import { test } from 'node:test';
import assert from 'node:assert/strict';

import { stageScore, stars } from '../src/score.js';

test('점수 내역을 더한다', () => {
  const s = stageScore({ bagoomsDefeated: 3, livesLeft: 2 });
  assert.equal(s.bagoom, 300);
  assert.equal(s.arrival, 500);
  assert.equal(s.lives, 400);
  assert.equal(s.total, 1200);
});

test('바굼을 하나도 안 잡아도 도착 보너스는 들어온다', () => {
  const s = stageScore({ bagoomsDefeated: 0, livesLeft: 1 });
  assert.equal(s.total, 700);
});

test('별은 남은 목숨만큼', () => {
  assert.equal(stars(3), 3);
  assert.equal(stars(2), 2);
  assert.equal(stars(1), 1);
});

test('별은 0개 아래로도 3개 위로도 안 간다', () => {
  assert.equal(stars(0), 0);
  assert.equal(stars(-1), 0);
  assert.equal(stars(99), 3);
});
