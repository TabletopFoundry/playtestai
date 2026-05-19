import Link from "next/link";
import { Activity, Database, Flag, FlaskConical, Server } from "lucide-react";
import { version } from "@/package.json";
import { TopNav } from "@/components/chrome/top-nav";
import { getProjectsSummary } from "@/lib/db";
import { PRODUCTION_SEED_FLAG, shouldSeedDemoData } from "@/lib/db/seed";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Status | PlaytestAI",
};

export default function StatusPage() {
  const projects = getProjectsSummary();
  const environment = process.env.NODE_ENV ?? "development";
  const seedingEnabled = shouldSeedDemoData();
  const serverTimestamp = new Date().toISOString();
  const latestProject = projects[0] ?? null;
  const latestRun = projects.find((project) => project.latestRun)?.latestRun ?? null;

  return (
    <div className="min-h-screen">
      <TopNav />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-12 focus:outline-none sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200">System status</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Operational visibility for PlaytestAI</h1>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            This page exposes the same health information as <code className="rounded bg-slate-950/70 px-2 py-1 text-slate-200">/api/health</code> and adds lightweight context for demo-data seeding and persisted projects.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "App status", value: "OK", icon: Activity, tone: "text-emerald-200" },
            { label: "Build version", value: version, icon: Server, tone: "text-cyan-200" },
            { label: "Projects detected", value: String(projects.length), icon: Database, tone: "text-white" },
            { label: "Demo seeding", value: seedingEnabled ? "Enabled" : "Disabled", icon: FlaskConical, tone: seedingEnabled ? "text-cyan-200" : "text-amber-200" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <section key={card.label} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3 text-slate-300">
                  <span className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                    <Icon className="h-5 w-5 text-cyan-200" />
                  </span>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">{card.label}</p>
                </div>
                <p className={`mt-4 font-mono text-3xl ${card.tone}`}>{card.value}</p>
              </section>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">Health payload</h2>
            <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/70 p-5 font-mono text-sm text-slate-300">
              <p>{`status: ok`}</p>
              <p className="mt-2">{`version: ${version}`}</p>
              <p className="mt-2">{`timestamp: ${serverTimestamp}`}</p>
              <p className="mt-2">{`environment: ${environment}`}</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/api/health" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
                <Activity className="h-4 w-4" />
                Open raw health JSON
              </Link>
              <Link href="/projects" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-white transition hover:border-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
                <Database className="h-4 w-4" />
                View projects
              </Link>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-3 text-cyan-200">
              <Flag className="h-4 w-4" />
              <p className="font-mono text-xs uppercase tracking-[0.3em]">Feature flags & persistence</p>
            </div>
            <div className="mt-5 space-y-4 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Seed flag</p>
                <p className="mt-2 font-mono text-cyan-200">{PRODUCTION_SEED_FLAG}</p>
                <p className="mt-3 text-slate-400">
                  {seedingEnabled
                    ? "Demo seeding is currently allowed for this environment. Empty project lists should only happen when no seed payload has been applied yet or the workspace has been cleared."
                    : "Demo seeding is disabled for this environment, so an empty project list is expected until someone creates a project manually."}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Latest persisted workspace</p>
                {latestProject ? (
                  <>
                    <p className="mt-2 text-white">{latestProject.name}</p>
                    <p className="mt-2 text-slate-400">Updated {formatDate(latestProject.updatedAt)}</p>
                  </>
                ) : (
                  <p className="mt-2 text-slate-400">No projects are currently stored.</p>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Latest benchmark</p>
                {latestRun ? (
                  <>
                    <p className="mt-2 text-white">{latestRun.label}</p>
                    <p className="mt-2 text-slate-400">Captured {formatDate(latestRun.createdAt)}</p>
                  </>
                ) : (
                  <p className="mt-2 text-slate-400">No simulation history has been stored yet.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
