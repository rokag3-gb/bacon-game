// 스테이지 배치 생성.
//
// 스테이지 시작 화면에서 딱 한 번 호출하고, 그 결과는 플레이 내내 바뀌지 않는다.
// 죽어서 되돌아가도, 목숨을 다 써서 스테이지를 처음부터 다시 해도 배치가 같아야
// 하기 때문이다. 그래서 시드를 받아 결정적으로 만든다.

import {
  STAGES,
  OBSTACLE_KINDS,
  BACON,
  BAGOOM,
  CHECKPOINT_BACK_SECONDS,
  RESPAWN_CLEARANCE,
  START_CLEAR,
  END_CLEAR,
  OBSTACLE_GAP_FACTOR,
  BAGOOM_GAP_FACTOR,
  BAGOOM_SEPARATION_FACTOR,
} from './config.js';
import { mulberry32, pick } from './rng.js';
import { airDistance } from './physics.js';

// 합이 total이 되는 n개의 랜덤 양수. 장애물 사이 여유 공간을 나눠 담는 데 쓴다.
function splitRandomly(rand, total, n) {
  const weights = Array.from({ length: n }, () => rand() + 0.05);
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => (w / sum) * total);
}

function placeObstacles(rand, count, usableStart, usableLength, minGap) {
  const kinds = Array.from({ length: count }, () => pick(rand, OBSTACLE_KINDS));

  // 최소로 필요한 폭: 장애물 폭 전부 + 사이사이 최소 간격
  const sumWidths = kinds.reduce((a, k) => a + k.w, 0);
  const minSpan = sumWidths + (count - 1) * minGap;
  const slack = usableLength - minSpan;
  if (slack < 0) {
    throw new Error(
      `스테이지 배치 불가: 최소 ${Math.ceil(minSpan)}u 필요한데 ${usableLength}u 뿐`,
    );
  }

  // 남는 공간을 앞 / 사이 / 뒤로 무작위 분배한다
  const extra = splitRandomly(rand, slack, count + 1);

  const obstacles = [];
  let x = usableStart + extra[0];
  for (let i = 0; i < count; i++) {
    obstacles.push({ x, kind: kinds[i].kind, w: kinds[i].w, h: kinds[i].h });
    x += kinds[i].w + minGap + extra[i + 1];
  }
  return obstacles;
}

// 장애물 사이의 빈 구간을 모아 바굼을 놓는다.
function placeBagooms(rand, count, usableStart, usableEnd, obstacles, clearance, separation) {
  // 장애물 좌우로 clearance만큼 물러난 구간이 바굼이 설 수 있는 자리다
  let intervals = [];
  let cursor = usableStart;
  for (const o of obstacles) {
    const lo = cursor;
    const hi = o.x - clearance - BAGOOM.w;
    if (hi > lo) intervals.push([lo, hi]);
    cursor = o.x + o.w + clearance;
  }
  if (usableEnd > cursor) intervals.push([cursor, usableEnd - BAGOOM.w]);
  intervals = intervals.filter(([lo, hi]) => hi > lo);

  const bagooms = [];
  for (let i = 0; i < count; i++) {
    const total = intervals.reduce((a, [lo, hi]) => a + (hi - lo), 0);
    if (total <= 0) break; // 자리가 없으면 그만. 개수 부족은 테스트가 잡는다.

    // 넓은 구간일수록 자주 뽑히도록 길이로 가중치를 준다
    let t = rand() * total;
    let idx = 0;
    for (; idx < intervals.length; idx++) {
      const len = intervals[idx][1] - intervals[idx][0];
      if (t < len) break;
      t -= len;
    }
    const [lo, hi] = intervals[idx];
    const x = lo + t;
    bagooms.push({ x, patrol: 40 + rand() * 60 });

    // 쓴 자리를 구간에서 파내 바굼끼리 겹치지 않게 한다.
    // 왼쪽은 새 바굼의 오른쪽 변이 기준이므로 바굼 폭만큼 더 물러나야 한다.
    const cutLo = x - separation - BAGOOM.w;
    const cutHi = x + BAGOOM.w + separation;
    const rest = [];
    if (cutLo > lo) rest.push([lo, cutLo]);
    if (hi > cutHi) rest.push([cutHi, hi]);
    intervals.splice(idx, 1, ...rest);
  }

  bagooms.sort((a, b) => a.x - b.x);
  return bagooms;
}

// 죽었을 때 되돌아갈 거리. 스테이지마다 스크롤 속도가 달라도 되감기는
// 시간이 같도록 거리가 아니라 초로 잡는다.
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

  for (let guard = 0; guard < 200 && x > 0; guard++) {
    let moved = false;
    const backOff = (objX, objW) => {
      if (x + BACON.w + RESPAWN_CLEARANCE > objX && x < objX + objW + RESPAWN_CLEARANCE) {
        x = objX - BACON.w - RESPAWN_CLEARANCE;
        moved = true;
      }
    };
    for (const o of stage.obstacles) backOff(o.x, o.w);
    for (const g of stage.bagooms) backOff(g.x, BAGOOM.w);
    if (!moved) break;
  }

  return Math.max(0, x);
}

/**
 * 스테이지 하나의 배치를 확정한다.
 * @param {number} stageNo 1부터 시작
 * @param {number} seed
 */
export function buildStage(stageNo, seed) {
  const cfg = STAGES[stageNo - 1];
  if (!cfg) throw new Error(`없는 스테이지: ${stageNo}`);

  const rand = mulberry32(seed);
  const air = airDistance(cfg.speed);
  const minGap = air * OBSTACLE_GAP_FACTOR;
  const clearance = air * BAGOOM_GAP_FACTOR;

  const usableStart = START_CLEAR;
  const usableEnd = cfg.length - END_CLEAR;
  const usableLength = usableEnd - usableStart;

  const obstacles = placeObstacles(rand, cfg.obstacles, usableStart, usableLength, minGap);
  const separation = air * BAGOOM_SEPARATION_FACTOR;
  const bagooms = placeBagooms(rand, cfg.bagooms, usableStart, usableEnd, obstacles, clearance, separation);

  return {
    stageNo,
    seed,
    speed: cfg.speed,
    length: cfg.length,
    minGap,
    obstacles,
    bagooms,
  };
}
