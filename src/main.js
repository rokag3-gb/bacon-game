// 부팅 + 게임 루프 + 씬 등록.

import { attach as attachViewport, viewport, beginFrame } from './viewport.js';
import { attach as attachInput, onUiTap } from './input.js';
import { unlock } from './audio.js';
import { game } from './game.js';
import { tuning } from './tuning.js';

import { intro } from './scenes/intro.js';
import { stageIntro } from './scenes/stageIntro.js';
import { play } from './scenes/play.js';
import { stageResult } from './scenes/stageResult.js';
import { ending } from './scenes/ending.js';

const canvas = document.getElementById('game');
attachViewport(canvas);
attachInput(canvas);

// 브라우저 자동재생 정책 때문에 오디오는 사용자 입력 핸들러 안에서 깨워야 한다
for (const ev of ['keydown', 'pointerdown', 'touchstart']) {
  addEventListener(ev, unlock, { passive: true });
}

onUiTap((x, y) => game.current?.onTap?.(x, y));

// 개발용 손잡이. D로 눈금판을 켜고 수치를 바꿔본다.
addEventListener('keydown', (e) => {
  if (e.key === 'd' || e.key === 'D') tuning.show = !tuning.show;
  else if (e.key === '[') tuning.jumpMul = Math.max(0.5, tuning.jumpMul - 0.05);
  else if (e.key === ']') tuning.jumpMul = Math.min(2, tuning.jumpMul + 0.05);
  else if (e.key === '-') tuning.speedMul = Math.max(0.4, tuning.speedMul - 0.05);
  else if (e.key === '=' || e.key === '+') tuning.speedMul = Math.min(2, tuning.speedMul + 0.05);
});

game.register({ intro, stageIntro, play, stageResult, ending });
game.go('intro');

let last = performance.now();
function frame(now) {
  // 탭이 백그라운드에 있다 돌아오면 dt가 크게 뛴다. 그대로 적분하면
  // 베이컨이 장애물을 뚫고 지나가므로 한 프레임 분량으로 잘라낸다.
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  game.update(dt);
  beginFrame();
  game.render(viewport.ctx);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
