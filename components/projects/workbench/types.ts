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

const AGENT_CYCLE: AgentType[] = ["random", "greedy", "balanced"];

export function defaultAgents(playerCount: number): AgentType[] {
  return Array.from({ length: playerCount }, (_, index) => AGENT_CYCLE[index % 3]!);
}

export function syncAgentTypes(playerCount: number, agentTypes: AgentType[]): AgentType[] {
  return Array.from({ length: playerCount }, (_, index) => agentTypes[index] ?? defaultAgents(playerCount)[index] ?? "random");
}

export function getSharedPlayerRange(versionA: GameVersion | null | undefined, versionB: GameVersion | null | undefined) {
  if (!versionA || !versionB) {
    return null;
  }

  const min = Math.max(versionA.playerCountMin, versionB.playerCountMin);
  const max = Math.min(versionA.playerCountMax, versionB.playerCountMax);
  return min <= max ? { min, max } : null;
}

export function normalizeConfig(version: GameVersion, config: SimulationConfig): SimulationConfig {
  const playerCount = Math.min(Math.max(config.playerCount, version.playerCountMin), version.playerCountMax);
  return {
    games: Math.min(Math.max(config.games, 100), 10000),
    playerCount,
    seed: Number.isFinite(config.seed) ? config.seed : 1337,
    agentTypes: syncAgentTypes(playerCount, config.agentTypes),
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

export function parseCsvRows(csvText: string) {
  const input = csvText.trim();
  if (!input) {
    return [] as string[][];
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;
  let quotedCell = false;

  function pushCell() {
    currentRow.push(quotedCell ? currentCell : currentCell.trim());
    currentCell = "";
    quotedCell = false;
  }

  function pushRow() {
    pushCell();
    if (currentRow.some((cell) => cell !== "")) {
      rows.push(currentRow);
    }
    currentRow = [];
  }

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (!char) continue;

    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          currentCell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
      continue;
    }

    if (char === '"' && currentCell.trim() === "") {
      currentCell = "";
      quotedCell = true;
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      pushCell();
      continue;
    }

    if (char === "\n" || char === "\r") {
      if (char === "\r" && input[index + 1] === "\n") {
        index += 1;
      }
      pushRow();
      continue;
    }

    currentCell += char;
  }

  if (inQuotes) {
    throw new Error("CSV contains an unterminated quoted field.");
  }

  pushRow();
  return rows;
}

export function parseCsvCards(csvText: string) {
  const rows = parseCsvRows(csvText);

  if (rows.length < 2) {
    throw new Error("CSV needs a header row and at least one data row.");
  }

  const headers = rows[0]!.map((header) => header.toLowerCase());
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
