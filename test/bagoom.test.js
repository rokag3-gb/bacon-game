// 바굼의 세로 움직임 — 장애물 위에서 시작해 서성이다 떨어지는 과정.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildStage, bagoomX } from '../src/stage.js';
import { createBagoomStates, updateBagooms, bagoomBox } from '../src/bagoom.js';
import { BAGOOM, STAGES } from '../src/config.js';

const DT = 1 / 60;

function run(stage, states, seconds) {
  for (let i = 0, n = Math.round(seconds / DT); i < n; i++) {
    updateBagooms(stage, states, i * DT, DT, stage.obstacles, new Set());
  }
}

test('처음 상태는 배치가 정해준 높이 그대로다', () => {
  const stage = buildStage(3, 20260926);
  const states = createBagoomStates(stage);
  for (const [i, g] of stage.bagooms.entries()) {
    assert.equal(states[i].y, g.startY);
  }
  assert.ok(stage.bagooms.some((g) => g.perch), '장애물 위 바굼이 하나도 없다');
});

test('바굼은 땅속으로 꺼지지 않는다', () => {
  for (let n = 1; n <= 5; n++) {
    const stage = buildStage(n, 77 + n);
    const states = createBagoomStates(stage);
    for (let i = 0; i < 600; i++) {
      updateBagooms(stage, states, i * DT, DT, stage.obstacles, new Set());
      for (const st of states) {
        assert.ok(st.y + BAGOOM.h <= 0.5, `스테이지 ${n}: 땅 아래로 ${(st.y + BAGOOM.h).toFixed(1)}u`);
        assert.ok(Number.isFinite(st.x) && Number.isFinite(st.y));
      }
    }
  }
});

test('잔디밭 바굼은 계속 지면에 붙어 있다', () => {
  const stage = buildStage(1, 4242); // 스테이지 1은 전부 잔디밭
  const states = createBagoomStates(stage);
  run(stage, states, 12);
  for (const st of states) {
    assert.ok(Math.abs(st.y + BAGOOM.h) < 0.5, `지면(0)이 아니라 ${(st.y + BAGOOM.h).toFixed(1)}에 있다`);
  }
});

// 장애물 위 바굼은 서성이다 가장자리를 넘으면 떨어져 잔디밭에서 걷는다
test('장애물 위 바굼은 결국 떨어져 지면에 내려선다', () => {
  let tested = 0;
  for (let n = 2; n <= 5; n++) {
    for (const seed of [1, 9, 77]) {
      const stage = buildStage(n, seed);
      const states = createBagoomStates(stage);
      const perched = stage.bagooms
        .map((g, i) => (g.perch ? i : -1))
        .filter((i) => i >= 0);
      if (!perched.length) continue;

      const startedHigh = perched.filter((i) => states[i].y + BAGOOM.h < -1);
      assert.ok(startedHigh.length, `스테이지 ${n}/${seed}: 위에서 시작한 바굼이 없다`);

      run(stage, states, 40); // 넉넉히 기다린다
      const landed = startedHigh.filter((i) => Math.abs(states[i].y + BAGOOM.h) < 0.5);
      assert.ok(
        landed.length >= startedHigh.length * 0.7,
        `스테이지 ${n}/${seed}: ${startedHigh.length}마리 중 ${landed.length}마리만 내려왔다`,
      );
      tested++;
    }
  }
  assert.ok(tested >= 8, `검사한 경우가 ${tested}개 뿐`);
});

test('지면을 걷는 바굼이 장애물 안으로 파고들지 않는다', () => {
  for (let n = 2; n <= 5; n++) {
    const stage = buildStage(n, 555);
    const states = createBagoomStates(stage);
    for (let i = 0; i < 1800; i++) {
      updateBagooms(stage, states, i * DT, DT, stage.obstacles, new Set());
      for (const st of states) {
        if (st.y + BAGOOM.h < -0.5) continue; // 아직 공중이거나 장애물 위
        for (const o of stage.obstacles) {
          const overlap = st.x + BAGOOM.w > o.x + 0.5 && st.x < o.x + o.w - 0.5;
          assert.ok(!overlap, `스테이지 ${n}: 바굼이 ${o.kind} 안에 들어갔다`);
        }
      }
    }
  }
});

test('잡힌 바굼은 더 이상 움직이지 않는다', () => {
  const stage = buildStage(3, 31);
  const states = createBagoomStates(stage);
  const dead = new Set([0]);
  const before = { ...states[0] };
  for (let i = 0; i < 300; i++) {
    updateBagooms(stage, states, i * DT, DT, stage.obstacles, dead);
  }
  assert.deepEqual({ ...states[0] }, before);
});

test('박스는 서성이는 지금 자리를 돌려준다', () => {
  const stage = buildStage(2, 8);
  const states = createBagoomStates(stage);
  run(stage, states, 3);
  const box = bagoomBox(states, 0);
  assert.equal(box.w, BAGOOM.w);
  assert.equal(box.h, BAGOOM.h);
  assert.equal(box.x, states[0].x);
  assert.ok(Number.isFinite(bagoomX(stage.bagooms[0], 3)));
  assert.equal(STAGES.length, 5);
});
