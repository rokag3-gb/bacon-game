// 소리는 귀로 확인해야 하지만, 곡 데이터가 어긋나는 건 여기서 잡을 수 있다.
// 성부 하나가 짧으면 그 뒤로는 undefined가 나와 소리 없이 조용해진다.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { installDom } from './_canvas.js';

installDom(844, 390);

const { TRACKS, isMuted, toggleMute, playBgm, stopBgm, sfx } = await import('../src/audio.js');

const VOICES = ['lead', 'counter', 'arp', 'bass', 'drum'];
const STEPS = 64;

test('모든 곡의 다섯 성부가 64스텝으로 맞아떨어진다', () => {
  for (const [name, t] of Object.entries(TRACKS)) {
    for (const v of VOICES) {
      assert.ok(Array.isArray(t[v]), `${name}.${v} 가 배열이 아니다`);
      assert.equal(t[v].length, STEPS, `${name}.${v} 가 ${t[v].length}스텝`);
    }
  }
});

test('음높이가 들을 수 있는 범위 안에 있다', () => {
  for (const [name, t] of Object.entries(TRACKS)) {
    for (const v of ['lead', 'counter', 'arp', 'bass']) {
      for (const [i, n] of t[v].entries()) {
        if (n === null || n === undefined) continue;
        assert.equal(typeof n, 'number', `${name}.${v}[${i}] 가 숫자가 아니다`);
        // 스테이지 5는 7반음 위로 올려 치므로 그만큼 여유를 두고 본다
        assert.ok(n >= 36 && n + 7 <= 96, `${name}.${v}[${i}] = ${n} 은 범위 밖`);
      }
    }
  }
});

test('드럼은 아는 소리만 쓴다', () => {
  for (const [name, t] of Object.entries(TRACKS)) {
    for (const [i, d] of t.drum.entries()) {
      if (d === null || d === undefined) continue;
      assert.ok(['k', 's', 'h'].includes(d), `${name}.drum[${i}] = ${d}`);
    }
  }
});

test('빠르기와 아르페지오 크기가 제정신인 값이다', () => {
  for (const [name, t] of Object.entries(TRACKS)) {
    assert.ok(t.bpm >= 60 && t.bpm <= 200, `${name} bpm ${t.bpm}`);
    assert.ok(t.arpVol > 0 && t.arpVol < 0.2, `${name} arpVol ${t.arpVol}`);
  }
});

test('플레이 곡은 인트로보다 빠르고 음이 촘촘하다', () => {
  assert.ok(TRACKS.stage.bpm > TRACKS.intro.bpm);
  const count = (t) => t.lead.filter((n) => n !== null).length;
  assert.ok(count(TRACKS.stage) > count(TRACKS.intro));
  assert.ok(TRACKS.intro.drum.every((d) => d === null), '인트로에 드럼이 들어갔다');
  assert.ok(TRACKS.stage.drum.some((d) => d !== null), '플레이에 드럼이 없다');
});

test('음소거는 껐다 켰다 된다', () => {
  const before = isMuted();
  assert.equal(toggleMute(), !before);
  assert.equal(isMuted(), !before);
  toggleMute();
  assert.equal(isMuted(), before);
});

// AudioContext가 없는 환경(테스트, 서버 렌더)에서도 조용히 넘어가야 한다
test('소리 장치가 없어도 터지지 않는다', () => {
  assert.doesNotThrow(() => {
    playBgm('stage', { tempo: 1.2, transpose: 5 });
    playBgm('없는곡');
    stopBgm();
    for (const play of Object.values(sfx)) play(0);
  });
});
