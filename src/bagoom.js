// 바굼의 움직임.
//
// 가로로는 제자리에서 서성이고(stage.js 의 bagoomX), 세로로는 중력을 받는다.
// 장애물 위에서 시작한 바굼은 서성이다 가장자리를 넘으면 떨어져, 그때부터
// 잔디밭에서 걷는다.

import { BAGOOM, BAGOOM_PERCH } from './config.js';
import { bagoomX } from './stage.js';

export function createBagoomStates(stage) {
  return stage.bagooms.map((g) => ({
    x: bagoomX(g, 0),
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

// 옆구리에 막히면 거기서 멈춘다.
//
// 바굼의 x 를 시간의 함수로 매 프레임 새로 계산해 대입하면 안 된다. 막혀
// 있는 동안에도 "가려는 위치"는 계속 흘러가고, 그게 장애물 반대편을 완전히
// 벗어나는 순간 장애물을 관통해 그리로 순간이동한다.
//
// 대신 이번 프레임에 "얼마나 움직이려 했는지"만 가져와 조금씩 옮기고,
// 그 이동을 장애물이 막는다. 그러면 어떤 경우에도 튀지 않는다.
function blockX(obstacles, fromX, toX, y) {
  let x = toX;
  for (const o of obstacles) {
    if (y + BAGOOM.h <= -o.h + 0.5) continue;   // 그 장애물보다 위에 있다

    const inside = (px) => px + BAGOOM.w > o.x && px < o.x + o.w;
    if (inside(fromX)) continue;                // 이미 겹쳐 있으면 억지로 밀지 않는다
    if (!inside(x)) continue;

    x = x > fromX ? o.x - BAGOOM.w : o.x + o.w;
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

    // 가로는 서성임이 이번 프레임에 움직이려 한 만큼만 옮긴다
    const near = obstacles.filter((o) => o.x + o.w > st.x - 400 && o.x < st.x + 400);
    const step = bagoomX(g, clock) - bagoomX(g, clock - dt);
    st.x = blockX(near, st.x, st.x + step, st.y);

    // 이번 프레임에 뚫고 지나간 면 중 제일 높은 곳에 내려선다
    let land = null;
    for (const sy of supportsUnder(near, st.x)) {
      if (prevFeet <= sy + 0.5 && feet >= sy && (land === null || sy < land)) land = sy;
    }
    if (land !== null) {
      st.y = land - BAGOOM.h;
      st.vy = 0;
      st.onGround = true;
    } else {
      st.onGround = false;
    }
  }
}

export function bagoomBox(states, i) {
  const st = states[i];
  return { x: st.x, y: st.y, w: BAGOOM.w, h: BAGOOM.h };
}
