import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  jumpApex,
  airtime,
  timeAboveHeight,
  canClear,
  aabbOverlap,
  classifyBagoomHit,
} from '../src/physics.js';
import { BACON, BAGOOM, OBSTACLE_KINDS, STAGES } from '../src/config.js';

test('점프 최고점은 224u', () => {
  assert.ok(Math.abs(jumpApex() - 224) < 1, `실제 ${jumpApex()}`);
});

test('체공 시간은 0.83초', () => {
  assert.ok(Math.abs(airtime() - 0.83) < 0.01, `실제 ${airtime()}`);
});

test('최고점보다 높은 곳에는 머물 수 없다', () => {
  assert.equal(timeAboveHeight(jumpApex() + 1), 0);
});

test('낮은 장애물일수록 위에 머무는 시간이 길다', () => {
  assert.ok(timeAboveHeight(55) > timeAboveHeight(135));
});

// 설계의 핵심 근거. 오토러너에서는 스크롤이 느릴수록 체공 중 이동 거리가 짧아
// 오히려 넘기 어렵다. 그래서 최악 조건은 가장 큰 장애물 × 가장 느린 스테이지다.
test('모든 스테이지에서 모든 장애물을 넘을 수 있다', () => {
  for (const [i, stage] of STAGES.entries()) {
    for (const o of OBSTACLE_KINDS) {
      assert.ok(
        canClear(o.h, o.w, BACON.w, stage.speed),
        `스테이지 ${i + 1} (${stage.speed} u/s)에서 ${o.kind}(${o.w}×${o.h})를 넘을 수 없다`,
      );
    }
  }
});

// 오토러너에서는 느릴수록 체공 중 이동 거리가 짧아 넘기 어렵다.
// 그래서 최악 조건은 가장 큰 장애물 × 가장 느린 스테이지다.
test('제일 빡빡한 조합은 가장 느린 스테이지의 침엽수다', () => {
  const tree = OBSTACLE_KINDS.find((o) => o.kind === 'tree');
  const slowest = Math.min(...STAGES.map((s) => s.speed));
  const travel = timeAboveHeight(tree.h) * slowest;
  const need = tree.w + BACON.w;
  const margin = travel - need;

  assert.ok(margin > 0, `${travel.toFixed(1)}u 이동 vs ${need}u 필요 — 넘을 수 없다`);
  // 여유가 너무 크면 장애물이 시시하다는 뜻이다. 스테이지 1 속도를 300으로
  // 올리면서 56u까지 늘었다 — 나중에 장애물을 더 키울 여지가 이만큼 있다.
  assert.ok(margin < 120, `여유 ${margin.toFixed(0)}u — 장애물이 너무 시시하다`);
});

test('AABB 교차', () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  assert.ok(aabbOverlap(a, { x: 5, y: 5, w: 10, h: 10 }));
  assert.ok(!aabbOverlap(a, { x: 10, y: 0, w: 10, h: 10 }), '변이 닿기만 한 건 교차가 아니다');
  assert.ok(!aabbOverlap(a, { x: 0, y: 20, w: 10, h: 10 }));
});

test('밟기와 피격을 가른다', () => {
  const bagoom = { x: 100, y: 200, w: BAGOOM.w, h: BAGOOM.h };

  // 하강 중이고 발이 바굼 윗변 근처 → 밟기
  const stomping = { x: 100, y: 200 + BAGOOM.stompTolerance - BACON.h, w: BACON.w, h: BACON.h };
  assert.equal(classifyBagoomHit(stomping, bagoom, 300), 'stomp');

  // 같은 자리라도 상승 중이면 밟기가 아니다
  assert.equal(classifyBagoomHit(stomping, bagoom, -300), 'hit');

  // 옆에서 부딪히면 피격
  const sideways = { x: 100, y: 200, w: BACON.w, h: BACON.h };
  assert.equal(classifyBagoomHit(sideways, bagoom, 300), 'hit');

  // 안 닿으면 아무 일도 없다
  const away = { x: 500, y: 200, w: BACON.w, h: BACON.h };
  assert.equal(classifyBagoomHit(away, bagoom, 300), null);
});
