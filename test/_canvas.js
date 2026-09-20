// 테스트용 가짜 캔버스와 DOM.
//
// 브라우저를 띄우지 않고 한 프레임을 그려보기 위한 것이다. 스텁에 없는
// 메서드를 부르거나 좌표에 NaN이 섞이면 바로 예외를 던진다 — 진짜 캔버스는
// NaN을 받으면 에러 없이 조용히 아무것도 안 그려서 알아채기 어렵다.

export const calls = [];

// 그린 점들의 범위를 기록한다. 아이콘이 버튼 밖으로 삐져나오는 것 같은
// 사고는 예외가 안 나서, 좌표를 직접 봐야 잡힌다.
export const bounds = { on: false, minX: 0, maxX: 0, minY: 0, maxY: 0, any: false };

export function trackBounds() {
  resetTransform();
  bounds.on = true;
  bounds.any = false;
  bounds.minX = Infinity;
  bounds.maxX = -Infinity;
  bounds.minY = Infinity;
  bounds.maxY = -Infinity;
}

// 변환 행렬 [a,b,c,d,e,f]. translate/rotate 안에서 그린 도형도 화면 좌표로
// 옮겨 봐야 한다 — 톱니 아이콘이 그렇게 그려진다.
let m = [1, 0, 0, 1, 0, 0];
const stack = [];

const mul = (p, q) => [
  p[0] * q[0] + p[2] * q[1], p[1] * q[0] + p[3] * q[1],
  p[0] * q[2] + p[2] * q[3], p[1] * q[2] + p[3] * q[3],
  p[0] * q[4] + p[2] * q[5] + p[4], p[1] * q[4] + p[3] * q[5] + p[5],
];

function transform(op, a) {
  if (op === 'save') stack.push(m.slice());
  else if (op === 'restore') m = stack.pop() || [1, 0, 0, 1, 0, 0];
  else if (op === 'translate') m = mul(m, [1, 0, 0, 1, a[0], a[1]]);
  else if (op === 'rotate') m = mul(m, [Math.cos(a[0]), Math.sin(a[0]), -Math.sin(a[0]), Math.cos(a[0]), 0, 0]);
  else if (op === 'scale') m = mul(m, [a[0], 0, 0, a[1], 0, 0]);
  else if (op === 'setTransform') m = a.length >= 6 ? a.slice(0, 6) : [1, 0, 0, 1, 0, 0];
}

export function resetTransform() {
  m = [1, 0, 0, 1, 0, 0];
  stack.length = 0;
}

function mark(x, y) {
  if (!bounds.on || !Number.isFinite(x) || !Number.isFinite(y)) return;
  const sx = m[0] * x + m[2] * y + m[4];
  const sy = m[1] * x + m[3] * y + m[5];
  bounds.any = true;
  bounds.minX = Math.min(bounds.minX, sx);
  bounds.maxX = Math.max(bounds.maxX, sx);
  bounds.minY = Math.min(bounds.minY, sy);
  bounds.maxY = Math.max(bounds.maxY, sy);
}

// 네 귀퉁이를 다 찍어야 회전한 도형의 범위가 제대로 나온다
function markBox(x0, y0, x1, y1) {
  mark(x0, y0);
  mark(x1, y0);
  mark(x0, y1);
  mark(x1, y1);
}

function record(op, a) {
  transform(op, a);
  switch (op) {
    case 'moveTo':
    case 'lineTo':
      mark(a[0], a[1]);
      break;
    case 'arc':
      markBox(a[0] - a[2], a[1] - a[2], a[0] + a[2], a[1] + a[2]);
      break;
    case 'ellipse':
      markBox(a[0] - a[2], a[1] - a[3], a[0] + a[2], a[1] + a[3]);
      break;
    case 'rect':
    case 'fillRect':
    case 'strokeRect':
    case 'roundRect':
      markBox(a[0], a[1], a[0] + a[2], a[1] + a[3]);
      break;
    default:
      break;
  }
}

export function makeCtx() {
  const gradient = { addColorStop: () => {} };
  const ctx = {
    canvas: null,
    setTransform: () => {},
    clearRect: () => {},
    createLinearGradient: () => gradient,
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    arcTo: () => {},
    ellipse: () => {},
    rect: () => {},
    roundRect: () => {},
    quadraticCurveTo: () => {},
    bezierCurveTo: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    clip: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    setLineDash: () => {},
    measureText: (t) => ({ width: String(t).length * 7 }),
    fillText: () => {},
    strokeText: () => {},
  };

  return new Proxy(ctx, {
    get(target, prop) {
      if (typeof prop === 'string' && !(prop in target) && !prop.startsWith('__')) {
        throw new Error(`가짜 컨텍스트에 없는 메서드/속성: ${String(prop)}`);
      }
      const v = target[prop];
      if (typeof v === 'function') {
        return (...args) => {
          for (const [i, a] of args.entries()) {
            if (typeof a === 'number' && !Number.isFinite(a)) {
              throw new Error(`${String(prop)}()의 ${i}번째 인자가 ${a}`);
            }
          }
          calls.push(prop);
          record(prop, args);
          return v(...args);
        };
      }
      return v;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

export function makeCanvas(w, h) {
  const ctx = makeCtx();
  const canvas = {
    clientWidth: w,
    clientHeight: h,
    width: 0,
    height: 0,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: w, height: h }),
    addEventListener: () => {},
  };
  ctx.canvas = canvas;
  return canvas;
}

export function installDom(w, h, dpr = 2) {
  globalThis.devicePixelRatio = dpr;
  globalThis.innerWidth = w;
  globalThis.innerHeight = h;
  globalThis.addEventListener = () => {};
  globalThis.removeEventListener = () => {};
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
  };
}

export const SCREENS = [
  { name: '데스크톱 가로', w: 1600, h: 900 },
  { name: '폰 가로', w: 844, h: 390 },
  { name: '폰 세로', w: 390, h: 844 },
  { name: '태블릿 세로', w: 820, h: 1180 },
  { name: '아주 납작한 창', w: 1400, h: 300 },
  { name: '아주 좁은 창', w: 300, h: 900 },
];
