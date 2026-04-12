"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CopyPlus,
  Download,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Swords,
  TableProperties,
  Trash2,
  Upload,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { simulateBatchAsync, validateVersionPlayable } from "@/lib/simulation/engine";
import type { AgentType, CardDefinition, GameProject, GameVersion, SimulationBatchResult, SimulationConfig } from "@/lib/types";
import { agentLabel, cn, deepClone, formatDate, formatPercent, parseStatsText, stringifyStats } from "@/lib/utils";

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "definition", label: "Rule definition" },
  { id: "simulate", label: "Simulations" },
  { id: "compare", label: "A/B testing" },
  { id: "report", label: "Report" },
] as const;

type ActiveTab = (typeof tabs)[number]["id"];
type CardSortKey = "powerScore" | "winCorrelation" | "averageImpact" | "inclusionRate";

function emptyCard(): CardDefinition {
  return {
    id: crypto.randomUUID(),
    name: "New card",
    cost: 1,
    power: 1,
    quantity: 2,
    stats: { score: 1 },
  };
}

function defaultAgents(playerCount: number): AgentType[] {
  return Array.from({ length: playerCount }, (_, index) => (["random", "greedy", "balanced"] as AgentType[])[index % 3]);
}

function normalizeConfig(version: GameVersion, config: SimulationConfig): SimulationConfig {
  const playerCount = Math.min(Math.max(config.playerCount, version.playerCountMin), version.playerCountMax);
  return {
    games: Math.min(Math.max(config.games, 100), 10000),
    playerCount,
    seed: Number.isFinite(config.seed) ? config.seed : 1337,
    agentTypes: Array.from({ length: playerCount }, (_, index) => config.agentTypes[index] ?? defaultAgents(playerCount)[index]),
  };
}

function createConfig(version: GameVersion, games = 500): SimulationConfig {
  const playerCount = version.playerCountMax;
  return {
    games,
    playerCount,
    seed: Math.floor(Date.now() % 100000),
    agentTypes: defaultAgents(playerCount),
  };
}

function parseCsvCards(csvText: string) {
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

function MetricCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "accent" | "warn" }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</p>
      <p className={cn("mt-3 font-mono text-2xl text-white", tone === "accent" && "text-cyan-200", tone === "warn" && "text-amber-200")}>{value}</p>
    </div>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {description ? <p className="text-sm text-slate-400">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function ProjectWorkbench({ initialProject }: { initialProject: GameProject }) {
  const initialVersion = initialProject.versions[0] ?? null;
  const initialStatsInput = initialVersion
    ? Object.fromEntries(initialVersion.cards.map((card) => [card.id, stringifyStats(card.stats)]))
    : {};

  const [project, setProject] = useState(initialProject);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [selectedVersionId, setSelectedVersionId] = useState(initialVersion?.id ?? "");
  const [selectedRunId, setSelectedRunId] = useState(initialProject.runs[0]?.id ?? "");
  const [workingVersion, setWorkingVersion] = useState<GameVersion | null>(initialVersion ? deepClone(initialVersion) : null);
  const [projectDraft, setProjectDraft] = useState({ name: initialProject.name, description: initialProject.description });
  const [cardStatsInput, setCardStatsInput] = useState<Record<string, string>>(initialStatsInput);
  const [csvText, setCsvText] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingProject, setSavingProject] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [simulationConfig, setSimulationConfig] = useState<SimulationConfig>(createConfig(initialProject.versions[0], 750));
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [compareConfig, setCompareConfig] = useState<SimulationConfig>(createConfig(initialProject.versions[0], 500));
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareProgress, setCompareProgress] = useState(0);
  const [comparison, setComparison] = useState<{
    versionAId: string;
    versionBId: string;
    resultA: SimulationBatchResult;
    resultB: SimulationBatchResult;
  } | null>(null);
  const [compareVersionAId, setCompareVersionAId] = useState(initialProject.versions[0]?.id ?? "");
  const [compareVersionBId, setCompareVersionBId] = useState(initialProject.versions[1]?.id ?? initialProject.versions[0]?.id ?? "");
  const [cardSortKey, setCardSortKey] = useState<CardSortKey>("powerScore");

  const selectedVersion = useMemo(
    () => project.versions.find((version) => version.id === selectedVersionId) ?? project.versions[0] ?? null,
    [project.versions, selectedVersionId],
  );
  const selectedRun = useMemo(
    () => project.runs.find((run) => run.id === selectedRunId) ?? project.runs[0] ?? null,
    [project.runs, selectedRunId],
  );
  const versionValidation = useMemo(() => (workingVersion ? validateVersionPlayable(workingVersion) : []), [workingVersion]);
  const dirty = useMemo(() => {
    if (!workingVersion || !selectedVersion) {
      return false;
    }
    return JSON.stringify(workingVersion) !== JSON.stringify(selectedVersion);
  }, [selectedVersion, workingVersion]);

  function syncVersionSelection(nextProject: GameProject, versionId: string) {
    const nextVersion = nextProject.versions.find((version) => version.id === versionId) ?? nextProject.versions[0] ?? null;
    if (!nextVersion) {
      return;
    }

    const clone = deepClone(nextVersion);
    setSelectedVersionId(nextVersion.id);
    setWorkingVersion(clone);
    setCardStatsInput(Object.fromEntries(clone.cards.map((card) => [card.id, stringifyStats(card.stats)])));
    setSimulationConfig((current) => normalizeConfig(clone, current));
    setCompareConfig((current) => normalizeConfig(clone, current));
  }

  const sortedCardRankings = useMemo(() => {
    if (!selectedRun) {
      return [];
    }

    return [...selectedRun.result.cardRankings].sort((left, right) => right[cardSortKey] - left[cardSortKey]);
  }, [cardSortKey, selectedRun]);

  async function updateFromResponse(response: Response, options?: { versionId?: string; keepStatus?: boolean }) {
    const payload = (await response.json()) as { project?: GameProject; error?: string };
    if (!response.ok || !payload.project) {
      throw new Error(payload.error ?? "Unexpected API error.");
    }

    setProject(payload.project);
    setProjectDraft({ name: payload.project.name, description: payload.project.description });

    const nextRunId = payload.project.runs.find((run) => run.id === selectedRunId)?.id ?? payload.project.runs[0]?.id ?? "";
    setSelectedRunId(nextRunId);

    const nextVersionId = options?.versionId;
    if (nextVersionId) {
      syncVersionSelection(payload.project, nextVersionId);
      setCompareVersionBId((current) => current || nextVersionId);
    } else if (!payload.project.versions.find((version) => version.id === selectedVersionId) && payload.project.versions[0]) {
      syncVersionSelection(payload.project, payload.project.versions[0].id);
    }

    if (!options?.keepStatus) {
      setErrorMessage(null);
    }
    return payload.project;
  }

  async function handleSaveProject() {
    setSavingProject(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectDraft),
      });
      await updateFromResponse(response);
      setStatusMessage("Project details saved.");
    } catch (caught) {
      setErrorMessage(caught instanceof Error ? caught.message : "Failed to save project.");
    } finally {
      setSavingProject(false);
    }
  }

  async function handleSaveVersion(silent = false) {
    if (!workingVersion) {
      return null;
    }

    setSavingVersion(true);
    if (!silent) {
      setStatusMessage(null);
      setErrorMessage(null);
    }

    try {
      const response = await fetch(`/api/projects/${project.id}/versions/${workingVersion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workingVersion),
      });
      const nextProject = await updateFromResponse(response, { versionId: workingVersion.id, keepStatus: silent });
      if (!silent) {
        setStatusMessage(`Saved ${workingVersion.label}.`);
      }
      return nextProject.versions.find((version) => version.id === workingVersion.id) ?? null;
    } catch (caught) {
      setErrorMessage(caught instanceof Error ? caught.message : "Failed to save version.");
      return null;
    } finally {
      setSavingVersion(false);
    }
  }

  async function handleCreateSnapshot() {
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const latestVersion = dirty ? await handleSaveVersion(true) : selectedVersion;
      const response = await fetch(`/api/projects/${project.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceVersionId: latestVersion?.id, label: `v${project.versions.length + 1}.0-snapshot` }),
      });
      const nextProject = await updateFromResponse(response);
      const newVersion = nextProject.versions[0];
      if (newVersion) {
        syncVersionSelection(nextProject, newVersion.id);
        setCompareVersionBId(newVersion.id);
      }
      setStatusMessage("Snapshot created. Use it as Variant B or a new tuning branch.");
    } catch (caught) {
      setErrorMessage(caught instanceof Error ? caught.message : "Failed to create snapshot.");
    }
  }

  async function handleRunSimulation() {
    if (!workingVersion) {
      return;
    }
    setErrorMessage(null);
    setStatusMessage(null);

    if (versionValidation.length) {
      setErrorMessage(versionValidation.join(" "));
      return;
    }

    setSimulationLoading(true);
    setSimulationProgress(0);

    try {
      const savedVersion = dirty ? await handleSaveVersion(true) : selectedVersion;
      if (!savedVersion) {
        throw new Error("Save the current version before running simulations.");
      }

      const config = normalizeConfig(savedVersion, simulationConfig);
      const result = await simulateBatchAsync(savedVersion, config, setSimulationProgress);
      const response = await fetch(`/api/projects/${project.id}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId: savedVersion.id,
          label: `${savedVersion.label} · ${config.games} games`,
          config,
          result,
        }),
      });
      const nextProject = await updateFromResponse(response);
      const latestRun = nextProject.runs[0];
      if (latestRun) {
        setSelectedRunId(latestRun.id);
      }
      setActiveTab("dashboard");
      setStatusMessage(`Simulation complete. ${config.games} games saved to history.`);
    } catch (caught) {
      setErrorMessage(caught instanceof Error ? caught.message : "Simulation failed.");
    } finally {
      setSimulationLoading(false);
      setSimulationProgress(0);
    }
  }

  async function handleRunComparison() {
    setErrorMessage(null);
    setStatusMessage(null);

    const versionA = project.versions.find((version) => version.id === compareVersionAId);
    const versionB = project.versions.find((version) => version.id === compareVersionBId);

    if (!versionA || !versionB) {
      setErrorMessage("Choose two saved versions to compare.");
      return;
    }

    setCompareLoading(true);
    setCompareProgress(0);

    try {
      const configA = normalizeConfig(versionA, compareConfig);
      const configB = normalizeConfig(versionB, compareConfig);
      const resultA = await simulateBatchAsync(versionA, configA, (value) => setCompareProgress(value / 2));
      const resultB = await simulateBatchAsync(versionB, configB, (value) => setCompareProgress(50 + value / 2));
      setComparison({ versionAId: versionA.id, versionBId: versionB.id, resultA, resultB });
      setStatusMessage("A/B comparison complete. Review the recommendation below.");
    } catch (caught) {
      setErrorMessage(caught instanceof Error ? caught.message : "Comparison failed.");
    } finally {
      setCompareLoading(false);
      setCompareProgress(0);
    }
  }

  function updateResource(index: number, field: keyof GameVersion["resources"][number], value: string | number) {
    if (!workingVersion) {
      return;
    }

    setWorkingVersion({
      ...workingVersion,
      resources: workingVersion.resources.map((resource, resourceIndex) =>
        resourceIndex === index ? { ...resource, [field]: value } : resource,
      ),
    });
  }

  function updateCard(index: number, field: keyof CardDefinition, value: string | number | Record<string, number>) {
    if (!workingVersion) {
      return;
    }

    setWorkingVersion({
      ...workingVersion,
      cards: workingVersion.cards.map((card, cardIndex) =>
        cardIndex === index ? ({ ...card, [field]: value } as CardDefinition) : card,
      ),
    });
  }

  const compareVersions = useMemo(
    () => ({
      versionA: project.versions.find((version) => version.id === comparison?.versionAId) ?? project.versions.find((version) => version.id === compareVersionAId),
      versionB: project.versions.find((version) => version.id === comparison?.versionBId) ?? project.versions.find((version) => version.id === compareVersionBId),
    }),
    [compareVersionAId, compareVersionBId, comparison, project.versions],
  );

  const comparisonWinner = useMemo(() => {
    if (!comparison) {
      return null;
    }

    const scoreA = comparison.resultA.summary.overallBalanceScore - Math.abs(comparison.resultA.summary.firstPlayerAdvantage) * 1.2;
    const scoreB = comparison.resultB.summary.overallBalanceScore - Math.abs(comparison.resultB.summary.firstPlayerAdvantage) * 1.2;
    const winner = scoreA === scoreB ? "tie" : scoreB > scoreA ? "B" : "A";
    return {
      winner,
      difference: Math.abs(scoreB - scoreA),
    };
  }, [comparison]);

  const comparisonPositionChart = useMemo(() => {
    if (!comparison) {
      return [];
    }

    return comparison.resultA.winRatesByPosition.map((entry, index) => ({
      position: `Seat ${entry.position}`,
      variantA: entry.winRate,
      variantB: comparison.resultB.winRatesByPosition[index]?.winRate ?? 0,
    }));
  }, [comparison]);

  const comparisonMetrics = useMemo(() => {
    if (!comparison) {
      return [];
    }

    return [
      { metric: "Balance score", variantA: comparison.resultA.summary.overallBalanceScore, variantB: comparison.resultB.summary.overallBalanceScore },
      { metric: "Seat 1 edge", variantA: comparison.resultA.summary.firstPlayerAdvantage, variantB: comparison.resultB.summary.firstPlayerAdvantage },
      { metric: "Avg turns", variantA: comparison.resultA.summary.averageTurns, variantB: comparison.resultB.summary.averageTurns },
    ];
  }, [comparison]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200">Project workspace</p>
            <h1 className="mt-3 text-4xl font-semibold text-white">{project.name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">{project.description}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <MetricCard label="Versions" value={String(project.versions.length)} />
            <MetricCard label="Runs" value={String(project.runs.length)} />
            <MetricCard label="Current balance" value={selectedRun ? String(Math.round(selectedRun.result.summary.overallBalanceScore)) : "--"} tone="accent" />
            <MetricCard label="Updated" value={formatDate(project.updatedAt)} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition",
                activeTab === tab.id
                  ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                  : "border-white/10 bg-slate-950/50 text-slate-400 hover:text-white",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {statusMessage ? <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-100">{statusMessage}</div> : null}
        {errorMessage ? <div className="mt-5 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{errorMessage}</div> : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {activeTab === "dashboard" ? (
            selectedRun ? (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="Balance score" value={`${Math.round(selectedRun.result.summary.overallBalanceScore)}`} tone="accent" />
                  <MetricCard label="Avg turns" value={selectedRun.result.summary.averageTurns.toFixed(1)} />
                  <MetricCard label="Seat 1 edge" value={formatPercent(selectedRun.result.summary.firstPlayerAdvantage)} tone={selectedRun.result.summary.firstPlayerAdvantage > 8 ? "warn" : "default"} />
                  <MetricCard label="Winning score" value={selectedRun.result.summary.averageWinningScore.toFixed(1)} />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <SectionCard title="Win rate by player position" description="Use this to detect first-player advantage or underperforming seats.">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={selectedRun.result.winRatesByPosition}>
                          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                          <XAxis dataKey="position" stroke="#64748b" />
                          <YAxis stroke="#64748b" />
                          <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                          <Bar dataKey="winRate" fill="#22d3ee" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>

                  <SectionCard title="Game length distribution" description="Histogram of simulated match length in turns.">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={selectedRun.result.gameLengthHistogram}>
                          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                          <XAxis dataKey="bucket" stroke="#64748b" />
                          <YAxis stroke="#64748b" />
                          <Tooltip />
                          <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <SectionCard title="Score distribution" description="Final score histogram across every simulated player.">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selectedRun.result.scoreDistribution}>
                          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                          <XAxis dataKey="bucket" stroke="#64748b" />
                          <YAxis stroke="#64748b" />
                          <Tooltip />
                          <Line type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={3} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>

                  <SectionCard title="Strategy breakdown" description="Dominant strategy is flagged when an agent wins more than 60% of games.">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={selectedRun.result.strategyBreakdown}>
                          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                          <XAxis dataKey="agent" stroke="#64748b" />
                          <YAxis stroke="#64748b" />
                          <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                          <Bar dataKey="winRate" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
                      {selectedRun.result.summary.dominantStrategy
                        ? `${agentLabel(selectedRun.result.summary.dominantStrategy)} is winning ${selectedRun.result.summary.dominantStrategyWinRate.toFixed(1)}% of games.`
                        : "No dominant strategy detected. The current agent mix is within the healthy threshold."}
                    </div>
                  </SectionCard>
                </div>

                <SectionCard title="Card power rankings" description="Sort by win correlation, inclusion, or average impact to find suspicious cards.">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <label className="text-sm text-slate-400">Sort table</label>
                    <select value={cardSortKey} onChange={(event) => setCardSortKey(event.target.value as CardSortKey)} className="rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-sm text-white">
                      <option value="powerScore">Power score</option>
                      <option value="winCorrelation">Win correlation</option>
                      <option value="averageImpact">Average impact</option>
                      <option value="inclusionRate">Inclusion rate</option>
                    </select>
                  </div>
                  <div className="overflow-auto rounded-3xl border border-white/10">
                    <table className="min-w-full divide-y divide-white/10 text-sm">
                      <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-[0.25em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Card</th>
                          <th className="px-4 py-3">Power score</th>
                          <th className="px-4 py-3">Win corr.</th>
                          <th className="px-4 py-3">Avg impact</th>
                          <th className="px-4 py-3">Inclusion</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 bg-white/[0.02]">
                        {sortedCardRankings.map((card) => (
                          <tr key={card.cardId}>
                            <td className="px-4 py-3 text-white">{card.cardName}</td>
                            <td className="px-4 py-3">{card.powerScore.toFixed(1)}</td>
                            <td className="px-4 py-3">{formatPercent(card.winCorrelation)}</td>
                            <td className="px-4 py-3">{card.averageImpact.toFixed(1)}</td>
                            <td className="px-4 py-3">{formatPercent(card.inclusionRate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              </div>
            ) : (
              <SectionCard title="No simulation history yet" description="Run a simulation to generate analytics, reports, and balance recommendations.">
                <button type="button" onClick={() => setActiveTab("simulate")} className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950">
                  Configure a simulation
                </button>
              </SectionCard>
            )
          ) : null}

          {activeTab === "definition" && workingVersion ? (
            <div className="space-y-6">
              <SectionCard title="Project metadata" description="Keep a high-signal description for collaborators and future reports.">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm text-slate-300">Project name</span>
                    <input value={projectDraft.name} onChange={(event) => setProjectDraft((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm text-slate-300">Description</span>
                    <textarea value={projectDraft.description} onChange={(event) => setProjectDraft((current) => ({ ...current, description: event.target.value }))} rows={4} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
                  </label>
                </div>
                <button type="button" onClick={handleSaveProject} disabled={savingProject} className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-400/40 disabled:opacity-60">
                  {savingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save project
                </button>
              </SectionCard>

              <SectionCard title="Version settings" description="Snapshots are immutable checkpoints you can branch from for what-if analysis.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Version label</span>
                    <input value={workingVersion.label} onChange={(event) => setWorkingVersion({ ...workingVersion, label: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Min players</span>
                    <input type="number" min={2} max={6} value={workingVersion.playerCountMin} onChange={(event) => setWorkingVersion({ ...workingVersion, playerCountMin: Number(event.target.value) })} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Max players</span>
                    <input type="number" min={2} max={6} value={workingVersion.playerCountMax} onChange={(event) => setWorkingVersion({ ...workingVersion, playerCountMax: Number(event.target.value) })} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Win condition</span>
                    <select value={workingVersion.winConditionType} onChange={(event) => setWorkingVersion({ ...workingVersion, winConditionType: event.target.value as GameVersion["winConditionType"] })} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white">
                      <option value="highest_score">Highest score</option>
                      <option value="first_to_x">First to X</option>
                      <option value="last_standing">Last player standing</option>
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Target score</span>
                    <input type="number" min={10} value={workingVersion.targetScore} onChange={(event) => setWorkingVersion({ ...workingVersion, targetScore: Number(event.target.value) })} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Max turns</span>
                    <input type="number" min={4} max={30} value={workingVersion.maxTurns} onChange={(event) => setWorkingVersion({ ...workingVersion, maxTurns: Number(event.target.value) })} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Starting health</span>
                    <input type="number" min={8} value={workingVersion.startingHealth} onChange={(event) => setWorkingVersion({ ...workingVersion, startingHealth: Number(event.target.value) })} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Starting hand size</span>
                    <input type="number" min={3} max={8} value={workingVersion.startingHandSize} onChange={(event) => setWorkingVersion({ ...workingVersion, startingHandSize: Number(event.target.value) })} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={() => void handleSaveVersion()} disabled={savingVersion} className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-60">
                    {savingVersion ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save version
                  </button>
                  <button type="button" onClick={() => void handleCreateSnapshot()} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-400/40">
                    <CopyPlus className="h-4 w-4" />
                    Create snapshot
                  </button>
                </div>
                {dirty ? <p className="mt-3 text-sm text-amber-200">Unsaved changes are ready to snapshot or simulate.</p> : null}
              </SectionCard>

              <SectionCard title="Resource definition" description="Resources are aggregated into the economy model for the MVP simulation engine.">
                <div className="space-y-3">
                  {workingVersion.resources.map((resource, index) => (
                    <div key={resource.id} className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/50 p-4 md:grid-cols-[1.3fr_repeat(2,minmax(0,1fr))_auto]">
                      <input value={resource.name} onChange={(event) => updateResource(index, "name", event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
                      <input type="number" value={resource.startAmount} onChange={(event) => updateResource(index, "startAmount", Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
                      <input type="number" value={resource.gainPerTurn} onChange={(event) => updateResource(index, "gainPerTurn", Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
                      <button type="button" onClick={() => setWorkingVersion({ ...workingVersion, resources: workingVersion.resources.filter((_, resourceIndex) => resourceIndex !== index) })} className="rounded-2xl border border-white/10 px-4 py-3 text-slate-300 transition hover:border-rose-500/40 hover:text-rose-200">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setWorkingVersion({ ...workingVersion, resources: [...workingVersion.resources, { id: crypto.randomUUID(), name: "New resource", startAmount: 0, gainPerTurn: 1 }] })} className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-400/40">
                  <Plus className="h-4 w-4" />
                  Add resource
                </button>
              </SectionCard>

              <SectionCard title="Card & component definition" description="Cards drive the simplified simulation. Custom numeric stats are supported via key:value pairs.">
                <div className="space-y-3">
                  {workingVersion.cards.map((card, index) => (
                    <div key={card.id} className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/50 p-4 xl:grid-cols-[1.4fr_repeat(3,minmax(0,110px))_1.6fr_auto]">
                      <input value={card.name} onChange={(event) => updateCard(index, "name", event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
                      <input type="number" value={card.cost} onChange={(event) => updateCard(index, "cost", Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
                      <input type="number" value={card.power} onChange={(event) => updateCard(index, "power", Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
                      <input type="number" value={card.quantity} onChange={(event) => updateCard(index, "quantity", Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
                      <input
                        value={cardStatsInput[card.id] ?? stringifyStats(card.stats)}
                        onChange={(event) => {
                          const input = event.target.value;
                          setCardStatsInput((current) => ({ ...current, [card.id]: input }));
                          updateCard(index, "stats", parseStatsText(input));
                        }}
                        placeholder="damage:2, draw:1"
                        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white"
                      />
                      <button type="button" onClick={() => setWorkingVersion({ ...workingVersion, cards: workingVersion.cards.filter((_, cardIndex) => cardIndex !== index) })} className="rounded-2xl border border-white/10 px-4 py-3 text-slate-300 transition hover:border-rose-500/40 hover:text-rose-200">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const card = emptyCard();
                      setWorkingVersion({ ...workingVersion, cards: [...workingVersion.cards, card] });
                      setCardStatsInput((current) => ({ ...current, [card.id]: stringifyStats(card.stats) }));
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-400/40"
                  >
                    <Plus className="h-4 w-4" />
                    Add card
                  </button>
                </div>
                <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-white">Import cards from CSV</h3>
                      <p className="mt-2 text-sm text-slate-400">Headers: name, cost, power, quantity, plus any numeric custom stat columns.</p>
                    </div>
                    <Upload className="h-5 w-5 text-cyan-200" />
                  </div>
                  <textarea value={csvText} onChange={(event) => setCsvText(event.target.value)} rows={6} className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" placeholder={`name,cost,power,quantity,damage,draw\nRune Wolf,3,3,2,2,0`} />
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const cards = parseCsvCards(csvText);
                        setWorkingVersion({ ...workingVersion, cards });
                        setCardStatsInput(Object.fromEntries(cards.map((card) => [card.id, stringifyStats(card.stats)])));
                        setStatusMessage(`Imported ${cards.length} cards from CSV.`);
                        setErrorMessage(null);
                      } catch (caught) {
                        setErrorMessage(caught instanceof Error ? caught.message : "CSV import failed.");
                      }
                    }}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950"
                  >
                    <Upload className="h-4 w-4" />
                    Replace cards with CSV
                  </button>
                </div>
              </SectionCard>
            </div>
          ) : null}

          {activeTab === "simulate" && workingVersion ? (
            <div className="space-y-6">
              <SectionCard title="Run simulation" description="The simulation engine executes entirely in-browser with real progress updates.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Games</span>
                    <input type="number" min={100} max={10000} step={100} value={simulationConfig.games} onChange={(event) => setSimulationConfig((current) => ({ ...current, games: Number(event.target.value) }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Player count</span>
                    <input type="number" min={workingVersion.playerCountMin} max={workingVersion.playerCountMax} value={simulationConfig.playerCount} onChange={(event) => setSimulationConfig((current) => ({ ...current, playerCount: Number(event.target.value), agentTypes: defaultAgents(Number(event.target.value)) }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Seed</span>
                    <input type="number" value={simulationConfig.seed} onChange={(event) => setSimulationConfig((current) => ({ ...current, seed: Number(event.target.value) }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
                  </label>
                  <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
                    <p className="font-medium text-white">Current version</p>
                    <p className="mt-2">{workingVersion.label}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: simulationConfig.playerCount }, (_, index) => (
                    <label key={`seat-${index + 1}`} className="space-y-2 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
                      <span className="text-sm text-slate-300">Seat {index + 1} agent</span>
                      <select
                        value={simulationConfig.agentTypes[index] ?? "random"}
                        onChange={(event) =>
                          setSimulationConfig((current) => ({
                            ...current,
                            agentTypes: current.agentTypes.map((agent, agentIndex) => (agentIndex === index ? (event.target.value as AgentType) : agent)),
                          }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white"
                      >
                        <option value="random">Random</option>
                        <option value="greedy">Greedy</option>
                        <option value="balanced">Balanced</option>
                      </select>
                    </label>
                  ))}
                </div>
                {versionValidation.length ? <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{versionValidation.join(" ")}</div> : null}
                {simulationLoading ? (
                  <div className="mt-5 rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                    <div className="flex items-center justify-between text-sm text-cyan-100">
                      <span>Simulating...</span>
                      <span>{simulationProgress.toFixed(0)}%</span>
                    </div>
                    <div className="mt-3 h-3 rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${simulationProgress}%` }} />
                    </div>
                  </div>
                ) : null}
                <button type="button" onClick={() => void handleRunSimulation()} disabled={simulationLoading} className="mt-5 inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950 disabled:opacity-60">
                  {simulationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {simulationLoading ? "Running simulations..." : "Run simulation"}
                </button>
              </SectionCard>
            </div>
          ) : null}

          {activeTab === "compare" ? (
            <div className="space-y-6">
              <SectionCard title="Variant comparison" description="Fork the current version, tweak stats, then compare A vs B under the same simulation load.">
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => void handleCreateSnapshot()} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-400/40">
                    <CopyPlus className="h-4 w-4" />
                    Duplicate current version as Variant B
                  </button>
                  <button type="button" onClick={() => setActiveTab("definition")} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-400/40">
                    <TableProperties className="h-4 w-4" />
                    Edit card stats
                  </button>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Version A</span>
                    <select value={compareVersionAId} onChange={(event) => setCompareVersionAId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white">
                      {project.versions.map((version) => (
                        <option key={version.id} value={version.id}>{version.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Version B</span>
                    <select value={compareVersionBId} onChange={(event) => setCompareVersionBId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white">
                      {project.versions.map((version) => (
                        <option key={version.id} value={version.id}>{version.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Games</span>
                    <input type="number" min={100} max={5000} step={100} value={compareConfig.games} onChange={(event) => setCompareConfig((current) => ({ ...current, games: Number(event.target.value) }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Player count</span>
                    <input type="number" min={2} max={4} value={compareConfig.playerCount} onChange={(event) => setCompareConfig((current) => ({ ...current, playerCount: Number(event.target.value), agentTypes: defaultAgents(Number(event.target.value)) }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" />
                  </label>
                </div>
                {compareLoading ? (
                  <div className="mt-5 rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                    <div className="flex items-center justify-between text-sm text-cyan-100">
                      <span>Comparing variants...</span>
                      <span>{compareProgress.toFixed(0)}%</span>
                    </div>
                    <div className="mt-3 h-3 rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${compareProgress}%` }} />
                    </div>
                  </div>
                ) : null}
                <button type="button" onClick={() => void handleRunComparison()} disabled={compareLoading || project.versions.length < 2} className="mt-5 inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950 disabled:opacity-60">
                  {compareLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
                  Run A/B comparison
                </button>
              </SectionCard>

              {comparison ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label={`${compareVersions.versionA?.label ?? "Variant A"} balance`} value={comparison.resultA.summary.overallBalanceScore.toFixed(1)} tone="accent" />
                    <MetricCard label={`${compareVersions.versionB?.label ?? "Variant B"} balance`} value={comparison.resultB.summary.overallBalanceScore.toFixed(1)} tone="accent" />
                    <MetricCard label="A seat 1 edge" value={formatPercent(comparison.resultA.summary.firstPlayerAdvantage)} tone={comparison.resultA.summary.firstPlayerAdvantage > 8 ? "warn" : "default"} />
                    <MetricCard label="B seat 1 edge" value={formatPercent(comparison.resultB.summary.firstPlayerAdvantage)} tone={comparison.resultB.summary.firstPlayerAdvantage > 8 ? "warn" : "default"} />
                  </div>

                  <SectionCard title="Side-by-side position chart" description="Compare positional fairness directly across both variants.">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonPositionChart}>
                          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                          <XAxis dataKey="position" stroke="#64748b" />
                          <YAxis stroke="#64748b" />
                          <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                          <Legend />
                          <Bar dataKey="variantA" name={compareVersions.versionA?.label ?? "Variant A"} fill="#22d3ee" radius={[8, 8, 0, 0]} />
                          <Bar dataKey="variantB" name={compareVersions.versionB?.label ?? "Variant B"} fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>

                  <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <SectionCard title="Comparison scorecard" description="Higher balance score and lower positional skew wins.">
                      <div className="space-y-3">
                        {comparisonMetrics.map((metric) => (
                          <div key={metric.metric} className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/60 p-4 md:grid-cols-3">
                            <div><p className="text-sm text-slate-300">{metric.metric}</p></div>
                            <p className="font-mono text-xl text-cyan-200">{metric.variantA.toFixed(1)}</p>
                            <p className="font-mono text-xl text-violet-200">{metric.variantB.toFixed(1)}</p>
                          </div>
                        ))}
                      </div>
                    </SectionCard>

                    <SectionCard title="Recommendation" description="A clear winner is computed from balance score and seat skew penalties.">
                      <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-5 text-sm leading-7 text-cyan-100">
                        {comparisonWinner?.winner === "tie"
                          ? "Variants are effectively tied. Prefer the one with better card feel in human playtests."
                          : comparisonWinner?.winner === "B"
                            ? `${compareVersions.versionB?.label ?? "Variant B"} wins by ${comparisonWinner?.difference.toFixed(1)} weighted points. It improves balance and reduces positional skew more effectively.`
                            : `${compareVersions.versionA?.label ?? "Variant A"} remains stronger by ${comparisonWinner?.difference.toFixed(1)} weighted points. Keep B as a branch for further tuning.`}
                      </div>
                      <div className="mt-4 grid gap-3">
                        {[comparison.resultA, comparison.resultB].map((result, index) => (
                          <div key={`${result.generatedAt}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
                            <p className="font-medium text-white">{index === 0 ? compareVersions.versionA?.label : compareVersions.versionB?.label}</p>
                            <p className="mt-2">{result.summary.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {activeTab === "report" ? (
            <div className="space-y-6">
              <SectionCard title="Exportable balance report" description="Use the formatted report for collaborator reviews or print/PDF export.">
                {selectedRun ? (
                  <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                      <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-200">Latest recommendation</p>
                      <p className="mt-4 text-lg leading-8 text-slate-200">{selectedRun.result.summary.recommendation}</p>
                      <ul className="mt-5 space-y-3 text-sm text-slate-300">
                        {(selectedRun.result.summary.flaggedIssues.length ? selectedRun.result.summary.flaggedIssues : ["No major issues flagged in the latest run."]).map((issue) => (
                          <li key={issue} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">{issue}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                      <p className="text-sm text-slate-400">Open the printable report view, then use your browser print dialog to export PDF.</p>
                      <Link href={`/projects/${project.id}/report?runId=${selectedRun.id}`} target="_blank" className="mt-5 inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950">
                        <Download className="h-4 w-4" />
                        Open report view
                      </Link>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Run a simulation first to generate a report.</p>
                )}
              </SectionCard>
            </div>
          ) : null}
        </div>

        <aside className="space-y-6">
          <SectionCard title="Versions" description="Immutable snapshots for version tracking and A/B baselines.">
            <div className="space-y-3">
              {project.versions.map((version) => (
                <button
                  key={version.id}
                  type="button"
                  onClick={() => syncVersionSelection(project, version.id)}
                  className={cn(
                    "w-full rounded-3xl border p-4 text-left transition",
                    selectedVersionId === version.id ? "border-cyan-400/30 bg-cyan-400/10" : "border-white/10 bg-slate-950/60 hover:border-cyan-400/20",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">{version.label}</p>
                    <span className="font-mono text-xs uppercase tracking-[0.25em] text-slate-500">{formatDate(version.updatedAt)}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-400">
                    {version.cards.length} cards · {version.resources.length} resources · {version.winConditionType.replaceAll("_", " ")}
                  </p>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Simulation history" description="Saved runs remain attached to the project with core metrics and timestamps.">
            <div className="space-y-3">
              {project.runs.length ? (
                project.runs.map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => {
                      setSelectedRunId(run.id);
                      setActiveTab("dashboard");
                    }}
                    className={cn(
                      "w-full rounded-3xl border p-4 text-left transition",
                      selectedRunId === run.id ? "border-cyan-400/30 bg-cyan-400/10" : "border-white/10 bg-slate-950/60 hover:border-cyan-400/20",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-white">{run.label}</p>
                      <span className="font-mono text-xs uppercase tracking-[0.25em] text-slate-500">{formatDate(run.createdAt)}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-400 sm:grid-cols-3">
                      <span>Balance {Math.round(run.result.summary.overallBalanceScore)}</span>
                      <span>Seat 1 {formatPercent(run.result.summary.firstPlayerAdvantage)}</span>
                      <span>{run.config.games} games</span>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-slate-400">No runs saved yet.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Quick guidance" description="What the current workspace is telling you.">
            <div className="space-y-3 text-sm leading-7 text-slate-300">
              <p>Use Rule definition to update cards or paste CSV data.</p>
              <p>Use Simulations for full history runs that persist to SQLite.</p>
              <p>Use A/B testing after duplicating a snapshot to get a side-by-side recommendation.</p>
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
