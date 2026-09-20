// 그리기 코드 연기 테스트.
//
// 캔버스 드로잉은 단위 테스트로 "예쁜가"를 볼 수 없지만, 오타나 없는 메서드
// 호출로 프레임이 통째로 죽는 건 여기서 잡을 수 있다. 브라우저를 안 띄우고
// 가짜 2D 컨텍스트에 대고 한 프레임을 그려본다.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { makeCanvas, installDom, SCREENS, calls, bounds, trackBounds } from './_canvas.js';

installDom(844, 390);

const { attach, viewport, beginFrame, resize } = await import('../src/viewport.js');
const { drawBackground } = await import('../src/scenery.js');
const { SIGHT_W, MIN_VIEW_H, GROUND_FROM_BOTTOM, ACTION_BAND } = await import('../src/config.js');

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

// 구름 모양은 여섯 가지를 해시로 고른다. 카메라를 멀리 옮겨가며 그려
// 여섯 가지가 모두 한 번씩은 나오도록 훑는다.
test('배경을 죽 스크롤해도 예외가 없다', () => {
  installDom(844, 390);
  attach(makeCanvas(844, 390));
  for (let cam = 0; cam < 40000; cam += 137) {
    assert.doesNotThrow(() => drawBackground(viewport.ctx, cam), `cameraX ${cam}`);
  }
});

// 음소거 아이콘의 음파가 버튼 밖으로 튀어나와 있었다. clip으로 가리기도 하지만
// 애초에 도형이 네모 안에 들어와야 한다.
test('톱니와 음소거 그림이 버튼 네모 안에 들어온다', async () => {
  const { drawIcons } = await import('../src/ui.js');
  for (const s of SCREENS) {
    for (const muted of [false, true]) {
      installDom(s.w, s.h);
      attach(makeCanvas(s.w, s.h));
      trackBounds();
      const zones = drawIcons(viewport.ctx, { muted });
      bounds.on = false;

      const boxes = zones.map((z) => z.box);
      const left = Math.min(...boxes.map((b) => b.x));
      const right = Math.max(...boxes.map((b) => b.x + b.w));
      const top = Math.min(...boxes.map((b) => b.y));
      const bottom = Math.max(...boxes.map((b) => b.y + b.h));

      const where = `${s.name} / ${muted ? '음소거' : '소리켜짐'}`;
      assert.ok(bounds.any, `${where}: 아무것도 안 그렸다`);
      assert.ok(bounds.minX >= left - 0.5, `${where}: 왼쪽으로 ${(left - bounds.minX).toFixed(1)}px 삐져나옴`);
      assert.ok(bounds.maxX <= right + 0.5, `${where}: 오른쪽으로 ${(bounds.maxX - right).toFixed(1)}px 삐져나옴`);
      assert.ok(bounds.minY >= top - 0.5, `${where}: 위로 ${(top - bounds.minY).toFixed(1)}px 삐져나옴`);
      assert.ok(bounds.maxY <= bottom + 0.5, `${where}: 아래로 ${(bounds.maxY - bottom).toFixed(1)}px 삐져나옴`);
    }
  }
});

test('두 아이콘은 서로 겹치지 않는다', async () => {
  const { drawIcons } = await import('../src/ui.js');
  for (const s of SCREENS) {
    installDom(s.w, s.h);
    attach(makeCanvas(s.w, s.h));
    const [gear, mute] = drawIcons(viewport.ctx, { muted: false });
    const gapBoxes = gear.box.x - (mute.box.x + mute.box.w);
    assert.ok(gapBoxes >= 12, `${s.name}: 그림 사이가 ${gapBoxes.toFixed(0)}px 뿐`);
    const gapZones = gear.x - (mute.x + mute.w);
    assert.ok(gapZones >= 0, `${s.name}: 누름 영역이 ${(-gapZones).toFixed(0)}px 겹친다`);
  }
});

test('나무 간판이 여러 화면비에서 그려진다', async () => {
  const { drawSign, CREDITS, drawCredits } = await import('../src/ui.js');
  for (const s of SCREENS) {
    installDom(s.w, s.h);
    attach(makeCanvas(s.w, s.h));
    const box = drawSign(viewport.ctx, '베이컨 먹방', s.h * 0.26);
    assert.ok(box.w > 0 && box.h > 0, `${s.name}: 간판 크기가 0`);
    assert.ok(box.x >= 0, `${s.name}: 간판이 화면 왼쪽 밖으로 나갔다`);
    assert.ok(box.x + box.w <= s.w + 0.001, `${s.name}: 간판이 화면 오른쪽 밖으로 나갔다`);
    assert.doesNotThrow(() => drawCredits(viewport.ctx), s.name);
  }
  assert.match(CREDITS, /PEACHSOFT 2026/);
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

test('지면 높이가 정해진 범위 안에 있다', () => {
  for (const s of SCREENS) {
    installDom(s.w, s.h);
    attach(makeCanvas(s.w, s.h));
    const fromBottom = (viewport.cssH - viewport.groundScreenY) / viewport.scale;
    assert.ok(fromBottom >= GROUND_FROM_BOTTOM.min - 0.001, `${s.name}: ${fromBottom.toFixed(0)}u`);
    assert.ok(fromBottom <= GROUND_FROM_BOTTOM.tallMax + 0.001, `${s.name}: ${fromBottom.toFixed(0)}u`);
    assert.ok(viewport.groundScreenY < viewport.cssH, `${s.name}: 지면이 화면 밖`);
  }
});

// 세로 화면에서 지면이 바닥에 깔리면 액션이 화면 맨 아래에 몰린다.
// 지면을 tallMax까지 끌어올려 잔디밭이 화면을 받치게 한다.
test('세로 화면에서는 지면이 tallMax까지 올라온다', () => {
  for (const s of SCREENS.filter((x) => x.h > x.w)) {
    installDom(s.w, s.h);
    attach(makeCanvas(s.w, s.h));
    const fromBottom = (viewport.cssH - viewport.groundScreenY) / viewport.scale;
    assert.ok(
      Math.abs(fromBottom - GROUND_FROM_BOTTOM.tallMax) < 0.001,
      `${s.name}: 지면이 ${fromBottom.toFixed(0)}u (${GROUND_FROM_BOTTOM.tallMax}u여야 함)`,
    );
  }
});

// 지면을 아무리 올려도 점프한 베이컨의 머리가 잘리면 안 된다
test('지면을 올려도 액션 띠는 항상 화면 안에 남는다', () => {
  for (const s of SCREENS) {
    installDom(s.w, s.h);
    attach(makeCanvas(s.w, s.h));
    const above = viewport.groundScreenY / viewport.scale;
    assert.ok(above >= ACTION_BAND, `${s.name}: 지면 위 ${above.toFixed(0)}u (${ACTION_BAND.toFixed(0)}u 필요)`);
  }
});

test('가로 화면의 지면 높이는 그대로다', () => {
  for (const s of SCREENS.filter((x) => x.w >= x.h)) {
    installDom(s.w, s.h);
    attach(makeCanvas(s.w, s.h));
    const fromBottom = (viewport.cssH - viewport.groundScreenY) / viewport.scale;
    assert.ok(fromBottom < 150, `${s.name}: 가로인데 지면이 ${fromBottom.toFixed(0)}u로 높다`);
  }
});

// 스프라이트는 "예쁜가"를 테스트할 수 없지만, 좌표에 NaN이 섞이면 브라우저가
// 조용히 아무것도 안 그린다. 그 사고는 여기서 잡힌다.
test('모든 스프라이트가 NaN 없이 그려진다', async () => {
  const { drawBacon, drawBagoom, drawObstacle, drawPacman } = await import('../src/sprites.js');
  const { OBSTACLE_KINDS, BACON, BAGOOM } = await import('../src/config.js');

  installDom(844, 390);
  attach(makeCanvas(844, 390));
  const ctx = viewport.ctx;
  const s = viewport.scale;

  for (const phase of [0, 0.7, 1.6, 3.4]) {
    for (const airborne of [false, true]) {
      for (const hurt of [false, true]) {
        assert.doesNotThrow(
          () => drawBacon(ctx, 100, 100, s, { runPhase: phase, airborne, hurt }),
          `베이컨 (phase ${phase}, 공중 ${airborne}, 피격 ${hurt})`,
        );
      }
    }
    for (const squashed of [false, true]) {
      assert.doesNotThrow(() => drawBagoom(ctx, 100, 100, s, { phase, squashed }), '바굼');
    }
    assert.doesNotThrow(() => drawPacman(ctx, 100, 100, 160 * s, s, { chomp: phase }), '팩맨');
  }

  for (const o of OBSTACLE_KINDS) {
    assert.doesNotThrow(
      () => drawObstacle(ctx, o.kind, 100, 100, o.w * s, o.h * s, s),
      `장애물 ${o.kind}`,
    );
  }
  assert.doesNotThrow(() => drawObstacle(ctx, '없는종류', 100, 100, 40, 40, s), '모르는 종류');

  assert.ok(BACON.w > 0 && BAGOOM.w > 0);
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
