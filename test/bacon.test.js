import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createBacon, updateBacon, baconBox } from '../src/bacon.js';
import { BACON, JUMP_APEX, CATCHUP_FACTOR } from '../src/config.js';

const DT = 1 / 240; // 물리 검증이라 촘촘히 돌린다

// 점프해서 다시 땅에 닿을 때까지 돌리고, 도달한 최고점과 걸린 시간을 돌려준다
function simulateJump({ holdFor = 99, obstacles = [], desiredX = () => 0 } = {}) {
  const b = createBacon(0);
  let t = 0;
  let highest = 0;
  let pressed = true;

  for (let i = 0; i < 4000; i++) {
    updateBacon(b, DT, {
      desiredX: desiredX(t),
      obstacles,
      pressed,
      held: t < holdFor,
    });
    pressed = false;
    t += DT;
    highest = Math.min(highest, b.y);
    if (i > 2 && b.onGround) break;
  }
  return { bacon: b, apex: -(highest + BACON.h), airtime: t };
}

test('끝까지 누르면 설계대로 224u까지 오른다', () => {
  const { apex } = simulateJump();
  assert.ok(Math.abs(apex - JUMP_APEX) < 3, `${apex.toFixed(1)}u (${JUMP_APEX.toFixed(1)}u 기대)`);
});

test('체공 시간은 0.83초쯤', () => {
  const { airtime } = simulateJump();
  assert.ok(Math.abs(airtime - 0.83) < 0.03, `${airtime.toFixed(3)}초`);
});

test('버튼을 일찍 떼면 낮게 뛴다', () => {
  const full = simulateJump().apex;
  const tap = simulateJump({ holdFor: 0.09 }).apex;
  assert.ok(tap < full * 0.7, `짧게 탭 ${tap.toFixed(0)}u vs 끝까지 ${full.toFixed(0)}u`);
  assert.ok(tap > 60, `짧게 탭해도 ${tap.toFixed(0)}u는 너무 낮다 — 덤불(55u)도 못 넘는다`);
});

test('최소 홀드 시간 안에 떼도 점프는 깎이지 않는다', () => {
  const instant = simulateJump({ holdFor: 0 }).apex;
  assert.ok(instant > 60, `${instant.toFixed(0)}u`);
});

test('공중에서는 두 번 뛸 수 없다', () => {
  const b = createBacon(0);
  updateBacon(b, DT, { desiredX: 0, obstacles: [], pressed: true, held: true });
  const afterFirst = b.vy;
  assert.ok(afterFirst < 0, '첫 점프가 안 됐다');

  for (let i = 0; i < 30; i++) {
    updateBacon(b, DT, { desiredX: 0, obstacles: [], pressed: true, held: true });
    assert.ok(!b.onGround);
  }
  assert.ok(b.vy > afterFirst, '공중에서 다시 뛰어 속도가 초기화됐다');
});

test('장애물 위에 올라서면 그 위에서 멈춘다', () => {
  const obstacle = { x: 200, kind: 'brick', w: 45, h: 100 };
  const b = createBacon(0);
  let pressed = true;

  // 점프하면서 장애물 위로 이동시킨다
  for (let i = 0; i < 400; i++) {
    const t = i * DT;
    updateBacon(b, DT, {
      desiredX: Math.min(210, t * 700),
      obstacles: [obstacle],
      pressed,
      held: true,
    });
    pressed = false;
    if (b.onGround && b.x > 190) break;
  }

  assert.ok(b.onGround, '착지하지 못했다');
  assert.ok(
    Math.abs(b.y + BACON.h - -obstacle.h) < 0.5,
    `장애물 윗면(${-obstacle.h}) 대신 ${(b.y + BACON.h).toFixed(1)}에 섰다`,
  );
});

test('장애물 옆구리에 막히면 그 앞에서 멈춘다 — 통과하지 않는다', () => {
  const obstacle = { x: 200, kind: 'tree', w: 55, h: 135 };
  const b = createBacon(0);

  for (let i = 0; i < 600; i++) {
    updateBacon(b, DT, {
      desiredX: i * DT * 400, // 점프 없이 그냥 밀어붙인다
      obstacles: [obstacle],
      pressed: false,
      held: false,
    });
  }

  assert.ok(b.blocked, '막혔다고 표시되지 않았다');
  assert.ok(
    Math.abs(b.x - (obstacle.x - BACON.w)) < 0.5,
    `x가 ${b.x.toFixed(1)} — ${(obstacle.x - BACON.w).toFixed(1)}이어야 한다`,
  );
});

test('막힌 상태에서 뛰어넘으면 다시 나아간다', () => {
  const obstacle = { x: 200, kind: 'bush', w: 60, h: 55 };
  const b = createBacon(0);

  // 먼저 옆구리에 붙인다
  for (let i = 0; i < 300; i++) {
    updateBacon(b, DT, { desiredX: 400, obstacles: [obstacle], pressed: false, held: false });
  }
  assert.ok(b.blocked);

  // 붙은 채로 점프
  let pressed = true;
  for (let i = 0; i < 400; i++) {
    updateBacon(b, DT, { desiredX: 400, obstacles: [obstacle], pressed, held: i < 60 });
    pressed = false;
  }
  assert.ok(b.x > obstacle.x + obstacle.w, `여전히 x=${b.x.toFixed(0)}에 갇혀 있다`);
});

// 장애물에 끼어 뒤로 밀린 뒤 뛰어넘으면, 막힘이 풀리는 순간 desiredX까지
// 한 프레임에 순간이동하던 버그가 있었다. 제 발로 달려 따라붙어야 한다.
test('밀린 뒤 뛰어넘어도 제자리로 순간이동하지 않는다', () => {
  const speed = 300;
  const obstacle = { x: 400, kind: 'bush', w: 60, h: 55 };
  const b = createBacon(0);
  let desired = 0;

  // 점프 없이 밀어붙여 밀리게 둔다. 실제 게임에서는 화면 왼쪽 끝까지
  // 밀리면 죽으므로, 밀리는 거리는 시야 폭(900u) 언저리를 넘지 않는다.
  for (let i = 0; i < 480; i++) {
    desired += speed * DT;
    updateBacon(b, DT, { desiredX: desired, obstacles: [obstacle], pressed: false, held: false, speed });
  }
  assert.ok(b.blocked, '막히지 않았다');
  const behind = desired - b.x;
  assert.ok(behind > 200, `밀린 거리가 ${behind.toFixed(0)}u 뿐이라 검사가 무의미하다`);

  // 이제 뛰어넘는다. 따라붙는 데 걸리는 시간도 재둔다.
  let pressed = true;
  let maxStep = 0;
  let prev = b.x;
  let caughtUpAt = null;
  for (let i = 0; i < 2000; i++) {
    desired += speed * DT;
    updateBacon(b, DT, { desiredX: desired, obstacles: [obstacle], pressed, held: i < 120, speed });
    pressed = false;
    maxStep = Math.max(maxStep, b.x - prev);
    prev = b.x;
    if (caughtUpAt === null && desired - b.x < 1) caughtUpAt = i * DT;
  }

  const limit = speed * (1 + CATCHUP_FACTOR) * DT;
  assert.ok(maxStep <= limit + 0.001, `한 프레임에 ${maxStep.toFixed(1)}u 이동 (한계 ${limit.toFixed(1)}u)`);
  assert.ok(b.x > obstacle.x + obstacle.w, '장애물을 넘지 못했다');
  assert.ok(caughtUpAt !== null, `따라잡지 못했다 — 아직 ${(desired - b.x).toFixed(0)}u 뒤`);
  // 순간이동도 아니고 하세월도 아니어야 한다
  assert.ok(caughtUpAt > 0.5, `${caughtUpAt.toFixed(2)}초 만에 따라잡았다 — 너무 빠르다`);
  assert.ok(caughtUpAt < 6, `따라잡는 데 ${caughtUpAt.toFixed(1)}초나 걸렸다`);
});

test('막히지 않았을 때는 따라잡기 제한이 발목을 잡지 않는다', () => {
  const speed = 300;
  const b = createBacon(0);
  let desired = 0;
  for (let i = 0; i < 300; i++) {
    desired += speed * DT;
    updateBacon(b, DT, { desiredX: desired, obstacles: [], pressed: false, held: false, speed });
  }
  assert.ok(Math.abs(b.x - desired) < 0.001, `제자리에서 ${(desired - b.x).toFixed(2)}u 뒤처졌다`);
});

test('박스는 항상 유한한 값이다', () => {
  const { bacon } = simulateJump({ obstacles: [{ x: 50, kind: 'pipe', w: 50, h: 120 }] });
  for (const v of Object.values(baconBox(bacon))) assert.ok(Number.isFinite(v));
});
