/**
 * Simulation runs repository — CRUD operations for the simulation_runs table.
 */

import { randomUUID } from "crypto";
import type { SimulationBatchResult, SimulationConfig, SimulationRun } from "@/lib/types";
import { getDb } from "./schema";

export type DeleteSimulationRunResult = "deleted" | "not-found";

export function createSimulationRun(projectId: string, versionId: string, label: string, config: SimulationConfig, result: SimulationBatchResult): void {
  const db = getDb();

  // Verify the version belongs to this project (referential integrity)
  const versionOwner = db.prepare(
    "SELECT project_id FROM versions WHERE id = ?"
  ).get(versionId) as { project_id: string } | undefined;

  if (!versionOwner || versionOwner.project_id !== projectId) {
    throw new Error("Version does not belong to this project.");
  }

  const run: SimulationRun = {
    id: randomUUID(),
    projectId,
    versionId,
    label,
    config,
    result,
    createdAt: new Date().toISOString(),
  };

  const transaction = db.transaction(() => {
    db.prepare(
      "INSERT INTO simulation_runs (id, project_id, version_id, label, config_json, result_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(run.id, run.projectId, run.versionId, run.label, JSON.stringify(run.config), JSON.stringify(run.result), run.createdAt);
    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(run.createdAt, projectId);
  });
  transaction();
}

export function deleteSimulationRun(projectId: string, runId: string): DeleteSimulationRunResult {
  const db = getDb();

  const transaction = db.transaction((): DeleteSimulationRunResult => {
    const result = db.prepare("DELETE FROM simulation_runs WHERE id = ? AND project_id = ?").run(runId, projectId);

    if (result.changes === 0) {
      return "not-found";
    }

    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(new Date().toISOString(), projectId);
    return "deleted";
  });

  return transaction();
}
