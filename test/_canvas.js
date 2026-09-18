// 테스트용 가짜 캔버스와 DOM.
//
// 브라우저를 띄우지 않고 한 프레임을 그려보기 위한 것이다. 스텁에 없는
// 메서드를 부르거나 좌표에 NaN이 섞이면 바로 예외를 던진다 — 진짜 캔버스는
// NaN을 받으면 에러 없이 조용히 아무것도 안 그려서 알아채기 어렵다.

export const calls = [];

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
