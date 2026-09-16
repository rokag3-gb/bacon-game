// 순수 함수만. 상태를 들고 있지 않으므로 Node에서 그대로 테스트한다.

import { GRAVITY, JUMP_V0, BAGOOM } from './config.js';

// 점프 최고점 (u)
export function jumpApex(v0 = JUMP_V0, g = GRAVITY) {
  return (v0 * v0) / (2 * g);
}

// 총 체공 시간 (초)
export function airtime(v0 = JUMP_V0, g = GRAVITY) {
  return (2 * v0) / g;
}

// 점프 중 높이 h 이상에 머무는 시간 (초). h가 최고점보다 높으면 0.
export function timeAboveHeight(h, v0 = JUMP_V0, g = GRAVITY) {
  const disc = v0 * v0 - 2 * g * h;
  if (disc <= 0) return 0;
  return (2 * Math.sqrt(disc)) / g;
}

// 체공 중 앞으로 나아가는 거리 (u). 스크롤이 느릴수록 짧아진다.
export function airDistance(speed, v0 = JUMP_V0, g = GRAVITY) {
  return airtime(v0, g) * speed;
}

// 높이 h, 폭 w인 장애물을 이 속도에서 넘을 수 있는가.
// 베이컨이 장애물 위를 지나는 동안 (폭 + 베이컨 폭)만큼 나아가야 한다.
export function canClear(h, w, baconW, speed, v0 = JUMP_V0, g = GRAVITY) {
  return timeAboveHeight(h, v0, g) * speed > w + baconW;
}

// ─── 충돌 ───────────────────────────────────────────────
// 박스는 { x, y, w, h }. y는 아래로 증가하고 y가 박스의 윗변이다.

export function aabbOverlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

// 바굼과의 접촉을 밟기와 피격으로 가른다.
// 하강 중이고 베이컨의 발이 바굼 윗변 근처에 있으면 밟기, 그 외는 피격.
// 겹치지 않으면 null.
export function classifyBagoomHit(bacon, bagoom, vy) {
  if (!aabbOverlap(bacon, bagoom)) return null;
  const feet = bacon.y + bacon.h;
  const falling = vy > 0;
  const nearTop = feet <= bagoom.y + BAGOOM.stompTolerance;
  return falling && nearTop ? 'stomp' : 'hit';
}
