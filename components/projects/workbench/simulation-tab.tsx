"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, Loader2, Sparkles, X } from "lucide-react";
import { simulateBatchAsync } from "@/lib/simulation/engine";
import { agentLabel } from "@/lib/utils";
import type { AgentType, SimulationConfig, ValidationIssue } from "@/lib/types";
import { getVersionStateLabel } from "./status-utils";
import type { WorkbenchState } from "./types";
import { createConfig, defaultAgents, normalizeConfig, syncAgentTypes } from "./types";
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

  const [simulationConfig, setSimulationConfig] = useState<SimulationConfig>(() => {
    const initialVersion = project.versions[0] ?? selectedVersion ?? workingVersion;
    return initialVersion
      ? createConfig(initialVersion, 750)
      : { games: 750, playerCount: 2, seed: 1337, agentTypes: defaultAgents(2) };
  });
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const effectivePreset = workingVersion ? normalizeConfig(workingVersion, simulationConfig) : simulationConfig;

  async function handleRunSimulation() {
    if (!workingVersion) return;
    setErrorMessage(null);
    setStatusMessage(null);

    const errors = versionValidation.filter((issue: ValidationIssue) => issue.severity === "error");
    if (errors.length) {
      setErrorMessage(errors.map((issue: ValidationIssue) => issue.message).join(" "));
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setSimulationLoading(true);
    setSimulationProgress(0);

    try {
      const savedVersion = dirty ? await handleSaveVersion(true) : selectedVersion;
      if (!savedVersion) {
        throw new Error("Save the current version before running simulations.");
      }

      const config = normalizeConfig(savedVersion, effectivePreset);
      setSimulationConfig(config);
      const result = await simulateBatchAsync(savedVersion, config, setSimulationProgress, controller.signal);
      const response = await fetch(`/api/projects/${project.id}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId: savedVersion.id,
          label: `${savedVersion.label} · ${config.games} games`,
          config,
          result,
        }),
        signal: controller.signal,
      });
      const nextProject = await updateFromResponse(response);
      const latestRun = nextProject.runs[0];
      if (latestRun) {
        setSelectedRunId(latestRun.id);
      }
      setActiveTab("dashboard");
      setStatusMessage(`Simulation complete. ${config.games} games saved to history.`);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setErrorMessage(caught instanceof Error ? caught.message : "Simulation failed.");
    } finally {
      setSimulationLoading(false);
      setSimulationProgress(0);
    }
  }

  function handleCancelSimulation() {
    if (!simulationLoading) {
      return;
    }

    abortControllerRef.current?.abort();
    setStatusMessage("Simulation cancelled before completion.");
  }

  const handleRunRef = useRef(handleRunSimulation);
  useEffect(() => {
    handleRunRef.current = handleRunSimulation;
  });

  useEffect(() => {
    function onRunShortcut() {
      void handleRunRef.current();
    }
    document.addEventListener("playtestai:run-simulation", onRunShortcut);
    return () => document.removeEventListener("playtestai:run-simulation", onRunShortcut);
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  if (!workingVersion) return null;

  const validationErrors = versionValidation.filter((issue) => issue.severity === "error");
  const validationWarnings = versionValidation.filter((issue) => issue.severity === "warning");

  return (
    <div className="space-y-6">
      <SectionCard title="Run simulation" description="The simulation engine executes entirely in-browser with real progress updates.">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Games</span>
              <input type="number" min={100} max={10000} step={100} value={effectivePreset.games} onChange={(event) => setSimulationConfig({ ...effectivePreset, games: Number(event.target.value) })} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Player count</span>
              <input
                type="number"
                min={workingVersion.playerCountMin}
                max={workingVersion.playerCountMax}
                value={effectivePreset.playerCount}
                onChange={(event) => {
                  const playerCount = Number(event.target.value);
                  setSimulationConfig({
                    ...effectivePreset,
                    playerCount,
                    agentTypes: syncAgentTypes(playerCount, effectivePreset.agentTypes),
                  });
                }}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Seed</span>
              <input type="number" value={effectivePreset.seed} onChange={(event) => setSimulationConfig({ ...effectivePreset, seed: Number(event.target.value) })} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
            </label>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.24em]">
              <span className={workingVersion.published ? "rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-cyan-100" : "rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-slate-300"}>
                {getVersionStateLabel(workingVersion)}
              </span>
              <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-slate-300">{workingVersion.label}</span>
            </div>
            <p className="mt-4 font-medium text-white">Effective preset</p>
            <dl className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <dt>Allowed seats</dt>
                <dd>{workingVersion.playerCountMin}-{workingVersion.playerCountMax}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Seat mix</dt>
                <dd className="text-right">{effectivePreset.agentTypes.map((agent) => agentLabel(agent)).join(" / ")}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Shortcut</dt>
                <dd>⌘/Ctrl + Enter</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs leading-6 text-slate-400">
              {dirty ? "Unsaved rule edits will be saved automatically before the run starts." : "Switching to another version automatically clamps this preset to the new seat limits."}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: effectivePreset.playerCount }, (_, index) => (
            <label key={`seat-${index + 1}`} className="space-y-2 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
              <span className="text-sm text-slate-300">Seat {index + 1} agent</span>
              <select
                value={effectivePreset.agentTypes[index] ?? "random"}
                onChange={(event) =>
                  setSimulationConfig({
                    ...effectivePreset,
                    agentTypes: effectivePreset.agentTypes.map((agent, agentIndex) => (agentIndex === index ? (event.target.value as AgentType) : agent)),
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
          <div className="mt-5 rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-4" aria-busy="true">
            <p className="sr-only" aria-live="polite">Simulation {simulationProgress.toFixed(0)}% complete.</p>
            <div className="flex items-center justify-between gap-3 text-sm text-cyan-100">
              <span>Simulating...</span>
              <div className="flex items-center gap-3">
                <span>{simulationProgress.toFixed(0)}%</span>
                <button
                  type="button"
                  onClick={handleCancelSimulation}
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 px-3 py-1.5 text-xs font-medium text-cyan-50 transition hover:border-cyan-200/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel run
                </button>
              </div>
            </div>
            <div
              className="mt-3 h-3 rounded-full bg-white/10"
              role="progressbar"
              aria-label="Simulation progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(simulationProgress)}
              aria-valuetext={`${simulationProgress.toFixed(0)}% complete`}
            >
              <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${simulationProgress}%` }} />
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void handleRunSimulation()} disabled={simulationLoading || validationErrors.length > 0} className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
            {simulationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {simulationLoading ? "Running simulations..." : "Run simulation"}
          </button>
          <p className="text-sm text-slate-400">
            {validationErrors.length > 0
              ? "Resolve blocking validation issues before launching a run."
              : "Every run is persisted to history and becomes the default dashboard benchmark."}
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
