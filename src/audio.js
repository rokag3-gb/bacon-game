// 소리 — 전부 Web Audio로 그 자리에서 합성한다. 오디오 파일이 없으므로
// 용량 0, 저작권 걱정 없음, 모바일에서 로딩 지연 없음.

const MUTE_KEY = 'bacon-game.muted';

let ac = null;
let master = null;
let muted = false;

try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  // 시크릿 모드 등에서 막히면 그냥 소리 켜진 상태로 간다
}

// 브라우저 자동재생 정책 때문에 첫 사용자 입력 전에는 소리를 낼 수 없다.
export function unlock() {
  if (ac) {
    if (ac.state === 'suspended') ac.resume();
    return;
  }
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = muted ? 0 : 0.28;
  master.connect(ac.destination);
  ensureTimer(); // 깨어나기 전에 요청해둔 배경음악이 있으면 여기서 시작한다
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.28;
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // 저장 못 해도 이번 판에서는 잘 동작한다
  }
  return muted;
}

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// 소리 하나. 주파수를 from에서 to로 훑으며 짧게 울린다.
function blip(from, to, dur, type = 'square', vol = 0.5, delay = 0) {
  if (!ac || muted) return;
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur, vol = 0.3, delay = 0) {
  if (!ac || muted) return;
  const t = ac.currentTime + delay;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  const gain = ac.createGain();
  src.buffer = buf;
  gain.gain.value = vol;
  src.connect(gain).connect(master);
  src.start(t);
}

export const sfx = {
  jump: () => blip(360, 760, 0.16, 'square', 0.4),
  stomp: () => {
    blip(700, 150, 0.14, 'square', 0.5);
    noise(0.1, 0.25);
  },
  hit: () => blip(400, 90, 0.4, 'sawtooth', 0.5),
  death: () => {
    blip(520, 80, 0.7, 'square', 0.45);
    noise(0.25, 0.2);
  },
  arrive: () => {
    [0, 0.09, 0.18, 0.3].forEach((d, i) => blip(midi(67 + i * 5), midi(67 + i * 5), 0.16, 'square', 0.45, d));
  },
  select: () => blip(620, 900, 0.07, 'square', 0.3),
  star: (i) => blip(midi(72 + i * 4), midi(76 + i * 4), 0.2, 'triangle', 0.4),
};

// ─── 배경음악 ───────────────────────────────────────────
// 16스텝 루프를 앞당겨 예약하는 방식. requestAnimationFrame에 맞추면
// 탭이 백그라운드로 가거나 프레임이 밀릴 때 박자가 흔들린다.

const TRACKS = {
  intro: {
    bpm: 96,
    lead: [72, null, 76, null, 79, null, 76, null, 74, null, 71, null, 67, null, null, null],
    bass: [48, null, 55, null, 48, null, 55, null, 45, null, 52, null, 43, null, 50, null],
  },
  stage: {
    bpm: 132,
    lead: [72, 76, 79, 76, 72, 74, 76, 74, 71, 74, 76, 74, 69, 71, 74, 71],
    bass: [48, 48, 55, 48, 53, 53, 60, 53, 50, 50, 57, 50, 43, 43, 50, 55],
  },
  ending: {
    bpm: 112,
    lead: [72, 74, 76, 79, 81, 79, 76, 79, 84, null, 81, null, 79, null, null, null],
    bass: [48, null, 55, null, 53, null, 60, null, 45, null, 52, null, 48, null, 55, null],
  },
};

let bgm = null;
let timer = null;

export function playBgm(name, tempoMul = 1) {
  if (bgm?.name === name && bgm?.tempoMul === tempoMul) return;
  const track = TRACKS[name];
  if (!track) return;
  stopBgm();
  bgm = { name, track, tempoMul, step: 0, nextTime: 0 };
  ensureTimer();
}

// 소리가 아직 안 깨어났으면 예약만 걸어두고, unlock() 때 이어서 시작한다.
// 테스트처럼 AudioContext가 아예 없는 환경에서는 타이머를 걸지 않는다 —
// 걸면 프로세스가 끝나지 않는다.
function ensureTimer() {
  if (!ac || !bgm || timer) return;
  timer = setInterval(schedule, 25);
  timer.unref?.();
}

export function stopBgm() {
  if (timer) clearInterval(timer);
  timer = null;
  bgm = null;
}

function schedule() {
  if (!ac || !bgm || muted) return;
  const { track, tempoMul } = bgm;
  const stepDur = 60 / (track.bpm * tempoMul) / 4; // 16분음표
  if (bgm.nextTime === 0) bgm.nextTime = ac.currentTime + 0.05;

  while (bgm.nextTime < ac.currentTime + 0.15) {
    const i = bgm.step % 16;
    const delay = bgm.nextTime - ac.currentTime;
    const lead = track.lead[i];
    const bass = track.bass[i];
    if (lead !== null && lead !== undefined) {
      blip(midi(lead), midi(lead), stepDur * 1.7, 'square', 0.16, delay);
    }
    if (bass !== null && bass !== undefined) {
      blip(midi(bass), midi(bass), stepDur * 1.5, 'triangle', 0.2, delay);
    }
    bgm.step++;
    bgm.nextTime += stepDur;
  }
}
