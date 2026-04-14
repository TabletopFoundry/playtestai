"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import type { GameProject } from "@/lib/types";
import { SectionCard } from "./shared";

interface ReportTabProps {
  project: GameProject;
  selectedRun: GameProject["runs"][number] | null;
}

export function ReportTab({ project, selectedRun }: ReportTabProps) {
  return (
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
              <Link href={`/projects/${project.id}/report?runId=${selectedRun.id}`} target="_blank" className="mt-5 inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
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
  );
}
