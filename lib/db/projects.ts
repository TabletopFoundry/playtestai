/**
 * Project repository — CRUD operations for the projects table.
 */

import { createProjectFromInput } from "@/lib/data-seeds";
import type { CreateProjectInput, GameProject, ProjectSummary } from "@/lib/types";
import { getDb, type ProjectRow, type RunRow } from "./schema";
import { hydrateRun, getVersionsByProject } from "./versions";

export function getProjectsSummary(): ProjectSummary[] {
  const db = getDb();
  const projects = db.prepare("SELECT * FROM projects ORDER BY updated_at DESC").all() as ProjectRow[];

  if (projects.length === 0) return [];

  // Batch query: version counts per project
  const versionCounts = db
    .prepare("SELECT project_id, COUNT(*) as count FROM versions GROUP BY project_id")
    .all() as { project_id: string; count: number }[];
  const versionCountMap = new Map(versionCounts.map((row) => [row.project_id, row.count]));

  // Batch query: latest run per project (avoids fetching all runs just for summary)
  const latestRuns = db
    .prepare(`
      SELECT sr.* FROM simulation_runs sr
      INNER JOIN (
        SELECT project_id, MAX(created_at) as max_created
        FROM simulation_runs
        GROUP BY project_id
      ) latest ON sr.project_id = latest.project_id AND sr.created_at = latest.max_created
    `)
    .all() as RunRow[];
  const latestRunMap = new Map<string, NonNullable<ProjectSummary["latestRun"]>>();
  latestRuns.forEach((row) => {
    const run = hydrateRun(row);
    if (run) {
      latestRunMap.set(row.project_id, run);
    }
  });

  // Batch query: run counts per project
  const runCounts = db
    .prepare("SELECT project_id, COUNT(*) as count FROM simulation_runs GROUP BY project_id")
    .all() as { project_id: string; count: number }[];
  const runCountMap = new Map(runCounts.map((row) => [row.project_id, row.count]));

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    versionCount: versionCountMap.get(project.id) ?? 0,
    runCount: runCountMap.get(project.id) ?? 0,
    latestRun: latestRunMap.get(project.id) ?? null,
  }));
}

export function getProjectById(projectId: string): GameProject | null {
  const db = getDb();
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId) as ProjectRow | undefined;
  if (!project) {
    return null;
  }

  const versions = getVersionsByProject(projectId);
  const runs = (db
    .prepare("SELECT * FROM simulation_runs WHERE project_id = ? ORDER BY created_at DESC")
    .all(projectId) as RunRow[])
    .map(hydrateRun)
    .filter((run): run is GameProject["runs"][number] => run !== null);

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    versions,
    runs,
  };
}

export function createProject(input: CreateProjectInput) {
  const db = getDb();
  const project = createProjectFromInput(input);
  const version = project.versions[0]!;

  const transaction = db.transaction(() => {
    db.prepare("INSERT INTO projects (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run(project.id, project.name, project.description, project.createdAt, project.updatedAt);
    db.prepare("INSERT INTO versions (id, project_id, label, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(version.id, project.id, version.label, JSON.stringify(version), version.createdAt, version.updatedAt);
  });

  transaction();
  return getProjectById(project.id)!;
}

export function updateProject(projectId: string, updates: Pick<GameProject, "name" | "description">) {
  const db = getDb();
  db.prepare("UPDATE projects SET name = ?, description = ?, updated_at = ? WHERE id = ?")
    .run(updates.name, updates.description, new Date().toISOString(), projectId);
  return getProjectById(projectId);
}

export function deleteProject(projectId: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);
  return result.changes > 0;
}
