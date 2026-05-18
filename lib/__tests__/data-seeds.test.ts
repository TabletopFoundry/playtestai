import { describe, expect, it } from "vitest";
import { getSeedProjects } from "@/lib/data-seeds";
import { GameVersionSchema, SimulationBatchResultSchema } from "@/lib/validation";

describe("seed dataset", () => {
  const projects = getSeedProjects();
  const activeProjects = projects.filter((project) => project.versions.length >= 5);
  const allVersions = projects.flatMap((project) => project.versions);
  const allRuns = projects.flatMap((project) => project.runs);

  it("ships a rich multi-project catalog", () => {
    expect(projects.length).toBeGreaterThanOrEqual(8);
    expect(activeProjects.length).toBeGreaterThanOrEqual(6);
    expect(allRuns.length).toBeGreaterThanOrEqual(20);
    expect(allVersions.filter((version) => version.published).length).toBeGreaterThan(0);
    expect(allVersions.filter((version) => !version.published).length).toBeGreaterThan(0);
  });

  it("gives every active project a deep card catalog and version history", () => {
    activeProjects.forEach((project) => {
      expect(project.versions.length).toBeGreaterThanOrEqual(5);
      project.versions.forEach((version) => {
        expect(version.cards.length).toBeGreaterThanOrEqual(30);
      });
    });

    const totalResourceDefinitions = allVersions.reduce((count, version) => count + version.resources.length, 0);
    expect(totalResourceDefinitions).toBeGreaterThanOrEqual(10);
  });

  it("includes the requested edge cases and comparison fixtures", () => {
    expect(projects.some((project) => project.versions.length === 0)).toBe(true);
    expect(allVersions.some((version) => version.cards.length === 1)).toBe(true);
    expect(allRuns.some((run) => run.result.summary.overallBalanceScore <= 10)).toBe(true);
    expect(allRuns.some((run) => run.result.summary.firstPlayerAdvantage >= 50)).toBe(true);
    expect(allRuns.filter((run) => run.label.startsWith("A/B candidate")).length).toBeGreaterThanOrEqual(10);
  });

  it("produces seed versions and analytics that satisfy the API validation schemas", () => {
    const versionIdsByProject = new Map(projects.map((project) => [project.id, new Set(project.versions.map((version) => version.id))]));

    allVersions.forEach((version) => {
      expect(GameVersionSchema.safeParse(version).success).toBe(true);
    });

    allRuns.forEach((run) => {
      expect(versionIdsByProject.get(run.projectId)?.has(run.versionId)).toBe(true);
      expect(SimulationBatchResultSchema.safeParse(run.result).success).toBe(true);
    });
  });
});
