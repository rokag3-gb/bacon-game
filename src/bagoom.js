// 바굼의 움직임.
//
// 가로로는 제자리에서 서성이고(stage.js 의 bagoomX), 세로로는 중력을 받는다.
// 장애물 위에서 시작한 바굼은 서성이다 가장자리를 넘으면 떨어져, 그때부터
// 잔디밭에서 걷는다.

import { BAGOOM, BAGOOM_PERCH } from './config.js';
import { bagoomX } from './stage.js';

export function createBagoomStates(stage) {
  return stage.bagooms.map((g) => ({
    x: g.x,
    y: g.startY,
    vy: 0,
    onGround: true,
  }));
}

// 이 바굼 아래에서 받쳐줄 수 있는 면들 (지면과 장애물 윗면)
function supportsUnder(obstacles, x) {
  const out = [0]; // 지면
  for (const o of obstacles) {
    if (x + BAGOOM.w > o.x && x < o.x + o.w) out.push(-o.h);
  }
  return out;
}

// 지면을 걷는 바굼이 장애물 옆구리를 뚫지 않게 막는다
function clampX(obstacles, x, y) {
  for (const o of obstacles) {
    const top = -o.h;
    if (y + BAGOOM.h <= top + 0.5) continue;       // 그 장애물보다 위에 있다
    if (x + BAGOOM.w <= o.x || x >= o.x + o.w) continue;
    // 가까운 쪽으로 밀어낸다
    const left = o.x - BAGOOM.w;
    const right = o.x + o.w;
    x = Math.abs(x - left) < Math.abs(x - right) ? left : right;
  }
  return x;
}

/**
 * 한 프레임 진행. 장애물은 근처 것만 걸러 넘겨도 된다.
 */
export function updateBagooms(stage, states, clock, dt, obstacles, defeated) {
  for (const [i, g] of stage.bagooms.entries()) {
    if (defeated && defeated.has(i)) continue;
    const st = states[i];

    const prevFeet = st.y + BAGOOM.h;
    st.vy += BAGOOM_PERCH.fallGravity * dt;
    st.y += st.vy * dt;
    const feet = st.y + BAGOOM.h;

    // 가로는 서성임이 정한다
    const near = obstacles.filter((o) => o.x + o.w > g.x - 300 && o.x < g.x + 300);
    let x = bagoomX(g, clock);

    // 이번 프레임에 뚫고 지나간 면 중 제일 높은 곳에 내려선다
    let land = null;
    for (const sy of supportsUnder(near, x)) {
      if (prevFeet <= sy + 0.5 && feet >= sy && (land === null || sy < land)) land = sy;
    }
    if (land !== null) {
      st.y = land - BAGOOM.h;
      st.vy = 0;
      st.onGround = true;
    } else {
      st.onGround = false;
    }

    st.x = clampX(near, x, st.y);
  }
}

export function bagoomBox(states, i) {
  const st = states[i];
  return { x: st.x, y: st.y, w: BAGOOM.w, h: BAGOOM.h };
}
