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
  stem: '#1B6B29',
};

const FLOWERS = ['#FF5A5A', '#FFD836', '#FFFFFF', '#FF8FC8', '#A77BFF'];

// 슬롯 번호로부터 항상 같은 값을 내는 해시. 카메라가 움직여도 꽃이
// 깜빡이거나 자리를 옮기지 않으려면 위치가 월드 좌표에만 의존해야 한다.
function hash(i) {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function drawSun(ctx, cssW) {
  // 아이 그림처럼 오른쪽 위에, 뾰족한 햇살을 두른 노란 원
  const r = Math.max(11, Math.min(su(35), cssW * 0.045));
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

// 구름 여섯 가지. 하나뿐이면 하늘이 금방 단조로워진다.
// 각 모양은 [상대 x, 상대 y, 반지름] 뭉치 목록과 아랫변을 메울 사각형으로 이루어진다.
const CLOUD_SHAPES = [
  // 0. 기본 세 뭉치
  { puffs: [[0, 0, 1], [0.9, -0.35, 0.8], [1.8, 0, 0.7]], base: [-1, 2.9, 1] },
  // 1. 길고 낮은 네 뭉치
  { puffs: [[0, 0, 0.75], [0.8, -0.2, 0.95], [1.7, -0.1, 0.8], [2.5, 0.05, 0.6]], base: [-0.75, 3.85, 0.8] },
  // 2. 봉긋하게 쌓인 것
  { puffs: [[0, 0, 0.85], [0.55, -0.7, 0.75], [1.2, -0.25, 0.9], [1.9, 0.05, 0.6]], base: [-0.85, 3.35, 0.9] },
  // 3. 작고 동그란 것
  { puffs: [[0, 0, 0.85], [0.8, -0.1, 0.7]], base: [-0.85, 2.35, 0.85] },
  // 4. 옆으로 퍼진 것
  { puffs: [[0, -0.1, 0.7], [0.75, 0.05, 1.05], [1.65, -0.05, 0.85], [2.4, 0.1, 0.55], [3.05, 0, 0.45]], base: [-0.7, 4.2, 0.95] },
  // 5. 울퉁불퉁 뭉친 것
  { puffs: [[0, 0.1, 0.6], [0.5, -0.45, 0.8], [1.1, 0.05, 0.7], [1.6, -0.5, 0.65], [2.2, -0.05, 0.75]], base: [-0.6, 3.55, 0.8] },
];

function drawCloud(ctx, x, y, s, shape = 0) {
  const { puffs, base } = CLOUD_SHAPES[shape % CLOUD_SHAPES.length];
  ctx.beginPath();
  for (const [dx, dy, r] of puffs) ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
  ctx.rect(x + base[0] * s, y, base[1] * s, base[2] * s);
  ctx.fill();
}

// 구름은 여러 겹으로 흐른다. 멀리 있는 것일수록 작고 느리고 흐릿하게,
// 가까운 것일수록 크고 빠르고 또렷하게 — 그래야 하늘에 깊이가 생긴다.
// 자리와 크기는 월드 좌표 해시로 뽑아 스크롤해도 흔들리지 않는다.
const CLOUD_LAYERS = [
  { parallax: 0.08, size: 0.55, band: [0.08, 0.34], span: 430, alpha: 0.62 },
  { parallax: 0.16, size: 0.75, band: [0.14, 0.46], span: 520, alpha: 0.74 },
  { parallax: 0.28, size: 1.0,  band: [0.06, 0.32], span: 640, alpha: 0.86 },
  { parallax: 0.44, size: 1.35, band: [0.22, 0.58], span: 780, alpha: 0.95 },
  { parallax: 0.62, size: 1.7,  band: [0.04, 0.26], span: 980, alpha: 1.0  },
];

function drawClouds(ctx, cameraX, cssW) {
  const sky = viewport.groundScreenY;
  if (sky <= 0) return;
  const base = Math.max(10, su(34));

  ctx.save();
  ctx.fillStyle = COLORS.cloud;

  for (const [li, layer] of CLOUD_LAYERS.entries()) {
    const span = su(layer.span);
    if (span <= 0) continue;
    const drift = su(cameraX * layer.parallax);
    const first = Math.floor(drift / span) - 1;
    ctx.globalAlpha = layer.alpha;

    for (let i = first; i * span - drift < cssW + span; i++) {
      const h1 = hash(i * 6151 + li * 48619);
      if (h1 > 0.72) continue; // 슬롯의 약 70%만 채운다
      const h2 = hash(i * 20011 + li * 91711);
      const h3 = hash(i * 40009 + li * 13337);
      const h4 = hash(i * 65537 + li * 27644);

      const x = i * span - drift + h2 * span * 0.7;
      const y = sky * (layer.band[0] + h3 * (layer.band[1] - layer.band[0]));
      const shape = Math.floor(h4 * CLOUD_SHAPES.length);
      drawCloud(ctx, x, y, base * layer.size * (0.8 + h1 * 0.55), shape);
    }
  }
  ctx.restore();
}

function drawFlower(ctx, x, baseY, size, color) {
  const stemH = size * 1.5;
  const headY = baseY - stemH;

  ctx.strokeStyle = COLORS.stem;
  ctx.lineWidth = Math.max(1, size * 0.14);
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x, headY);
  ctx.stroke();

  // 잎 두 장
  ctx.fillStyle = COLORS.stem;
  ctx.beginPath();
  ctx.ellipse(x - size * 0.38, baseY - stemH * 0.42, size * 0.34, size * 0.17, -0.5, 0, Math.PI * 2);
  ctx.ellipse(x + size * 0.38, baseY - stemH * 0.62, size * 0.34, size * 0.17, 0.5, 0, Math.PI * 2);
  ctx.fill();

  // 꽃잎 다섯 장 + 노란 가운데
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * size * 0.34, headY + Math.sin(a) * size * 0.34, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#FFC93C';
  ctx.beginPath();
  ctx.arc(x, headY, size * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

// 잔디밭 위에 꽃을 흩뿌린다. 아래쪽 줄일수록 크고 조금 빨리 흘러
// 앞에 있는 것처럼 보이게 했다. 지면선 아래에만 두므로 장애물과
// 헷갈릴 일이 없다.
function drawFlowers(ctx, cameraX) {
  const { cssW, cssH, groundScreenY } = viewport;
  const lawnH = cssH - groundScreenY;
  if (lawnH <= 0) return;

  const rows = Math.max(1, Math.min(4, Math.round(lawnH / viewport.scale / 90)));
  const slot = su(150);
  if (slot <= 0) return;

  for (let row = 0; row < rows; row++) {
    const frac = (row + 0.5) / rows;
    const baseY = groundScreenY + lawnH * frac;
    const parallax = 1 + frac * 0.35;
    const size = su(16) * (0.8 + frac * 0.6);
    const drift = cameraX * parallax;
    const first = Math.floor(drift / 150) - 1;

    for (let i = first; i * slot - su(drift) < cssW + slot; i++) {
      const h1 = hash(i * 7919 + row * 104729);
      if (h1 > 0.5) continue; // 슬롯 절반쯤만 채워 간간이 지나가게
      const h2 = hash(i * 31337 + row * 2654435761);
      const x = i * slot - su(drift) + h2 * slot * 0.8;
      if (x < -slot || x > cssW + slot) continue;
      drawFlower(ctx, x, baseY, size * (0.85 + h2 * 0.3), FLOWERS[Math.floor(h1 * 10) % FLOWERS.length]);
    }
  }
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

  drawFlowers(ctx, cameraX);
}

export function groundY() {
  return sy(0);
}
