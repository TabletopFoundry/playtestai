import { describe, expect, it } from "vitest";
import {
  PRODUCTION_SEED_FLAG,
  SEED_DATASET_VERSION,
  shouldApplySeedDataset,
  shouldSeedDemoData,
} from "../seed";

describe("seed bootstrap helpers", () => {
  it("skips automatic seeding in production unless explicitly enabled", () => {
    expect(shouldSeedDemoData({ NODE_ENV: "production" })).toBe(false);
    expect(shouldSeedDemoData({ NODE_ENV: "production", [PRODUCTION_SEED_FLAG]: "true" })).toBe(true);
    expect(shouldSeedDemoData({ NODE_ENV: "development" })).toBe(true);
  });

  it("applies the dataset when the database is empty or already contains seed rows", () => {
    expect(shouldApplySeedDataset(0, 0, null)).toBe(true);
    expect(shouldApplySeedDataset(3, 1, null)).toBe(true);
    expect(shouldApplySeedDataset(3, 0, SEED_DATASET_VERSION)).toBe(true);
  });

  it("leaves existing non-seed data alone when no seed marker is present", () => {
    expect(shouldApplySeedDataset(2, 0, null)).toBe(false);
  });
});
