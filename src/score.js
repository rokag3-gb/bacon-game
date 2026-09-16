import { SCORE, MAX_LIVES } from './config.js';

// 스테이지 클리어 점수 내역
export function stageScore({ bagoomsDefeated, livesLeft }) {
  const bagoom = bagoomsDefeated * SCORE.bagoom;
  const arrival = SCORE.arrival;
  const lives = livesLeft * SCORE.perLife;
  return {
    bagoomsDefeated,
    bagoom,
    arrival,
    livesLeft,
    lives,
    total: bagoom + arrival + lives,
  };
}

// 남은 목숨으로 별 등급을 매긴다. 목숨 3개면 ★★★.
export function stars(livesLeft) {
  return Math.max(0, Math.min(MAX_LIVES, livesLeft));
}
