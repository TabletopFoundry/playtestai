import { describe, expect, it } from "vitest";
import { createRng, shuffle } from "../rng";

describe("createRng", () => {
  it("produces deterministic output for the same seed", () => {
    const rng1 = createRng(42);
    const rng2 = createRng(42);

    const values1 = Array.from({ length: 10 }, () => rng1());
    const values2 = Array.from({ length: 10 }, () => rng2());

    expect(values1).toEqual(values2);
  });

  it("produces values in [0, 1) range", () => {
    const rng = createRng(123);
    for (let i = 0; i < 1000; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("produces different output for different seeds", () => {
    const rng1 = createRng(1);
    const rng2 = createRng(2);

    const values1 = Array.from({ length: 5 }, () => rng1());
    const values2 = Array.from({ length: 5 }, () => rng2());

    expect(values1).not.toEqual(values2);
  });
});

describe("shuffle", () => {
  it("returns a new array with the same elements", () => {
    const items = [1, 2, 3, 4, 5];
    const rng = createRng(42);
    const shuffled = shuffle(items, rng);

    expect(shuffled).toHaveLength(items.length);
    expect(shuffled.sort()).toEqual([...items].sort());
  });

  it("does not mutate the original array", () => {
    const items = [1, 2, 3, 4, 5];
    const original = [...items];
    shuffle(items, createRng(42));

    expect(items).toEqual(original);
  });

  it("is deterministic with the same seed", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled1 = shuffle(items, createRng(99));
    const shuffled2 = shuffle(items, createRng(99));

    expect(shuffled1).toEqual(shuffled2);
  });

  it("handles empty arrays", () => {
    expect(shuffle([], createRng(1))).toEqual([]);
  });

  it("handles single-element arrays", () => {
    expect(shuffle([42], createRng(1))).toEqual([42]);
  });
});
