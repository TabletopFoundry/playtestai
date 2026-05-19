import { describe, expect, it } from "vitest";
import type { GameVersion } from "@/lib/types";
import { getSharedPlayerRange, syncAgentTypes } from "./types";

const baseVersion: GameVersion = {
  id: "version-a",
  projectId: "project-1",
  label: "v1.0",
  published: false,
  playerCountMin: 2,
  playerCountMax: 4,
  winConditionType: "highest_score",
  targetScore: 20,
  maxTurns: 12,
  startingHealth: 15,
  startingHandSize: 5,
  resources: [{ id: "r1", name: "Mana", startAmount: 2, gainPerTurn: 1 }],
  cards: [{ id: "c1", name: "Scout", cost: 1, power: 1, quantity: 4, stats: { score: 1 } }],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("syncAgentTypes", () => {
  it("fills missing seats using default agent rotation", () => {
    expect(syncAgentTypes(4, ["balanced"]))
      .toEqual(["balanced", "greedy", "balanced", "random"]);
  });
});

describe("getSharedPlayerRange", () => {
  it("returns the overlap between two versions", () => {
    expect(getSharedPlayerRange(baseVersion, { ...baseVersion, id: "version-b", playerCountMin: 3, playerCountMax: 5 }))
      .toEqual({ min: 3, max: 4 });
  });

  it("returns null when versions cannot share a player count", () => {
    expect(getSharedPlayerRange(baseVersion, { ...baseVersion, id: "version-c", playerCountMin: 5, playerCountMax: 6 }))
      .toBeNull();
  });
});
