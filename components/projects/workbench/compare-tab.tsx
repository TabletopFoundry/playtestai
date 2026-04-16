"use client";

import { useMemo, useState } from "react";
import { CopyPlus, Loader2, Swords, TableProperties } from "lucide-react";
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
import type { SimulationBatchResult, SimulationConfig } from "@/lib/types";
import { formatPercent } from "@/lib/utils";
import type { WorkbenchState } from "./types";
import { createConfig, defaultAgents, normalizeConfig } from "./types";
import { MetricCard, SectionCard, darkTooltipProps } from "./shared";

interface CompareTabProps {
  state: WorkbenchState;
}

export function CompareTab({ state }: CompareTabProps) {
  const {
    project,
    setStatusMessage,
    setErrorMessage,
    setActiveTab,
    handleCreateSnapshot,
  } = state;

  const [compareConfig, setCompareConfig] = useState<SimulationConfig>(createConfig(project.versions[0]!, 500));
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareProgress, setCompareProgress] = useState(0);
  const [comparison, setComparison] = useState<{
    versionAId: string;
    versionBId: string;
    resultA: SimulationBatchResult;
    resultB: SimulationBatchResult;
  } | null>(null);
  const [compareVersionAId, setCompareVersionAId] = useState(project.versions[0]?.id ?? "");
  const [compareVersionBId, setCompareVersionBId] = useState(project.versions[1]?.id ?? project.versions[0]?.id ?? "");

  const compareVersions = useMemo(
    () => ({
      versionA: project.versions.find((version) => version.id === comparison?.versionAId) ?? project.versions.find((version) => version.id === compareVersionAId),
      versionB: project.versions.find((version) => version.id === comparison?.versionBId) ?? project.versions.find((version) => version.id === compareVersionBId),
    }),
    [compareVersionAId, compareVersionBId, comparison, project.versions],
  );

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

  const notEnoughVersions = project.versions.length < 2;

  return (
    <div className="space-y-6">
      <SectionCard title="Variant comparison" description="Fork the current version, tweak stats, then compare A vs B under the same simulation load.">
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => void handleCreateSnapshot()} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
            <CopyPlus className="h-4 w-4" />
            Duplicate current version as Variant B
          </button>
          <button type="button" onClick={() => setActiveTab("definition")} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
            <TableProperties className="h-4 w-4" />
            Edit card stats
          </button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Version A</span>
            <select value={compareVersionAId} onChange={(event) => setCompareVersionAId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
              {project.versions.map((version) => (
                <option key={version.id} value={version.id}>{version.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Version B</span>
            <select value={compareVersionBId} onChange={(event) => setCompareVersionBId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
              {project.versions.map((version) => (
                <option key={version.id} value={version.id}>{version.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Games</span>
            <input type="number" min={100} max={5000} step={100} value={compareConfig.games} onChange={(event) => setCompareConfig((current) => ({ ...current, games: Number(event.target.value) }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Player count</span>
            <input type="number" min={2} max={4} value={compareConfig.playerCount} onChange={(event) => setCompareConfig((current) => ({ ...current, playerCount: Number(event.target.value), agentTypes: defaultAgents(Number(event.target.value)) }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
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

        {/* QW-8: tooltip when < 2 versions */}
        <div className="mt-5 flex items-center gap-3">
          <button type="button" onClick={() => void handleRunComparison()} disabled={compareLoading || notEnoughVersions} className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
            {compareLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
            Run A/B comparison
          </button>
          {notEnoughVersions && (
            <span className="text-sm text-slate-400">Create a snapshot first to have two versions to compare.</span>
          )}
        </div>
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
