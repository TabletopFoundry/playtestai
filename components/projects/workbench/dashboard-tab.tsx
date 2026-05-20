"use client";

import { useMemo, useState } from "react";
import { Download, Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GameProject } from "@/lib/types";
import { agentLabel, formatDate, formatPercent } from "@/lib/utils";
import { escapeCsvField } from "@/lib/csv-export";
import type { ActiveTab, CardSortKey } from "./types";
import { MetricCard, SectionCard, darkTooltipProps } from "./shared";

interface DashboardTabProps {
  project: GameProject;
  selectedVersion: GameProject["versions"][number] | null;
  selectedRun: GameProject["runs"][number] | null;
  setActiveTab: (tab: ActiveTab) => void;
}

function generateRunCsv(run: GameProject["runs"][number]): string {
  const lines: string[] = [];

  lines.push("# Balance Report");
  lines.push(`Balance Score,${Math.round(run.result.summary.overallBalanceScore)}`);
  lines.push(`Average Turns,${run.result.summary.averageTurns.toFixed(1)}`);
  lines.push(`Seat 1 Edge,${run.result.summary.firstPlayerAdvantage.toFixed(1)}%`);
  lines.push(`Winning Score,${run.result.summary.averageWinningScore.toFixed(1)}`);
  lines.push("");

  lines.push("# Win Rate by Position");
  lines.push("Position,Wins,Win Rate %");
  for (const entry of run.result.winRatesByPosition) {
    lines.push(`${entry.position},${entry.wins},${entry.winRate.toFixed(1)}`);
  }
  lines.push("");

  lines.push("# Strategy Breakdown");
  lines.push("Agent,Wins,Win Rate %");
  for (const entry of run.result.strategyBreakdown) {
    lines.push(`${escapeCsvField(entry.agent)},${entry.wins},${entry.winRate.toFixed(1)}`);
  }
  lines.push("");

  lines.push("# Card Rankings");
  lines.push("Card,Power Score,Win Correlation %,Avg Impact,Inclusion Rate %,Total Plays");
  for (const card of run.result.cardRankings) {
    lines.push(`${escapeCsvField(card.cardName)},${card.powerScore.toFixed(1)},${card.winCorrelation.toFixed(1)},${card.averageImpact.toFixed(1)},${card.inclusionRate.toFixed(1)},${card.totalPlays}`);
  }

  return lines.join("\n");
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function DashboardTab({ project, selectedVersion, selectedRun, setActiveTab }: DashboardTabProps) {
  const [cardSortKey, setCardSortKey] = useState<CardSortKey>("powerScore");
  const selectedRunVersion = selectedRun
    ? project.versions.find((version) => version.id === selectedRun.versionId) ?? null
    : null;

  const sortedCardRankings = useMemo(() => {
    if (!selectedRun) return [];
    return [...selectedRun.result.cardRankings].sort((left, right) => right[cardSortKey] - left[cardSortKey]);
  }, [cardSortKey, selectedRun]);

  if (!selectedRun) {
    if (project.runs.length > 0 && selectedVersion) {
      return (
        <SectionCard title="No benchmark saved for this version" description="Analytics follow the version currently selected in the workspace.">
          <div className="space-y-4">
            <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm leading-7 text-amber-100">
              <p className="font-medium text-white">{selectedVersion.label} does not have a saved benchmark yet.</p>
              <p className="mt-3">
                Run a simulation for this version to refresh the dashboard, or choose another benchmark from Simulation history if you want to inspect a different branch.
              </p>
            </div>
            <button type="button" onClick={() => setActiveTab("simulate")} className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
              <Sparkles className="mr-2 inline h-4 w-4" />
              Run a benchmark for {selectedVersion.label}
            </button>
          </div>
        </SectionCard>
      );
    }

    return (
      <SectionCard title="Welcome to your workspace" description="Get started with your first simulation in three steps.">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/10 font-mono text-sm font-bold text-cyan-200">1</span>
                <p className="font-medium text-white">Define your cards</p>
              </div>
              <p className="mt-3 text-sm text-slate-400">Head to the Rule definition tab to set up resources, cards, and game parameters.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/10 font-mono text-sm font-bold text-cyan-200">2</span>
                <p className="font-medium text-white">Run a simulation</p>
              </div>
              <p className="mt-3 text-sm text-slate-400">Configure player count and agent types, then run hundreds of games to generate data.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/10 font-mono text-sm font-bold text-cyan-200">3</span>
                <p className="font-medium text-white">Review analytics</p>
              </div>
              <p className="mt-3 text-sm text-slate-400">Analyze win rates, card power rankings, and balance scores to guide your design.</p>
            </div>
          </div>
          <button type="button" onClick={() => setActiveTab("definition")} className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
            <Sparkles className="mr-2 inline h-4 w-4" />
            Start with rule definition
          </button>
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Selected benchmark context" description="Keep the active analytics tied to the exact saved run you are reviewing.">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(0,0.6fr))]">
          <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-4">
            <p className="font-medium text-white">{selectedRun.label}</p>
            <p className="mt-2 text-sm text-slate-300">
              Source version {selectedRunVersion?.label ?? "Unknown version"} · captured {formatDate(selectedRun.createdAt)}.
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.24em] text-cyan-200">
              Seat mix: {selectedRun.config.agentTypes.map((agent) => agentLabel(agent)).join(" / ")}
            </p>
          </div>
          <MetricCard label="Games" value={String(selectedRun.config.games)} />
          <MetricCard label="Seats" value={String(selectedRun.config.playerCount)} />
          <MetricCard label="Seed" value={String(selectedRun.config.seed)} />
        </div>
      </SectionCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Balance score" value={`${Math.round(selectedRun.result.summary.overallBalanceScore)}`} tone="accent" />
        <MetricCard label="Avg turns" value={selectedRun.result.summary.averageTurns.toFixed(1)} />
        <MetricCard label="Seat 1 edge" value={formatPercent(selectedRun.result.summary.firstPlayerAdvantage)} tone={selectedRun.result.summary.firstPlayerAdvantage > 8 ? "warn" : "default"} />
        <MetricCard label="Winning score" value={selectedRun.result.summary.averageWinningScore.toFixed(1)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Win rate by player position" description="Use this to detect first-player advantage or underperforming seats.">
          <div className="h-72" role="img" aria-label="Bar chart showing win rate by player position">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={selectedRun.result.winRatesByPosition}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="position" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip {...darkTooltipProps} formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Bar dataKey="winRate" fill="#22d3ee" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>Win rate by player position</caption>
            <thead><tr><th>Position</th><th>Win Rate</th></tr></thead>
            <tbody>
              {selectedRun.result.winRatesByPosition.map((entry) => (
                <tr key={entry.position}><td>Seat {entry.position}</td><td>{entry.winRate.toFixed(1)}%</td></tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="Game length distribution" description="Histogram of simulated match length in turns.">
          <div className="h-72" role="img" aria-label="Bar chart showing game length distribution in turns">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={selectedRun.result.gameLengthHistogram}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="bucket" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip {...darkTooltipProps} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>Game length distribution</caption>
            <thead><tr><th>Turns</th><th>Count</th></tr></thead>
            <tbody>
              {selectedRun.result.gameLengthHistogram.map((entry) => (
                <tr key={entry.bucket}><td>{entry.bucket}</td><td>{entry.count}</td></tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Score distribution" description="Final score histogram across every simulated player.">
          <div className="h-72" role="img" aria-label="Line chart showing score distribution across all simulated players">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={selectedRun.result.scoreDistribution}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="bucket" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip {...darkTooltipProps} />
                <Line type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>Score distribution</caption>
            <thead><tr><th>Score</th><th>Count</th></tr></thead>
            <tbody>
              {selectedRun.result.scoreDistribution.map((entry) => (
                <tr key={entry.bucket}><td>{entry.bucket}</td><td>{entry.count}</td></tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="Strategy breakdown" description="Dominant strategy is flagged when an agent wins more than 60% of games.">
          <div className="h-72" role="img" aria-label="Bar chart showing strategy breakdown by agent type">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={selectedRun.result.strategyBreakdown}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="agent" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip {...darkTooltipProps} formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Bar dataKey="winRate" fill="#f59e0b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>Strategy breakdown by agent type</caption>
            <thead><tr><th>Agent</th><th>Win Rate</th></tr></thead>
            <tbody>
              {selectedRun.result.strategyBreakdown.map((entry) => (
                <tr key={entry.agent}><td>{entry.agent}</td><td>{entry.winRate.toFixed(1)}%</td></tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
            {selectedRun.result.summary.dominantStrategy
              ? `${agentLabel(selectedRun.result.summary.dominantStrategy)} is winning ${selectedRun.result.summary.dominantStrategyWinRate.toFixed(1)}% of games.`
              : "No dominant strategy detected. The current agent mix is within the healthy threshold."}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Card power rankings" description="Sort by win correlation, inclusion, or average impact to find suspicious cards.">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label htmlFor="card-sort-select" className="text-sm text-slate-400">Sort table</label>
            <select
              id="card-sort-select"
              value={cardSortKey}
              onChange={(event) => setCardSortKey(event.target.value as CardSortKey)}
              className="rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
            >
              <option value="powerScore">Power score</option>
              <option value="winCorrelation">Win correlation</option>
              <option value="averageImpact">Average impact</option>
              <option value="inclusionRate">Inclusion rate</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => downloadCsv(generateRunCsv(selectedRun), `run-${selectedRun.label.replace(/\s+/g, "-")}.csv`)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
        <div className="overflow-auto rounded-3xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-[0.25em] text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">Card</th>
                <th scope="col" className="px-4 py-3">Power score</th>
                <th scope="col" className="px-4 py-3">Win corr.</th>
                <th scope="col" className="px-4 py-3">Avg impact</th>
                <th scope="col" className="px-4 py-3">Inclusion</th>
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
  );
}
