import { test } from 'node:test';
import assert from 'node:assert/strict';

import { makeCtx, installDom } from './_canvas.js';
import { createDust, spawnDust, updateDust, drawDust } from '../src/dust.js';

installDom(844, 390);

const DT = 1 / 60;

test('착지하면 먼지가 피어오른다', () => {
  const d = createDust();
  assert.equal(d.length, 0);
  spawnDust(d, 500, 0, 1);
  assert.ok(d.length >= 10, `${d.length}개 뿐`);
});

test('세게 떨어질수록 많이 피어오른다', () => {
  const soft = createDust();
  const hard = createDust();
  spawnDust(soft, 0, 0, 0.25);
  spawnDust(hard, 0, 0, 1);
  assert.ok(hard.length > soft.length);
});

test('먼지는 양옆으로 갈라진다', () => {
  const d = createDust();
  spawnDust(d, 1000, 0, 1);
  assert.ok(d.some((p) => p.vx < 0), '왼쪽으로 튄 게 없다');
  assert.ok(d.some((p) => p.vx > 0), '오른쪽으로 튄 게 없다');
});

test('먼지는 땅속으로 꺼지지 않는다', () => {
  const d = createDust();
  spawnDust(d, 0, 0, 1);
  for (let i = 0; i < 60; i++) {
    updateDust(d, DT);
    for (const p of d) assert.ok(p.y <= 0.001, `땅 아래로 ${p.y.toFixed(1)}u 내려갔다`);
  }
});

test('먼지는 1초 안에 전부 사라진다', () => {
  const d = createDust();
  spawnDust(d, 0, 0, 1);
  for (let i = 0; i < 60; i++) updateDust(d, DT);
  assert.equal(d.length, 0, `${d.length}개가 남아 있다`);
});

// 연타로 점프하면 입자가 끝없이 쌓일 수 있다
test('아무리 많이 피워도 입자 수에 상한이 있다', () => {
  const d = createDust();
  for (let i = 0; i < 100; i++) spawnDust(d, i * 10, 0, 1);
  assert.ok(d.length <= 90, `${d.length}개까지 늘었다`);
});

test('좌표에 NaN 없이 그려진다', () => {
  const ctx = makeCtx();
  const d = createDust();
  spawnDust(d, 500, 0, 1);
  for (let i = 0; i < 30; i++) {
    updateDust(d, DT);
    assert.doesNotThrow(() => drawDust(ctx, d, (x) => x * 0.5, (y) => 300 + y * 0.5, 0.5));
  }
  // 빈 목록이어도 터지지 않는다
  assert.doesNotThrow(() => drawDust(ctx, [], (x) => x, (y) => y, 1));
});
