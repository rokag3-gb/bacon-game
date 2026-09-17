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

// ─── 장애물 ─────────────────────────────────────────────
// 크기는 "가장 느린 스테이지에서도 넘을 수 있는가"로 역산한 값이다.
// 오토러너에서는 스크롤이 느릴수록 체공 중 이동 거리가 짧아 오히려 넘기 어렵다.
export const OBSTACLE_KINDS = [
  { kind: 'bush',  w: 60, h: 55  },  // 덤불
  { kind: 'brick', w: 45, h: 100 },  // 벽돌 기둥
  { kind: 'pipe',  w: 50, h: 120 },  // 주황 지붕 토관
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
export const BAGOOM_MIN_SEPARATION = 150; // 바굼끼리 최소 간격

// ─── 목숨 / 부활 ────────────────────────────────────────
export const MAX_LIVES = 3;
export const CHECKPOINT_BACK = 1200;  // 죽은 지점에서 이만큼 뒤로 물러나 재개
export const INVULN_TIME = 1.5;       // 부활 후 무적 (초)
export const DEATH_MARGIN = 20;       // 카메라 왼쪽 끝에서 이만큼 밀리면 사망

// ─── 점수 ───────────────────────────────────────────────
export const SCORE = {
  bagoom: 100,
  arrival: 500,
  perLife: 200,
};
