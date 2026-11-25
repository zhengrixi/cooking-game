// A small seeded random number generator (mulberry32).
//
// The diner runs on this instead of Math.random so a scene is reproducible:
// the screenshot scenes and the logic tests pass a seed and get the same
// customers, in the same order, every time. Live play seeds it from the clock.

export function makeRng(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    // A float in [min, max).
    range(min, max) {
      return min + next() * (max - min);
    },
    // An integer in [min, max], both ends included.
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    // One item of an array.
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
    // True with the given probability.
    chance(probability) {
      return next() < probability;
    },
  };
}
