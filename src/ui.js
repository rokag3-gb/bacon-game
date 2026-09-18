// HUD와 팝업. 월드 스케일과 무관하게 화면 픽셀로 그려서
// 세로 화면에서도 읽을 수 있는 크기를 유지한다. 터치 타겟은 44px 이상.

import { viewport } from './viewport.js';
import { drawHeart } from './sprites.js';
import { MAX_LIVES } from './config.js';

const FONT = 'system-ui, -apple-system, "Malgun Gothic", sans-serif';
const TOUCH = 44;

export function ui(size) {
  return Math.max(11, Math.min(size, viewport.cssW / 26));
}

function iconButton(ctx, x, y, size, draw) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.strokeStyle = 'rgba(18,48,63,0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, size * 0.26);
  ctx.fill();
  ctx.stroke();
  draw(ctx, x + size / 2, y + size / 2, size * 0.3);
  ctx.restore();
}

function gearIcon(ctx, cx, cy, r) {
  ctx.fillStyle = '#12303f';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.fillRect(-r * 0.22, -r * 1.45, r * 0.44, r * 0.6);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
}

function speakerIcon(ctx, cx, cy, r, muted) {
  ctx.fillStyle = '#12303f';
  ctx.beginPath();
  ctx.moveTo(cx - r, cy - r * 0.45);
  ctx.lineTo(cx - r * 0.35, cy - r * 0.45);
  ctx.lineTo(cx + r * 0.2, cy - r * 1.05);
  ctx.lineTo(cx + r * 0.2, cy + r * 1.05);
  ctx.lineTo(cx - r * 0.35, cy + r * 0.45);
  ctx.lineTo(cx - r, cy + r * 0.45);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#12303f';
  ctx.lineWidth = Math.max(1.6, r * 0.26);
  ctx.lineCap = 'round';
  if (muted) {
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.5, cy - r * 0.5);
    ctx.lineTo(cx + r * 1.15, cy + r * 0.5);
    ctx.moveTo(cx + r * 1.15, cy - r * 0.5);
    ctx.lineTo(cx + r * 0.5, cy + r * 0.5);
    ctx.stroke();
  } else {
    for (const rr of [0.55, 0.95]) {
      ctx.beginPath();
      ctx.arc(cx + r * 0.25, cy, r * (0.6 + rr), -0.6, 0.6);
      ctx.stroke();
    }
  }
}

// 우상단 톱니바퀴와 음소거. 눌린 자리를 알 수 있도록 영역을 돌려준다.
export function drawIcons(ctx, { muted }) {
  const s = Math.max(TOUCH, viewport.cssW * 0.1);
  const m = 10;
  const gear = { x: viewport.cssW - m - s, y: m, w: s, h: s, id: 'gear' };
  const mute = { x: viewport.cssW - m - s * 2 - 8, y: m, w: s, h: s, id: 'mute' };

  iconButton(ctx, mute.x, mute.y, s, (c, cx, cy, r) => speakerIcon(c, cx, cy, r, muted));
  iconButton(ctx, gear.x, gear.y, s, gearIcon);
  return [gear, mute];
}

export function drawHearts(ctx, lives, x, y) {
  const r = Math.max(9, Math.min(15, viewport.cssW / 30));
  for (let i = 0; i < MAX_LIVES; i++) {
    drawHeart(ctx, x + r + i * r * 2.6, y + r, r, i < lives);
  }
  return { h: r * 2.3, r };
}

// 진행 막대 — 작은 베이컨 얼굴이 팩맨까지 얼마나 갔는지 보여준다
export function drawMinimap(ctx, progress, x, y, w) {
  const t = Math.max(0, Math.min(1, progress));
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();

  // 도착점 팩맨
  ctx.fillStyle = '#FFD836';
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.arc(x + w, y, 8, Math.PI + 0.22 * Math.PI, Math.PI - 0.22 * Math.PI, false);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // 베이컨 얼굴
  const bx = x + w * t;
  ctx.fillStyle = '#FBF6EE';
  ctx.beginPath();
  ctx.roundRect(bx - 7, y - 7, 14, 14, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7A4A22';
  ctx.fillRect(bx - 7, y - 8, 14, 4);
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(bx - 4, y - 2, 2, 4);
  ctx.fillRect(bx + 2, y - 2, 2, 4);
  ctx.restore();
}

// ─── 팝업 ───────────────────────────────────────────────
// items를 주면 메뉴가 되고, 선택된 항목이 강조된다. 각 항목의 영역을 돌려준다.
export function drawPopup(ctx, { title, lines = [], items = [], selected = 0, accent = '#2FA83C' }) {
  const { cssW, cssH } = viewport;
  const fs = ui(20);
  const small = ui(15);
  const pad = fs * 1.2;
  const w = Math.min(cssW * 0.86, Math.max(280, cssW * 0.62));
  const itemH = Math.max(TOUCH, fs * 2.1);
  const h = pad * 2 + fs * 1.5 + lines.length * small * 1.65 + items.length * (itemH + 8) + (items.length ? pad * 0.4 : 0);
  const x = (cssW - w) / 2;
  const y = (cssH - h) / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(8,26,36,0.45)';
  ctx.fillRect(0, 0, cssW, cssH);

  ctx.fillStyle = '#FBF6EE';
  ctx.strokeStyle = '#12303f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 16);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let cy = y + pad + fs * 0.75;
  ctx.fillStyle = accent;
  ctx.font = `bold ${fs}px ${FONT}`;
  ctx.fillText(title, x + w / 2, cy);
  cy += fs * 0.9;

  ctx.fillStyle = '#12303f';
  ctx.font = `${small}px ${FONT}`;
  for (const line of lines) {
    cy += small * 1.65;
    ctx.fillText(line, x + w / 2, cy);
  }

  const zones = [];
  cy += pad * 0.4;
  for (const [i, label] of items.entries()) {
    const iy = cy + i * (itemH + 8);
    const on = i === selected;
    ctx.fillStyle = on ? accent : 'rgba(18,48,63,0.08)';
    ctx.beginPath();
    ctx.roundRect(x + pad, iy, w - pad * 2, itemH, 10);
    ctx.fill();
    if (on) {
      ctx.strokeStyle = '#12303f';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    ctx.fillStyle = on ? '#FFFFFF' : '#12303f';
    ctx.font = `bold ${ui(17)}px ${FONT}`;
    ctx.fillText(label, x + w / 2, iy + itemH / 2 + 1);
    zones.push({ x: x + pad, y: iy, w: w - pad * 2, h: itemH, id: `item${i}`, index: i });
  }

  ctx.restore();
  return zones;
}

export function drawCenterText(ctx, text, sub, yRatio = 0.5, alpha = 1) {
  const { cssW, cssH } = viewport;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  const fs = ui(34);
  ctx.font = `bold ${fs}px ${FONT}`;
  ctx.strokeStyle = '#12303f';
  ctx.lineWidth = Math.max(4, fs * 0.16);
  ctx.strokeText(text, cssW / 2, cssH * yRatio);
  ctx.fillStyle = '#FBF6EE';
  ctx.fillText(text, cssW / 2, cssH * yRatio);

  if (sub) {
    const ss = ui(17);
    ctx.font = `${ss}px ${FONT}`;
    ctx.lineWidth = Math.max(3, ss * 0.18);
    ctx.strokeText(sub, cssW / 2, cssH * yRatio + fs * 1.1);
    ctx.fillText(sub, cssW / 2, cssH * yRatio + fs * 1.1);
  }
  ctx.restore();
}

export function drawStars(ctx, count, cx, cy, r) {
  for (let i = 0; i < 3; i++) {
    const x = cx + (i - 1) * r * 2.6;
    ctx.save();
    ctx.beginPath();
    for (let p = 0; p < 10; p++) {
      const a = (p / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = p % 2 ? r * 0.45 : r;
      ctx[p ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = i < count ? '#FFD836' : 'rgba(18,48,63,0.14)';
    ctx.fill();
    ctx.strokeStyle = i < count ? '#B8860B' : 'rgba(18,48,63,0.3)';
    ctx.lineWidth = Math.max(1.5, r * 0.1);
    ctx.stroke();
    ctx.restore();
  }
}

export function hitZone(zones, x, y) {
  return zones.find((z) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h);
}
