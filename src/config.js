// 게임 전체 수치. 설계 문서 docs/superpowers/specs/2026-09-26-bacon-game-design.md 기준.

// ─── 화면 ───────────────────────────────────────────────
// 게임 로직은 전부 월드 유닛(u)으로 계산하고, 그릴 때만 픽셀로 환산한다.
export const SIGHT_W = 900;      // 가로로 항상 보이는 거리
export const MIN_VIEW_H = 460;   // 세로로 최소한 보여야 하는 높이 (점프 224 + 키 100 + 여유)

// ─── 물리 ───────────────────────────────────────────────
export const GRAVITY = 2600;     // u/s²
export const JUMP_V0 = 1080;     // u/s → 최고점 224u, 체공 0.83초
export const JUMP_CUT = 0.45;    // 버튼을 떼면 상승 속도를 이 비율로 깎는다
export const JUMP_MIN_HOLD = 0.08; // 그 전까지는 떼도 안 깎는다 (초)

export const BACON = {
  w: 46,
  h: 100,
  screenXRatio: 0.30,  // 화면 왼쪽에서 30% 지점이 기본 자리
};

export const JUMP_APEX = (JUMP_V0 * JUMP_V0) / (2 * GRAVITY); // 224u
// 액션이 벌어지는 띠의 높이 — 지면부터 점프한 베이컨의 머리끝까지
export const ACTION_BAND = BACON.h + JUMP_APEX;               // 324u

// 지면을 화면 아래에서 얼마나 띄울지.
//
// 가로에서는 화면의 22% 지점(최대 150u)이면 충분하다. 그런데 세로에서는
// 그 규칙을 그대로 쓰면 액션이 화면 맨 아래에 깔려버린다. 그래서 화면이
// 세로로 길어질수록 지면을 tallMax까지 끌어올려 잔디밭이 화면을 받치게 한다.
// tallFrom~tallTo 사이에서 부드럽게 올라가므로 창을 줄일 때 툭 튀지 않는다.
// 지면 위로는 ACTION_BAND 만큼이 반드시 남아야 하므로 viewport에서 한 번 더 막는다.
export const GROUND_FROM_BOTTOM = {
  ratio: 0.22,
  min: 90,
  max: 150,              // 가로에서의 상한
  tallMax: 500,          // 세로에서 도달할 높이
  tallFrom: 0.75,        // viewH / viewW 가 이 값을 넘으면 올라가기 시작
  tallTo: 1.0,           // 이 값에서 완전히 올라간다
};

export const BAGOOM = {
  w: 50,
  h: 50,
  stompTolerance: 15,  // 발이 바굼 상단 이 범위에 들어오면 밟기로 친다
};

// 바굼은 제자리에서 느릿느릿 좌우로 서성인다. 주기가 서로 어긋나는 사인파 둘을
// 겹쳐 규칙적으로 보이지 않게 한다.
export const BAGOOM_WANDER = {
  minAmp: 20, maxAmp: 45,      // 좌우로 흔들리는 폭 (u)
  minRate: 0.25, maxRate: 0.6, // 느리게
};

// 밀린 뒤 제자리로 돌아오는 속도. 스크롤 속도의 이 배수만큼 더 빨리 달려 따라잡는다.
// 0이면 영영 못 따라잡고, 너무 크면 순간이동처럼 보인다.
export const CATCHUP_FACTOR = 0.6;

// ─── 장애물 ─────────────────────────────────────────────
// 크기는 "가장 느린 스테이지에서도 넘을 수 있는가"로 역산한 값이다.
// 오토러너에서는 스크롤이 느릴수록 체공 중 이동 거리가 짧아 오히려 넘기 어렵다.
export const OBSTACLE_KINDS = [
  { kind: 'bush',  w: 60, h: 55  },  // 덤불
  { kind: 'brick', w: 45, h: 100 },  // 벽돌 기둥
  { kind: 'pipe',  w: 52, h: 110 },  // 토관 (마리오식 초록 관)
  { kind: 'tower', w: 50, h: 120 },  // 주황 지붕 기둥 — 아이 그림의 그것
  { kind: 'tree',  w: 55, h: 135 },  // 침엽수
];

// ─── 스테이지 ───────────────────────────────────────────
// 난이도는 스크롤 속도와 출현 빈도 두 가지로만 올린다.
// 장애물의 종류와 크기는 스테이지와 무관하다 (전 스테이지 균등 확률).
export const STAGES = [
  { speed: 220, length: 16000, obstacles: 8,  bagooms: 4  },
  { speed: 260, length: 20000, obstacles: 14, bagooms: 7  },
  { speed: 300, length: 26000, obstacles: 22, bagooms: 11 },
  { speed: 340, length: 32000, obstacles: 30, bagooms: 15 },
  { speed: 380, length: 38000, obstacles: 40, bagooms: 20 },
];

export const STAGE_COUNT = STAGES.length;

// 배치 규칙
export const START_CLEAR = 1500;      // 스테이지 시작 후 비워두는 구간
export const END_CLEAR = 800;         // 팩맨 앞 비워두는 구간
export const OBSTACLE_GAP_FACTOR = 1.6;  // 장애물 사이 최소 간격 = 체공거리 × 이 값
export const BAGOOM_GAP_FACTOR = 0.8;    // 바굼과 장애물 사이 최소 간격

// 바굼끼리 최소 간격 = 체공거리 × 이 값.
// 이것도 속도에 맞춰 늘어나야 한다. 고정 거리로 두면 빠른 스테이지에서 바굼 둘이
// 붙어, 앞 바굼을 넘어 착지하는 순간 뒤 바굼에 닿아 죽는 구간이 생긴다.
// 1보다 크게 잡아 한 번 뛰고 착지했을 때 다음 바굼까지 여유가 남게 한다.
export const BAGOOM_SEPARATION_FACTOR = 1.2;

// ─── 목숨 / 부활 ────────────────────────────────────────
export const MAX_LIVES = 3;

// 죽은 지점에서 얼마나 뒤로 물러나 재개할지.
//
// 거리가 아니라 시간으로 잡는다. 고정 거리(예전 1200u)로 하면 스크롤이 빠른
// 뒷 스테이지일수록 되감기는 시간이 짧아져, 정작 어려운 스테이지에서 되돌아가는
// 맛이 사라진다. 초로 잡으면 어느 스테이지에서든 같은 만큼 되감긴다.
export const CHECKPOINT_BACK_SECONDS = 8;

export const RESPAWN_CLEARANCE = 60;  // 부활 지점과 장애물 사이 최소 여유
export const INVULN_TIME = 2.0;       // 부활 후 무적 (초)
export const BLINK_HZ = 7;            // 무적 동안 깜빡이는 빈도
export const DEATH_MARGIN = 20;       // 카메라 왼쪽 끝에서 이만큼 밀리면 사망

// ─── 점수 ───────────────────────────────────────────────
export const SCORE = {
  bagoom: 100,
  arrival: 500,
  perLife: 200,
};
