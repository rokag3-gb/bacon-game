// 캔버스 크기와 월드↔화면 환산.
//
// 좌표계: 월드 y는 아래로 증가하고, 지면 윗면이 y = 0이다.
// 따라서 공중은 음수 — 서 있는 베이컨의 윗변은 y = -100, 발은 y = 0.
//
// 세로/가로 대응의 전부가 여기 있다. 게임 로직은 전부 유닛 기준이라
// 화면이 회전해도 scale만 다시 재면 되고, 월드 상태는 건드릴 필요가 없다.

import { SIGHT_W, MIN_VIEW_H, GROUND_FROM_BOTTOM, ACTION_BAND } from './config.js';

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

  viewport.groundScreenY = cssH - groundFromBottom() * scale;
}

// 지면을 화면 아래에서 몇 유닛 띄울지. 세로로 길수록 높이 올린다.
function groundFromBottom() {
  const g = GROUND_FROM_BOTTOM;
  const wide = Math.max(g.min, Math.min(g.max, viewport.viewH * g.ratio));

  const tallness = viewport.viewH / viewport.viewW;
  const t = Math.max(0, Math.min(1, (tallness - g.tallFrom) / (g.tallTo - g.tallFrom)));
  const raised = wide + (g.tallMax - wide) * t;

  // 아무리 올려도 지면 위로 점프한 베이컨의 머리가 들어갈 자리는 남겨야 한다
  return Math.min(raised, Math.max(wide, viewport.viewH - ACTION_BAND));
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
