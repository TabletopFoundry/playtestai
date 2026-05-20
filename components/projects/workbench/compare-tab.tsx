"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, CopyPlus, Loader2, Swords, TableProperties, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { simulateBatchAsync } from "@/lib/simulation/engine";
import type { AgentType, SimulationBatchResult, SimulationConfig } from "@/lib/types";
import { agentLabel, formatPercent } from "@/lib/utils";
import { getVersionStateLabel } from "./status-utils";
import type { WorkbenchState } from "./types";
import { createConfig, defaultAgents, getSharedPlayerRange, isComparisonSelectionCurrent, normalizeConfig, syncAgentTypes } from "./types";
import { MetricCard, SectionCard, darkTooltipProps } from "./shared";

interface CompareTabProps {
  state: WorkbenchState;
}

export function CompareTab({ state }: CompareTabProps) {
  const {
    project,
    selectedVersion,
    setStatusMessage,
    setErrorMessage,
    setActiveTab,
    handleCreateSnapshot,
  } = state;

  const [compareConfig, setCompareConfig] = useState<SimulationConfig>(() => {
    const initialVersion = project.versions[0];
    return initialVersion
      ? createConfig(initialVersion, 500)
      : { games: 500, playerCount: 2, seed: 1337, agentTypes: defaultAgents(2) };
  });
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareProgress, setCompareProgress] = useState(0);
  const [comparison, setComparison] = useState<{
    versionAId: string;
    versionBId: string;
    config: SimulationConfig;
    resultA: SimulationBatchResult;
    resultB: SimulationBatchResult;
  } | null>(null);
  const [compareVersionAId, setCompareVersionAId] = useState(project.versions[0]?.id ?? "");
  const [compareVersionBId, setCompareVersionBId] = useState(project.versions[1]?.id ?? project.versions[0]?.id ?? "");

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    abortControllerRef.current?.abort();
  }, []);

  const notEnoughVersions = project.versions.length < 2;
  const selectedVersionA = project.versions.find((version) => version.id === compareVersionAId) ?? project.versions[0] ?? null;
  const fallbackVersionB = project.versions.find((version) => version.id !== (selectedVersionA?.id ?? "")) ?? project.versions[0] ?? null;
  const selectedVersionB =
    project.versions.find((version) => version.id === compareVersionBId && version.id !== (selectedVersionA?.id ?? "")) ??
    fallbackVersionB;
  const versionBChoices = project.versions.filter((version) => version.id !== (selectedVersionA?.id ?? ""));

  const compareVersions = useMemo(
    () => ({
      versionA: project.versions.find((version) => version.id === comparison?.versionAId) ?? selectedVersionA,
      versionB: project.versions.find((version) => version.id === comparison?.versionBId) ?? selectedVersionB,
    }),
    [comparison, project.versions, selectedVersionA, selectedVersionB],
  );

  const sharedPlayerRange = useMemo(
    () => getSharedPlayerRange(selectedVersionA, selectedVersionB),
    [selectedVersionA, selectedVersionB],
  );

  const sharedPlayerCount = sharedPlayerRange
    ? Math.min(Math.max(compareConfig.playerCount, sharedPlayerRange.min), sharedPlayerRange.max)
    : compareConfig.playerCount;
  const sharedConfig: SimulationConfig = sharedPlayerRange
    ? {
        ...compareConfig,
        playerCount: sharedPlayerCount,
        agentTypes: syncAgentTypes(sharedPlayerCount, compareConfig.agentTypes),
      }
    : compareConfig;
  const currentComparisonConfig = selectedVersionA && sharedPlayerRange ? normalizeConfig(selectedVersionA, sharedConfig) : null;
  const comparisonIsCurrent = currentComparisonConfig && selectedVersionA && selectedVersionB
    ? isComparisonSelectionCurrent(comparison, selectedVersionA.id, selectedVersionB.id, currentComparisonConfig)
    : false;

  const comparisonWinner = useMemo(() => {
    if (!comparison) return null;
    const scoreA = comparison.resultA.summary.overallBalanceScore - Math.abs(comparison.resultA.summary.firstPlayerAdvantage) * 1.2;
    const scoreB = comparison.resultB.summary.overallBalanceScore - Math.abs(comparison.resultB.summary.firstPlayerAdvantage) * 1.2;
    const winner = scoreA === scoreB ? "tie" : scoreB > scoreA ? "B" : "A";
    return { winner, difference: Math.abs(scoreB - scoreA) };
  }, [comparison]);

  const comparisonPositionChart = useMemo(() => {
    if (!comparison) return [];
    return comparison.resultA.winRatesByPosition.map((entry, index) => ({
      position: `Seat ${entry.position}`,
      variantA: entry.winRate,
      variantB: comparison.resultB.winRatesByPosition[index]?.winRate ?? 0,
    }));
  }, [comparison]);

  const comparisonMetrics = useMemo(() => {
    if (!comparison) return [];
    return [
      { metric: "Balance score", variantA: comparison.resultA.summary.overallBalanceScore, variantB: comparison.resultB.summary.overallBalanceScore },
      { metric: "Seat 1 edge", variantA: comparison.resultA.summary.firstPlayerAdvantage, variantB: comparison.resultB.summary.firstPlayerAdvantage },
      { metric: "Avg turns", variantA: comparison.resultA.summary.averageTurns, variantB: comparison.resultB.summary.averageTurns },
    ];
  }, [comparison]);

  async function handleRunComparison() {
    setErrorMessage(null);
    setStatusMessage(null);

    const versionA = selectedVersionA;
    const versionB = selectedVersionB;
    const playerRange = getSharedPlayerRange(versionA, versionB);

    if (!versionA || !versionB) {
      setErrorMessage("Choose two saved versions to compare.");
      return;
    }

    if (!playerRange) {
      setErrorMessage("These versions do not overlap on player count, so they cannot be compared fairly.");
      return;
    }

    setCompareLoading(true);
    setCompareProgress(0);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const configA = normalizeConfig(versionA, sharedConfig);
      const configB = normalizeConfig(versionB, sharedConfig);
      setCompareConfig(configA);
      const resultA = await simulateBatchAsync(versionA, configA, (value) => setCompareProgress(value / 2), controller.signal);
      const resultB = await simulateBatchAsync(versionB, configB, (value) => setCompareProgress(50 + value / 2), controller.signal);
      setComparison({ versionAId: versionA.id, versionBId: versionB.id, config: configA, resultA, resultB });
      setStatusMessage("A/B comparison complete. Review the recommendation below.");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setErrorMessage(caught instanceof Error ? caught.message : "Comparison failed.");
    } finally {
      setCompareLoading(false);
      setCompareProgress(0);
    }
  }

  function handleCancelComparison() {
    if (!compareLoading) {
      return;
    }

    abortControllerRef.current?.abort();
    setStatusMessage("A/B comparison cancelled before completion.");
  }

  function handleSwapVersions() {
    if (!selectedVersionA || !selectedVersionB) {
      return;
    }

    setCompareVersionAId(selectedVersionB.id);
    setCompareVersionBId(selectedVersionA.id);
  }

  async function handleCreateVariantBSnapshot() {
    const sourceVersionId = selectedVersion?.id ?? selectedVersionA?.id ?? compareVersionAId;
    const snapshot = await handleCreateSnapshot();
    if (!snapshot) {
      return;
    }

    if (sourceVersionId) {
      setCompareVersionAId(sourceVersionId);
    }
    setCompareVersionBId(snapshot.id);
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Variant comparison" description="Fork the current version, tweak stats, then compare A vs B under the same simulation load.">
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => void handleCreateVariantBSnapshot()} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
            <CopyPlus className="h-4 w-4" />
            Duplicate current version as Variant B
          </button>
          <button type="button" onClick={() => setActiveTab("definition")} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
            <TableProperties className="h-4 w-4" />
            Edit card stats
          </button>
          <button
            type="button"
            onClick={handleSwapVersions}
            disabled={!selectedVersionA || !selectedVersionB || compareLoading}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
          >
            <ArrowLeftRight className="h-4 w-4" />
            Swap A/B
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)]">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Version A</span>
              <select value={selectedVersionA?.id ?? ""} onChange={(event) => setCompareVersionAId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
                {project.versions.map((version) => (
                  <option key={version.id} value={version.id}>{version.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Version B</span>
              <select value={selectedVersionB?.id ?? ""} onChange={(event) => setCompareVersionBId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
                {versionBChoices.map((version) => (
                  <option key={version.id} value={version.id}>{version.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Games</span>
              <input type="number" min={100} max={5000} step={100} value={compareConfig.games} onChange={(event) => setCompareConfig((current) => ({ ...current, games: Number(event.target.value) }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Seed</span>
              <input type="number" value={compareConfig.seed} onChange={(event) => setCompareConfig((current) => ({ ...current, seed: Number(event.target.value) }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-300">Shared player count</span>
              <input
                type="number"
                min={sharedPlayerRange?.min ?? 2}
                max={sharedPlayerRange?.max ?? 2}
                value={sharedConfig.playerCount}
                disabled={!sharedPlayerRange}
                onChange={(event) => {
                  const playerCount = Number(event.target.value);
                  setCompareConfig({
                    ...sharedConfig,
                    playerCount,
                    agentTypes: syncAgentTypes(playerCount, sharedConfig.agentTypes),
                  });
                }}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
            <p className="font-medium text-white">Comparison fairness metadata</p>
            <dl className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <dt>{selectedVersionA?.label ?? "Version A"}</dt>
                <dd>{selectedVersionA ? getVersionStateLabel(selectedVersionA) : "Missing"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>{selectedVersionB?.label ?? "Version B"}</dt>
                <dd>{selectedVersionB ? getVersionStateLabel(selectedVersionB) : "Missing"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Shared seat range</dt>
                <dd>{sharedPlayerRange ? `${sharedPlayerRange.min}-${sharedPlayerRange.max}` : "No overlap"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Shared config</dt>
                <dd className="text-right">{sharedConfig.games} games · seed {sharedConfig.seed}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Seat mix</dt>
                <dd className="text-right">{sharedConfig.agentTypes.map((agent) => agentLabel(agent)).join(" / ")}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs leading-6 text-slate-400">
              Both variants run with the same games, seed, seat count, and seat-agent lineup so the comparison stays apples-to-apples.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: sharedConfig.playerCount }, (_, index) => (
            <label key={`compare-seat-${index + 1}`} className="space-y-2 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
              <span className="text-sm text-slate-300">Seat {index + 1} agent</span>
              <select
                value={sharedConfig.agentTypes[index] ?? "random"}
                onChange={(event) =>
                  setCompareConfig({
                    ...sharedConfig,
                    agentTypes: sharedConfig.agentTypes.map((agent, agentIndex) => (agentIndex === index ? (event.target.value as AgentType) : agent)),
                  })
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
              >
                <option value="random">Random</option>
                <option value="greedy">Greedy</option>
                <option value="balanced">Balanced</option>
              </select>
            </label>
          ))}
        </div>

        {!sharedPlayerRange && !notEnoughVersions ? (
          <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            The selected versions do not share a common player-count range. Pick versions that overlap to run a fair comparison.
          </div>
        ) : null}

        {compareLoading ? (
          <div className="mt-5 rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-4" aria-busy="true">
            <p className="sr-only" aria-live="polite">Comparison {compareProgress.toFixed(0)}% complete.</p>
            <div className="flex items-center justify-between gap-3 text-sm text-cyan-100">
              <span>Comparing variants...</span>
              <div className="flex items-center gap-3">
                <span>{compareProgress.toFixed(0)}%</span>
                <button
                  type="button"
                  onClick={handleCancelComparison}
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 px-3 py-1.5 text-xs font-medium text-cyan-50 transition hover:border-cyan-200/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel compare
                </button>
              </div>
            </div>
            <div
              className="mt-3 h-3 rounded-full bg-white/10"
              role="progressbar"
              aria-label="Comparison progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(compareProgress)}
              aria-valuetext={`${compareProgress.toFixed(0)}% complete`}
            >
              <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${compareProgress}%` }} />
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void handleRunComparison()} disabled={compareLoading || notEnoughVersions || !sharedPlayerRange} className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
            {compareLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
            Run A/B comparison
          </button>
          {notEnoughVersions ? (
            <span className="text-sm text-slate-400">Create a snapshot first to have two versions to compare.</span>
          ) : (
            <span className="text-sm text-slate-400">The same seed and seat mix are reused for both variants.</span>
          )}
        </div>

        {comparison && !comparisonIsCurrent ? (
          <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Current controls no longer match the last completed comparison. The results below still reflect {compareVersions.versionA?.label ?? "Variant A"} vs {compareVersions.versionB?.label ?? "Variant B"} with {comparison.config.games} games, seed {comparison.config.seed}, and {comparison.config.playerCount} seats. Run the comparison again to refresh the recommendation.
          </div>
        ) : null}
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
            <div className="h-80" role="img" aria-label="Bar chart comparing win rates by position between variants A and B">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonPositionChart}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="position" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip {...darkTooltipProps} formatter={(value: number) => `${value.toFixed(1)}%`} />
                  <Legend />
                  <Bar dataKey="variantA" name={compareVersions.versionA?.label ?? "Variant A"} fill="#22d3ee" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="variantB" name={compareVersions.versionB?.label ?? "Variant B"} fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="sr-only">
              <caption>Win rates by position — {compareVersions.versionA?.label ?? "Variant A"} vs {compareVersions.versionB?.label ?? "Variant B"}</caption>
              <thead><tr><th>Position</th><th>{compareVersions.versionA?.label ?? "A"}</th><th>{compareVersions.versionB?.label ?? "B"}</th></tr></thead>
              <tbody>
                {comparisonPositionChart.map((entry) => (
                  <tr key={entry.position}><td>{entry.position}</td><td>{entry.variantA.toFixed(1)}%</td><td>{entry.variantB.toFixed(1)}%</td></tr>
                ))}
              </tbody>
            </table>
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
  );
}
