// 시드 기반 난수. 같은 시드면 항상 같은 스테이지가 나와야 하므로
// Math.random()은 스테이지 생성에 절대 쓰지 않는다.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// [min, max) 실수
export function randRange(rand, min, max) {
  return min + rand() * (max - min);
}

// 배열에서 하나 균등하게
export function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

// 새 시드 하나
export function newSeed() {
  return (Math.random() * 0xffffffff) >>> 0;
}
