// 스테이지 시작 전 화면.
//
// 목숨을 다 써서 돌아왔을 때도 여기를 거친다. 그래서 "죽어서 조금 뒤로 물러나기"와
// "스테이지를 처음부터 다시 하기"가 눈에 띄게 다르게 느껴진다.

import { drawBackground } from '../scenery.js';
import { drawPopup, drawIcons, hitZone } from '../ui.js';
import { consumePress, setUiZones } from '../input.js';
import { toggleMute, isMuted, stopBgm, sfx } from '../audio.js';
import { game } from '../game.js';
import { state } from '../state.js';
import { MAX_LIVES } from '../config.js';

let t = 0;
let zones = [];
let restarted = false;   // 목숨을 다 써서 돌아왔는가

export const stageIntro = {
  enter(arg) {
    t = 0;
    restarted = !!arg?.restarted;
    // 스테이지에 들어갈 때마다 목숨은 3개로 복구된다. 별 등급이 남은 목숨으로
    // 매겨지므로 스테이지마다 같은 조건에서 시작해야 한다.
    state.lives = MAX_LIVES;
    stopBgm();
  },

  update(dt) {
    t += dt;
    if (consumePress() && t > 0.3) {
      sfx.select();
      game.go('play');
    }
  },

  onTap(x, y) {
    const z = hitZone(zones, x, y);
    if (z?.id === 'mute') {
      toggleMute();
      sfx.select();
      return;
    }
    if (t > 0.3) {
      sfx.select();
      game.go('play');
    }
  },

  render(ctx) {
    drawBackground(ctx, 0);

    const blink = Math.sin(t * 5) > -0.3;
    drawPopup(ctx, {
      title: `스테이지 ${state.stageNo}`,
      textScale: 1.25,
      accent: restarted ? '#E8853F' : '#2FA83C',
      lines: restarted
        ? ['목숨을 다 사용하고 나면 스테이지 처음부터!', '', '스테이지 끝까지 도달하세요']
        : ['스테이지 끝까지 도달하세요'],
      footer: [blink ? '엔터 또는 화면 터치' : ' '],
    });

    zones = drawIcons(ctx, { muted: isMuted() }).filter((z) => z.id === 'mute');
    setUiZones(zones);
  },
};
