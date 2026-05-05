import { describe, expect, it } from "vitest";
import { formatDate, agentLabel, statsScore } from "../utils";
import type { CardDefinition } from "@/lib/types";

describe("formatDate", () => {
  it("formats an ISO date string", () => {
    // Use a fixed UTC date to avoid timezone issues in CI
    const result = formatDate("2025-01-15T14:30:00.000Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    // Should contain some date-like elements
    expect(result).toMatch(/jan|15/i);
  });
});

describe("agentLabel", () => {
  it("capitalizes random", () => {
    expect(agentLabel("random")).toBe("Random");
  });

  it("capitalizes greedy", () => {
    expect(agentLabel("greedy")).toBe("Greedy");
  });

  it("capitalizes balanced", () => {
    expect(agentLabel("balanced")).toBe("Balanced");
  });
});

describe("statsScore", () => {
  it("sums all stat values", () => {
    const card: CardDefinition = {
      id: "c1",
      name: "Test",
      cost: 1,
      power: 1,
      quantity: 1,
      stats: { damage: 3, shield: 2, draw: 1 },
    };
    expect(statsScore(card)).toBe(6);
  });

  it("returns 0 for empty stats", () => {
    const card: CardDefinition = {
      id: "c1",
      name: "Test",
      cost: 1,
      power: 1,
      quantity: 1,
      stats: {},
    };
    expect(statsScore(card)).toBe(0);
  });

  it("handles negative stat values", () => {
    const card: CardDefinition = {
      id: "c1",
      name: "Test",
      cost: 1,
      power: 1,
      quantity: 1,
      stats: { damage: 3, penalty: -1 },
    };
    expect(statsScore(card)).toBe(2);
  });
});
