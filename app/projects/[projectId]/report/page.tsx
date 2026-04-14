import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProjectById } from "@/lib/db";
import { formatDate, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }): Promise<Metadata> {
  const { projectId } = await params;
  const project = getProjectById(projectId);
  return { title: project ? `Report — ${project.name} | PlaytestAI` : "Report | PlaytestAI" };
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ runId?: string }>;
}) {
  const { projectId } = await params;
  const { runId } = await searchParams;
  const project = getProjectById(projectId);

  if (!project) {
    notFound();
  }

  const run = project.runs.find((candidate) => candidate.id === runId) ?? project.runs[0];
  const version = project.versions.find((candidate) => candidate.id === run?.versionId) ?? project.versions[0];

  if (!run || !version) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 text-slate-100 sm:px-6 lg:px-8 print:bg-white print:text-slate-950">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-8 print:border-slate-200 print:bg-white">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200 print:text-slate-500">Balance report</p>
          <h1 className="mt-3 text-4xl font-semibold">{project.name}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 print:text-slate-600">{project.description}</p>
        </div>
        <div className="text-right text-sm text-slate-400 print:text-slate-600">
          <p>Version: {version.label}</p>
          <p className="mt-1">Run: {run.label}</p>
          <p className="mt-1">Generated: {formatDate(run.createdAt)}</p>
          <Link href={`/projects/${project.id}`} className="mt-4 inline-block rounded-full border border-white/10 px-4 py-2 print:hidden">
            Back to workspace
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        {[
          ["Balance score", Math.round(run.result.summary.overallBalanceScore)],
          ["Avg turns", run.result.summary.averageTurns.toFixed(1)],
          ["Seat 1 edge", formatPercent(run.result.summary.firstPlayerAdvantage)],
          ["Winning score", run.result.summary.averageWinningScore.toFixed(1)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-3xl border border-white/10 bg-white/5 p-5 print:border-slate-200 print:bg-white">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</p>
            <p className="mt-3 font-mono text-3xl text-white print:text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 print:border-slate-200 print:bg-white">
          <h2 className="text-xl font-semibold">Key findings</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300 print:text-slate-700">
            {(run.result.summary.flaggedIssues.length ? run.result.summary.flaggedIssues : ["No critical issues were detected in the selected run."]).map((issue) => (
              <li key={issue} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 print:border-slate-200 print:bg-slate-50">
                {issue}
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-4 text-sm text-cyan-100 print:border-slate-200 print:bg-slate-50 print:text-slate-700">
            {run.result.summary.recommendation}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 print:border-slate-200 print:bg-white">
          <h2 className="text-xl font-semibold">Top cards</h2>
          <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 print:border-slate-200">
            <table className="min-w-full divide-y divide-white/10 text-sm print:divide-slate-200">
              <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-[0.25em] text-slate-500 print:bg-slate-100">
                <tr>
                  <th className="px-4 py-3">Card</th>
                  <th className="px-4 py-3">Win corr.</th>
                  <th className="px-4 py-3">Avg impact</th>
                  <th className="px-4 py-3">Inclusion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 print:divide-slate-200">
                {run.result.cardRankings.slice(0, 8).map((card) => (
                  <tr key={card.cardId} className="bg-white/[0.02] print:bg-white">
                    <td className="px-4 py-3 text-white print:text-slate-950">{card.cardName}</td>
                    <td className="px-4 py-3">{formatPercent(card.winCorrelation)}</td>
                    <td className="px-4 py-3">{card.averageImpact.toFixed(1)}</td>
                    <td className="px-4 py-3">{formatPercent(card.inclusionRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
