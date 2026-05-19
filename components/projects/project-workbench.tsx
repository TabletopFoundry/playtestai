"use client";

import { useMemo, useRef, type KeyboardEvent } from "react";
import { ArrowRight, CheckCircle2, CircleAlert, Keyboard, PlayCircle, Sparkles } from "lucide-react";
import type { GameProject } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { useWorkbenchState } from "./use-workbench-state";
import { DashboardTab } from "./workbench/dashboard-tab";
import { DefinitionTab } from "./workbench/definition-tab";
import { SimulationTab } from "./workbench/simulation-tab";
import { CompareTab } from "./workbench/compare-tab";
import { ReportTab } from "./workbench/report-tab";
import { VersionSidebar } from "./workbench/version-sidebar";
import { MetricCard } from "./workbench/shared";
import { countValidationIssues, getVersionStateLabel, getWorkspaceStatusSummary } from "./workbench/status-utils";
import type { ActiveTab } from "./workbench/types";

const tabs: { id: ActiveTab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "definition", label: "Rule definition" },
  { id: "simulate", label: "Simulations" },
  { id: "compare", label: "A/B testing" },
  { id: "report", label: "Report" },
];

export function ProjectWorkbench({ initialProject }: { initialProject: GameProject }) {
  const state = useWorkbenchState(initialProject);
  const {
    project,
    activeTab,
    setActiveTab,
    selectedRun,
    statusMessage,
    errorMessage,
    savingProject,
    savingVersion,
    selectedVersion,
    versionValidation,
    dirty,
  } = state;
  const tabRefs = useRef<Partial<Record<ActiveTab, HTMLButtonElement | null>>>({});
  const validationCounts = useMemo(() => countValidationIssues(versionValidation), [versionValidation]);
  const workspaceStatus = useMemo(
    () => getWorkspaceStatusSummary({ version: selectedVersion, issues: versionValidation, selectedRun, dirty }),
    [dirty, selectedRun, selectedVersion, versionValidation],
  );

  function handleTabListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    if (currentIndex === -1) {
      return;
    }

    let nextIndex = currentIndex;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    if (!nextTab) {
      return;
    }

    setActiveTab(nextTab.id);
    tabRefs.current[nextTab.id]?.focus();
  }

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
            <MetricCard label="Benchmark score" value={selectedRun ? String(Math.round(selectedRun.result.summary.overallBalanceScore)) : "--"} tone="accent" />
            <MetricCard label="Updated" value={formatDate(project.updatedAt)} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
          <section
            className={cn(
              "rounded-3xl border p-5",
              workspaceStatus.tone === "danger" && "border-rose-500/30 bg-rose-500/10",
              workspaceStatus.tone === "warn" && "border-amber-500/30 bg-amber-500/10",
              workspaceStatus.tone === "ready" && "border-emerald-500/20 bg-emerald-500/10",
              workspaceStatus.tone === "accent" && "border-cyan-400/20 bg-cyan-400/10",
            )}
          >
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.25em]">
              <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-slate-200">
                {selectedVersion?.label ?? "No version"}
              </span>
              {selectedVersion ? (
                <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-slate-300">
                  {getVersionStateLabel(selectedVersion)}
                </span>
              ) : null}
              {dirty ? <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-amber-200">Unsaved</span> : null}
              <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-slate-300">
                {validationCounts.errors > 0
                  ? `${validationCounts.errors} blocker${validationCounts.errors === 1 ? "" : "s"}`
                  : validationCounts.warnings > 0
                    ? `${validationCounts.warnings} warning${validationCounts.warnings === 1 ? "" : "s"}`
                    : "No blockers"}
              </span>
            </div>

            <div className="mt-4 flex items-start gap-3">
              {workspaceStatus.tone === "danger" || workspaceStatus.tone === "warn" ? (
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-current" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-current" />
              )}
              <div>
                <h2 className="text-lg font-semibold text-white">{workspaceStatus.title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-200/90">{workspaceStatus.description}</p>
                <p className="mt-3 text-sm text-slate-300">
                  {selectedRun
                    ? `Selected benchmark: ${selectedRun.label} · ${project.versions.find((version) => version.id === selectedRun.versionId)?.label ?? "Unknown version"} · ${formatDate(selectedRun.createdAt)}.`
                    : "No saved runs yet — start with a baseline benchmark once your ruleset is ready."}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setActiveTab(validationCounts.errors > 0 ? "definition" : "simulate")}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
              >
                <PlayCircle className="h-4 w-4" />
                {validationCounts.errors > 0 ? "Fix blockers" : "Run next simulation"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("compare")}
                disabled={project.versions.length < 2}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
              >
                <Sparkles className="h-4 w-4" />
                Compare variants
              </button>
              <button
                type="button"
                onClick={() => setActiveTab(selectedRun ? "report" : "dashboard")}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
              >
                <ArrowRight className="h-4 w-4" />
                {selectedRun ? "Open latest report" : "Review dashboard guidance"}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <div className="flex items-center gap-2 text-cyan-200">
              <Keyboard className="h-4 w-4" />
              <p className="font-mono text-xs uppercase tracking-[0.3em]">Shortcut cheatsheet</p>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              {[
                ["⌘ / Ctrl + S", "Save the active version"],
                ["⌘ / Ctrl + Enter", "Run a simulation from anywhere in the workspace"],
                ["1–5", "Jump between workspace tabs"],
                ["Esc", "Dismiss status and error banners"],
              ].map(([shortcut, label]) => (
                <li key={shortcut} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="font-mono text-xs text-cyan-200">{shortcut}</span>
                  <span className="text-right">{label}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-6 flex flex-wrap gap-3" role="tablist" aria-label="Workspace navigation" onKeyDown={handleTabListKeyDown}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[tab.id] = element;
              }}
              type="button"
              role="tab"
              tabIndex={activeTab === tab.id ? 0 : -1}
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50",
                activeTab === tab.id
                  ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                  : "border-white/10 bg-slate-950/50 text-slate-400 hover:text-white",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {statusMessage ? <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-100" role="status">{statusMessage}</div> : null}
        {errorMessage ? <div className="mt-5 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200" role="alert">{errorMessage}</div> : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <div role="tabpanel" id="tabpanel-dashboard" aria-labelledby="tab-dashboard" className={activeTab !== "dashboard" ? "hidden" : undefined}>
            <DashboardTab project={project} selectedRun={selectedRun} setActiveTab={setActiveTab} />
          </div>

          <div role="tabpanel" id="tabpanel-definition" aria-labelledby="tab-definition" className={activeTab !== "definition" ? "hidden" : undefined}>
            <DefinitionTab state={state} savingProject={savingProject} savingVersion={savingVersion} handleSaveProject={state.handleSaveProject} />
          </div>

          <div role="tabpanel" id="tabpanel-simulate" aria-labelledby="tab-simulate" className={activeTab !== "simulate" ? "hidden" : undefined}>
            <SimulationTab state={state} />
          </div>

          <div role="tabpanel" id="tabpanel-compare" aria-labelledby="tab-compare" className={activeTab !== "compare" ? "hidden" : undefined}>
            <CompareTab state={state} />
          </div>

          <div role="tabpanel" id="tabpanel-report" aria-labelledby="tab-report" className={activeTab !== "report" ? "hidden" : undefined}>
            <ReportTab project={project} selectedRun={selectedRun} />
          </div>
        </div>

        <VersionSidebar state={state} />
      </div>
    </div>
  );
}
