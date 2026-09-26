// 스테이지 배치 생성.
//
// 스테이지 시작 화면에서 딱 한 번 호출하고, 그 결과는 플레이 내내 바뀌지 않는다.
// 죽어서 되돌아가도, 목숨을 다 써서 스테이지를 처음부터 다시 해도 배치가 같아야
// 하기 때문이다. 그래서 시드를 받아 결정적으로 만든다.

import {
  STAGES,
  OBSTACLE_KINDS,
  OBSTACLE_CLUSTER,
  BACON,
  BAGOOM,
  BAGOOM_CLUSTER,
  BAGOOM_PERCH,
  BAGOOM_WANDER_PER_STAGE,
  CHECKPOINT_BACK_SECONDS,
  RESPAWN_CLEARANCE,
  START_CLEAR,
  END_CLEAR,
  OBSTACLE_GAP_FACTOR,
  BAGOOM_GAP_FACTOR,
  BAGOOM_SEPARATION_FACTOR,
  BAGOOM_WANDER,
} from './config.js';
import { mulberry32, pick } from './rng.js';
import { airDistance, timeAboveHeight } from './physics.js';

// ─── 여유 공간 나누기 ───────────────────────────────────
//
// 그냥 균등 난수로 나누면 장애물이 일정한 박자로 온다 — 변동계수가 15%쯤
// 밖에 안 돼서 사람 눈에는 규칙적으로 보인다. 대신 리듬을 만든다.
// 촘촘한 무리 → 숨 돌릴 틈 → 평범한 간격 몇 개를 반복한다.
function rhythmWeights(rand, n) {
  const w = [];
  const push = (v) => { if (w.length < n) w.push(v); };

  while (w.length < n) {
    for (let i = 0, burst = 2 + Math.floor(rand() * 3); i < burst; i++) push(0.10 + rand() * 0.25);
    push(1.8 + rand() * 2.6);
    for (let i = 0, calm = 1 + Math.floor(rand() * 2); i < calm; i++) push(0.7 + rand() * 0.8);
  }

  // 항상 무리로 시작하면 그것대로 규칙적이므로 시작 지점을 돌린다
  const shift = Math.floor(rand() * n);
  return w.map((_, i) => w[(i + shift) % n]);
}

function splitRandomly(rand, total, n) {
  const weights = rhythmWeights(rand, n);
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => (w / sum) * total);
}

// ─── 장애물 무리 ────────────────────────────────────────

// 붙어 있는 무리는 한 번의 점프로 통째로 넘어야 한다. 제일 높은 놈 위에
// 머무는 동안 무리 전체 폭 + 베이컨 폭만큼 나아갈 수 있어야 한다.
function clusterFits(parts, width, speed) {
  const maxH = Math.max(...parts.map((p) => p.h));
  return timeAboveHeight(maxH) * speed > width + BACON.w + OBSTACLE_CLUSTER.margin;
}

// 무리를 지을 때는 낮은 장애물을 더 자주 고른다. 안 그러면 대부분 퇴짜를 맞아
// 무리가 거의 안 생긴다.
function pickKind(rand, preferShort) {
  if (!preferShort || rand() > OBSTACLE_CLUSTER.shortBias) return pick(rand, OBSTACLE_KINDS);
  const short = OBSTACLE_KINDS.filter((o) => o.h <= 110);
  return pick(rand, short.length ? short : OBSTACLE_KINDS);
}

function buildCluster(rand, size, speed) {
  const parts = [];
  let w = 0;
  for (let i = 0; i < size; i++) {
    const k = pickKind(rand, size > 1);
    parts.push({ kind: k.kind, w: k.w, h: k.h, dx: w });
    w += k.w + (i < size - 1 ? OBSTACLE_CLUSTER.gap : 0);
  }
  return size === 1 || clusterFits(parts, w, speed) ? { parts, w } : null;
}

// 장애물 count 개를 무리로 묶는다. 넘을 수 없는 무리는 크기를 줄여 다시 만든다.
// 느린 스테이지에서는 체공 중 이동 거리가 짧아 큰 무리가 거의 다 퇴짜를 맞고,
// 빠른 스테이지에서는 통과한다 — 무리 크기가 난이도를 따라 저절로 커진다.
function makeGroups(rand, count, speed) {
  const groups = [];
  let left = count;

  while (left > 0) {
    const r = rand();
    let want = 1;
    if (left >= 3 && r < OBSTACLE_CLUSTER.tripleChance) want = 3;
    else if (left >= 2 && r < OBSTACLE_CLUSTER.tripleChance + OBSTACLE_CLUSTER.pairChance) want = 2;

    let g = null;
    for (let size = want; size >= 1 && !g; size--) g = buildCluster(rand, size, speed);
    groups.push(g);
    left -= g.parts.length;
  }
  return groups;
}

// ─── 배치 ───────────────────────────────────────────────

/**
 * @param {object} wide  바굼이 들어갈 넓은 틈 — { count, extra }
 *   리듬을 주면 대부분의 틈이 최소 간격에 붙어 바굼이 설 자리가 없어진다.
 *   그래서 바굼 수만큼의 틈에 필요한 여유를 먼저 떼어 놓고, 남은 여유로만
 *   리듬을 만든다. 넓은 틈은 스테이지 전체에 고르게 흩어 놓는다.
 */
function placeGroups(rand, groups, usableStart, usableLength, minGap, wide) {
  const sumWidths = groups.reduce((a, g) => a + g.w, 0);
  const minSpan = sumWidths + (groups.length - 1) * minGap;
  const slack = usableLength - minSpan;
  if (slack < 0) {
    throw new Error(`스테이지 배치 불가: 최소 ${Math.ceil(minSpan)}u 필요한데 ${usableLength}u 뿐`);
  }

  const gaps = groups.length + 1;

  // 바굼 자리부터 확보한다. 여유의 60%를 넘겨 쓰지는 않는다.
  const reserved = new Array(gaps).fill(0);
  let reservedTotal = 0;
  if (wide && wide.count > 0 && wide.extra > 0) {
    const per = Math.min(slack * 0.6, wide.count * wide.extra) / wide.count;
    for (let i = 0; i < wide.count; i++) {
      const base = ((i + 0.5) * gaps) / wide.count;
      const jitter = (rand() - 0.5) * (gaps / wide.count);
      reserved[Math.max(0, Math.min(gaps - 1, Math.floor(base + jitter)))] += per;
    }
    reservedTotal = reserved.reduce((a, b) => a + b, 0);
  }

  const rhythm = splitRandomly(rand, slack - reservedTotal, gaps);

  const placed = [];
  const obstacles = [];
  let x = usableStart + rhythm[0] + reserved[0];
  for (const [i, g] of groups.entries()) {
    placed.push({ x, w: g.w, size: g.parts.length });
    for (const p of g.parts) obstacles.push({ x: x + p.dx, kind: p.kind, w: p.w, h: p.h, group: i });
    x += g.w + minGap + rhythm[i + 1] + reserved[i + 1];
  }
  return { obstacles, placed };
}

// 무리 사이의 빈 구간을 모아 바굼을 놓는다. 스테이지 3부터는 바굼도 가끔
// 2~3마리씩 붙어 나온다.
function wanderOf(rand, mul, range = BAGOOM_WANDER) {
  return {
    amp: range.minAmp + rand() * (range.maxAmp - range.minAmp),
    rate: (BAGOOM_WANDER.minRate + rand() * (BAGOOM_WANDER.maxRate - BAGOOM_WANDER.minRate)) * mul,
    phase: rand() * Math.PI * 2,
    phase2: rand() * Math.PI * 2,
  };
}

// 바굼 몇 마리를 낮은 장애물 위에 올려 놓는다. 전부가 아니라 일부만이다.
// 서성이다 가장자리를 넘으면 떨어져 그때부터 잔디밭에서 걷는다.
function perchBagooms(rand, want, obstacles, groupSizes, mul) {
  if (want <= 0) return [];
  const eligible = obstacles.filter(
    (o) => o.h <= BAGOOM_PERCH.maxHeight && groupSizes[o.group] === 1,
  );
  const perched = [];
  for (let i = 0; i < want && eligible.length; i++) {
    const [o] = eligible.splice(Math.floor(rand() * eligible.length), 1);
    perched.push({
      x: o.x + (o.w - BAGOOM.w) / 2,
      startY: -o.h - BAGOOM.h,
      perch: true,
      cluster: 1,
      group: -1 - i,
      ...wanderOf(rand, mul, BAGOOM_PERCH),
    });
  }
  return perched;
}

function placeBagooms(rand, count, usableStart, usableEnd, placed, clearance, separation, clusters, mul) {
  const widest = BAGOOM.w * 3 + BAGOOM_CLUSTER.gap * 2;

  let intervals = [];
  let cursor = usableStart;
  for (const g of placed) {
    if (g.x - clearance > cursor) intervals.push([cursor, g.x - clearance]);
    cursor = g.x + g.w + clearance;
  }
  if (usableEnd > cursor) intervals.push([cursor, usableEnd]);

  const bagooms = [];
  let groupId = 0;
  while (bagooms.length < count) {
    const remaining = count - bagooms.length;

    let want = 1;
    if (clusters && remaining >= 2 && rand() < BAGOOM_CLUSTER.chance) {
      want = remaining >= 3 && rand() < BAGOOM_CLUSTER.tripleShare ? 3 : 2;
    }

    // 원하는 마리 수가 안 들어가면 줄인다
    let size = 0;
    let width = 0;
    let idx = -1;
    for (let n = want; n >= 1; n--) {
      const w = n * BAGOOM.w + (n - 1) * BAGOOM_CLUSTER.gap;
      const fits = intervals.filter(([lo, hi]) => hi - lo >= w);
      if (!fits.length) continue;

      // 넓은 구간일수록 자주 뽑히도록 남는 길이로 가중치를 준다
      let t = rand() * fits.reduce((a, [lo, hi]) => a + (hi - lo - w), 0);
      let chosen = fits[fits.length - 1];
      for (const iv of fits) {
        const room = iv[1] - iv[0] - w;
        if (t < room) { chosen = iv; break; }
        t -= room;
      }
      size = n;
      width = w;
      idx = intervals.indexOf(chosen);
      break;
    }
    if (idx < 0) break; // 자리가 없으면 그만. 개수 부족은 buildStage 가 다시 뽑는다.

    const [lo, hi] = intervals[idx];
    const x = lo + rand() * (hi - lo - width);

    // 한 무리는 같은 박자로 함께 서성인다 — 따로 놀면 서로 겹친다
    const wander = wanderOf(rand, mul);
    for (let i = 0; i < size; i++) {
      bagooms.push({
        x: x + i * (BAGOOM.w + BAGOOM_CLUSTER.gap),
        startY: -BAGOOM.h,
        perch: false,
        ...wander,
        cluster: size,
        group: groupId,
      });
    }
    groupId++;

    // 쓴 자리를 파낸다. 왼쪽은 다음 무리가 제일 클 수 있으므로 그만큼 더 물러난다.
    const rest = [];
    if (x - separation - widest > lo) rest.push([lo, x - separation - widest]);
    if (hi > x + width + separation) rest.push([x + width + separation, hi]);
    intervals.splice(idx, 1, ...rest);
  }

  bagooms.sort((a, b) => a.x - b.x);
  return bagooms;
}

// ─── 부활 ───────────────────────────────────────────────

export function checkpointBack(stage, seconds = CHECKPOINT_BACK_SECONDS) {
  return stage.speed * seconds;
}

/**
 * 죽은 자리에서 물러나 다시 시작할 x.
 * 그 자리가 장애물이나 바굼과 겹치면 겹치지 않을 때까지 더 물러난다.
 * 스테이지 시작 1,500u는 항상 비어 있으므로 0까지 가면 반드시 안전하다.
 */
export function safeRespawnX(stage, deathX, seconds = CHECKPOINT_BACK_SECONDS) {
  let x = Math.max(0, deathX - checkpointBack(stage, seconds));

  for (let guard = 0; guard < 300 && x > 0; guard++) {
    let moved = false;
    const backOff = (objX, objW) => {
      if (x + BACON.w + RESPAWN_CLEARANCE > objX && x < objX + objW + RESPAWN_CLEARANCE) {
        x = objX - BACON.w - RESPAWN_CLEARANCE;
        moved = true;
      }
    };
    for (const o of stage.obstacles) backOff(o.x, o.w);
    for (const g of stage.bagooms) {
      backOff(g.x - BAGOOM_WANDER.maxAmp, BAGOOM.w + BAGOOM_WANDER.maxAmp * 2);
    }
    if (!moved) break;
  }

  return Math.max(0, x);
}

// 바굼이 지금 있는 자리. 주기가 어긋난 사인파 둘을 겹쳐 규칙적으로 보이지 않게 한다.
// 그리기와 충돌이 같은 값을 써야 하므로 여기 한 곳에서만 계산한다.
export function bagoomX(g, t) {
  const wobble = Math.sin(t * g.rate + g.phase) + 0.6 * Math.sin(t * g.rate * 1.7 + g.phase2);
  return g.x + (g.amp * wobble) / 1.6;
}

// ─── 스테이지 만들기 ────────────────────────────────────

/**
 * 스테이지 하나의 배치를 확정한다.
 * @param {number} stageNo 1부터 시작
 * @param {number} seed
 */
export function buildStage(stageNo, seed) {
  const cfg = STAGES[stageNo - 1];
  if (!cfg) throw new Error(`없는 스테이지: ${stageNo}`);

  // 간격에 리듬을 주다 보면 아주 드물게 바굼이 한 마리 덜 들어간다.
  // 그럴 때는 시드를 정해진 방식으로 비틀어 다시 뽑는다 — 같은 시드를 주면
  // 여전히 같은 배치가 나오므로 "죽어도 배치가 같다"는 성질은 그대로다.
  let best = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    const stage = attemptStage(stageNo, cfg, (seed + attempt * 0x9e3779b9) >>> 0, seed);
    if (stage.bagooms.length === cfg.bagooms && stage.obstacles.length === cfg.obstacles) return stage;
    if (!best || stage.bagooms.length > best.bagooms.length) best = stage;
  }
  return best;
}

function attemptStage(stageNo, cfg, mixedSeed, seed) {
  const rand = mulberry32(mixedSeed);
  const air = airDistance(cfg.speed);
  const minGap = air * OBSTACLE_GAP_FACTOR;

  // 바굼이 서성이다 장애물에 닿지 않도록 여유에 흔들림 폭을 더해 잡는다
  const clearance = air * BAGOOM_GAP_FACTOR + BAGOOM_WANDER.maxAmp;
  const separation = air * BAGOOM_SEPARATION_FACTOR + BAGOOM_WANDER.maxAmp * 2;
  const clusters = stageNo >= BAGOOM_CLUSTER.fromStage;

  const usableStart = START_CLEAR;
  const usableEnd = cfg.length - END_CLEAR;

  const groups = makeGroups(rand, cfg.obstacles, cfg.speed);

  // 바굼 한 무리가 서려면 이만큼의 틈이 필요하다
  const widest = clusters ? BAGOOM.w * 3 + BAGOOM_CLUSTER.gap * 2 : BAGOOM.w;
  const lawnCount = cfg.bagooms - (stageNo >= BAGOOM_PERCH.fromStage
    ? Math.round(cfg.bagooms * BAGOOM_PERCH.share) : 0);
  const wide = { count: lawnCount, extra: Math.max(0, clearance * 2 + widest - minGap) };

  const { obstacles, placed } = placeGroups(
    rand, groups, usableStart, usableEnd - usableStart, minGap, wide,
  );

  // 일부는 낮은 장애물 위에서 시작한다. 나머지는 잔디밭에.
  const wanderMul = 1 + (stageNo - 1) * BAGOOM_WANDER_PER_STAGE;
  const perchWant = stageNo >= BAGOOM_PERCH.fromStage
    ? Math.round(cfg.bagooms * BAGOOM_PERCH.share)
    : 0;
  const groupSizes = placed.map((g) => g.size);
  const perched = perchBagooms(rand, perchWant, obstacles, groupSizes, wanderMul);

  const onLawn = placeBagooms(
    rand, cfg.bagooms - perched.length, usableStart, usableEnd,
    placed, clearance, separation, clusters, wanderMul,
  );
  const bagooms = [...perched, ...onLawn].sort((a, b) => a.x - b.x);

  return {
    stageNo,
    seed,
    speed: cfg.speed,
    length: cfg.length,
    minGap,
    groups: placed,
    obstacles,
    bagooms,
  };
}
