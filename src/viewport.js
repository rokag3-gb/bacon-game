// 캔버스 크기와 월드↔화면 환산.
//
// 좌표계: 월드 y는 아래로 증가하고, 지면 윗면이 y = 0이다.
// 따라서 공중은 음수 — 서 있는 베이컨의 윗변은 y = -100, 발은 y = 0.
//
// 세로/가로 대응의 전부가 여기 있다. 게임 로직은 전부 유닛 기준이라
// 화면이 회전해도 scale만 다시 재면 되고, 월드 상태는 건드릴 필요가 없다.

import { SIGHT_W, MIN_VIEW_H, GROUND_FROM_BOTTOM } from './config.js';

export const viewport = {
  canvas: null,
  ctx: null,
  dpr: 1,
  cssW: 0,
  cssH: 0,
  scale: 1,       // px per unit
  viewW: SIGHT_W, // 실제로 보이는 가로 유닛
  viewH: MIN_VIEW_H,
  groundScreenY: 0, // 지면 윗면의 화면 y (CSS 픽셀)
};

export function attach(canvas) {
  viewport.canvas = canvas;
  viewport.ctx = canvas.getContext('2d');
  resize();
  addEventListener('resize', resize);
  addEventListener('orientationchange', resize);
}

export function resize() {
  const { canvas } = viewport;
  if (!canvas) return;

  const cssW = canvas.clientWidth || innerWidth;
  const cssH = canvas.clientHeight || innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, 3);

  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  // min을 쓰므로 어떤 화면에서도 가로 SIGHT_W 이상, 세로 MIN_VIEW_H 이상이 보인다.
  // 폰 가로처럼 납작한 화면에서는 세로 제약이 먼저 걸려 가로가 더 넓게 보인다.
  const scale = Math.min(cssW / SIGHT_W, cssH / MIN_VIEW_H);

  viewport.dpr = dpr;
  viewport.cssW = cssW;
  viewport.cssH = cssH;
  viewport.scale = scale;
  viewport.viewW = cssW / scale;
  viewport.viewH = cssH / scale;

  const fromBottom = Math.max(
    GROUND_FROM_BOTTOM.min,
    Math.min(GROUND_FROM_BOTTOM.max, viewport.viewH * GROUND_FROM_BOTTOM.ratio),
  );
  viewport.groundScreenY = cssH - fromBottom * scale;
}

// 캔버스를 CSS 픽셀 좌표로 쓰도록 변환을 걸어둔다 (레티나 대응)
export function beginFrame() {
  const { ctx, dpr, canvas } = viewport;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function sx(worldX, cameraX) {
  return (worldX - cameraX) * viewport.scale;
}

export function sy(worldY) {
  return viewport.groundScreenY + worldY * viewport.scale;
}

export function su(units) {
  return units * viewport.scale;
}
