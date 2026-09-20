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

// HUD를 화면 가장자리에서 띄우는 여백. 너무 붙어 있으면 답답하고,
// 폰의 둥근 모서리나 노치에 걸리기도 한다.
export function hudMargin() {
  return Math.max(16, Math.min(32, viewport.cssW * 0.04));
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

  // 아이콘이 버튼 밖으로 삐져나오지 않도록 잘라낸다
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, size * 0.26);
  ctx.clip();
  draw(ctx, x + size / 2, y + size / 2, size * 0.3);
  ctx.restore();
}

// 누르는 영역은 그림보다 넓게 잡는다. 아이콘을 작게 그리면서도
// 손가락으로 누를 수 있어야 하기 때문이다.
function touchZone(box, id) {
  const pad = Math.max(0, (TOUCH - box.w) / 2);
  return {
    x: box.x - pad,
    y: box.y - pad,
    w: box.w + pad * 2,
    h: box.h + pad * 2,
    id,
    box, // 그림이 실제로 차지하는 네모. 테스트가 이 안에 들어오는지 본다.
  };
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

// 버튼 반쪽이 1.67r 이므로 글리프 전체가 가로 ±1.2r 안에 들어오도록 잡았다.
// 예전에는 음파가 1.55r 까지 뻗어 버튼 밖으로 튀어나왔다.
function speakerIcon(ctx, cx, cy, r, muted) {
  const bx = cx - r * 0.35; // 스피커를 왼쪽으로 조금 밀어 음파 자리를 만든다

  ctx.fillStyle = '#12303f';
  ctx.beginPath();
  ctx.moveTo(bx - r * 0.75, cy - r * 0.38);
  ctx.lineTo(bx - r * 0.22, cy - r * 0.38);
  ctx.lineTo(bx + r * 0.45, cy - r * 0.92);
  ctx.lineTo(bx + r * 0.45, cy + r * 0.92);
  ctx.lineTo(bx - r * 0.22, cy + r * 0.38);
  ctx.lineTo(bx - r * 0.75, cy + r * 0.38);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#12303f';
  ctx.lineWidth = Math.max(1.5, r * 0.22);
  ctx.lineCap = 'round';

  if (muted) {
    const mx = cx + r * 0.62;
    const d = r * 0.4;
    ctx.beginPath();
    ctx.moveTo(mx - d, cy - d);
    ctx.lineTo(mx + d, cy + d);
    ctx.moveTo(mx + d, cy - d);
    ctx.lineTo(mx - d, cy + d);
    ctx.stroke();
  } else {
    for (const rr of [0.48, 0.85]) {
      ctx.beginPath();
      ctx.arc(bx + r * 0.45, cy, r * rr, -0.62, 0.62);
      ctx.stroke();
    }
  }
}

// 우상단 톱니바퀴와 음소거.
// 예전에는 크기를 화면 폭의 10%로 잡아 데스크톱에서 160px까지 커졌다.
// 작게 그리되, 누르는 영역은 손가락이 닿을 만큼 넓게 남긴다.
export function drawIcons(ctx, { muted }) {
  const s = Math.max(24, Math.min(40, viewport.cssW * 0.05));
  const m = hudMargin();
  // 그림은 작아도 누르는 영역은 44px이라, 둘 사이를 그만큼 띄워야 겹치지 않는다
  const gap = Math.max(14, TOUCH - s + 10);
  const gear = { x: viewport.cssW - m - s, y: m, w: s, h: s };
  const mute = { x: viewport.cssW - m - s * 2 - gap, y: m, w: s, h: s };

  iconButton(ctx, mute.x, mute.y, s, (c, cx, cy, r) => speakerIcon(c, cx, cy, r, muted));
  iconButton(ctx, gear.x, gear.y, s, gearIcon);
  return [touchZone(gear, 'gear'), touchZone(mute, 'mute')];
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
  const r = Math.max(9, Math.min(13, viewport.cssW / 42)); // 팩맨 반지름
  const f = r * 1.85;                                      // 베이컨 얼굴 한 변

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
  ctx.arc(x + w, y, r, Math.PI + 0.22 * Math.PI, Math.PI - 0.22 * Math.PI, false);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(x + w - r * 0.12, y - r * 0.62, Math.max(1.5, r * 0.2), r * 0.3);

  // 베이컨 얼굴
  const bx = x + w * t;
  ctx.fillStyle = '#FBF6EE';
  ctx.beginPath();
  ctx.roundRect(bx - f / 2, y - f / 2, f, f, f * 0.22);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7A4A22';
  ctx.beginPath();
  ctx.roundRect(bx - f / 2, y - f / 2 - f * 0.08, f, f * 0.3, f * 0.14);
  ctx.fill();
  ctx.fillStyle = '#1A1A1A';
  const eye = Math.max(1.5, f * 0.12);
  ctx.fillRect(bx - f * 0.24, y - f * 0.08, eye, f * 0.26);
  ctx.fillRect(bx + f * 0.12, y - f * 0.08, eye, f * 0.26);
  ctx.restore();
}

// ─── 팝업 ───────────────────────────────────────────────
// 게임의 스프라이트와 같은 결로 그린다 — 두꺼운 먹선, 크림색 종이,
// 색 띠를 두른 머리, 그리고 밀린 그림자로 스티커처럼 도톰하게.
//
// lines 는 가운데 정렬 문장, rows 는 [항목, 값] 쌍으로 양끝 정렬한다.
// 점수 내역처럼 자릿수를 맞춰야 하는 것은 rows 를 쓴다 — 비례 글꼴에서
// 공백으로 맞추면 절대 안 맞는다.
const INK = '#1A1A1A';
const PAPER = '#FBF6EE';

function chunkyBox(ctx, x, y, w, h, r, fill, lift = 5) {
  ctx.fillStyle = 'rgba(26,26,26,0.55)';
  ctx.beginPath();
  ctx.roundRect(x + lift, y + lift, w, h, r);
  ctx.fill();

  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2.5, h * 0.03);
  ctx.lineJoin = 'round';
  ctx.stroke();
}

export function drawPopup(ctx, {
  title, lines = [], rows = [], footer = [], items = [], selected = 0,
  accent = '#2FA83C', topSpace = 0,
}) {
  const { cssW, cssH } = viewport;
  const fs = ui(20);
  const small = ui(15);
  const pad = fs * 1.1;
  const headH = fs * 2.2;
  const itemH = Math.max(TOUCH, fs * 2.2);
  const gap = fs * 0.5;

  const w = Math.min(cssW * 0.88, Math.max(288, cssW * 0.64));
  const bodyH =
    topSpace +
    (lines.length ? lines.length * small * 1.6 : 0) +
    (rows.length ? rows.length * small * 1.6 + gap * 0.6 : 0) +
    (footer.length ? footer.length * small * 1.6 + gap * 0.4 : 0) +
    (items.length ? items.length * (itemH + 10) + gap : 0);
  const h = headH + pad * 1.2 + bodyH + pad;
  const x = (cssW - w) / 2;
  const y = (cssH - h) / 2;

  ctx.save();

  // 뒤를 어둡게 깔아 팝업에 눈이 가게 한다
  ctx.fillStyle = 'rgba(8,26,36,0.5)';
  ctx.fillRect(0, 0, cssW, cssH);

  chunkyBox(ctx, x, y, w, h, 18, PAPER, 6);

  // 머리 띠 — 아래쪽 모서리는 각지게 해서 본문과 이어지게
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 18);
  ctx.clip();
  ctx.fillStyle = accent;
  ctx.fillRect(x, y, w, headH);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(x, y, w, headH * 0.32);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y + headH);
  ctx.lineTo(x + w, y + headH);
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.font = `bold ${fs}px ${FONT}`;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(3, fs * 0.16);
  ctx.strokeText(title, x + w / 2, y + headH / 2 + 1);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(title, x + w / 2, y + headH / 2 + 1);

  let cy = y + headH + pad * 1.2 + topSpace;

  ctx.font = `${small}px ${FONT}`;
  ctx.fillStyle = '#2A3B44';
  for (const line of lines) {
    ctx.textAlign = 'center';
    ctx.fillText(line, x + w / 2, cy + small * 0.5);
    cy += small * 1.6;
  }

  if (rows.length) {
    cy += gap * 0.6;
    for (const [label, value, strong] of rows) {
      if (label === null) {
        // 구분선
        ctx.strokeStyle = 'rgba(26,26,26,0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + pad, cy + small * 0.5);
        ctx.lineTo(x + w - pad, cy + small * 0.5);
        ctx.stroke();
      } else {
        ctx.font = `${strong ? 'bold ' : ''}${small}px ${FONT}`;
        ctx.fillStyle = strong ? INK : '#2A3B44';
        ctx.textAlign = 'left';
        ctx.fillText(label, x + pad, cy + small * 0.5);
        ctx.textAlign = 'right';
        ctx.fillText(value, x + w - pad, cy + small * 0.5);
      }
      cy += small * 1.6;
    }
  }

  if (footer.length) {
    cy += gap * 0.4;
    ctx.font = `${small}px ${FONT}`;
    ctx.fillStyle = '#2A3B44';
    ctx.textAlign = 'center';
    for (const line of footer) {
      ctx.fillText(line, x + w / 2, cy + small * 0.5);
      cy += small * 1.6;
    }
  }

  const zones = [];
  if (items.length) {
    cy += gap;
    for (const [i, label] of items.entries()) {
      const iy = cy + i * (itemH + 10);
      const on = i === selected;
      chunkyBox(ctx, x + pad, iy, w - pad * 2, itemH, 12, on ? accent : PAPER, on ? 4 : 2);

      ctx.textAlign = 'center';
      ctx.font = `bold ${ui(17)}px ${FONT}`;
      if (on) {
        ctx.strokeStyle = INK;
        ctx.lineWidth = Math.max(3, fs * 0.15);
        ctx.strokeText(label, x + w / 2, iy + itemH / 2 + 1);
        ctx.fillStyle = '#FFFFFF';
      } else {
        ctx.fillStyle = '#2A3B44';
      }
      ctx.fillText(label, x + w / 2, iy + itemH / 2 + 1);

      zones.push({ x: x + pad, y: iy, w: w - pad * 2, h: itemH, id: `item${i}`, index: i });
    }
  }

  ctx.restore();

  // 호출한 쪽이 팝업 위에 별 같은 것을 정확히 얹을 수 있도록 상자 위치도 넘긴다
  zones.box = { x, y, w, h, headH, topSpace };
  return zones;
}

export const CREDITS = '기획 및 일러스트 KDH · 개발 KJW · ⓒ PEACHSOFT 2026';

export function drawCredits(ctx) {
  const fs = ui(12);
  ctx.save();
  ctx.font = `${fs}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(18,48,63,0.55)';
  ctx.lineWidth = 3;
  ctx.strokeText(CREDITS, viewport.cssW / 2, viewport.cssH - hudMargin() * 0.7);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillText(CREDITS, viewport.cssW / 2, viewport.cssH - hudMargin() * 0.7);
  ctx.restore();
}

// 나무 간판에 새긴 타이틀. 공원이 배경이라 나무 간판이 어울린다.
export function drawSign(ctx, text, centerY) {
  const { cssW } = viewport;
  const fs = Math.max(26, Math.min(cssW * 0.125, 76));

  ctx.save();
  ctx.font = `bold ${fs}px ${FONT}`;
  const textW = ctx.measureText(text).width;
  const w = Math.min(cssW * 0.9, textW + fs * 1.7);
  const h = fs * 1.95;
  const x = (cssW - w) / 2;
  const y = centerY - h / 2;

  // 기둥 두 개 — 판자 뒤에서 아래로 뻗는다
  const postW = Math.max(8, fs * 0.22);
  ctx.fillStyle = '#6B4420';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2.5, fs * 0.05);
  ctx.lineJoin = 'round';
  for (const px of [x + w * 0.22, x + w * 0.78 - postW]) {
    ctx.beginPath();
    ctx.rect(px, y + h * 0.4, postW, h * 1.5);
    ctx.fill();
    ctx.stroke();
  }

  // 그림자 — 스티커처럼 도톰하게
  ctx.fillStyle = 'rgba(26,26,26,0.45)';
  ctx.beginPath();
  ctx.roundRect(x + fs * 0.1, y + fs * 0.1, w, h, fs * 0.16);
  ctx.fill();

  // 판자
  ctx.fillStyle = '#A5702F';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, fs * 0.16);
  ctx.fill();
  ctx.stroke();

  // 나뭇결
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, fs * 0.16);
  ctx.clip();
  ctx.strokeStyle = 'rgba(90,55,20,0.4)';
  ctx.lineWidth = Math.max(1.5, fs * 0.035);
  for (let i = 1; i < 5; i++) {
    const gy = y + (h / 5) * i;
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.bezierCurveTo(x + w * 0.3, gy - h * 0.05, x + w * 0.7, gy + h * 0.05, x + w, gy);
    ctx.stroke();
  }
  ctx.restore();

  // 네 귀퉁이 못
  ctx.fillStyle = '#5A3714';
  for (const [bx, by] of [[0.055, 0.2], [0.945, 0.2], [0.055, 0.8], [0.945, 0.8]]) {
    ctx.beginPath();
    ctx.arc(x + w * bx, y + h * by, Math.max(2.5, fs * 0.07), 0, Math.PI * 2);
    ctx.fill();
  }

  // 글씨
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(4, fs * 0.15);
  ctx.strokeStyle = INK;
  ctx.strokeText(text, x + w / 2, y + h / 2 + fs * 0.04);
  ctx.fillStyle = '#FBF6EE';
  ctx.fillText(text, x + w / 2, y + h / 2 + fs * 0.04);

  ctx.restore();
  return { x, y, w, h };
}

// 글자가 maxW 를 넘으면 넘지 않을 만큼 줄인다
function fitted(ctx, text, px, maxW, weight) {
  if (!text) return px;
  ctx.font = `${weight}${px}px ${FONT}`;
  const w = ctx.measureText(text).width;
  return w > maxW && w > 0 ? px * (maxW / w) : px;
}

// scale 로 글자를 키운다. 인트로의 PRESS ENTER 처럼 눈에 확 띄어야 하는 곳에 쓴다.
//
// ui() 를 쓰지 않는다. ui() 는 화면 폭을 26으로 나눈 값을 상한으로 걸어서,
// 폰 세로에서는 제목도 본문 크기(15px)로 눌려버린다. 제목은 따로 잡는다.
export function drawCenterText(ctx, text, sub, yRatio = 0.5, alpha = 1, scale = 1) {
  const { cssW, cssH } = viewport;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  const cap = viewport.cssW / 16;
  const fs = fitted(
    ctx, text,
    Math.max(16, Math.min(34 * scale, cap * scale)),
    cssW * 0.88, 'bold ',
  );
  ctx.font = `bold ${fs}px ${FONT}`;
  ctx.strokeStyle = '#12303f';
  ctx.lineWidth = Math.max(4, fs * 0.16);
  ctx.strokeText(text, cssW / 2, cssH * yRatio);
  ctx.fillStyle = '#FBF6EE';
  ctx.fillText(text, cssW / 2, cssH * yRatio);

  if (sub) {
    const ss = fitted(
      ctx, sub,
      Math.max(12, Math.min(17 * scale, cap * 0.62 * scale)),
      cssW * 0.88, '',
    );
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
