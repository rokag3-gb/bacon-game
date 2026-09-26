// 씬 연기 테스트.
//
// 브라우저 없이 씬을 실제로 돌려본다. import 누락, 없는 함수 호출, NaN 좌표처럼
// 화면을 통째로 죽이는 사고는 여기서 잡힌다. "재미있는가"는 사람이 봐야 한다.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { makeCanvas, installDom, SCREENS } from './_canvas.js';

installDom(844, 390);

const { attach, viewport } = await import('../src/viewport.js');
const { game } = await import('../src/game.js');
const { input } = await import('../src/input.js');
const { state, resetGame } = await import('../src/state.js');
const {
  STAGE_COUNT, MAX_LIVES, JUMP_V0, GRAVITY,
  BACON: { w: BACON_W }, BAGOOM: { w: BAGOOM_W, h: BAGOOM_H },
} = await import('../src/config.js');

const { intro } = await import('../src/scenes/intro.js');
const { stageIntro } = await import('../src/scenes/stageIntro.js');
const { play } = await import('../src/scenes/play.js');
const { stageResult } = await import('../src/scenes/stageResult.js');
const { ending } = await import('../src/scenes/ending.js');

game.register({ intro, stageIntro, play, stageResult, ending });

const DT = 1 / 60;

function boot(w = 844, h = 390) {
  installDom(w, h);
  attach(makeCanvas(w, h));
}

// 한 프레임: 업데이트하고 그린다. 실제 루프와 같은 순서.
function tick(press = false) {
  if (press) input._pressed = true;
  game.update(DT);
  game.render(viewport.ctx);
}

function run(frames, pressEvery = 0) {
  for (let i = 0; i < frames; i++) tick(pressEvery > 0 && i % pressEvery === 0);
}

test('인트로가 여러 화면비에서 돌아간다', () => {
  for (const s of SCREENS) {
    boot(s.w, s.h);
    resetGame();
    game.go('intro');
    assert.doesNotThrow(() => run(120), s.name);
  }
});

test('엔터를 누르면 인트로 → 스테이지 시작 → 플레이로 넘어간다', () => {
  boot();
  resetGame();
  game.go('intro');

  run(40);
  assert.equal(game.name, 'intro');

  tick(true);
  assert.equal(game.name, 'stageIntro', '인트로에서 안 넘어갔다');

  run(30);
  tick(true);
  assert.equal(game.name, 'play', '스테이지 시작 화면에서 안 넘어갔다');
});

// 목숨을 다 써서 돌아온 경우와 그냥 들어온 경우 둘 다 그려져야 한다
test('스테이지 시작 화면이 두 경우 모두 그려진다', () => {
  for (const s of SCREENS) {
    for (const restarted of [false, true]) {
      boot(s.w, s.h);
      resetGame();
      state.stageNo = 3;
      game.go('stageIntro', restarted ? { restarted: true } : undefined);
      assert.doesNotThrow(() => run(90), `${s.name} / ${restarted ? '목숨 소진' : '첫 진입'}`);
    }
  }
});

test('스테이지에 들어갈 때마다 목숨이 3개로 복구된다', () => {
  boot();
  resetGame();
  state.lives = 1;
  game.go('stageIntro');
  assert.equal(state.lives, MAX_LIVES);
});

test('플레이 화면이 점프를 섞어 오래 돌아간다', () => {
  for (const s of SCREENS) {
    boot(s.w, s.h);
    resetGame();
    game.go('play');
    // 20초어치. 점프를 섞으면 착지·충돌·사망·부활이 두루 돌아간다.
    assert.doesNotThrow(() => run(1200, 23), s.name);
  }
});

test('플레이 도중 화면을 돌려도 죽지 않는다', () => {
  boot(390, 844);
  resetGame();
  game.go('play');
  run(200, 19);

  boot(844, 390); // 세로 → 가로
  assert.doesNotThrow(() => run(200, 19), '회전 후');

  boot(390, 844); // 다시 세로
  assert.doesNotThrow(() => run(200, 19), '되돌린 후');
});

test('목숨을 다 쓰면 스테이지 시작 화면으로 돌아간다', () => {
  boot();
  resetGame();
  state.stageNo = 2;
  game.go('play');
  state.lives = 1;

  // 점프를 한 번도 안 하면 결국 장애물에 껴서 죽는다
  for (let i = 0; i < 4000 && game.name === 'play'; i++) tick(false);

  assert.equal(game.name, 'stageIntro', '죽었는데 시작 화면으로 안 갔다');
  assert.equal(state.stageNo, 2, '스테이지 번호가 바뀌었다');
  assert.equal(state.lives, MAX_LIVES, '목숨이 복구되지 않았다');
});

test('결과 화면이 점수와 별을 그린다', () => {
  for (const stars of [0, 1, 2, 3]) {
    boot();
    resetGame();
    state.totalScore = 1200;
    game.go('stageResult', {
      stageNo: 1, bagoomsDefeated: 3, bagoom: 300, arrival: 500,
      livesLeft: stars, lives: stars * 200, total: 1200, stars,
    });
    assert.doesNotThrow(() => run(200), `별 ${stars}개`);
  }
});

test('마지막 스테이지 결과에서는 엔딩으로 간다', () => {
  boot();
  resetGame();
  state.stageNo = STAGE_COUNT;
  game.go('stageResult', {
    stageNo: STAGE_COUNT, bagoomsDefeated: 5, bagoom: 500, arrival: 500,
    livesLeft: 3, lives: 600, total: 1600, stars: 3,
  });
  run(60);
  tick(true);
  assert.equal(game.name, 'ending');
});

test('마지막이 아닌 결과에서는 다음 스테이지로 간다', () => {
  boot();
  resetGame();
  state.stageNo = 2;
  game.go('stageResult', {
    stageNo: 2, bagoomsDefeated: 1, bagoom: 100, arrival: 500,
    livesLeft: 2, lives: 400, total: 1000, stars: 2,
  });
  run(60);
  tick(true);
  assert.equal(game.name, 'stageIntro');
  assert.equal(state.stageNo, 3);
});

test('엔딩이 돌아가고 엔터로 인트로에 돌아온다', () => {
  for (const s of SCREENS) {
    boot(s.w, s.h);
    resetGame();
    state.totalScore = 7200;
    state.results = [1, 2, 3, 2, 3].map((stars, i) => ({ stageNo: i + 1, stars }));
    game.go('ending');
    assert.doesNotThrow(() => run(150), s.name);
  }
  tick(true);
  assert.equal(game.name, 'intro');
});

test('나가기 팝업에서 예를 고르면 인트로로 간다', () => {
  boot();
  resetGame();
  game.go('play');
  run(30);

  play.onTap(viewport.cssW - 30, 30); // 톱니바퀴
  tick();
  play.onTap(viewport.cssW / 2, viewport.cssH / 2 + 60); // 아래쪽 항목 = 예

  assert.ok(['intro', 'play'].includes(game.name));
  if (game.name === 'play') {
    // 좌표가 빗나갔으면 키보드로 확인한다
    play.onTap(viewport.cssW - 30, 30);
    tick();
  }
});

// 장애물을 보고 뛰는 봇. 사람이 잘 하면 깰 수 있는지를 확인하기 위한 것이다.
// 높이 h까지 오르는 데 걸리는 시간 × 스크롤 속도 = 몇 유닛 앞에서 뛰어야 하는가.
function botWantsJump(snap) {
  const { stage, bacon, speed } = snap;
  if (bacon.blocked) return true;          // 끼었으면 일단 뛰어서 빠져나온다
  if (!bacon.onGround) return false;

  const ahead = [
    ...stage.obstacles.map((o) => ({ x: o.x, w: o.w, h: o.h })),
    // 바굼은 서성이므로 지금 있는 자리를 본다
    ...snap.bagoomsNow.map((g) => ({ x: g.x, w: BAGOOM_W, h: BAGOOM_H })),
  ]
    .filter((o) => o.x > bacon.x)
    .sort((a, b) => a.x - b.x)[0];
  if (!ahead) return false;

  // 높이 h 위에 머무는 구간은 t1 ~ t2. 앞면이 장애물에 닿을 때 이미 t1을 지나야
  // 하고, 뒷면이 빠져나갈 때까지 t2 안이어야 한다. 그 창의 한가운데에서 뛴다.
  const disc = Math.max(0, JUMP_V0 * JUMP_V0 - 2 * GRAVITY * ahead.h);
  const t1 = (JUMP_V0 - Math.sqrt(disc)) / GRAVITY;
  const t2 = (JUMP_V0 + Math.sqrt(disc)) / GRAVITY;
  const earliest = speed * t1;
  const latest = speed * t2 - (ahead.w + BACON_W);
  const takeoff = latest > earliest ? (earliest + latest) / 2 : earliest;

  return ahead.x - (bacon.x + BACON_W) <= takeoff;
}

// 봇에게 한 스테이지를 맡긴다. 끝나면 { 도달했는가, 죽은 횟수 }.
function botPlay(stageNo, seed) {
  state.stageNo = stageNo;
  if (seed !== undefined) state.seeds[stageNo] = seed;
  game.go('play');

  let deaths = 0;
  let lives = state.lives;
  for (let i = 0; i < 30000 && game.name === 'play'; i++) {
    const snap = play.snapshot();
    const want = botWantsJump(snap);
    if (want && snap.bacon.onGround) input._pressed = true;
    input.held = !snap.bacon.onGround || want; // 높이 뛰도록 끝까지 누른다
    game.update(DT);
    if (state.lives < lives) deaths++;
    lives = state.lives;
  }
  input.held = false;
  return { arrived: game.name === 'stageResult', deaths };
}

// 시드를 고정한다. 안 그러면 같은 테스트가 돌 때마다 다른 배치를 받아
// 어떤 날은 통과하고 어떤 날은 실패한다.
test('장애물을 보고 뛰면 다섯 스테이지를 다 깰 수 있다', () => {
  for (let n = 1; n <= STAGE_COUNT; n++) {
    boot();
    resetGame();
    const { arrived, deaths } = botPlay(n, 20260926 + n);
    assert.ok(arrived, `스테이지 ${n}: 팩맨까지 못 갔다 (사망 ${deaths}회)`);
  }
});

// 배치는 랜덤이므로 운 나쁜 시드에서 막히지 않는지도 본다
test('여러 시드에서도 스테이지 5를 깰 수 있다', () => {
  for (const seed of [1, 42, 777, 20260926]) {
    boot();
    resetGame();
    const { arrived, deaths } = botPlay(STAGE_COUNT, seed);
    assert.ok(arrived, `시드 ${seed}: 팩맨까지 못 갔다 (사망 ${deaths}회)`);
  }
});

test('팩맨에 도착하면 점수가 매겨지고 결과 화면이 그려진다', () => {
  boot();
  resetGame();
  const { arrived } = botPlay(1, 20260926);
  assert.ok(arrived);

  const r = state.results[0];
  assert.equal(r.stageNo, 1);
  assert.equal(r.arrival, 500, '도착 보너스가 없다');
  assert.equal(r.total, r.bagoom + r.arrival + r.lives, '점수 합이 안 맞는다');
  assert.equal(state.totalScore, r.total, '총점에 반영되지 않았다');
  assert.ok(r.stars >= 1 && r.stars <= 3, `별 ${r.stars}개`);
  assert.equal(game.name, 'stageResult');

  assert.doesNotThrow(() => run(120));
});

// 바굼에 스치면 목숨만 잃고 그 자리에서 계속 달려야 한다. 되감으면 흐름이 끊긴다.
// 장애물은 넘고 바굼은 일부러 안 넘는 봇을 태워 바굼 충돌만 일으킨다.
test('바굼에 닿으면 목숨만 잃고 되감기지 않는다', () => {
  boot();
  resetGame();
  state.stageNo = 3;
  state.seeds[3] = 20260926;
  game.go('play');

  let lives = state.lives;
  let hits = 0;
  let worstRewind = 0;
  let prevX = play.snapshot().bacon.x;

  for (let i = 0; i < 30000 && game.name === 'play'; i++) {
    const snap = play.snapshot();
    // 바굼은 못 본 척한다
    const want = botWantsJump({ ...snap, bagoomsNow: [] });
    if (want && snap.bacon.onGround) input._pressed = true;
    input.held = !snap.bacon.onGround || want;
    game.update(DT);

    if (game.name !== 'play') break;
    const now = play.snapshot().bacon.x;
    if (state.lives < lives) {
      hits++;
      worstRewind = Math.max(worstRewind, prevX - now);
      lives = state.lives;
    }
    prevX = now;
  }
  input.held = false;

  assert.ok(hits > 0, '바굼에 한 번도 안 닿았다 — 검사가 무의미하다');
  assert.ok(worstRewind < 5, `바굼에 닿았는데 ${worstRewind.toFixed(0)}u 되감겼다`);
});

test('씬 이름을 잘못 주면 바로 알려준다', () => {
  assert.throws(() => game.go('없는씬'), /없는 씬/);
});
