// 부팅 + 게임 루프.
//
// 지금은 테스트 모드다. 화면 배치·점프 높이·스크롤 속도를 그 자리에서 바꿔가며
// 감을 볼 수 있게 만들었다. 6단계에서 씬 디스패치로 바뀐다.

import { attach as attachViewport, viewport, beginFrame, sx, sy, su } from './viewport.js';
import { attach as attachInput, input, consumePress, setUiZones, onUiTap } from './input.js';
import { drawBackground } from './scenery.js';
import { drawBacon, drawBagoom, drawObstacle, drawPacman, drawHeart } from './sprites.js';
import { createBacon, updateBacon, baconBox } from './bacon.js';
import { classifyBagoomHit, jumpApex } from './physics.js';
import {
  BACON, BAGOOM, GRAVITY, JUMP_V0, STAGE_COUNT,
  MAX_LIVES, INVULN_TIME, BLINK_HZ, DEATH_MARGIN, CHECKPOINT_BACK_SECONDS,
} from './config.js';
import { buildStage, safeRespawnX, checkpointBack } from './stage.js';
import { newSeed } from './rng.js';

const canvas = document.getElementById('game');
attachViewport(canvas);
attachInput(canvas);

const PACMAN_SIZE = 160;

const sim = {
  stageNo: 1,
  seed: 20260926,
  stage: null,
  cameraX: 0,
  bacon: null,
  defeated: new Set(),
  lives: MAX_LIVES,
  invuln: 0,
  backSeconds: CHECKPOINT_BACK_SECONDS,
  speedMul: 1,
  jumpMul: 1,
  paused: false,
};

function loadStage(stageNo, seed) {
  sim.stageNo = stageNo;
  sim.seed = seed;
  sim.stage = buildStage(stageNo, seed);
  sim.cameraX = 0;
  sim.defeated.clear();
  sim.lives = MAX_LIVES;
  sim.invuln = 0;
  sim.bacon = createBacon(viewport.viewW * BACON.screenXRatio);
}
loadStage(1, sim.seed);

const speed = () => sim.stage.speed * sim.speedMul;
const jumpV0 = () => JUMP_V0 * sim.jumpMul;
const apex = () => jumpApex(jumpV0(), GRAVITY);

// 다음 장애물 바로 앞으로 건너뛴다. 스테이지 1은 장애물 간격이 7.8초라
// 이게 없으면 테스트가 너무 느리다.
function skipToNextObstacle() {
  const ahead = sim.stage.obstacles.find((o) => o.x > sim.bacon.x + viewport.viewW * 0.5);
  if (!ahead) {
    sim.cameraX = 0;
  } else {
    sim.cameraX = ahead.x - viewport.viewW * 0.8;
  }
  sim.bacon.x = sim.cameraX + viewport.viewW * BACON.screenXRatio;
  sim.bacon.y = -BACON.h;
  sim.bacon.vy = 0;
}

// ─── 버튼 ───────────────────────────────────────────────
let buttons = [];

function layoutButtons() {
  const m = 10;
  const h = Math.max(34, Math.min(44, viewport.cssH * 0.055));
  const fs = Math.max(11, Math.min(14, viewport.cssW / 32));
  const top = readoutBottom + m;
  buttons = [];

  const row = (y, items) => {
    let x = m;
    for (const [label, w, action] of items) {
      buttons.push({ label, x, y, w: w * fs, h, action, fs });
      x += w * fs + 6;
    }
  };

  row(top, [
    ['◀', 2.4, () => loadStage(Math.max(1, sim.stageNo - 1), sim.seed)],
    [`스테이지 ${sim.stageNo}`, 5.6, null],
    ['▶', 2.4, () => loadStage(Math.min(STAGE_COUNT, sim.stageNo + 1), sim.seed)],
    ['다시뽑기', 5, () => loadStage(sim.stageNo, newSeed())],
  ]);
  row(top + h + 6, [
    ['점프 ◀', 4, () => (sim.jumpMul = Math.max(0.5, sim.jumpMul - 0.05))],
    [`${Math.round(apex())}u`, 4, null],
    ['▶', 2.4, () => (sim.jumpMul = Math.min(2, sim.jumpMul + 0.05))],
  ]);
  row(top + (h + 6) * 2, [
    ['속도 ◀', 4, () => (sim.speedMul = Math.max(0.4, sim.speedMul - 0.05))],
    [`${Math.round(speed())}`, 4, null],
    ['▶', 2.4, () => (sim.speedMul = Math.min(2, sim.speedMul + 0.05))],
  ]);
  row(top + (h + 6) * 3, [
    ['되감기 ◀', 4.6, () => (sim.backSeconds = Math.max(2, sim.backSeconds - 1))],
    [`${sim.backSeconds}초`, 3.4, null],
    ['▶', 2.4, () => (sim.backSeconds = Math.min(20, sim.backSeconds + 1))],
  ]);
  row(top + (h + 6) * 4, [
    ['▶▶ 다음 장애물', 9, skipToNextObstacle],
    [sim.paused ? '재생' : '멈춤', 3.4, () => (sim.paused = !sim.paused)],
  ]);

  // 표시 전용 칸도 등록해야 그 위를 눌렀을 때 점프하지 않는다
  setUiZones(buttons);
}

onUiTap((x, y) => {
  const hit = buttons.find(
    (b) => b.action && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h,
  );
  hit?.action();
});

addEventListener('keydown', (e) => {
  const k = e.key;
  if (k >= '1' && k <= String(STAGE_COUNT)) loadStage(Number(k), sim.seed);
  else if (k === 'r' || k === 'R') loadStage(sim.stageNo, newSeed());
  else if (k === '[') sim.jumpMul = Math.max(0.5, sim.jumpMul - 0.05);
  else if (k === ']') sim.jumpMul = Math.min(2, sim.jumpMul + 0.05);
  else if (k === '-') sim.speedMul = Math.max(0.4, sim.speedMul - 0.05);
  else if (k === '=' || k === '+') sim.speedMul = Math.min(2, sim.speedMul + 0.05);
  else if (k === ',') sim.backSeconds = Math.max(2, sim.backSeconds - 1);
  else if (k === '.') sim.backSeconds = Math.min(20, sim.backSeconds + 1);
  else if (k === 'f' || k === 'F') skipToNextObstacle();
  else if (k === 'p' || k === 'P') sim.paused = !sim.paused;
});

// ─── 진행 ───────────────────────────────────────────────
function nearbyObstacles() {
  const lo = sim.bacon.x - 400;
  const hi = sim.bacon.x + viewport.viewW + 400;
  return sim.stage.obstacles.filter((o) => o.x + o.w > lo && o.x < hi);
}

function respawn() {
  const b = sim.bacon;
  const x = safeRespawnX(sim.stage, b.x, sim.backSeconds);
  sim.cameraX = Math.max(0, x - viewport.viewW * BACON.screenXRatio);
  b.x = sim.cameraX + viewport.viewW * BACON.screenXRatio;
  b.y = -BACON.h;
  b.vy = 0;
  b.onGround = true;
  b.blocked = false;
  sim.invuln = INVULN_TIME;
}

function die() {
  if (sim.invuln > 0) return;
  sim.lives -= 1;
  if (sim.lives <= 0) {
    // 목숨을 다 쓰면 스테이지 처음부터. 배치는 시드가 같아 그대로다.
    loadStage(sim.stageNo, sim.seed);
    return;
  }
  respawn();
}

function step(dt) {
  const b = sim.bacon;
  const pressed = consumePress();

  sim.invuln = Math.max(0, sim.invuln - dt);
  sim.cameraX += speed() * dt;
  if (sim.cameraX > sim.stage.length) sim.cameraX = 0;

  updateBacon(b, dt, {
    desiredX: sim.cameraX + viewport.viewW * BACON.screenXRatio,
    obstacles: nearbyObstacles(),
    pressed,
    held: input.held,
    jumpV0: jumpV0(),
  });

  // 바굼 — 위에서 밟으면 잡히고, 옆이나 아래로 닿으면 죽는다
  const bb = baconBox(b);
  for (const [i, g] of sim.stage.bagooms.entries()) {
    if (sim.defeated.has(i)) continue;
    if (Math.abs(g.x - b.x) > 300) continue;
    const hit = classifyBagoomHit(bb, { x: g.x, y: -BAGOOM.h, w: BAGOOM.w, h: BAGOOM.h }, b.vy);
    if (hit === 'stomp') {
      sim.defeated.add(i);
      b.vy = -jumpV0() * 0.55;
      b.onGround = false;
    } else if (hit === 'hit') {
      die();
      return;
    }
  }

  // 장애물에 끼어 화면 왼쪽 끝까지 밀리면 사망
  if (b.x < sim.cameraX + DEATH_MARGIN) die();
}

// ─── 그리기 ─────────────────────────────────────────────
let readoutBottom = 0;

function drawEntities(ctx) {
  const s = viewport.scale;
  const cam = sim.cameraX;

  for (const o of sim.stage.obstacles) {
    const px = sx(o.x, cam);
    if (px > viewport.cssW + 40 || px + su(o.w) < -40) continue;
    drawObstacle(ctx, o.kind, px, sy(-o.h), su(o.w), su(o.h), s);
  }

  for (const [i, g] of sim.stage.bagooms.entries()) {
    const px = sx(g.x, cam);
    if (px > viewport.cssW + 40 || px + su(BAGOOM.w) < -40) continue;
    drawBagoom(ctx, px, sy(-BAGOOM.h), s, {
      phase: g.x * 0.05 + performance.now() * 0.006,
      squashed: sim.defeated.has(i),
    });
  }

  const pacX = sim.stage.length - PACMAN_SIZE - 60;
  const ppx = sx(pacX, cam);
  if (ppx < viewport.cssW + 200 && ppx > -su(PACMAN_SIZE) - 200) {
    drawPacman(ctx, ppx, sy(-PACMAN_SIZE), su(PACMAN_SIZE), s, { chomp: performance.now() * 0.006 });
  }

  // 무적 동안 깜빡인다 — 보였다 안 보였다 해야 무적인 게 눈에 띈다
  const b = sim.bacon;
  const blinkOff = sim.invuln > 0 && Math.floor(performance.now() / 1000 * BLINK_HZ) % 2 === 1;
  if (!blinkOff) {
    drawBacon(ctx, sx(b.x, cam), sy(b.y), s, {
      runPhase: b.runPhase,
      airborne: !b.onGround,
      hurt: sim.invuln > 0,
    });
  }
}

function drawApexGuide(ctx) {
  const y = sy(-(BACON.h + apex()));
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.setLineDash([7, 7]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(viewport.cssW, y);
  ctx.stroke();
  ctx.restore();
}

function drawProgress(ctx) {
  const m = 10;
  const w = viewport.cssW - m * 2;
  const y = m + 8;
  const t = Math.max(0, Math.min(1, sim.bacon.x / sim.stage.length));

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(m, y);
  ctx.lineTo(m + w, y);
  ctx.stroke();

  ctx.fillStyle = '#FFD836';
  ctx.beginPath();
  ctx.arc(m + w, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#FBF6EE';
  ctx.beginPath();
  ctx.arc(m + w * t, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  return y + 14;
}

function drawLives(ctx, top) {
  const r = Math.max(8, Math.min(13, viewport.cssW / 34));
  const gap = r * 2.6;
  for (let i = 0; i < MAX_LIVES; i++) {
    drawHeart(ctx, 10 + r + i * gap, top + r, r, i < sim.lives);
  }
  return top + r * 2.2;
}

function drawReadout(ctx, top) {
  const pad = 10;
  const secs = sim.stage.length / speed();
  const lines = [
    `${viewport.cssW}×${viewport.cssH}px · scale ${viewport.scale.toFixed(3)}`,
    `시야 ${Math.round(viewport.viewW)}×${Math.round(viewport.viewH)}u · 지면 ${Math.round((viewport.cssH - viewport.groundScreenY) / viewport.scale)}u`,
    `베이컨 ${Math.round(BACON.h * viewport.scale)}px · 점프 ${Math.round(apex())}u · 속도 ${Math.round(speed())}u/s`,
    `스테이지 ${sim.stageNo} · 장애물 ${sim.stage.obstacles.length}개 · 완주 ${Math.round(secs)}초`,
    `되감기 ${sim.backSeconds}초 = ${Math.round(checkpointBack(sim.stage, sim.backSeconds))}u`,
  ];
  const fs = Math.max(10, Math.min(13, viewport.cssW / 34));

  ctx.save();
  ctx.font = `${fs}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2;
  const h = lines.length * fs * 1.5 + pad;
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.beginPath();
  ctx.roundRect(10, top, w, h, 8);
  ctx.fill();
  ctx.fillStyle = '#12303f';
  lines.forEach((l, i) => ctx.fillText(l, 10 + pad, top + pad * 0.6 + i * fs * 1.5));
  ctx.restore();
  return top + h;
}

function drawButtons(ctx) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const b of buttons) {
    ctx.fillStyle = b.action ? 'rgba(255,255,255,0.9)' : 'rgba(18,48,63,0.82)';
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(18,48,63,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = b.action ? '#12303f' : '#FFFFFF';
    ctx.font = `${b.fs}px system-ui, sans-serif`;
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
  }
  ctx.restore();
}

function render() {
  const { ctx } = viewport;
  beginFrame();
  drawBackground(ctx, sim.cameraX);
  drawApexGuide(ctx);
  drawEntities(ctx);

  const afterBar = drawProgress(ctx);
  const afterLives = drawLives(ctx, afterBar);
  readoutBottom = drawReadout(ctx, afterLives + 4);
  layoutButtons();
  drawButtons(ctx);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05); // 탭 전환 후 한 번에 크게 뛰는 것을 막는다
  last = now;
  if (!sim.paused) step(dt);
  else consumePress();
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
