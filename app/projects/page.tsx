import Link from "next/link";
import { Activity, ChevronRight, FlaskConical } from "lucide-react";
import { TopNav } from "@/components/chrome/top-nav";
import { getProjectsSummary } from "@/lib/db";
import { formatDate, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Projects | PlaytestAI",
};

export default function ProjectsPage() {
  const projects = getProjectsSummary();

  return (
    <div className="min-h-screen">
      <TopNav />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-12 focus:outline-none sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200">Projects</p>
            <h1 className="mt-3 text-4xl font-semibold text-white">Simulation labs</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              {projects.length
                ? `${projects.length} saved workspace${projects.length === 1 ? " is" : "s are"} ready to inspect. Each lab keeps version history, simulation runs, and printable reports in one place.`
                : "No balance labs are saved yet. Create your first project or inspect the status page if you expected seeded demo data to appear."}
            </p>
          </div>
          <Link href="/projects/new" className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-300">
            <FlaskConical className="h-4 w-4" />
            Start a project
          </Link>
        </div>

        {projects.length === 0 ? (
          <section className="mt-10 rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200">Empty workspace</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">Your project directory is ready for its first balance lab</h2>
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  Create a new project to start modeling cards and resources, or open the system status page to confirm whether demo-data seeding is enabled for this environment.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/projects/new" className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-300">
                  <FlaskConical className="h-4 w-4" />
                  Create first project
                </Link>
                <Link href="/status" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-white transition hover:border-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
                  <Activity className="h-4 w-4" />
                  Open status
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="group rounded-[2rem] border border-white/10 bg-white/5 p-6 transition hover:border-cyan-400/30 hover:bg-white/[0.07]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">{project.name}</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-400">{project.description}</p>
                  </div>
                  <ChevronRight className="mt-1 h-5 w-5 text-slate-500 transition group-hover:text-cyan-200" />
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Versions</p>
                    <p className="mt-3 font-mono text-2xl text-white">{project.versionCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Runs</p>
                    <p className="mt-3 font-mono text-2xl text-white">{project.runCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Balance</p>
                    <p className="mt-3 font-mono text-2xl text-cyan-200">
                      {project.latestRun ? Math.round(project.latestRun.result.summary.overallBalanceScore) : "--"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Seat 1 edge</p>
                    <p className="mt-3 font-mono text-2xl text-white">
                      {project.latestRun ? formatPercent(project.latestRun.result.summary.firstPlayerAdvantage) : "--"}
                    </p>
                  </div>
                </div>

                {project.latestRun ? (
                  <div className="mt-6 rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span>{project.latestRun.label}</span>
                      <span className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-200">{formatDate(project.latestRun.createdAt)}</span>
                    </div>
                    <p className="mt-3 text-slate-300">{project.latestRun.result.summary.recommendation}</p>
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
