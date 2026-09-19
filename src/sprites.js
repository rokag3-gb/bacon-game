// 캐릭터와 장애물 그리기.
//
// 아이가 그린 image/ 의 그림을 캔버스 도형으로 옮긴 것이다. 모든 함수는
// 박스의 왼쪽 위 화면 좌표(px)와 scale(px/u)을 받아 그 안에 맞춰 그린다.

const INK = '#1A1A1A';

function outline(ctx, s) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, s * 2.2);
  ctx.lineJoin = 'round';
}

// ─── 베이컨 ─────────────────────────────────────────────
// 갈색 머리, 하얀 사각 얼굴에 점 눈 두 개와 미소, 검은 정장, 파란 넥타이.
export function drawBacon(ctx, px, py, s, { runPhase = 0, airborne = false, hurt = false } = {}) {
  const u = (n) => n * s;      // 유닛 → 픽셀
  const cx = px + u(23);       // 폭 46의 가운데

  ctx.save();
  if (hurt) ctx.globalAlpha = 0.45;
  outline(ctx, s);

  // 다리 — 달릴 때 번갈아 흔들고, 공중에서는 앞뒤로 벌린다
  const swing = airborne ? 1 : Math.sin(runPhase);
  const legTop = py + u(72);
  ctx.fillStyle = '#23232B';
  for (const [i, dir] of [[0, 1], [1, -1]]) {
    const off = u(7 * swing * dir);
    ctx.save();
    ctx.translate(cx + u(i === 0 ? -9 : 9), legTop);
    ctx.beginPath();
    ctx.roundRect(-u(5) + off * 0.35, 0, u(10), u(28), u(3));
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 정장 몸통
  ctx.fillStyle = '#23232B';
  ctx.beginPath();
  ctx.roundRect(px + u(4), py + u(34), u(38), u(40), u(4));
  ctx.fill();
  ctx.stroke();

  // 하얀 셔츠 깃 + 파란 넥타이
  ctx.fillStyle = '#F4F4F4';
  ctx.beginPath();
  ctx.moveTo(cx - u(7), py + u(34));
  ctx.lineTo(cx + u(7), py + u(34));
  ctx.lineTo(cx, py + u(52));
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#1447D6';
  ctx.beginPath();
  ctx.moveTo(cx - u(4), py + u(35));
  ctx.lineTo(cx + u(4), py + u(35));
  ctx.lineTo(cx + u(2), py + u(41));
  ctx.lineTo(cx + u(5), py + u(52));
  ctx.lineTo(cx, py + u(58));
  ctx.lineTo(cx - u(5), py + u(52));
  ctx.lineTo(cx - u(2), py + u(41));
  ctx.closePath();
  ctx.fill();

  // 팔 — 달릴 때 다리와 반대로
  ctx.fillStyle = '#23232B';
  for (const [i, dir] of [[0, -1], [1, 1]]) {
    const off = u(6 * swing * dir);
    ctx.beginPath();
    ctx.roundRect(px + (i === 0 ? u(-1) : u(38)), py + u(36) + off * 0.5, u(9), u(30), u(4));
    ctx.fill();
    ctx.stroke();
  }

  // 하얀 사각 얼굴
  ctx.fillStyle = '#FBF6EE';
  ctx.beginPath();
  ctx.roundRect(cx - u(14), py + u(6), u(28), u(30), u(4));
  ctx.fill();
  ctx.stroke();

  // 갈색 머리
  ctx.fillStyle = '#7A4A22';
  ctx.beginPath();
  ctx.roundRect(cx - u(15), py + u(1), u(30), u(10), u(4));
  ctx.fill();
  ctx.stroke();

  // 점 눈 두 개
  ctx.fillStyle = INK;
  ctx.fillRect(cx - u(7), py + u(15), Math.max(1, u(2.5)), u(7));
  ctx.fillRect(cx + u(4), py + u(15), Math.max(1, u(2.5)), u(7));

  // 미소
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, s * 1.8);
  ctx.beginPath();
  ctx.arc(cx, py + u(26), u(5), 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.restore();
}

// ─── 바굼 ───────────────────────────────────────────────
// 갈색 삼각 몸통에 큰 눈 두 개, 가는 다리와 동그란 발.
export function drawBagoom(ctx, px, py, s, { phase = 0, squashed = false, look = null } = {}) {
  const u = (n) => n * s;
  const cx = px + u(25);

  ctx.save();
  outline(ctx, s);

  if (squashed) {
    ctx.fillStyle = '#8B5A2B';
    ctx.beginPath();
    ctx.ellipse(cx, py + u(44), u(26), u(7), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  // 다리와 발 — 걸을 때 번갈아
  const swing = Math.sin(phase);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, s * 2.4);
  ctx.fillStyle = '#8B5A2B';
  for (const [i, dir] of [[0, 1], [1, -1]]) {
    const fx = cx + u(i === 0 ? -10 : 10) + u(3 * swing * dir);
    ctx.beginPath();
    ctx.moveTo(cx + u(i === 0 ? -4 : 4), py + u(34));
    ctx.lineTo(fx, py + u(44));
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(fx, py + u(46), u(7), u(4.5), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 삼각 몸통 (꼭대기가 둥글다)
  outline(ctx, s);
  ctx.fillStyle = '#8B5A2B';
  ctx.beginPath();
  ctx.moveTo(cx, py + u(1));
  ctx.quadraticCurveTo(cx + u(6), py + u(2), cx + u(23), py + u(33));
  ctx.quadraticCurveTo(cx, py + u(39), cx - u(23), py + u(33));
  ctx.quadraticCurveTo(cx - u(6), py + u(2), cx, py + u(1));
  ctx.fill();
  ctx.stroke();

  // 큰 눈 두 개. look 을 주면 눈동자가 그쪽을 본다 — 몸은 가만히 있고 눈만.
  const lx = look ? Math.max(-1, Math.min(1, look.x)) : 0.35;
  const ly = look ? Math.max(-1, Math.min(1, look.y)) : 0.25;
  for (const dx of [-8, 8]) {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(cx + u(dx), py + u(22), u(5.5), u(7), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(1, s * 1.6);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(cx + u(dx) + lx * u(2.4), py + u(22) + ly * u(3.2), u(2.6), u(3.6), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 찡그린 눈썹
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, s * 2);
  ctx.beginPath();
  ctx.moveTo(cx - u(13), py + u(12));
  ctx.lineTo(cx - u(4), py + u(16));
  ctx.moveTo(cx + u(13), py + u(12));
  ctx.lineTo(cx + u(4), py + u(16));
  ctx.stroke();

  ctx.restore();
}

// ─── 장애물 ─────────────────────────────────────────────
const OBSTACLE_PAINTERS = {
  // 초록 덤불
  bush(ctx, px, py, w, h, s) {
    ctx.fillStyle = '#2E8B3A';
    ctx.beginPath();
    ctx.arc(px + w * 0.27, py + h * 0.52, h * 0.48, 0, Math.PI * 2);
    ctx.arc(px + w * 0.58, py + h * 0.38, h * 0.52, 0, Math.PI * 2);
    ctx.arc(px + w * 0.82, py + h * 0.58, h * 0.42, 0, Math.PI * 2);
    ctx.rect(px, py + h * 0.5, w, h * 0.5);
    ctx.fill();
    ctx.stroke();
  },

  // 벽돌 기둥
  brick(ctx, px, py, w, h, s) {
    ctx.fillStyle = '#9C6B3F';
    ctx.beginPath();
    ctx.rect(px, py, w, h);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = Math.max(1, s * 1.4);
    const rows = 6;
    for (let i = 1; i < rows; i++) {
      const y = py + (h / rows) * i;
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(px + w, y);
      ctx.stroke();
      const x = px + (i % 2 ? w * 0.5 : w * 0.25);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - h / rows);
      ctx.stroke();
    }
  },

  // 토관 — 마리오식 초록 관. 입구 테두리가 몸통보다 넓다.
  pipe(ctx, px, py, w, h, s) {
    const lip = h * 0.2;
    const inset = w * 0.1;

    // 몸통
    ctx.fillStyle = '#2FA83C';
    ctx.beginPath();
    ctx.rect(px + inset, py + lip, w - inset * 2, h - lip);
    ctx.fill();
    ctx.stroke();

    // 몸통 하이라이트와 그늘로 둥근 느낌
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(px + inset + w * 0.08, py + lip, w * 0.16, h - lip);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(px + w - inset - w * 0.2, py + lip, w * 0.2, h - lip);

    // 입구 테두리 — 밟고 서기 좋게 평평하다
    ctx.fillStyle = '#35BF45';
    ctx.beginPath();
    ctx.rect(px, py, w, lip);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(px + w * 0.08, py + lip * 0.18, w * 0.14, lip * 0.64);

    // 관 속 어둠
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath();
    ctx.ellipse(px + w / 2, py + lip * 0.3, w * 0.34, lip * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  },

  // 주황 지붕을 인 갈색 기둥 — 아이 그림 background.jpg 에 있는 그것
  tower(ctx, px, py, w, h, s) {
    const roof = h * 0.34;
    ctx.fillStyle = '#8B5A2B';
    ctx.beginPath();
    ctx.rect(px + w * 0.08, py + roof, w * 0.84, h - roof);
    ctx.fill();
    ctx.stroke();

    // 지붕은 사다리꼴 — 뾰족하면 베이컨이 꼭짓점 위에 떠 있는 것처럼 보인다
    ctx.fillStyle = '#F58220';
    ctx.beginPath();
    ctx.moveTo(px + w * 0.2, py);
    ctx.lineTo(px + w * 0.8, py);
    ctx.lineTo(px + w * 1.06, py + roof);
    ctx.lineTo(px - w * 0.06, py + roof);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 옹이
    ctx.beginPath();
    ctx.lineWidth = Math.max(1, s * 1.4);
    ctx.arc(px + w / 2, py + roof + h * 0.22, w * 0.1, 0, Math.PI * 2);
    ctx.stroke();
  },

  // 침엽수 — 다듬어 놓은 정원수처럼 꼭대기가 평평하다.
  // 뾰족하면 베이컨이 밟고 섰을 때 꼭짓점 위에 떠 있는 것처럼 보인다.
  tree(ctx, px, py, w, h, s) {
    const trunk = h * 0.2;
    const cx = px + w / 2;

    ctx.fillStyle = '#8B5A2B';
    ctx.beginPath();
    ctx.rect(px + w * 0.36, py + h - trunk, w * 0.28, trunk);
    ctx.fill();
    ctx.stroke();

    // 아래 단부터 그려 위 단이 덮게 한다. [윗변 y, 아랫변 y, 윗변 폭, 아랫변 폭]
    const tiers = [
      [0.5, 0.84, 0.66, 1.0],
      [0.25, 0.6, 0.76, 0.9],
      [0.0, 0.34, 0.84, 0.82],
    ];
    ctx.fillStyle = '#2E8B3A';
    for (const [t, b, topW, botW] of tiers) {
      const ty = py + h * t;
      const by = py + h * b;
      ctx.beginPath();
      ctx.moveTo(cx - (w / 2) * topW, ty);
      ctx.lineTo(cx + (w / 2) * topW, ty);
      ctx.lineTo(cx + (w / 2) * botW, by);
      ctx.lineTo(cx - (w / 2) * botW, by);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  },
};

export function drawObstacle(ctx, kind, px, py, pw, ph, s) {
  ctx.save();
  outline(ctx, s);
  (OBSTACLE_PAINTERS[kind] || OBSTACLE_PAINTERS.brick)(ctx, px, py, pw, ph, s);
  ctx.restore();
}

// ─── 하트 ───────────────────────────────────────────────
export function drawHeart(ctx, cx, cy, r, filled) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.85);
  ctx.bezierCurveTo(cx - r * 1.5, cy - r * 0.3, cx - r * 0.5, cy - r * 1.1, cx, cy - r * 0.35);
  ctx.bezierCurveTo(cx + r * 0.5, cy - r * 1.1, cx + r * 1.5, cy - r * 0.3, cx, cy + r * 0.85);
  ctx.closePath();
  ctx.fillStyle = filled ? '#FF4D5E' : 'rgba(255,255,255,0.28)';
  ctx.fill();
  ctx.strokeStyle = filled ? '#8E1622' : 'rgba(0,0,0,0.35)';
  ctx.lineWidth = Math.max(1.2, r * 0.18);
  ctx.stroke();
  ctx.restore();
}

// ─── 팩맨 ───────────────────────────────────────────────
// 스테이지 끝 벽에 붙어 왼쪽으로 입을 벌리고 있다.
export function drawPacman(ctx, px, py, size, s, { chomp = 0 } = {}) {
  const r = size / 2;
  const cx = px + r;
  const cy = py + r;
  const open = 0.18 + 0.14 * (0.5 + 0.5 * Math.sin(chomp));

  ctx.save();
  outline(ctx, s);
  ctx.fillStyle = '#FFD836';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, Math.PI + open * Math.PI, Math.PI - open * Math.PI, false);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.fillRect(cx - r * 0.1, cy - r * 0.62, Math.max(1, s * 3), r * 0.26);
  ctx.fillRect(cx + r * 0.22, cy - r * 0.62, Math.max(1, s * 3), r * 0.26);
  ctx.restore();
}
