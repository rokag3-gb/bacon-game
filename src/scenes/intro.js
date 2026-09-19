// 인트로 — 배경이 흘러가고, 2초 뒤부터 PRESS ENTER 가 깜빡인다.

import { viewport, sy, su } from '../viewport.js';
import { drawBackground } from '../scenery.js';
import { drawBacon, drawPacman } from '../sprites.js';
import { drawIcons, drawCenterText, drawSign, drawCredits, hitZone } from '../ui.js';
import { consumePress, setUiZones } from '../input.js';
import { toggleMute, isMuted, playBgm, sfx } from '../audio.js';
import { game } from '../game.js';
import { resetGame } from '../state.js';
import { BACON } from '../config.js';

let t = 0;
let cameraX = 0;
let zones = [];

export const intro = {
  enter() {
    t = 0;
    cameraX = 0;
    playBgm('intro');
  },

  update(dt) {
    t += dt;
    cameraX += 70 * dt;
    if (consumePress() && t > 0.4) {
      sfx.select();
      resetGame();
      game.go('stageIntro');
    }
  },

  onTap(x, y) {
    const z = hitZone(zones, x, y);
    if (z?.id === 'mute') {
      toggleMute();
      sfx.select();
    }
  },

  render(ctx) {
    drawBackground(ctx, cameraX);

    // 제자리에서 달리는 베이컨과, 저 멀리 기다리는 팩맨
    const s = viewport.scale;
    drawBacon(ctx, viewport.cssW * 0.22, sy(-BACON.h), s, { runPhase: t * 14 });
    drawPacman(ctx, viewport.cssW * 0.72, sy(-140), su(140), s, { chomp: t * 6 });

    drawSign(ctx, '베이컨 먹방', viewport.cssH * 0.26);

    if (t > 2) {
      const blink = 0.55 + 0.45 * Math.sin(t * 5);
      drawCenterText(ctx, 'PRESS ENTER', '또는 화면을 터치하세요', 0.78, blink);
    }

    drawCredits(ctx);

    zones = drawIcons(ctx, { muted: isMuted() }).filter((z) => z.id === 'mute');
    setUiZones(zones);
  },
};
