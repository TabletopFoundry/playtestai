import { describe, expect, it } from "vitest";
import {
  CreateProjectInputSchema,
  UpdateProjectInputSchema,
  SimulationConfigSchema,
  GameVersionSchema,
  DuplicateVersionInputSchema,
  formatZodErrors,
} from "../validation";

describe("CreateProjectInputSchema", () => {
  it("accepts valid input with all fields", () => {
    const result = CreateProjectInputSchema.safeParse({
      name: "My Game",
      description: "A card battler",
      playerCountMin: 2,
      playerCountMax: 4,
      winConditionType: "highest_score",
    });
    expect(result.success).toBe(true);
  });

  it("applies defaults for optional fields", () => {
    const result = CreateProjectInputSchema.safeParse({ name: "Minimal" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("");
      expect(result.data.playerCountMin).toBe(2);
      expect(result.data.playerCountMax).toBe(4);
      expect(result.data.winConditionType).toBe("highest_score");
    }
  });

  it("rejects empty name", () => {
    const result = CreateProjectInputSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding max length", () => {
    const result = CreateProjectInputSchema.safeParse({ name: "x".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects invalid win condition type", () => {
    const result = CreateProjectInputSchema.safeParse({
      name: "Test",
      winConditionType: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects player count below minimum", () => {
    const result = CreateProjectInputSchema.safeParse({
      name: "Test",
      playerCountMin: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects player count above maximum", () => {
    const result = CreateProjectInputSchema.safeParse({
      name: "Test",
      playerCountMax: 11,
    });
    expect(result.success).toBe(false);
  });

  it("rejects when playerCountMin > playerCountMax", () => {
    const result = CreateProjectInputSchema.safeParse({
      name: "Test",
      playerCountMin: 5,
      playerCountMax: 2,
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdateProjectInputSchema", () => {
  it("accepts partial updates", () => {
    expect(UpdateProjectInputSchema.safeParse({ name: "Updated" }).success).toBe(true);
    expect(UpdateProjectInputSchema.safeParse({ description: "New desc" }).success).toBe(true);
    expect(UpdateProjectInputSchema.safeParse({}).success).toBe(true);
  });

  it("rejects name exceeding max length", () => {
    const result = UpdateProjectInputSchema.safeParse({ name: "x".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects description exceeding max length", () => {
    const result = UpdateProjectInputSchema.safeParse({ description: "x".repeat(2001) });
    expect(result.success).toBe(false);
  });
});

describe("SimulationConfigSchema", () => {
  it("accepts valid config", () => {
    const result = SimulationConfigSchema.safeParse({
      games: 100,
      playerCount: 2,
      seed: 42,
      agentTypes: ["random", "greedy"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero games", () => {
    const result = SimulationConfigSchema.safeParse({
      games: 0,
      playerCount: 2,
      seed: 42,
      agentTypes: ["random"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects games exceeding maximum", () => {
    const result = SimulationConfigSchema.safeParse({
      games: 50_001,
      playerCount: 2,
      seed: 42,
      agentTypes: ["random"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty agent types", () => {
    const result = SimulationConfigSchema.safeParse({
      games: 100,
      playerCount: 2,
      seed: 42,
      agentTypes: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid agent type", () => {
    const result = SimulationConfigSchema.safeParse({
      games: 100,
      playerCount: 2,
      seed: 42,
      agentTypes: ["aggressive"],
    });
    expect(result.success).toBe(false);
  });
});

describe("GameVersionSchema", () => {
  const validVersion = {
    id: "v1",
    projectId: "p1",
    label: "v1.0",
    published: false,
    playerCountMin: 2,
    playerCountMax: 4,
    winConditionType: "highest_score",
    targetScore: 40,
    maxTurns: 10,
    startingHealth: 18,
    startingHandSize: 5,
    resources: [{ id: "r1", name: "Mana", startAmount: 2, gainPerTurn: 2 }],
    cards: [{ id: "c1", name: "Scout", cost: 1, power: 1, quantity: 4, stats: { draw: 1 } }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("accepts valid version", () => {
    expect(GameVersionSchema.safeParse(validVersion).success).toBe(true);
  });

  it("rejects when playerCountMin > playerCountMax", () => {
    const result = GameVersionSchema.safeParse({
      ...validVersion,
      playerCountMin: 5,
      playerCountMax: 2,
    });
    expect(result.success).toBe(false);
  });

  it("rejects when cards array is empty", () => {
    const result = GameVersionSchema.safeParse({ ...validVersion, cards: [] });
    expect(result.success).toBe(false);
  });

  it("rejects when resources array is empty", () => {
    const result = GameVersionSchema.safeParse({ ...validVersion, resources: [] });
    expect(result.success).toBe(false);
  });

  it("defaults published to false when omitted", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { published: _published, ...withoutPublished } = validVersion;
    const result = GameVersionSchema.safeParse(withoutPublished);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.published).toBe(false);
    }
  });
});

describe("DuplicateVersionInputSchema", () => {
  it("accepts empty object", () => {
    expect(DuplicateVersionInputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts with source version id", () => {
    expect(DuplicateVersionInputSchema.safeParse({ sourceVersionId: "v1" }).success).toBe(true);
  });

  it("accepts with custom label", () => {
    expect(DuplicateVersionInputSchema.safeParse({ label: "My variant" }).success).toBe(true);
  });

  it("rejects empty sourceVersionId", () => {
    const result = DuplicateVersionInputSchema.safeParse({ sourceVersionId: "" });
    expect(result.success).toBe(false);
  });
});

describe("formatZodErrors", () => {
  it("formats multiple issues into semicolon-separated string", () => {
    const result = CreateProjectInputSchema.safeParse({ name: "", playerCountMin: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      expect(typeof formatted).toBe("string");
      expect(formatted.length).toBeGreaterThan(0);
    }
  });

  it("includes field path in formatted output", () => {
    const result = SimulationConfigSchema.safeParse({ games: 0, playerCount: 2, seed: 42, agentTypes: ["random"] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      expect(formatted).toContain("games");
    }
  });
});
