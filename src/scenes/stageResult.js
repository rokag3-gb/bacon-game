// 스테이지 결과 — 별 등급과 점수 내역.

import { viewport } from '../viewport.js';
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

    const pad = (n) => String(n).padStart(5, ' ');
    drawPopup(ctx, {
      title: `스테이지 ${result.stageNo} 클리어!`,
      lines: [
        '',
        '',
        `바굼 처치   ${result.bagoomsDefeated} × 100 = ${pad(result.bagoom)}`,
        `도착 보너스          = ${pad(result.arrival)}`,
        `남은 목숨   ${result.livesLeft} × 200 = ${pad(result.lives)}`,
        '─────────────────',
        `스테이지 점수   ${pad(result.total)}`,
        `총점            ${pad(state.totalScore)}`,
        '',
        t > 0.6 ? (isLastStage(result.stageNo) ? '엔터 — 마지막으로' : '엔터 — 다음 스테이지') : ' ',
      ],
    });

    // 팝업 제목 바로 아래에 별을 겹쳐 그린다
    const r = ui(19);
    drawStars(ctx, shown, viewport.cssW / 2, viewport.cssH / 2 - ui(20) * 2.6, r);

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
