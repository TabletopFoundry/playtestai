/**
 * Backwards-compatible re-export of database functions.
 *
 * All logic now lives in `lib/db/` modules. This file triggers
 * lazy initialisation + seeding and re-exports the public API.
 */

import "server-only";

import { seedIfEmpty } from "@/lib/db/seed";

// Trigger seed on first import (lazy — db opens inside seedIfEmpty → getDb)
seedIfEmpty();

export {
  getProjectsSummary,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from "@/lib/db/projects";

export {
  duplicateVersion,
  updateVersion,
  publishVersion,
  deleteVersion,
} from "@/lib/db/versions";

export {
  createSimulationRun,
  deleteSimulationRun,
} from "@/lib/db/runs";
