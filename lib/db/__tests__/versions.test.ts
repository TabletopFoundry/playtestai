import { describe, expect, it, vi } from "vitest";
import type { RunRow, VersionRow } from "../schema";
import { hydrateRun, hydrateVersion } from "../versions";

describe("database hydration", () => {
  it("hydrates valid version rows", () => {
    const row: VersionRow = {
      id: "version-1",
      project_id: "project-1",
      label: "v1.0",
      data_json: JSON.stringify({
        id: "stale-id",
        projectId: "stale-project",
        label: "Old label",
        published: true,
        playerCountMin: 2,
        playerCountMax: 4,
        winConditionType: "highest_score",
        targetScore: 20,
        maxTurns: 12,
        startingHealth: 15,
        startingHandSize: 5,
        resources: [{ id: "r1", name: "Mana", startAmount: 2, gainPerTurn: 1 }],
        cards: [{ id: "c1", name: "Scout", cost: 1, power: 1, quantity: 4, stats: { score: 1 } }],
        createdAt: "old-created",
        updatedAt: "old-updated",
      }),
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-02T00:00:00.000Z",
    };

    expect(hydrateVersion(row)).toMatchObject({
      id: "version-1",
      projectId: "project-1",
      label: "v1.0",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
    });
  });

  it("skips corrupt version rows instead of throwing", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(
      hydrateVersion({
        id: "broken-version",
        project_id: "project-1",
        label: "Broken",
        data_json: "{not-json",
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-02T00:00:00.000Z",
      }),
    ).toBeNull();

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("skips corrupt simulation runs instead of throwing", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const row: RunRow = {
      id: "run-1",
      project_id: "project-1",
      version_id: "version-1",
      label: "Latest run",
      config_json: JSON.stringify({ games: 100, playerCount: 2, seed: 42, agentTypes: ["random", "greedy"] }),
      result_json: "{not-json",
      created_at: "2025-01-03T00:00:00.000Z",
    };

    expect(hydrateRun(row)).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
