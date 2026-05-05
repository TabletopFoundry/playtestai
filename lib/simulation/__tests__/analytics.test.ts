import { describe, expect, it } from "vitest";
import { buildHistogram } from "../analytics";

describe("buildHistogram", () => {
  it("groups values into correct buckets", () => {
    const values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const histogram = buildHistogram(values, 5);

    expect(histogram).toHaveLength(2);
    expect(histogram[0]!.count).toBe(5); // 0-4
    expect(histogram[1]!.count).toBe(5); // 5-9
  });

  it("returns empty array for empty input", () => {
    expect(buildHistogram([], 5)).toEqual([]);
  });

  it("handles single value", () => {
    const histogram = buildHistogram([7], 5);
    expect(histogram).toHaveLength(1);
    expect(histogram[0]!.count).toBe(1);
  });

  it("supports custom bucket formatters", () => {
    const histogram = buildHistogram([1, 2, 3], 5, (start, end) => `${start}-${end} turns`);
    expect(histogram[0]!.bucket).toBe("0-4 turns");
  });

  it("sorts buckets by numeric start", () => {
    const values = [15, 3, 8, 22, 1];
    const histogram = buildHistogram(values, 10);

    const starts = histogram.map((b) => Number(b.bucket.split("-")[0]));
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("counts duplicates correctly", () => {
    const values = [5, 5, 5, 5, 5];
    const histogram = buildHistogram(values, 10);
    expect(histogram).toHaveLength(1);
    expect(histogram[0]!.count).toBe(5);
  });
});
