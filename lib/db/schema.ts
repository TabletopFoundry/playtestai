/**
 * Database connection and schema initialisation.
 *
 * Uses a lazy singleton so the database is only opened on first access,
 * avoiding side effects at import time (P1-5).
 */

import "server-only";

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

let sqlite: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!sqlite) {
    const dataDir = path.join(process.cwd(), "data");
    const dbPath = path.join(dataDir, "playtestai.sqlite");
    fs.mkdirSync(dataDir, { recursive: true });

    sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    initSchema(sqlite);
  }
  return sqlite;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS versions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      label TEXT NOT NULL,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS simulation_runs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      version_id TEXT NOT NULL,
      label TEXT NOT NULL,
      config_json TEXT NOT NULL,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS seed_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// Row types used across repositories
export type ProjectRow = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
};

export type VersionRow = {
  id: string;
  project_id: string;
  label: string;
  data_json: string;
  created_at: string;
  updated_at: string;
};

export type RunRow = {
  id: string;
  project_id: string;
  version_id: string;
  label: string;
  config_json: string;
  result_json: string;
  created_at: string;
};
