/**
 * Seed data bootstrap — inserts demo projects when the database is empty.
 */

import { getSeedProjects } from "@/lib/data-seeds";
import { getDb } from "./schema";

export function seedIfEmpty() {
  const db = getDb();
  const projectCount = db.prepare("SELECT COUNT(*) as count FROM projects").get() as { count: number };
  if (projectCount.count > 0) {
    return;
  }

  const seeds = getSeedProjects();
  const insertProject = db.prepare(
    "INSERT INTO projects (id, name, description, created_at, updated_at) VALUES (@id, @name, @description, @createdAt, @updatedAt)",
  );
  const insertVersion = db.prepare(
    "INSERT INTO versions (id, project_id, label, data_json, created_at, updated_at) VALUES (@id, @projectId, @label, @dataJson, @createdAt, @updatedAt)",
  );
  const insertRun = db.prepare(
    "INSERT INTO simulation_runs (id, project_id, version_id, label, config_json, result_json, created_at) VALUES (@id, @projectId, @versionId, @label, @configJson, @resultJson, @createdAt)",
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
  });

  seedTransaction();
}
