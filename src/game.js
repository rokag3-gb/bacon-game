// 씬 전환기.
//
// 씬은 이 모듈만 import하고, main.js가 씬을 등록한다. 이렇게 하면 씬끼리,
// 또는 씬과 main이 서로를 import하는 고리가 생기지 않는다.

export const game = {
  scenes: {},
  name: null,
  current: null,

  register(scenes) {
    this.scenes = scenes;
  },

  go(name, arg) {
    const next = this.scenes[name];
    if (!next) throw new Error(`없는 씬: ${name}`);
    this.current?.exit?.();
    this.name = name;
    this.current = next;
    next.enter?.(arg);
  },

  update(dt) {
    this.current?.update?.(dt);
  },

  render(ctx) {
    this.current?.render?.(ctx);
  },
};
