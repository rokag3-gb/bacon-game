// 그리기 코드 연기 테스트.
//
// 캔버스 드로잉은 단위 테스트로 "예쁜가"를 볼 수 없지만, 오타나 없는 메서드
// 호출로 프레임이 통째로 죽는 건 여기서 잡을 수 있다. 브라우저를 안 띄우고
// 가짜 2D 컨텍스트에 대고 한 프레임을 그려본다.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const calls = [];

function makeCtx() {
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
    rect: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    setLineDash: () => {},
    measureText: (t) => ({ width: String(t).length * 7 }),
    fillText: () => {},
    strokeText: () => {},
  };
  // 실제로 호출된 메서드를 세고, 스텁에 없는 메서드를 부르면 바로 실패한다
  return new Proxy(ctx, {
    get(target, prop) {
      if (typeof prop === 'string' && !(prop in target) && !prop.startsWith('__')) {
        throw new Error(`가짜 컨텍스트에 없는 메서드/속성: ${String(prop)}`);
      }
      const v = target[prop];
      if (typeof v === 'function') {
        return (...args) => {
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

function makeCanvas(w, h) {
  const ctx = makeCtx();
  const canvas = { clientWidth: w, clientHeight: h, width: 0, height: 0, getContext: () => ctx };
  ctx.canvas = canvas;
  return canvas;
}

function installDom(w, h, dpr = 2) {
  globalThis.devicePixelRatio = dpr;
  globalThis.innerWidth = w;
  globalThis.innerHeight = h;
  globalThis.addEventListener = () => {};
  globalThis.removeEventListener = () => {};
}

const { attach, viewport, beginFrame, resize } = await import('../src/viewport.js');
const { drawBackground } = await import('../src/scenery.js');
const { SIGHT_W, MIN_VIEW_H, GROUND_FROM_BOTTOM } = await import('../src/config.js');

const SCREENS = [
  { name: '데스크톱 가로', w: 1600, h: 900 },
  { name: '폰 가로', w: 844, h: 390 },
  { name: '폰 세로', w: 390, h: 844 },
  { name: '태블릿 세로', w: 820, h: 1180 },
  { name: '아주 납작한 창', w: 1400, h: 300 },
  { name: '아주 좁은 창', w: 300, h: 900 },
];

test('모든 화면 비율에서 한 프레임이 예외 없이 그려진다', () => {
  for (const s of SCREENS) {
    installDom(s.w, s.h);
    attach(makeCanvas(s.w, s.h));
    calls.length = 0;
    assert.doesNotThrow(() => {
      beginFrame();
      drawBackground(viewport.ctx, 1234.5);
    }, `${s.name}에서 예외`);
    assert.ok(calls.length > 20, `${s.name}: 그린 게 거의 없다 (${calls.length}회)`);
  }
});

test('어떤 화면에서도 최소 시야가 보장된다', () => {
  for (const s of SCREENS) {
    installDom(s.w, s.h);
    attach(makeCanvas(s.w, s.h));
    assert.ok(viewport.viewW >= SIGHT_W - 0.001, `${s.name}: 가로 ${viewport.viewW.toFixed(0)}u`);
    assert.ok(viewport.viewH >= MIN_VIEW_H - 0.001, `${s.name}: 세로 ${viewport.viewH.toFixed(0)}u`);
  }
});

test('점프 최고점의 베이컨 머리가 화면 안에 들어온다', () => {
  // 지면 위로 필요한 높이 = 점프 224u + 베이컨 키 100u
  const needed = 224 + 100;
  for (const s of SCREENS) {
    installDom(s.w, s.h);
    attach(makeCanvas(s.w, s.h));
    const aboveGround = viewport.groundScreenY / viewport.scale;
    assert.ok(
      aboveGround >= needed,
      `${s.name}: 지면 위 ${aboveGround.toFixed(0)}u 뿐 (${needed}u 필요)`,
    );
  }
});

test('지면선은 화면 아래쪽에 붙어 있다', () => {
  for (const s of SCREENS) {
    installDom(s.w, s.h);
    attach(makeCanvas(s.w, s.h));
    const fromBottom = (viewport.cssH - viewport.groundScreenY) / viewport.scale;
    assert.ok(fromBottom >= GROUND_FROM_BOTTOM.min - 0.001, `${s.name}: ${fromBottom.toFixed(0)}u`);
    assert.ok(fromBottom <= GROUND_FROM_BOTTOM.max + 0.001, `${s.name}: ${fromBottom.toFixed(0)}u`);
    assert.ok(viewport.groundScreenY < viewport.cssH, `${s.name}: 지면이 화면 밖`);
  }
});

test('회전해도 scale만 다시 계산된다', () => {
  installDom(390, 844);
  const canvas = makeCanvas(390, 844);
  attach(canvas);
  const portrait = { ...viewport, canvas: null, ctx: null };

  // 세로 → 가로
  canvas.clientWidth = 844;
  canvas.clientHeight = 390;
  installDom(844, 390);
  resize();

  assert.notEqual(viewport.scale, portrait.scale, '회전했는데 scale이 그대로다');
  assert.ok(viewport.viewW >= SIGHT_W - 0.001);
  assert.ok(viewport.viewH >= MIN_VIEW_H - 0.001);
});
