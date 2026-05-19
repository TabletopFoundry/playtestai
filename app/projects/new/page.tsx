import Link from "next/link";
import { ArrowLeft, BarChart3, Layers3, Sparkles } from "lucide-react";
import { TopNav } from "@/components/chrome/top-nav";
import { CreateProjectForm } from "@/components/projects/create-project-form";

export const metadata = {
  title: "New Project | PlaytestAI",
};

const nextSteps = [
  {
    title: "Seed the first ruleset",
    description: "PlaytestAI creates your first editable draft immediately, so you can start tuning cards without extra setup.",
    icon: Layers3,
  },
  {
    title: "Run quick benchmarks",
    description: "Jump into the Simulations tab to save a baseline run before you branch into variants.",
    icon: Sparkles,
  },
  {
    title: "Review balance signals",
    description: "Use dashboards, A/B testing, and the printable report to decide what to change next.",
    icon: BarChart3,
  },
] as const;

export default function NewProjectPage() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-12 focus:outline-none sm:px-6 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to projects
            </Link>

            <p className="mt-6 font-mono text-xs uppercase tracking-[0.35em] text-cyan-200">Project setup guide</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Know what happens after you create the workspace.</h1>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              The form on the right is just the starting point. Player counts, win conditions, resources, cards, and simulation presets all stay editable after the project is created.
            </p>

            <div className="mt-8 space-y-4">
              {nextSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                    <div className="flex items-center gap-3 text-cyan-200">
                      <span className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3">
                        <Icon className="h-5 w-5" />
                      </span>
                      <h2 className="text-lg font-semibold text-white">{step.title}</h2>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-400">{step.description}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-5 text-sm leading-7 text-cyan-100">
              Tip: If you expected the demo catalogue instead of a blank workspace, check <Link href="/status" className="underline decoration-cyan-300/40 underline-offset-4 hover:text-white">System status</Link> to confirm whether demo-data seeding is enabled.
            </div>
          </section>

          <CreateProjectForm />
        </div>
      </main>
    </div>
  );
}
