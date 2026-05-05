/**
 * Version repository — CRUD operations for the versions table.
 */

import { randomUUID } from "crypto";
import { createStarterVersion } from "@/lib/data-seeds";
import type { GameVersion, SimulationConfig, SimulationBatchResult, SimulationRun } from "@/lib/types";
import { getDb, type VersionRow, type RunRow } from "./schema";

export type UpdateVersionResult =
  | { status: "updated" | "draft-created"; versionId: string }
  | { status: "not-found" };

export type DuplicateVersionResult = "created" | "not-found";
export type PublishVersionResult = "published" | "already-published" | "not-found";
export type DeleteVersionResult = "deleted" | "last-version" | "not-found";

function parseStoredJson<T>(value: string, kind: string, rowId: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Skipping corrupt ${kind} row ${rowId}.`, error);
    return null;
  }
}

export function hydrateVersion(row: VersionRow): GameVersion | null {
  const parsed = parseStoredJson<GameVersion>(row.data_json, "version", row.id);
  if (!parsed) {
    return null;
  }

  return {
    ...parsed,
    id: row.id,
    projectId: row.project_id,
    label: row.label,
    published: parsed.published ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function hydrateRun(row: RunRow): SimulationRun | null {
  const config = parseStoredJson<SimulationConfig>(row.config_json, "simulation config", row.id);
  const result = parseStoredJson<SimulationBatchResult>(row.result_json, "simulation result", row.id);
  if (!config || !result) {
    return null;
  }

  return {
    id: row.id,
    projectId: row.project_id,
    versionId: row.version_id,
    label: row.label,
    config,
    result,
    createdAt: row.created_at,
  };
}

export function getVersionsByProject(projectId: string): GameVersion[] {
  const db = getDb();
  return (db
    .prepare("SELECT * FROM versions WHERE project_id = ? ORDER BY created_at DESC")
    .all(projectId) as VersionRow[])
    .map(hydrateVersion)
    .filter((version): version is GameVersion => version !== null);
}

export function duplicateVersion(projectId: string, sourceVersionId?: string, label?: string): DuplicateVersionResult {
  const db = getDb();
  const versions = getVersionsByProject(projectId);
  if (versions.length === 0) {
    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId) as { id: string } | undefined;
    if (!project) return "not-found";
  }

  const sourceVersion =
    versions.find((version) => version.id === sourceVersionId) ?? versions[0] ?? createStarterVersion(projectId);
  const timestamp = new Date().toISOString();
  const copy: GameVersion = {
    ...sourceVersion,
    id: randomUUID(),
    label: label ?? `v${versions.length + 1}.0-variant`,
    published: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    resources: sourceVersion.resources.map((resource) => ({ ...resource, id: randomUUID() })),
    cards: sourceVersion.cards.map((card) => ({ ...card, id: randomUUID(), stats: { ...card.stats } })),
  };

  const transaction = db.transaction(() => {
    db.prepare("INSERT INTO versions (id, project_id, label, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(copy.id, projectId, copy.label, JSON.stringify(copy), copy.createdAt, copy.updatedAt);
    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(timestamp, projectId);
  });

  transaction();
  return "created";
}

export function updateVersion(projectId: string, versionId: string, data: GameVersion): UpdateVersionResult {
  const db = getDb();
  const versions = getVersionsByProject(projectId);
  const existingVersion = versions.find((v) => v.id === versionId);

  if (!existingVersion) {
    return { status: "not-found" };
  }

  if (existingVersion.published) {
    const timestamp = new Date().toISOString();
    const draftVersion: GameVersion = {
      ...data,
      id: randomUUID(),
      projectId,
      label: `${data.label}-draft`,
      published: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const transaction = db.transaction(() => {
      db.prepare("INSERT INTO versions (id, project_id, label, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(draftVersion.id, projectId, draftVersion.label, JSON.stringify(draftVersion), draftVersion.createdAt, draftVersion.updatedAt);
      db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(timestamp, projectId);
    });

    transaction();
    return { status: "draft-created", versionId: draftVersion.id };
  }

  const updated: GameVersion = {
    ...data,
    id: versionId,
    projectId,
    published: data.published ?? false,
    updatedAt: new Date().toISOString(),
  };

  const transaction = db.transaction((): UpdateVersionResult => {
    const result = db.prepare("UPDATE versions SET label = ?, data_json = ?, updated_at = ? WHERE id = ? AND project_id = ?")
      .run(updated.label, JSON.stringify(updated), updated.updatedAt, versionId, projectId);

    if (result.changes === 0) {
      return { status: "not-found" };
    }

    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(updated.updatedAt, projectId);
    return { status: "updated", versionId };
  });

  return transaction();
}

export function publishVersion(projectId: string, versionId: string): PublishVersionResult {
  const db = getDb();
  const versions = getVersionsByProject(projectId);
  const version = versions.find((v) => v.id === versionId);
  if (!version) return "not-found";
  if (version.published) return "already-published";

  const published: GameVersion = { ...version, published: true, updatedAt: new Date().toISOString() };
  const transaction = db.transaction((): PublishVersionResult => {
    const result = db.prepare("UPDATE versions SET data_json = ?, updated_at = ? WHERE id = ? AND project_id = ?")
      .run(JSON.stringify(published), published.updatedAt, versionId, projectId);

    if (result.changes === 0) {
      return "not-found";
    }

    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(published.updatedAt, projectId);
    return "published";
  });

  return transaction();
}

export function deleteVersion(projectId: string, versionId: string): DeleteVersionResult {
  const db = getDb();

  const transaction = db.transaction((): DeleteVersionResult => {
    const versionCount = (db.prepare(
      "SELECT COUNT(*) as count FROM versions WHERE project_id = ?"
    ).get(projectId) as { count: number } | undefined)?.count ?? 0;

    if (versionCount <= 1) {
      return "last-version";
    }

    const result = db.prepare("DELETE FROM versions WHERE id = ? AND project_id = ?")
      .run(versionId, projectId);

    if (result.changes === 0) {
      return "not-found";
    }

    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), projectId);
    return "deleted";
  });

  return transaction();
}
