"use client";

import Link from "next/link";
import { Download, Sparkles } from "lucide-react";
import type { GameProject } from "@/lib/types";
import { agentLabel, formatDate } from "@/lib/utils";
import type { ActiveTab } from "./types";
import { MetricCard, SectionCard } from "./shared";

interface ReportTabProps {
  project: GameProject;
  selectedVersion: GameProject["versions"][number] | null;
  selectedRun: GameProject["runs"][number] | null;
  setActiveTab: (tab: ActiveTab) => void;
}

export function ReportTab({ project, selectedVersion, selectedRun, setActiveTab }: ReportTabProps) {
  const selectedRunVersion = selectedRun
    ? project.versions.find((version) => version.id === selectedRun.versionId) ?? null
    : null;

  return (
    <div className="space-y-6">
      <SectionCard title="Exportable balance report" description="Use the formatted report for collaborator reviews or print/PDF export.">
        {selectedRun ? (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(0,0.55fr))]">
              <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-5">
                <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-200">Selected benchmark</p>
                <p className="mt-3 text-lg font-semibold text-white">{selectedRun.label}</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">
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

            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-200">Selected benchmark recommendation</p>
                <p className="mt-4 text-lg leading-8 text-slate-200">{selectedRun.result.summary.recommendation}</p>
                <ul className="mt-5 space-y-3 text-sm text-slate-300">
                  {(selectedRun.result.summary.flaggedIssues.length ? selectedRun.result.summary.flaggedIssues : ["No major issues flagged in the selected run."]).map((issue) => (
                    <li key={issue} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">{issue}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                <p className="text-sm text-slate-400">Open the printable report view, then use your browser print dialog to export PDF.</p>
                <Link href={`/projects/${project.id}/report?runId=${selectedRun.id}`} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
                  <Download className="h-4 w-4" />
                  Open report view
                </Link>
              </div>
            </div>
          </div>
        ) : project.runs.length > 0 && selectedVersion ? (
          <div className="space-y-4 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm leading-7 text-amber-100">
            <div>
              <p className="font-medium text-white">{selectedVersion.label} does not have a saved report yet.</p>
              <p className="mt-3">
                Reports are generated from saved benchmarks for the version you are currently editing. Run a simulation for this branch or pick another benchmark from Simulation history.
              </p>
            </div>
            <button type="button" onClick={() => setActiveTab("simulate")} className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
              <Sparkles className="h-4 w-4" />
              Run a benchmark for {selectedVersion.label}
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Run a simulation first to generate a report.</p>
        )}
      </SectionCard>
    </div>
  );
}
