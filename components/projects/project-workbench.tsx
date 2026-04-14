"use client";

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
  const { project, activeTab, setActiveTab, selectedRun, statusMessage, errorMessage, savingProject, savingVersion } = state;

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

        {/* ARIA tablist (QW-5) */}
        <div className="mt-6 flex flex-wrap gap-3" role="tablist" aria-label="Workspace navigation">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
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
          {/* ARIA tabpanels — all panels stay mounted to preserve state (P1-6) */}
          <div role="tabpanel" id="tabpanel-dashboard" aria-labelledby="tab-dashboard" className={activeTab !== "dashboard" ? "hidden" : undefined}>
            <DashboardTab selectedRun={selectedRun} setActiveTab={setActiveTab} />
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
