// 배경 — 하늘, 해, 구름, 잔디. 아이 그림 image/background.jpg 의 색을 따랐다.
// 세로 화면에서는 하늘이 아주 넓어지므로, 하늘은 화면 위쪽 끝까지 채운다.

import { viewport, sy, su } from './viewport.js';

export const COLORS = {
  skyTop: '#5BB5E8',
  skyLow: '#A8DCF5',
  sun: '#FFD836',
  sunGlow: '#FFEC8A',
  cloud: '#FFFFFF',
  grass: '#2E9B3F',
  grassDark: '#1F7A2E',
  soil: '#7A5230',
};

function drawSun(ctx, cssW) {
  // 아이 그림처럼 오른쪽 위에, 뾰족한 햇살을 두른 노란 원
  const r = Math.max(22, Math.min(su(70), cssW * 0.09));
  const cx = cssW * 0.82;
  const cy = Math.max(r * 2.2, viewport.groundScreenY * 0.18);

  ctx.save();
  ctx.strokeStyle = COLORS.sun;
  ctx.lineWidth = Math.max(2, r * 0.13);
  ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 1.25, cy + Math.sin(a) * r * 1.25);
    ctx.lineTo(cx + Math.cos(a) * r * 1.65, cy + Math.sin(a) * r * 1.65);
    ctx.stroke();
  }
  ctx.fillStyle = COLORS.sunGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.sun;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCloud(ctx, x, y, s) {
  ctx.beginPath();
  ctx.arc(x, y, s, 0, Math.PI * 2);
  ctx.arc(x + s * 0.9, y - s * 0.35, s * 0.8, 0, Math.PI * 2);
  ctx.arc(x + s * 1.8, y, s * 0.7, 0, Math.PI * 2);
  ctx.rect(x - s, y, s * 2.9, s);
  ctx.fill();
}

// 구름은 배경보다 훨씬 천천히 흘러 깊이를 준다
function drawClouds(ctx, cameraX, cssW) {
  const s = Math.max(14, su(38));
  const span = su(1400);
  const drift = (cameraX * 0.25) % span;
  const band = viewport.groundScreenY * 0.42;

  ctx.save();
  ctx.fillStyle = COLORS.cloud;
  ctx.globalAlpha = 0.9;
  for (let i = -1; i * span - drift < cssW + span; i++) {
    const x = i * span - drift;
    drawCloud(ctx, x, band * 0.6, s);
    drawCloud(ctx, x + span * 0.55, band * 1.15, s * 0.75);
  }
  ctx.restore();
}

export function drawBackground(ctx, cameraX) {
  const { cssW, cssH, groundScreenY } = viewport;

  const sky = ctx.createLinearGradient(0, 0, 0, groundScreenY);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(1, COLORS.skyLow);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, cssW, groundScreenY);

  drawSun(ctx, cssW);
  drawClouds(ctx, cameraX, cssW);

  // 잔디밭
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, groundScreenY, cssW, cssH - groundScreenY);

  // 지면 윗면의 짙은 띠 — 착지 지점이 눈에 잘 띄게
  ctx.fillStyle = COLORS.grassDark;
  ctx.fillRect(0, groundScreenY, cssW, Math.max(2, su(6)));

  // 흘러가는 풀포기. 스크롤이 눈에 보이게 하는 유일한 단서다.
  const tuft = su(90);
  const off = cameraX % 90;
  ctx.strokeStyle = COLORS.grassDark;
  ctx.lineWidth = Math.max(1.5, su(3));
  ctx.lineCap = 'round';
  for (let x = -su(off); x < cssW + tuft; x += tuft) {
    const base = groundScreenY + su(16);
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.lineTo(x - su(5), base - su(11));
    ctx.moveTo(x, base);
    ctx.lineTo(x + su(4), base - su(13));
    ctx.stroke();
  }
}

export function groundY() {
  return sy(0);
}
