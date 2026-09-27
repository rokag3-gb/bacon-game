import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildStage, safeRespawnX, checkpointBack } from '../src/stage.js';
import {
  STAGES,
  BACON,
  BAGOOM,
  START_CLEAR,
  END_CLEAR,
  BAGOOM_SEPARATION_FACTOR,
  OBSTACLE_GAP_FACTOR,
  BAGOOM_GAP_FACTOR,
  CHECKPOINT_BACK_SECONDS,
  SIGHT_W,
  BAGOOM_PERCH,
  RESPAWN_CLEARANCE,
} from '../src/config.js';
import { airDistance, canClear } from '../src/physics.js';

const SEEDS = [1, 7, 42, 1234, 99999, 2026];
const stageNos = STAGES.map((_, i) => i + 1);

function eachStage(fn) {
  for (const n of stageNos) for (const seed of SEEDS) fn(buildStage(n, seed), n, seed);
}

test('같은 시드는 같은 배치를 만든다', () => {
  for (const n of stageNos) {
    assert.deepEqual(buildStage(n, 12345), buildStage(n, 12345));
  }
});

test('다른 시드는 다른 배치를 만든다', () => {
  for (const n of stageNos) {
    const a = buildStage(n, 1);
    const b = buildStage(n, 2);
    assert.notDeepEqual(a.obstacles, b.obstacles);
  }
});

test('장애물과 바굼 개수가 수치 테이블과 같다', () => {
  eachStage((s, n) => {
    assert.equal(s.obstacles.length, STAGES[n - 1].obstacles, `스테이지 ${n} 장애물`);
    assert.equal(s.bagooms.length, STAGES[n - 1].bagooms, `스테이지 ${n} 바굼`);
  });
});

test('시작 구간과 팩맨 앞 구간은 비어 있다', () => {
  eachStage((s, n, seed) => {
    for (const o of s.obstacles) {
      assert.ok(o.x >= START_CLEAR, `스테이지 ${n}/${seed}: 장애물이 시작 구간에 있다`);
      assert.ok(o.x + o.w <= s.length - END_CLEAR, `스테이지 ${n}/${seed}: 장애물이 끝 구간에 있다`);
    }
    for (const b of s.bagooms) {
      assert.ok(b.x >= START_CLEAR, `스테이지 ${n}/${seed}: 바굼이 시작 구간에 있다`);
      assert.ok(b.x + BAGOOM.w <= s.length - END_CLEAR, `스테이지 ${n}/${seed}: 바굼이 끝 구간에 있다`);
    }
  });
});

// 장애물은 2~3개가 붙어 한 무리를 이루기도 한다. 최소 간격은 무리와 무리
// 사이에 적용된다 — 무리 안은 일부러 붙여 놓은 것이다.
test('무리 사이 최소 간격을 지킨다 — 깰 수 없는 구간이 없다', () => {
  eachStage((s, n, seed) => {
    const minGap = airDistance(s.speed) * OBSTACLE_GAP_FACTOR;
    for (let i = 1; i < s.groups.length; i++) {
      const prev = s.groups[i - 1];
      const gap = s.groups[i].x - (prev.x + prev.w);
      assert.ok(
        gap >= minGap - 0.001,
        `스테이지 ${n}/${seed}: ${i}번 무리 간격 ${gap.toFixed(1)}u < ${minGap.toFixed(1)}u`,
      );
    }
  });
});

test('무리 안의 장애물은 딱 붙어 있다', () => {
  eachStage((s, n, seed) => {
    const byGroup = new Map();
    for (const o of s.obstacles) {
      if (!byGroup.has(o.group)) byGroup.set(o.group, []);
      byGroup.get(o.group).push(o);
    }
    for (const [gi, parts] of byGroup) {
      assert.ok(parts.length <= 6, `스테이지 ${n}/${seed}: ${gi}번 무리가 ${parts.length}개`);
      for (let i = 1; i < parts.length; i++) {
        const gap = parts[i].x - (parts[i - 1].x + parts[i - 1].w);
        assert.ok(gap >= 0 && gap <= 12, `스테이지 ${n}/${seed}: 무리 안 간격 ${gap.toFixed(1)}u`);
      }
    }
  });
});

// 장애물 위에 올라앉은 바굼은 이 규칙에서 빠진다 — 일부러 그 위에 둔 것이다
test('잔디밭 바굼은 장애물에서 충분히 떨어져 있다', () => {
  eachStage((s, n, seed) => {
    const clearance = airDistance(s.speed) * BAGOOM_GAP_FACTOR;
    for (const b of s.bagooms) {
      if (b.perch) continue;
      for (const o of s.obstacles) {
        const gap = b.x > o.x ? b.x - (o.x + o.w) : o.x - (b.x + BAGOOM.w);
        assert.ok(
          gap >= clearance - 0.001,
          `스테이지 ${n}/${seed}: 바굼(${b.x.toFixed(0)})과 ${o.kind}(${o.x.toFixed(0)}) 간격 ${gap.toFixed(1)}u`,
        );
      }
    }
  });
});

// 바굼 둘이 붙어 있으면, 앞 바굼을 뛰어넘어 착지하는 순간 뒤 바굼에 닿아 죽는다.
// 그래서 간격도 속도에 맞춰 늘어나야 한다.
// 바굼도 스테이지 3부터 2~3마리가 붙어 한 무리를 이룬다. 최소 간격은
// 무리와 무리 사이에 적용된다.
test('잔디밭 바굼 무리끼리 한 번 뛸 거리보다 넓게 떨어져 있다', () => {
  eachStage((s, n, seed) => {
    const sep = airDistance(s.speed) * BAGOOM_SEPARATION_FACTOR;
    const lawn = s.bagooms.filter((b) => !b.perch);
    for (let i = 1; i < lawn.length; i++) {
      const prev = lawn[i - 1];
      const cur = lawn[i];
      const gap = cur.x - (prev.x + BAGOOM.w);
      if (cur.group === prev.group) {
        assert.ok(gap >= 0 && gap <= 12, `스테이지 ${n}/${seed}: 무리 안 바굼 간격 ${gap.toFixed(1)}u`);
      } else {
        assert.ok(gap >= sep - 0.001, `스테이지 ${n}/${seed}: 바굼 무리 간격 ${gap.toFixed(1)}u < ${sep.toFixed(1)}u`);
      }
    }
  });
});

// ─── 장애물 위의 바굼 ───────────────────────────────────

test('바굼 일부만 장애물 위에서 시작한다 — 전부는 아니다', () => {
  for (const n of stageNos) {
    let perch = 0;
    let total = 0;
    for (const seed of SEEDS) {
      const s = buildStage(n, seed);
      for (const b of s.bagooms) {
        total++;
        if (b.perch) perch++;
      }
    }
    const share = perch / total;
    if (n < BAGOOM_PERCH.fromStage) {
      assert.equal(perch, 0, `스테이지 ${n}: 아직 나오면 안 된다`);
    } else {
      assert.ok(share > 0.1, `스테이지 ${n}: ${(share * 100).toFixed(0)}% 뿐`);
      assert.ok(share < 0.45, `스테이지 ${n}: ${(share * 100).toFixed(0)}% — 너무 많다`);
    }
  }
});

test('장애물 위 바굼은 그 장애물 꼭대기에 정확히 서 있다', () => {
  eachStage((s, n, seed) => {
    for (const b of s.bagooms) {
      if (!b.perch) continue;
      const under = s.obstacles.find((o) => b.x + BAGOOM.w > o.x && b.x < o.x + o.w);
      assert.ok(under, `스테이지 ${n}/${seed}: 밑에 장애물이 없다`);
      assert.ok(
        Math.abs(b.startY + BAGOOM.h - -under.h) < 0.001,
        `스테이지 ${n}/${seed}: 꼭대기(${-under.h})가 아니라 ${(b.startY + BAGOOM.h).toFixed(1)}에 있다`,
      );
    }
  });
});

// 높은 장애물 위에 올리면 둘을 합친 높이를 한 번에 넘어야 해서 넘기 빡빡해진다.
// 무리 안에 올릴 때는 그 무리의 최고 높이를 넘지 않아야 난이도가 그대로다.
test('장애물 위 바굼이 넘어야 할 높이를 키우지 않는다', () => {
  eachStage((s, n, seed) => {
    const size = new Map();
    const maxH = new Map();
    for (const o of s.obstacles) {
      size.set(o.group, (size.get(o.group) || 0) + 1);
      maxH.set(o.group, Math.max(maxH.get(o.group) || 0, o.h));
    }
    for (const b of s.bagooms) {
      if (!b.perch) continue;
      const under = s.obstacles.find((o) => b.x + BAGOOM.w > o.x && b.x < o.x + o.w);
      assert.ok(under.h <= BAGOOM_PERCH.maxHeight, `스테이지 ${n}/${seed}: ${under.kind}(${under.h}u) 위에 있다`);
      if (size.get(under.group) > 1) {
        assert.ok(
          under.h + BAGOOM.h <= maxH.get(under.group),
          `스테이지 ${n}/${seed}: 무리 최고 높이(${maxH.get(under.group)})를 넘겨 ${under.h + BAGOOM.h} 이 됐다`,
        );
      }
    }
  });
});

test('잔디밭 바굼은 지면에서 시작한다', () => {
  eachStage((s) => {
    for (const b of s.bagooms) {
      if (b.perch) continue;
      assert.equal(b.startY, -BAGOOM.h);
    }
  });
});

// 서성임 주기는 바굼마다 난수로 뽑은 뒤 스테이지 배율을 곱한다. 한 스테이지에
// 7~26마리뿐이라 시드 하나로 평균 내면 난수 편차가 9% 증가분을 덮는다.
test('스테이지가 올라갈수록 바굼이 부지런해진다', () => {
  const averages = stageNos.map((n) => {
    let sum = 0;
    let count = 0;
    for (let seed = 1; seed <= 120; seed++) {
      for (const b of buildStage(n, seed).bagooms) {
        sum += b.rate;
        count++;
      }
    }
    return sum / count;
  });

  for (let i = 1; i < averages.length; i++) {
    assert.ok(
      averages[i] > averages[i - 1] * 1.04,
      `스테이지 ${i + 1}: 평균 ${averages[i].toFixed(3)} (이전 ${averages[i - 1].toFixed(3)})`,
    );
  }
  assert.ok(averages[4] / averages[0] > 1.25, `1→5 배율이 ${(averages[4] / averages[0]).toFixed(2)}배 뿐`);
});

test('바굼 무리는 스테이지 3부터만 나온다', () => {
  for (const n of stageNos) {
    for (const seed of SEEDS) {
      const s = buildStage(n, seed);
      const sizes = new Set(s.bagooms.map((b) => b.cluster));
      if (n < 3) assert.deepEqual([...sizes].sort(), [1], `스테이지 ${n}/${seed}: 무리가 생겼다`);
      for (const size of sizes) assert.ok(size <= 3, `스테이지 ${n}: ${size}마리 무리`);
    }
  }
});

test('한 무리의 바굼은 같은 박자로 함께 서성인다', () => {
  eachStage((s, n, seed) => {
    const byGroup = new Map();
    for (const b of s.bagooms) {
      if (!byGroup.has(b.group)) byGroup.set(b.group, []);
      byGroup.get(b.group).push(b);
    }
    for (const parts of byGroup.values()) {
      for (const b of parts) {
        assert.equal(b.rate, parts[0].rate, `스테이지 ${n}/${seed}: 무리 안에서 박자가 다르다`);
        assert.equal(b.phase, parts[0].phase);
        assert.equal(b.amp, parts[0].amp);
      }
    }
  });
});

// 붙어 있는 무리는 통째로 넘어야 한다. 제일 높은 놈 위에 머무는 동안
// 무리 전체 폭을 지나갈 수 있어야 한다는 뜻이다.
test('배치된 무리는 전부 한 번의 점프로 넘을 수 있다', () => {
  eachStage((s, n, seed) => {
    const byGroup = new Map();
    for (const o of s.obstacles) {
      if (!byGroup.has(o.group)) byGroup.set(o.group, []);
      byGroup.get(o.group).push(o);
    }
    for (const [gi, parts] of byGroup) {
      const width = Math.max(...parts.map((p) => p.x + p.w)) - Math.min(...parts.map((p) => p.x));
      const height = Math.max(...parts.map((p) => p.h));
      assert.ok(
        canClear(height, width, BACON.w, s.speed),
        `스테이지 ${n}/${seed}: ${gi}번 무리(${parts.length}개, 폭 ${width.toFixed(0)}u, 높이 ${height}u)를 넘을 수 없다`,
      );
    }
  });
});

test('장애물은 x 오름차순이다', () => {
  eachStage((s) => {
    for (let i = 1; i < s.obstacles.length; i++) {
      assert.ok(s.obstacles[i].x > s.obstacles[i - 1].x);
    }
  });
});

// 장애물 빈도는 스테이지 2쯤에서 물리적 한계에 닿아 더 오르지 못한다.
// 최소 간격이 체공시간 × 속도 × 1.6 이라, 빠른 스테이지일수록 오히려
// 빽빽하게 넣을 수 없기 때문이다. 그래서 난이도가 오르는지는 다른 두 가지로 본다.
test('스테이지가 올라갈수록 피해야 할 것이 많아진다', () => {
  let prev = 0;
  for (const n of stageNos) {
    const s = buildStage(n, 777);
    const total = s.obstacles.length + s.bagooms.length;
    assert.ok(total > prev, `스테이지 ${n}: ${total}개로 이전(${prev}개)보다 적다`);
    prev = total;
  }
});

test('스테이지가 올라갈수록 반응할 시간이 짧아진다', () => {
  let prev = Infinity;
  for (const n of stageNos) {
    const s = buildStage(n, 777);
    // 장애물이 화면 오른쪽 끝에 나타나 베이컨에게 닿기까지의 시간
    const reaction = (SIGHT_W * (1 - BACON.screenXRatio)) / s.speed;
    assert.ok(reaction < prev, `스테이지 ${n}: 반응 시간 ${reaction.toFixed(2)}초가 이전보다 길다`);
    prev = reaction;
  }
});

// 장애물을 한계까지 채우면 나눠 쓸 여유가 사라져 모든 틈이 최소 간격에 딱
// 붙는다 — 배치가 균일해져 오히려 예측 가능해진다. 평균 간격이 바닥의 1.25배는
// 되어야 리듬을 만들 여지가 남는다.
//
// (장애물 개수로 한계를 재던 예전 방식은 무리를 고려하지 못했다. 2~3개가 한
//  간격을 나눠 쓰므로 장애물 수는 간격 수보다 많을 수 있다.)
test('배치에 리듬을 만들 여유가 남아 있다', () => {
  for (const n of stageNos) {
    const minGap = airDistance(STAGES[n - 1].speed) * OBSTACLE_GAP_FACTOR;
    const gaps = [];
    for (const seed of SEEDS) {
      const s = buildStage(n, seed);
      for (let i = 1; i < s.groups.length; i++) {
        gaps.push(s.groups[i].x - (s.groups[i - 1].x + s.groups[i - 1].w));
      }
    }
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    assert.ok(
      mean >= minGap * 1.25,
      `스테이지 ${n}: 평균 간격이 바닥의 ${(mean / minGap).toFixed(2)}배 뿐 — 벽처럼 빽빽하다`,
    );
  }
});

// ─── 부활 지점 ──────────────────────────────────────────

test('되감기는 거리가 아니라 시간이라 스테이지마다 같은 만큼 되돌아간다', () => {
  for (const n of stageNos) {
    const s = buildStage(n, 55);
    const back = checkpointBack(s);
    assert.ok(
      Math.abs(back / s.speed - CHECKPOINT_BACK_SECONDS) < 0.001,
      `스테이지 ${n}: ${(back / s.speed).toFixed(2)}초`,
    );
  }
  // 빠른 스테이지일수록 되감기는 거리가 길어야 시간이 같아진다
  assert.ok(checkpointBack(buildStage(5, 1)) > checkpointBack(buildStage(1, 1)));
});

test('부활 지점은 장애물과 바굼에서 떨어져 있다', () => {
  eachStage((s, n, seed) => {
    // 스테이지 곳곳에서 죽어봤다고 치고 전부 확인한다
    for (let deathX = 500; deathX < s.length; deathX += 700) {
      const x = safeRespawnX(s, deathX);
      assert.ok(x >= 0, `음수 좌표 ${x}`);
      for (const o of s.obstacles) {
        const clear = x + BACON.w + RESPAWN_CLEARANCE <= o.x || x >= o.x + o.w + RESPAWN_CLEARANCE;
        assert.ok(clear, `스테이지 ${n}/${seed}: 부활 ${x.toFixed(0)} 이 ${o.kind}(${o.x.toFixed(0)})에 붙었다`);
      }
      for (const g of s.bagooms) {
        const clear = x + BACON.w + RESPAWN_CLEARANCE <= g.x || x >= g.x + BAGOOM.w + RESPAWN_CLEARANCE;
        assert.ok(clear, `스테이지 ${n}/${seed}: 부활 ${x.toFixed(0)} 이 바굼(${g.x.toFixed(0)})에 붙었다`);
      }
    }
  });
});

test('부활 지점은 죽은 자리보다 반드시 뒤다', () => {
  eachStage((s) => {
    for (let deathX = 2000; deathX < s.length; deathX += 900) {
      assert.ok(safeRespawnX(s, deathX) < deathX);
    }
  });
});

test('되감기 초를 늘리면 더 뒤로 간다', () => {
  const s = buildStage(3, 2026);
  const near = safeRespawnX(s, 15000, 4);
  const far = safeRespawnX(s, 15000, 12);
  assert.ok(far < near, `4초 ${near.toFixed(0)} vs 12초 ${far.toFixed(0)}`);
});

test('없는 스테이지는 거부한다', () => {
  assert.throws(() => buildStage(0, 1));
  assert.throws(() => buildStage(6, 1));
});
