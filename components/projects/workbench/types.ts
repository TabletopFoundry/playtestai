import type { AgentType, CardDefinition, GameProject, GameVersion, SimulationConfig, ValidationIssue } from "@/lib/types";

export type ActiveTab = "dashboard" | "definition" | "simulate" | "compare" | "report";
export type CardSortKey = "powerScore" | "winCorrelation" | "averageImpact" | "inclusionRate";

export interface WorkbenchState {
  project: GameProject;
  setProject: (project: GameProject) => void;
  activeTab: ActiveTab;
  selectedVersionId: string;
  selectedRunId: string;
  setSelectedRunId: (id: string) => void;
  workingVersion: GameVersion | null;
  setWorkingVersion: (version: GameVersion | null) => void;
  projectDraft: { name: string; description: string };
  setProjectDraft: (draft: { name: string; description: string }) => void;
  statusMessage: string | null;
  setStatusMessage: (message: string | null) => void;
  errorMessage: string | null;
  setErrorMessage: (message: string | null) => void;
  selectedVersion: GameVersion | null;
  selectedRun: GameProject["runs"][number] | null;
  versionValidation: ValidationIssue[];
  dirty: boolean;
  setActiveTab: (tab: ActiveTab) => void;
  syncVersionSelection: (project: GameProject, versionId: string) => void;
  handleSaveVersion: (silent?: boolean) => Promise<GameVersion | null>;
  handleSaveProject: () => Promise<void>;
  handleCreateSnapshot: () => Promise<void>;
  updateFromResponse: (response: Response, options?: { versionId?: string; keepStatus?: boolean }) => Promise<GameProject>;
  cardStatsInput: Record<string, string>;
  setCardStatsInput: (input: Record<string, string> | ((current: Record<string, string>) => Record<string, string>)) => void;
  savingProject: boolean;
  savingVersion: boolean;
}

export function emptyCard(): CardDefinition {
  return {
    id: crypto.randomUUID(),
    name: "New card",
    cost: 1,
    power: 1,
    quantity: 2,
    stats: { score: 1 },
  };
}

export function defaultAgents(playerCount: number): AgentType[] {
  return Array.from({ length: playerCount }, (_, index) => (["random", "greedy", "balanced"] as AgentType[])[index % 3]);
}

export function normalizeConfig(version: GameVersion, config: SimulationConfig): SimulationConfig {
  const playerCount = Math.min(Math.max(config.playerCount, version.playerCountMin), version.playerCountMax);
  return {
    games: Math.min(Math.max(config.games, 100), 10000),
    playerCount,
    seed: Number.isFinite(config.seed) ? config.seed : 1337,
    agentTypes: Array.from({ length: playerCount }, (_, index) => config.agentTypes[index] ?? defaultAgents(playerCount)[index]),
  };
}

export function createConfig(version: GameVersion, games = 500): SimulationConfig {
  const playerCount = version.playerCountMax;
  return {
    games,
    playerCount,
    seed: Math.floor(Date.now() % 100000),
    agentTypes: defaultAgents(playerCount),
  };
}

export function parseCsvCards(csvText: string) {
  const rows = csvText
    .trim()
    .split(/\r?\n/)
    .map((row) => row.split(",").map((cell) => cell.trim()));

  if (rows.length < 2) {
    throw new Error("CSV needs a header row and at least one data row.");
  }

  const headers = rows[0].map((header) => header.toLowerCase());
  return rows.slice(1).map((cells, index) => {
    const record = headers.reduce<Record<string, string>>((acc, header, headerIndex) => {
      acc[header] = cells[headerIndex] ?? "";
      return acc;
    }, {});

    const stats = Object.entries(record).reduce<Record<string, number>>((acc, [key, value]) => {
      if (["name", "cost", "power", "quantity", "notes"].includes(key) || value === "") {
        return acc;
      }

      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        acc[key] = numeric;
      }
      return acc;
    }, {});

    return {
      id: crypto.randomUUID(),
      name: record.name || `Imported card ${index + 1}`,
      cost: Number(record.cost || 0),
      power: Number(record.power || 0),
      quantity: Number(record.quantity || 1),
      notes: record.notes || undefined,
      stats,
    } satisfies CardDefinition;
  });
}
