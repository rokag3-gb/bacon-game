// 착지 먼지.
//
// 배경 장식과 달리 조작에 붙는 반응이라, 점프할 때마다 손맛이 달라진다.
// 입자는 월드 좌표에 살아서 스크롤과 함께 자연스럽게 흘러간다.

const GRAVITY = 900;   // u/s² — 베이컨보다 가볍게 떨어진다
const DRAG = 2.2;      // 공기 저항. 튄 흙이 금방 힘을 잃는다
const MAX = 90;        // 입자 상한. 넘치면 오래된 것부터 버린다

const SOIL = ['#D9C8A5', '#C9B48C', '#E6DAC0'];
const GRASS = ['#6FBF56', '#4F9E3C'];

export function createDust() {
  return [];
}

/**
 * 먼지를 피운다.
 * @param {number} x 발이 닿은 월드 x (베이컨 가운데)
 * @param {number} y 발이 닿은 월드 y (지면이면 0)
 * @param {number} power 0~1. 높이 떨어질수록 크게 피어오른다.
 */
export function spawnDust(list, x, y, power = 1) {
  const count = Math.round(5 + power * 9);
  for (let i = 0; i < count; i++) {
    const side = i % 2 ? 1 : -1;           // 양옆으로 갈라지며
    const spread = 0.35 + Math.random() * 0.9;
    const grass = Math.random() < 0.25;    // 가끔 풀조각도 같이 튄다
    list.push({
      x: x + side * spread * 14,
      y: y - Math.random() * 6,
      vx: side * (45 + Math.random() * 115) * spread * (0.6 + power * 0.7),
      vy: -(25 + Math.random() * 95) * (0.6 + power * 0.7),
      r: (grass ? 2.5 : 4) + Math.random() * (grass ? 2 : 6),
      life: 0,
      span: 0.34 + Math.random() * 0.3,
      color: grass
        ? GRASS[(Math.random() * GRASS.length) | 0]
        : SOIL[(Math.random() * SOIL.length) | 0],
      grass,
    });
  }
  if (list.length > MAX) list.splice(0, list.length - MAX);
}

export function updateDust(list, dt) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life += dt;
    if (p.life >= p.span) {
      list.splice(i, 1);
      continue;
    }
    const drag = Math.max(0, 1 - DRAG * dt);
    p.vx *= drag;
    p.vy = p.vy * drag + GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.y > 0) {      // 땅에 닿으면 붙어서 사그라든다
      p.y = 0;
      p.vy = 0;
      p.vx *= 0.7;
    }
  }
}

/**
 * @param {Function} sx 월드 x → 화면 x
 * @param {Function} sy 월드 y → 화면 y
 * @param {number} scale px per unit
 */
export function drawDust(ctx, list, sx, sy, scale) {
  if (!list.length) return;
  ctx.save();
  for (const p of list) {
    const k = p.life / p.span;
    ctx.globalAlpha = (1 - k) * 0.85;
    ctx.fillStyle = p.color;
    const r = Math.max(0.6, p.r * (1 + k * 0.7) * scale);
    ctx.beginPath();
    if (p.grass) {
      ctx.ellipse(sx(p.x), sy(p.y), r, r * 0.45, p.life * 9, 0, Math.PI * 2);
    } else {
      ctx.arc(sx(p.x), sy(p.y), r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  ctx.restore();
}
