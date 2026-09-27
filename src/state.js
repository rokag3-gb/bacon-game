// 게임 한 판을 가로지르는 상태. 씬이 바뀌어도 살아남는 것만 여기 둔다.
// 스테이지 안에서만 쓰는 것(카메라, 베이컨, 잡은 바굼)은 play 씬이 들고 있다.

import { MAX_LIVES, STAGE_COUNT, START_STAGE } from './config.js';
import { newSeed } from './rng.js';

export const state = {
  stageNo: START_STAGE,
  lives: MAX_LIVES,
  totalScore: 0,
  results: [],        // 스테이지별 { stageNo, bagoom, arrival, lives, total, stars }
  seeds: {},          // 스테이지 번호 → 시드
};

export function resetGame() {
  state.stageNo = START_STAGE;   // 임시로 3부터 (config.js 의 START_STAGE)
  state.lives = MAX_LIVES;
  state.totalScore = 0;
  state.results = [];
  state.seeds = {};
}

// 스테이지 시드는 처음 들어갈 때 한 번만 뽑는다. 목숨을 다 써서 다시 시작해도
// 같은 시드를 쓰므로 장애물 배치가 그대로다.
export function seedFor(stageNo) {
  if (state.seeds[stageNo] === undefined) state.seeds[stageNo] = newSeed();
  return state.seeds[stageNo];
}

export function isLastStage(stageNo = state.stageNo) {
  return stageNo >= STAGE_COUNT;
}

export function totalStars() {
  return state.results.reduce((a, r) => a + r.stars, 0);
}
