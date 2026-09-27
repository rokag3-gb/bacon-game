// 최종 엔딩 — 다섯 스테이지를 다 지난 뒤.

import { viewport, sy, su } from '../viewport.js';
import { drawSky, drawGround } from '../scenery.js';
import { drawPacman, drawBacon, drawBagoom } from '../sprites.js';
import { drawStars, drawCenterText, drawIcons, drawCredits, hitZone, ui } from '../ui.js';
import { consumePress, setUiZones } from '../input.js';
import { toggleMute, isMuted, playBgm, sfx } from '../audio.js';
import { game } from '../game.js';
import { state, totalStars } from '../state.js';
import { BACON, BAGOOM, STAGE_COUNT } from '../config.js';

const FONT = 'system-ui, -apple-system, "Malgun Gothic", sans-serif';

let t = 0;
let cameraX = 0;
let zones = [];

export const ending = {
  enter() {
    t = 0;
    cameraX = 0;
    playBgm('ending');
  },

  update(dt) {
    t += dt;
    cameraX += 50 * dt;
    if (consumePress() && t > 1.2) {
      sfx.select();
      game.go('intro');
    }
  },

  onTap(x, y) {
    const z = hitZone(zones, x, y);
    if (z?.id === 'mute') {
      toggleMute();
      sfx.select();
      return;
    }
    if (t > 1.2) {
      sfx.select();
      game.go('intro');
    }
  },

  render(ctx) {
    const s = viewport.scale;
    const bob = Math.sin(t * 3) * su(6);
    const baconX = viewport.cssW * 0.34;

    drawSky(ctx, cameraX);
    drawPacman(ctx, viewport.cssW * 0.58, sy(-150) + bob, su(150), s, { chomp: t * 5 });

    // 구경 나온 바굼 셋. 통통 뛰면서 눈으로 베이컨을 좇는다.
    for (const [i, at] of [0.1, 0.22, 0.84].entries()) {
      const bx = viewport.cssW * at;
      const hop = Math.abs(Math.sin(t * 2.4 + i * 1.7)) * su(14);
      const dx = baconX - bx;
      const len = Math.max(su(80), Math.abs(dx));
      drawBagoom(ctx, bx, sy(-BAGOOM.h) - hop, s, {
        phase: t * 7 + i * 2,
        look: { x: dx / len, y: 0.2 },
      });
    }

    drawBacon(ctx, baconX, sy(-BACON.h), s, { runPhase: t * 10 });
    drawGround(ctx, cameraX);

    drawCenterText(ctx, '축하합니다!', `${STAGE_COUNT}개 스테이지를 모두 지났습니다`, 0.16);

    const stars = totalStars();
    const r = ui(16);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${ui(26)}px ${FONT}`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#12303f';
    ctx.lineWidth = 5;
    const score = `총점 ${state.totalScore.toLocaleString('ko-KR')}`;
    ctx.strokeText(score, viewport.cssW / 2, viewport.cssH * 0.62);
    ctx.fillStyle = '#FFD836';
    ctx.fillText(score, viewport.cssW / 2, viewport.cssH * 0.62);

    ctx.font = `${ui(14)}px ${FONT}`;
    ctx.lineWidth = 3;
    const starLine = `별 ${stars} / ${STAGE_COUNT * 3}`;
    ctx.strokeText(starLine, viewport.cssW / 2, viewport.cssH * 0.69);
    ctx.fillStyle = '#FBF6EE';
    ctx.fillText(starLine, viewport.cssW / 2, viewport.cssH * 0.69);
    ctx.restore();

    drawStars(ctx, Math.min(3, Math.round(stars / STAGE_COUNT)), viewport.cssW / 2, viewport.cssH * 0.76, r);

    if (t > 1.2) {
      const blink = 0.55 + 0.45 * Math.sin(t * 5);
      drawCenterText(ctx, '', '엔터 — 처음으로', 0.86, blink);
    }

    drawCredits(ctx);

    zones = drawIcons(ctx, { muted: isMuted() }).filter((z) => z.id === 'mute');
    setUiZones(zones);
  },
};
