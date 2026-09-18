// 키보드 / 마우스 / 터치를 하나로 모은다.
// 조작은 점프 하나뿐이고, 같은 입력이 다른 화면에서는 "확인"으로 쓰인다.

const JUMP_KEYS = new Set(['Space', 'Enter', 'NumpadEnter']);

export const input = {
  held: false,      // 지금 누르고 있는가 (가변 점프에 쓴다)
  _pressed: false,  // 이번 프레임에 새로 눌렸는가
};

// 메뉴 조작용 이벤트 큐. 점프와 달리 놓치면 안 되므로 쌓아 두고 씬이 꺼내 쓴다.
let menuQueue = [];

export function consumeMenu() {
  const q = menuQueue;
  menuQueue = [];
  return q;
}

// HUD 아이콘 위를 눌렀을 때는 점프로 치지 않는다.
// 씬이 { x, y, w, h } 목록(CSS 픽셀)을 넣어두면 그 영역은 건너뛴다.
let uiZones = [];
export function setUiZones(zones) {
  uiZones = zones || [];
}

function inUiZone(x, y) {
  return uiZones.some((z) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h);
}

let uiHandler = null;
export function onUiTap(fn) {
  uiHandler = fn;
}

function press() {
  input.held = true;
  input._pressed = true;
}

function release() {
  input.held = false;
}

export function attach(canvas) {
  addEventListener('keydown', (e) => {
    if (e.code === 'ArrowUp') menuQueue.push('up');
    else if (e.code === 'ArrowDown') menuQueue.push('down');
    else if (e.code === 'Escape') menuQueue.push('escape');

    if (!JUMP_KEYS.has(e.code)) return;
    e.preventDefault();
    if (!e.repeat) press();
  });
  addEventListener('keyup', (e) => {
    if (JUMP_KEYS.has(e.code)) release();
  });

  // 터치와 마우스가 둘 다 발화하는 것을 막기 위해 터치를 본 뒤로는 마우스를 무시한다
  let sawTouch = false;

  const start = (x, y) => {
    if (inUiZone(x, y)) {
      uiHandler?.(x, y);
      return;
    }
    press();
  };

  canvas.addEventListener(
    'touchstart',
    (e) => {
      sawTouch = true;
      e.preventDefault();
      const t = e.changedTouches[0];
      const r = canvas.getBoundingClientRect();
      start(t.clientX - r.left, t.clientY - r.top);
    },
    { passive: false },
  );
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    release();
  }, { passive: false });

  canvas.addEventListener('mousedown', (e) => {
    if (sawTouch) return;
    const r = canvas.getBoundingClientRect();
    start(e.clientX - r.left, e.clientY - r.top);
  });
  addEventListener('mouseup', () => {
    if (!sawTouch) release();
  });

  // 탭 전환 등으로 포커스를 잃으면 누른 상태가 남지 않게 한다
  addEventListener('blur', release);
}

// 이번 프레임에 새로 눌렸으면 true를 돌려주고 플래그를 지운다
export function consumePress() {
  if (!input._pressed) return false;
  input._pressed = false;
  return true;
}

export function clearPress() {
  input._pressed = false;
}
