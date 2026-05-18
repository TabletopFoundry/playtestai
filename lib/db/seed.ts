/**
 * Seed data bootstrap — inserts demo projects when the database is empty.
 */

import { getSeedProjects } from "@/lib/data-seeds";
import { getDb } from "./schema";

export const SEED_DATASET_VERSION = "rich-demo-v1";
export const PRODUCTION_SEED_FLAG = "PLAYTESTAI_ENABLE_SEEDING";
const SEED_METADATA_KEY = "demo_dataset_version";

export type SeedBootstrapStatus = "seeded" | "skipped-production" | "skipped-existing-data";

export function shouldSeedDemoData(environment: NodeJS.ProcessEnv = process.env) {
  return environment.NODE_ENV !== "production" || environment[PRODUCTION_SEED_FLAG] === "true";
}

export function shouldApplySeedDataset(existingProjectCount: number, existingSeedProjectCount: number, datasetVersion: string | null) {
  return existingProjectCount === 0 || existingSeedProjectCount > 0 || datasetVersion === SEED_DATASET_VERSION;
}

export function seedIfEmpty(environment: NodeJS.ProcessEnv = process.env): SeedBootstrapStatus {
  if (!shouldSeedDemoData(environment)) {
    return "skipped-production";
  }

  const db = getDb();
  const seeds = getSeedProjects();
  const seedProjectIds = seeds.map((project) => project.id);
  const placeholders = seedProjectIds.map(() => "?").join(", ");
  const existingProjectCount = (db.prepare("SELECT COUNT(*) as count FROM projects").get() as { count: number }).count;
  const existingSeedProjectCount = placeholders
    ? ((db.prepare(`SELECT COUNT(*) as count FROM projects WHERE id IN (${placeholders})`).get(...seedProjectIds) as { count: number }).count)
    : 0;
  const datasetVersion = (db.prepare("SELECT value FROM seed_metadata WHERE key = ?").get(SEED_METADATA_KEY) as { value: string } | undefined)?.value ?? null;

  if (!shouldApplySeedDataset(existingProjectCount, existingSeedProjectCount, datasetVersion)) {
    return "skipped-existing-data";
  }

  const insertProject = db.prepare(
    "INSERT OR IGNORE INTO projects (id, name, description, created_at, updated_at) VALUES (@id, @name, @description, @createdAt, @updatedAt)",
  );
  const insertVersion = db.prepare(
    "INSERT OR IGNORE INTO versions (id, project_id, label, data_json, created_at, updated_at) VALUES (@id, @projectId, @label, @dataJson, @createdAt, @updatedAt)",
  );
  const insertRun = db.prepare(
    "INSERT OR IGNORE INTO simulation_runs (id, project_id, version_id, label, config_json, result_json, created_at) VALUES (@id, @projectId, @versionId, @label, @configJson, @resultJson, @createdAt)",
  );
  const upsertSeedMetadata = db.prepare(
    "INSERT INTO seed_metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  );

  const seedTransaction = db.transaction(() => {
    seeds.forEach((project) => {
      insertProject.run({
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      });
      project.versions.forEach((version) => {
        insertVersion.run({
          id: version.id,
          projectId: project.id,
          label: version.label,
          dataJson: JSON.stringify(version),
          createdAt: version.createdAt,
          updatedAt: version.updatedAt,
        });
      });
      project.runs.forEach((run) => {
        insertRun.run({
          id: run.id,
          projectId: project.id,
          versionId: run.versionId,
          label: run.label,
          configJson: JSON.stringify(run.config),
          resultJson: JSON.stringify(run.result),
          createdAt: run.createdAt,
        });
      });
    });

    upsertSeedMetadata.run(SEED_METADATA_KEY, SEED_DATASET_VERSION);
  });

  seedTransaction();
  return "seeded";
}
