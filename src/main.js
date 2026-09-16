// 부팅 + 게임 루프.
//
// 지금은 1단계(뼈대) 확인용 화면이 붙어 있다. 배경이 흘러가고, 실제 크기의
// 베이컨·바굼·장애물 박스를 그려서 세로/가로에서 크기가 어떤지 눈으로 볼 수 있다.
// 4단계에서 씬 디스패치로 바뀐다.

import { attach as attachViewport, viewport, beginFrame, sx, sy, su } from './viewport.js';
import { attach as attachInput, input, consumePress } from './input.js';
import { drawBackground } from './scenery.js';
import { BACON, BAGOOM, OBSTACLE_KINDS, STAGES } from './config.js';
import { buildStage } from './stage.js';

const canvas = document.getElementById('game');
attachViewport(canvas);
attachInput(canvas);

// ── 임시: 1단계 확인용 ────────────────────────────────
const demo = {
  cameraX: 0,
  running: true,
  stage: buildStage(1, 20260926),
};

function drawBox(ctx, worldX, worldY, w, h, fill, label) {
  const x = sx(worldX, demo.cameraX);
  const y = sy(worldY);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, su(w), su(h));
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = Math.max(1, su(2));
  ctx.strokeRect(x, y, su(w), su(h));

  if (label) {
    ctx.fillStyle = '#12303f';
    ctx.font = `${Math.max(9, su(15))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x + su(w) / 2, y - su(8));
  }
}

function drawReadout(ctx) {
  const pad = 12;
  const lines = [
    `${viewport.cssW}×${viewport.cssH}px  ·  dpr ${viewport.dpr}`,
    `scale ${viewport.scale.toFixed(3)} px/u`,
    `보이는 가로 ${Math.round(viewport.viewW)}u  세로 ${Math.round(viewport.viewH)}u`,
    `베이컨 화면 크기 ${Math.round(BACON.h * viewport.scale)}px`,
    input.held ? '누르는 중' : '탭하거나 스페이스를 눌러보세요',
  ];
  const size = Math.max(11, Math.min(15, viewport.cssW / 30));

  ctx.font = `${size}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2;
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.fillRect(pad, pad, w, lines.length * size * 1.5 + pad);
  ctx.fillStyle = '#12303f';
  lines.forEach((l, i) => ctx.fillText(l, pad * 2, pad * 1.6 + i * size * 1.5));
  ctx.textBaseline = 'alphabetic';
}

function render() {
  const { ctx } = viewport;
  beginFrame();
  drawBackground(ctx, demo.cameraX);

  // 실제 크기의 장애물 4종을 나란히 — 세로 화면에서 얼마나 작아지는지 보려고
  let x = 400;
  for (const o of OBSTACLE_KINDS) {
    drawBox(ctx, x, -o.h, o.w, o.h, '#9C6B3F', `${o.kind} ${o.w}×${o.h}`);
    x += 200;
  }
  drawBox(ctx, x, -BAGOOM.h, BAGOOM.w, BAGOOM.h, '#8B5A2B', '바굼');

  // 베이컨 자리 — 화면 왼쪽 30% 지점
  const baconWorldX = demo.cameraX + viewport.viewW * BACON.screenXRatio;
  drawBox(ctx, baconWorldX, -BACON.h, BACON.w, BACON.h, '#2B2B33', '베이컨');

  // 점프 최고점 표시선
  const apexY = sy(-(BACON.h + 224));
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, apexY);
  ctx.lineTo(viewport.cssW, apexY);
  ctx.stroke();
  ctx.setLineDash([]);

  drawReadout(ctx);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05); // 탭 전환 후 한 번에 크게 뛰는 것을 막는다
  last = now;

  if (consumePress()) demo.running = !demo.running;
  if (demo.running) {
    demo.cameraX += STAGES[0].speed * dt;
    if (demo.cameraX > demo.stage.length) demo.cameraX = 0;
  }

  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
