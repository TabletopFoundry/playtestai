"use client";

import { useState } from "react";
import { AlertCircle, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { simulateBatchAsync } from "@/lib/simulation/engine";
import type { AgentType, SimulationConfig, ValidationIssue } from "@/lib/types";
import type { WorkbenchState } from "./types";
import { createConfig, defaultAgents, normalizeConfig } from "./types";
import { SectionCard } from "./shared";

interface SimulationTabProps {
  state: WorkbenchState;
}

export function SimulationTab({ state }: SimulationTabProps) {
  const {
    project,
    workingVersion,
    selectedVersion,
    versionValidation,
    dirty,
    setStatusMessage,
    setErrorMessage,
    setActiveTab,
    setSelectedRunId,
    handleSaveVersion,
    updateFromResponse,
  } = state;

  const [simulationConfig, setSimulationConfig] = useState<SimulationConfig>(createConfig(project.versions[0], 750));
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);

  async function handleRunSimulation() {
    if (!workingVersion) return;
    setErrorMessage(null);
    setStatusMessage(null);

    const errors = versionValidation.filter((issue: ValidationIssue) => issue.severity === "error");
    if (errors.length) {
      setErrorMessage(errors.map((issue: ValidationIssue) => issue.message).join(" "));
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

  if (!workingVersion) return null;

  const validationErrors = versionValidation.filter((issue) => issue.severity === "error");
  const validationWarnings = versionValidation.filter((issue) => issue.severity === "warning");

  return (
    <div className="space-y-6">
      <SectionCard title="Run simulation" description="The simulation engine executes entirely in-browser with real progress updates.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Games</span>
            <input type="number" min={100} max={10000} step={100} value={simulationConfig.games} onChange={(event) => setSimulationConfig((current) => ({ ...current, games: Number(event.target.value) }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Player count</span>
            <input type="number" min={workingVersion.playerCountMin} max={workingVersion.playerCountMax} value={simulationConfig.playerCount} onChange={(event) => setSimulationConfig((current) => ({ ...current, playerCount: Number(event.target.value), agentTypes: defaultAgents(Number(event.target.value)) }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Seed</span>
            <input type="number" value={simulationConfig.seed} onChange={(event) => setSimulationConfig((current) => ({ ...current, seed: Number(event.target.value) }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
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
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
              >
                <option value="random">Random</option>
                <option value="greedy">Greedy</option>
                <option value="balanced">Balanced</option>
              </select>
            </label>
          ))}
        </div>

        {/* Validation panel with severity (MT-6) */}
        {versionValidation.length > 0 && (
          <div className="mt-5 space-y-2">
            {validationErrors.map((issue, index) => (
              <div key={`err-${index}`} className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{issue.message}</span>
              </div>
            ))}
            {validationWarnings.map((issue, index) => (
              <div key={`warn-${index}`} className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span>{issue.message}</span>
              </div>
            ))}
          </div>
        )}

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
        <button type="button" onClick={() => void handleRunSimulation()} disabled={simulationLoading || validationErrors.length > 0} className="mt-5 inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
          {simulationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {simulationLoading ? "Running simulations..." : "Run simulation"}
        </button>
      </SectionCard>
    </div>
  );
}
