import { describe, expect, it } from "vitest";
import { clamp, cn, deepClone, formatPercent, parseStatsText, slugify, stringifyStats } from "../utils";

describe("cn", () => {
  it("joins truthy strings", () => {
    expect(cn("a", "b", false, null, undefined, "c")).toBe("a b c");
  });

  it("returns empty string for no inputs", () => {
    expect(cn()).toBe("");
  });
});

describe("formatPercent", () => {
  it("formats with default digits", () => {
    expect(formatPercent(12.345)).toBe("12.3%");
  });

  it("formats with custom digits", () => {
    expect(formatPercent(12.345, 2)).toBe("12.35%");
  });
});

describe("slugify", () => {
  it("converts to lowercase slug", () => {
    expect(slugify("Hello World 123")).toBe("hello-world-123");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("--Test--")).toBe("test");
  });

  it("truncates to 48 characters", () => {
    const long = "a".repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(48);
  });
});

describe("parseStatsText / stringifyStats", () => {
  it("parses key:value pairs", () => {
    expect(parseStatsText("damage:2, draw:1")).toEqual({ damage: 2, draw: 1 });
  });

  it("ignores invalid pairs", () => {
    expect(parseStatsText("damage:abc, draw:1")).toEqual({ draw: 1 });
  });

  it("handles empty string", () => {
    expect(parseStatsText("")).toEqual({});
  });

  it("round-trips stats", () => {
    const stats = { damage: 2, draw: 1 };
    expect(parseStatsText(stringifyStats(stats))).toEqual(stats);
  });
});

describe("clamp", () => {
  it("clamps below min", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("clamps above max", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("passes through value in range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
});

describe("deepClone", () => {
  it("creates independent copy", () => {
    const original = { a: 1, b: { c: 2 } };
    const clone = deepClone(original);
    clone.b.c = 99;
    expect(original.b.c).toBe(2);
  });
});
