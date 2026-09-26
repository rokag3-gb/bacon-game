// 스테이지 결과 — 별 등급과 점수 내역.

import { drawBackground } from '../scenery.js';
import { drawPopup, drawStars, drawIcons, hitZone, ui } from '../ui.js';
import { consumePress, setUiZones } from '../input.js';
import { toggleMute, isMuted, sfx } from '../audio.js';
import { game } from '../game.js';
import { state, isLastStage } from '../state.js';
import { STAGE_COUNT } from '../config.js';

let t = 0;
let result = null;
let shown = 0;   // 지금까지 소리와 함께 나타난 별 개수
let zones = [];

export const stageResult = {
  enter(r) {
    t = 0;
    shown = 0;
    result = r;
  },

  update(dt) {
    t += dt;

    // 별을 하나씩 소리와 함께 띄운다
    const want = Math.min(result.stars, Math.floor(Math.max(0, t - 0.35) / 0.32));
    while (shown < want) {
      sfx.star(shown);
      shown++;
    }

    if (consumePress() && t > 0.6) next();
  },

  onTap(x, y) {
    const z = hitZone(zones, x, y);
    if (z?.id === 'mute') {
      toggleMute();
      sfx.select();
      return;
    }
    if (t > 0.6) next();
  },

  render(ctx) {
    drawBackground(ctx, 0);

    const num = (n) => n.toLocaleString('ko-KR');
    const starR = ui(19);
    const popup = drawPopup(ctx, {
      title: `스테이지 ${result.stageNo} 클리어!`,
      textScale: 1.25,
      topSpace: starR * 2.8, // 별을 얹을 자리
      rows: [
        [`바굼 처치  ${result.bagoomsDefeated} × 100`, num(result.bagoom)],
        ['도착 보너스', num(result.arrival)],
        [`남은 목숨  ${result.livesLeft} × 200`, num(result.lives)],
        [null],
        ['스테이지 점수', num(result.total), true],
        ['총점', num(state.totalScore), true],
      ],
      footer: [
        t > 0.6 ? (isLastStage(result.stageNo) ? '엔터 — 마지막으로' : '엔터 — 다음 스테이지') : ' ',
      ],
    });

    // 머리 띠 바로 아래, 비워둔 자리에 별을 얹는다
    const b = popup.box;
    drawStars(ctx, shown, b.x + b.w / 2, b.y + b.headH + b.topSpace / 2 + starR * 0.2, starR);

    zones = drawIcons(ctx, { muted: isMuted() }).filter((z) => z.id === 'mute');
    setUiZones(zones);
  },
};

function next() {
  sfx.select();
  if (isLastStage(result.stageNo)) {
    game.go('ending');
  } else {
    state.stageNo = Math.min(STAGE_COUNT, result.stageNo + 1);
    game.go('stageIntro');
  }
}
