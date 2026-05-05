/**
 * Database barrel — re-exports all repository functions.
 *
 * Initialises the database and seeds data on first access (lazy).
 */

export { getDb } from "./schema";
export { seedIfEmpty } from "./seed";
export { getProjectsSummary, getProjectById, createProject, updateProject, deleteProject } from "./projects";
export { duplicateVersion, updateVersion, publishVersion, deleteVersion } from "./versions";
export { createSimulationRun, deleteSimulationRun } from "./runs";
