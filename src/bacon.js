// 베이컨의 점프와 충돌 처리.
//
// 오토러너라 베이컨은 스스로 앞으로 가지 않는다. 카메라가 나아가고, 베이컨은
// 화면상 자기 자리(desiredX)를 따라갈 뿐이다. 장애물 옆구리에 막히면 그 자리에
// 붙들려 화면 왼쪽으로 밀려난다 — 기획서의 "몸이 낀다"가 이것이다.

import { BACON, GRAVITY, JUMP_V0, JUMP_CUT, JUMP_MIN_HOLD, CATCHUP_FACTOR } from './config.js';

export function createBacon(worldX) {
  return {
    x: worldX,
    y: -BACON.h,   // 지면 윗면이 y = 0, 위가 음수
    vy: 0,
    onGround: true,
    jumping: false,
    holdTime: 0,
    runPhase: 0,
    blocked: false,
  };
}

export function baconBox(b) {
  return { x: b.x, y: b.y, w: BACON.w, h: BACON.h };
}

function obstacleBox(o) {
  return { x: o.x, y: -o.h, w: o.w, h: o.h };
}

function verticallyOverlaps(b, o) {
  const box = obstacleBox(o);
  return b.y < box.y + box.h && box.y < b.y + BACON.h;
}

/**
 * 한 프레임 진행.
 * @param {object} b        createBacon()이 만든 객체
 * @param {number} dt       초
 * @param {object} env
 * @param {number} env.desiredX  이번 프레임에 있어야 할 월드 x
 * @param {Array}  env.obstacles 이 근처의 장애물만 걸러서 넘겨도 된다
 * @param {boolean} env.pressed  이번 프레임에 새로 눌렸는가
 * @param {boolean} env.held     지금 누르고 있는가
 * @param {number} [env.speed]   스크롤 속도. 밀린 뒤 따라잡는 속도를 여기서 정한다.
 * @param {number} [env.gravity]
 * @param {number} [env.jumpV0]
 */
export function updateBacon(b, dt, env) {
  const g = env.gravity ?? GRAVITY;
  const v0 = env.jumpV0 ?? JUMP_V0;
  const obstacles = env.obstacles || [];

  // 점프 시작
  if (env.pressed && b.onGround) {
    b.vy = -v0;
    b.onGround = false;
    b.jumping = true;
    b.holdTime = 0;
  }

  // 가변 점프 — 최소 홀드 시간을 지나 버튼을 떼면 상승 속도를 깎는다
  if (b.jumping) {
    b.holdTime += dt;
    if (b.vy >= 0) {
      b.jumping = false;
    } else if (!env.held && b.holdTime >= JUMP_MIN_HOLD) {
      b.vy *= JUMP_CUT;
      b.jumping = false;
    }
  }

  // 수직 적분
  const prevFeet = b.y + BACON.h;
  b.vy += g * dt;
  b.y += b.vy * dt;
  const feet = b.y + BACON.h;

  // 착지 — 지면과 장애물 윗면 중 이번 프레임에 뚫고 지나간 것 가운데 제일 높은 곳
  if (b.vy > 0) {
    let landOn = null;
    const consider = (surfaceY) => {
      if (prevFeet <= surfaceY + 0.001 && feet >= surfaceY) {
        if (landOn === null || surfaceY < landOn) landOn = surfaceY;
      }
    };
    consider(0); // 지면
    for (const o of obstacles) {
      if (b.x + BACON.w > o.x && b.x < o.x + o.w) consider(-o.h);
    }
    if (landOn !== null) {
      b.y = landOn - BACON.h;
      b.vy = 0;
      b.onGround = true;
      b.jumping = false;
    } else {
      b.onGround = false;
    }
  } else {
    b.onGround = false;
  }

  // 수평 — 제자리로 따라가되 장애물 옆면에 막히면 거기서 멈춘다.
  //
  // 따라잡는 속도에 상한을 둔다. 이게 없으면 장애물에 끼어 뒤로 밀린 뒤
  // 뛰어넘는 순간 막힘이 풀리면서 한 프레임 만에 제자리로 순간이동한다.
  // 스크롤보다 CATCHUP_FACTOR 만큼 더 빨리 달려 제 발로 따라붙는 모습이 된다.
  const maxAdvance = env.speed ? env.speed * (1 + CATCHUP_FACTOR) * dt : Infinity;
  let x = Math.min(env.desiredX, b.x + maxAdvance);
  b.blocked = false;
  for (const o of obstacles) {
    if (!verticallyOverlaps(b, o)) continue;
    if (b.x <= o.x && x + BACON.w > o.x) {
      x = Math.min(x, o.x - BACON.w);
      b.blocked = true;
    }
  }
  b.x = x;

  // 달리는 다리 애니메이션
  if (b.onGround) b.runPhase += dt * 14;

  return b;
}
