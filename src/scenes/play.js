// 본 게임.
//
// 베이컨은 스스로 달리지 않는다. 카메라가 나아가고 베이컨은 화면상 자기 자리를
// 따라갈 뿐이며, 조작은 점프 하나다. 스테이지 끝에서는 카메라가 멈추고 베이컨이
// 제 발로 팩맨에게 달려간다.

import { viewport, sx, sy, su } from '../viewport.js';
import { drawBackground } from '../scenery.js';
import { drawBacon, drawBagoom, drawObstacle, drawPacman } from '../sprites.js';
import { drawHearts, drawMinimap, drawIcons, drawPopup, drawCenterText, hitZone, ui, hudMargin } from '../ui.js';
import { consumePress, consumeMenu, input, setUiZones } from '../input.js';
import { playBgm, stopBgm, sfx, toggleMute, isMuted } from '../audio.js';
import { createBacon, updateBacon, baconBox } from '../bacon.js';
import { classifyBagoomHit } from '../physics.js';
import { buildStage, safeRespawnX, bagoomX } from '../stage.js';
import { stageScore, stars } from '../score.js';
import { game } from '../game.js';
import { state, seedFor } from '../state.js';
import { tuning } from '../tuning.js';
import {
  BACON, BAGOOM, JUMP_V0, INVULN_TIME, BLINK_HZ, DEATH_MARGIN, STAGE_COUNT,
} from '../config.js';

const PACMAN_SIZE = 160;
const ARRIVE_TIME = 0.9;

let stage = null;
let cameraX = 0;
let bacon = null;
let defeated = new Set();
let invuln = 0;
let arriving = null;   // { t } — 팩맨에게 들어가는 연출 중
let menu = null;       // { selected } — 나가기 팝업
let zones = [];
let pacX = 0;
let goalX = 0;
let clock = 0;   // 씬이 시작된 뒤 흐른 시간. 바굼의 서성임을 여기에 맞춘다.

const speed = () => stage.speed * tuning.speedMul;
const jumpV0 = () => JUMP_V0 * tuning.jumpMul;
const cameraMax = () => Math.max(0, stage.length - viewport.viewW);

export const play = {
  snapshot,

  enter() {
    stage = buildStage(state.stageNo, seedFor(state.stageNo));
    pacX = stage.length - PACMAN_SIZE - 60;
    goalX = pacX + PACMAN_SIZE * 0.32 - BACON.w / 2;
    cameraX = 0;
    bacon = createBacon(viewport.viewW * BACON.screenXRatio);
    defeated = new Set();
    invuln = 0;
    arriving = null;
    menu = null;
    clock = 0;
    // 스테이지가 올라갈수록 빠르고 높아진다 — 같은 곡인데 조여드는 느낌이 난다
    playBgm('stage', {
      tempo: 1 + (state.stageNo - 1) * 0.06,
      transpose: [0, 2, 3, 5, 7][state.stageNo - 1] ?? 0,
    });
  },

  exit() {
    stopBgm();
  },

  update(dt) {
    for (const key of consumeMenu()) {
      if (key === 'escape') toggleMenu();
      else if (menu && key === 'up') moveMenu(-1);
      else if (menu && key === 'down') moveMenu(1);
    }

    if (menu) {
      if (consumePress()) chooseMenu();
      return;
    }

    const pressed = consumePress();
    if (arriving) return updateArrival(dt);

    clock += dt;
    invuln = Math.max(0, invuln - dt);
    cameraX = Math.min(cameraX + speed() * dt, cameraMax());

    // 카메라가 끝에 닿으면 베이컨이 제 발로 팩맨까지 달려간다
    const desiredX =
      cameraX < cameraMax()
        ? cameraX + viewport.viewW * BACON.screenXRatio
        : Math.min(bacon.x + speed() * dt, goalX);

    const wasOnGround = bacon.onGround;
    updateBacon(bacon, dt, {
      desiredX,
      obstacles: nearbyObstacles(),
      pressed,
      held: input.held,
      jumpV0: jumpV0(),
      speed: speed(),
    });
    if (pressed && wasOnGround && !bacon.onGround) sfx.jump();

    if (checkBagooms()) return;

    // 장애물에 끼어 화면 왼쪽 끝까지 밀리면 사망
    if (bacon.x < cameraX + DEATH_MARGIN && squeezed()) return;

    if (bacon.x >= goalX - 0.5) {
      arriving = { t: 0 };
      stopBgm();
      sfx.arrive();
    }
  },

  onTap(x, y) {
    const z = hitZone(zones, x, y);
    if (!z) return;
    if (z.id === 'mute') {
      toggleMute();
      sfx.select();
    } else if (z.id === 'gear') {
      toggleMenu();
    } else if (z.index !== undefined) {
      menu.selected = z.index;
      chooseMenu();
    }
  },

  render(ctx) {
    drawBackground(ctx, cameraX);
    drawEntities(ctx);
    drawHud(ctx);
    if (tuning.show) drawTuning(ctx);
  },
};

// 눈금판과 테스트가 안을 들여다보기 위한 창. 읽기 전용으로만 쓴다.
export function snapshot() {
  return {
    stage, bacon, cameraX, invuln, arriving, defeated, goalX, clock,
    speed: speed(),
    // 바굼은 서성이므로 지금 어디 있는지를 같이 넘긴다
    bagoomsNow: stage.bagooms
      .map((g, i) => ({ i, x: bagoomX(g, clock) }))
      .filter((g) => !defeated.has(g.i)),
  };
}

// ─── 진행 ───────────────────────────────────────────────
function nearbyObstacles() {
  const lo = bacon.x - 400;
  const hi = bacon.x + viewport.viewW + 400;
  return stage.obstacles.filter((o) => o.x + o.w > lo && o.x < hi);
}

function checkBagooms() {
  const bb = baconBox(bacon);
  for (const [i, g] of stage.bagooms.entries()) {
    if (defeated.has(i)) continue;
    const gx = bagoomX(g, clock);
    if (Math.abs(gx - bacon.x) > 300) continue;
    const hit = classifyBagoomHit(bb, { x: gx, y: -BAGOOM.h, w: BAGOOM.w, h: BAGOOM.h }, bacon.vy);
    if (hit === 'stomp') {
      defeated.add(i);
      bacon.vy = -jumpV0() * 0.55;
      bacon.onGround = false;
      sfx.stomp();
    } else if (hit === 'hit') {
      return hurt();
    }
  }
  return false;
}

// 목숨 하나를 잃되 자리는 그대로 두는 경우. 바굼에 스쳤을 때가 이것이다.
// 되감으면 흐름이 끊겨 부자연스럽다 — 잠깐 무적으로 깜빡이며 그냥 달린다.
function hurt() {
  if (invuln > 0) return false;
  state.lives -= 1;
  if (state.lives <= 0) return gameOver();
  sfx.hit();
  invuln = INVULN_TIME;
  return false;
}

// 장애물에 끼어 화면 밖으로 밀렸을 때. 이쪽은 조금 뒤로 물러나 다시 붙는다.
function squeezed() {
  if (invuln > 0) return false;
  state.lives -= 1;
  if (state.lives <= 0) return gameOver();

  sfx.hit();
  const x = safeRespawnX(stage, bacon.x);
  cameraX = Math.max(0, x - viewport.viewW * BACON.screenXRatio);
  bacon.x = cameraX + viewport.viewW * BACON.screenXRatio;
  bacon.y = -BACON.h;
  bacon.vy = 0;
  bacon.onGround = true;
  bacon.blocked = false;
  invuln = INVULN_TIME;
  return false;
}

// 목숨을 다 쓰면 스테이지 시작 화면으로 되돌아간다. 시드가 같아 배치는 그대로다.
function gameOver() {
  sfx.death();
  stopBgm();
  game.go('stageIntro');
  return true;
}

function updateArrival(dt) {
  arriving.t += dt;
  if (arriving.t < ARRIVE_TIME) return;

  const result = stageScore({ bagoomsDefeated: defeated.size, livesLeft: state.lives });
  result.stageNo = state.stageNo;
  result.stars = stars(state.lives);
  state.results.push(result);
  state.totalScore += result.total;
  game.go('stageResult', result);
}

// ─── 메뉴 ───────────────────────────────────────────────
function toggleMenu() {
  menu = menu ? null : { selected: 0 };
  sfx.select();
}

function moveMenu(d) {
  menu.selected = (menu.selected + d + 2) % 2;
  sfx.select();
}

function chooseMenu() {
  const yes = menu.selected === 1;
  menu = null;
  sfx.select();
  if (yes) {
    stopBgm();
    game.go('intro');
  }
}

// ─── 그리기 ─────────────────────────────────────────────
function drawEntities(ctx) {
  const s = viewport.scale;

  for (const o of stage.obstacles) {
    const px = sx(o.x, cameraX);
    if (px > viewport.cssW + 40 || px + su(o.w) < -40) continue;
    drawObstacle(ctx, o.kind, px, sy(-o.h), su(o.w), su(o.h), s);
  }

  const baconCx = bacon.x + BACON.w / 2;
  const baconCy = bacon.y + BACON.h / 2;
  for (const [i, g] of stage.bagooms.entries()) {
    const gx = bagoomX(g, clock);
    const px = sx(gx, cameraX);
    if (px > viewport.cssW + 40 || px + su(BAGOOM.w) < -40) continue;

    // 몸은 가만히 있고 눈동자만 베이컨을 좇는다
    const dx = baconCx - (gx + BAGOOM.w / 2);
    const dy = baconCy - -BAGOOM.h * 0.55;
    const len = Math.max(60, Math.hypot(dx, dy));
    drawBagoom(ctx, px, sy(-BAGOOM.h), s, {
      phase: g.phase + clock * 4,
      squashed: defeated.has(i),
      look: { x: dx / len, y: dy / len },
    });
  }

  const ppx = sx(pacX, cameraX);
  if (ppx < viewport.cssW + 200 && ppx > -su(PACMAN_SIZE) - 200) {
    drawPacman(ctx, ppx, sy(-PACMAN_SIZE), su(PACMAN_SIZE), s, {
      chomp: performance.now() * 0.006,
    });
  }

  drawBaconNow(ctx, s);
}

function drawBaconNow(ctx, s) {
  // 팩맨 입으로 빨려 들어가는 연출 — 입 가운데로 옮겨가며 작아진다
  if (arriving) {
    const k = Math.min(1, arriving.t / ARRIVE_TIME);
    const ease = k * k;
    const mouthX = sx(pacX + PACMAN_SIZE * 0.42, cameraX);
    const mouthY = sy(-PACMAN_SIZE * 0.5);
    const px = sx(bacon.x, cameraX) + (mouthX - sx(bacon.x, cameraX)) * ease;
    const py = sy(bacon.y) + (mouthY - sy(bacon.y)) * ease;
    const shrink = s * (1 - ease * 0.92);
    if (shrink > 0.01) {
      drawBacon(ctx, px, py, shrink, { runPhase: arriving.t * 20 });
    }
    return;
  }

  // 무적 동안 깜빡인다 — 보였다 안 보였다 해야 무적인 게 눈에 띈다
  const off = invuln > 0 && Math.floor((performance.now() / 1000) * BLINK_HZ) % 2 === 1;
  if (off) return;
  drawBacon(ctx, sx(bacon.x, cameraX), sy(bacon.y), s, {
    runPhase: bacon.runPhase,
    airborne: !bacon.onGround,
    hurt: invuln > 0,
  });
}

function drawHud(ctx) {
  const m = hudMargin();
  const icons = drawIcons(ctx, { muted: isMuted() });
  const iconBottom = icons[0].y + icons[0].h;

  const hearts = drawHearts(ctx, state.lives, m, m);
  const mapY = iconBottom + Math.max(22, m * 1.1);
  drawMinimap(ctx, bacon.x / stage.length, m + 16, mapY, viewport.cssW - m * 2 - 32);

  ctx.save();
  ctx.font = `bold ${ui(14)}px system-ui, sans-serif`;
  ctx.fillStyle = '#FBF6EE';
  ctx.strokeStyle = '#12303f';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const label = `스테이지 ${state.stageNo} / ${STAGE_COUNT}`;
  ctx.strokeText(label, m, m + hearts.h + 2);
  ctx.fillText(label, m, m + hearts.h + 2);
  ctx.restore();

  zones = [...icons];

  if (arriving) {
    drawCenterText(ctx, '냠!', null, 0.3, 1 - arriving.t / ARRIVE_TIME);
  }

  if (menu) {
    const items = drawPopup(ctx, {
      title: '게임에서 나가시겠습니까?',
      lines: ['지금까지의 점수는 사라집니다'],
      items: ['아니오', '예'],
      selected: menu.selected,
      accent: '#E8553F',
    });
    zones = [...items, ...icons];
  }

  setUiZones(zones);
}

function drawTuning(ctx) {
  const lines = [
    `scale ${viewport.scale.toFixed(3)} · 시야 ${Math.round(viewport.viewW)}×${Math.round(viewport.viewH)}u`,
    `속도 ${Math.round(speed())} u/s (- =) · 점프 ${Math.round((jumpV0() ** 2) / 5200)}u ([ ])`,
    `장애물 ${stage.obstacles.length} · 바굼 ${defeated.size}/${stage.bagooms.length}`,
  ];
  const fs = ui(12);
  ctx.save();
  ctx.font = `${fs}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20;
  const y = viewport.cssH - lines.length * fs * 1.5 - 18;
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.beginPath();
  ctx.roundRect(10, y, w, lines.length * fs * 1.5 + 10, 8);
  ctx.fill();
  ctx.fillStyle = '#12303f';
  lines.forEach((l, i) => ctx.fillText(l, 20, y + 6 + i * fs * 1.5));
  ctx.restore();
}
