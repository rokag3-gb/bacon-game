import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildStage } from '../src/stage.js';
import {
  STAGES,
  BACON,
  BAGOOM,
  START_CLEAR,
  END_CLEAR,
  BAGOOM_MIN_SEPARATION,
  OBSTACLE_GAP_FACTOR,
  BAGOOM_GAP_FACTOR,
} from '../src/config.js';
import { airDistance, canClear } from '../src/physics.js';

const SEEDS = [1, 7, 42, 1234, 99999, 2026];
const stageNos = STAGES.map((_, i) => i + 1);

function eachStage(fn) {
  for (const n of stageNos) for (const seed of SEEDS) fn(buildStage(n, seed), n, seed);
}

test('같은 시드는 같은 배치를 만든다', () => {
  for (const n of stageNos) {
    assert.deepEqual(buildStage(n, 12345), buildStage(n, 12345));
  }
});

test('다른 시드는 다른 배치를 만든다', () => {
  for (const n of stageNos) {
    const a = buildStage(n, 1);
    const b = buildStage(n, 2);
    assert.notDeepEqual(a.obstacles, b.obstacles);
  }
});

test('장애물과 바굼 개수가 수치 테이블과 같다', () => {
  eachStage((s, n) => {
    assert.equal(s.obstacles.length, STAGES[n - 1].obstacles, `스테이지 ${n} 장애물`);
    assert.equal(s.bagooms.length, STAGES[n - 1].bagooms, `스테이지 ${n} 바굼`);
  });
});

test('시작 구간과 팩맨 앞 구간은 비어 있다', () => {
  eachStage((s, n, seed) => {
    for (const o of s.obstacles) {
      assert.ok(o.x >= START_CLEAR, `스테이지 ${n}/${seed}: 장애물이 시작 구간에 있다`);
      assert.ok(o.x + o.w <= s.length - END_CLEAR, `스테이지 ${n}/${seed}: 장애물이 끝 구간에 있다`);
    }
    for (const b of s.bagooms) {
      assert.ok(b.x >= START_CLEAR, `스테이지 ${n}/${seed}: 바굼이 시작 구간에 있다`);
      assert.ok(b.x + BAGOOM.w <= s.length - END_CLEAR, `스테이지 ${n}/${seed}: 바굼이 끝 구간에 있다`);
    }
  });
});

test('장애물 사이 최소 간격을 지킨다 — 깰 수 없는 구간이 없다', () => {
  eachStage((s, n, seed) => {
    const minGap = airDistance(s.speed) * OBSTACLE_GAP_FACTOR;
    for (let i = 1; i < s.obstacles.length; i++) {
      const prev = s.obstacles[i - 1];
      const gap = s.obstacles[i].x - (prev.x + prev.w);
      assert.ok(
        gap >= minGap - 0.001,
        `스테이지 ${n}/${seed}: ${i}번 장애물 간격 ${gap.toFixed(1)}u < ${minGap.toFixed(1)}u`,
      );
    }
  });
});

test('바굼은 장애물에서 충분히 떨어져 있다', () => {
  eachStage((s, n, seed) => {
    const clearance = airDistance(s.speed) * BAGOOM_GAP_FACTOR;
    for (const b of s.bagooms) {
      for (const o of s.obstacles) {
        const gap = b.x > o.x ? b.x - (o.x + o.w) : o.x - (b.x + BAGOOM.w);
        assert.ok(
          gap >= clearance - 0.001,
          `스테이지 ${n}/${seed}: 바굼(${b.x.toFixed(0)})과 ${o.kind}(${o.x.toFixed(0)}) 간격 ${gap.toFixed(1)}u`,
        );
      }
    }
  });
});

test('바굼끼리 겹치지 않는다', () => {
  eachStage((s, n, seed) => {
    for (let i = 1; i < s.bagooms.length; i++) {
      const gap = s.bagooms[i].x - (s.bagooms[i - 1].x + BAGOOM.w);
      assert.ok(gap >= BAGOOM_MIN_SEPARATION - 0.001, `스테이지 ${n}/${seed}: 바굼 간격 ${gap.toFixed(1)}u`);
    }
  });
});

test('배치된 장애물은 전부 그 스테이지 속도로 넘을 수 있다', () => {
  eachStage((s, n, seed) => {
    for (const o of s.obstacles) {
      assert.ok(canClear(o.h, o.w, BACON.w, s.speed), `스테이지 ${n}/${seed}: ${o.kind}를 넘을 수 없다`);
    }
  });
});

test('장애물은 x 오름차순이다', () => {
  eachStage((s) => {
    for (let i = 1; i < s.obstacles.length; i++) {
      assert.ok(s.obstacles[i].x > s.obstacles[i - 1].x);
    }
  });
});

test('스테이지가 올라갈수록 장애물이 자주 나온다', () => {
  const density = stageNos.map((n) => {
    const s = buildStage(n, 777);
    return s.obstacles.length / s.length;
  });
  for (let i = 1; i < density.length; i++) {
    assert.ok(density[i] > density[i - 1], `스테이지 ${i + 1}의 빈도가 더 낮다`);
  }
});

test('없는 스테이지는 거부한다', () => {
  assert.throws(() => buildStage(0, 1));
  assert.throws(() => buildStage(6, 1));
});
