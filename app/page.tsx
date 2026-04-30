import Link from "next/link";
import { ArrowRight, Bot, ChartNoAxesCombined, FlaskConical, GitCompareArrows, Layers3 } from "lucide-react";
import { TopNav } from "@/components/chrome/top-nav";

const features = [
  {
    title: "Rule modeling",
    description: "Define player counts, decks, resources, and custom card stats with CSV import for rapid iteration.",
    icon: Layers3,
  },
  {
    title: "In-browser simulation",
    description: "Run 100 to 10,000 automated playtests with random, greedy, and balanced agents plus live progress.",
    icon: Bot,
  },
  {
    title: "Balance analytics",
    description: "Track first-player advantage, dominant strategies, card power concentration, and score pacing at a glance.",
    icon: ChartNoAxesCombined,
  },
  {
    title: "A/B tuning",
    description: "Duplicate versions, edit suspect cards, and compare balance metrics side-by-side before physical playtests.",
    icon: GitCompareArrows,
  },
];

const pricing = [
  { tier: "MVP", price: "$0", note: "Local-first build for designers validating new rulesets.", bullets: ["SQLite persistence", "Seeded example projects", "Printable balance reports"] },
  { tier: "Studio", price: "Soon", note: "For teams running broader design pipelines.", bullets: ["Shared workspaces", "Human playtest logs", "Scheduled reports"] },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200">Board game balance lab</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
              Simulate thousands of tabletop matches before you print the next prototype.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              PlaytestAI is a developer-tool style MVP for defining card-driven games, running AI playtests, finding broken openings,
              and comparing balance variants with real metrics.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-300"
              >
                Open projects
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/projects/new" className="rounded-full border border-white/10 px-5 py-3 text-slate-100 transition hover:border-cyan-400/40">
                Create project
              </Link>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ["10k", "max simulations per run"],
                ["3", "built-in agent archetypes"],
                ["0-100", "overall balance score"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="font-mono text-2xl text-cyan-200">{value}</p>
                  <p className="mt-2 text-sm text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-cyan-950/30">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 font-mono text-xs uppercase tracking-[0.3em] text-slate-400">
              <span>live simulation view</span>
              <span>seeded data</span>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                {[72, 61, 48, 39].map((value, index) => (
                  <div key={value}>
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                      <span>seat {index + 1}</span>
                      <span>{value / 2}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-3xl border border-white/10 bg-[#050917] p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["Balance score", "78"],
                    ["First-player edge", "+7.2%"],
                    ["Top card", "Crystal Dragon"],
                    ["Dominant strategy", "Balanced"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</p>
                      <p className="mt-3 font-mono text-2xl text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-cyan-100">
                  Variant B reduces opener tempo by tuning Dragon + Leyline Engine, improving the projected balance score by 11 points.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200">Capabilities</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Everything needed for an MVP playtesting pipeline</h2>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <div className="inline-flex rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-3 text-cyan-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-400">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200">How it works</p>
            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              {[
                ["01", "Model the rules", "Create a game project, set player counts and win condition, then define resources and cards or paste CSV data."],
                ["02", "Run AI matches", "Choose simulation volume, seat count, and agent mix. The browser executes real card-game runs with progress feedback."],
                ["03", "Tune and compare", "Spot first-player advantage, review top cards, fork a variant, and compare side-by-side before human sessions."],
              ].map(([step, title, description]) => (
                <div key={step} className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                  <p className="font-mono text-cyan-200">{step}</p>
                  <h3 className="mt-3 text-xl font-semibold text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-400">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200">Pricing</p>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {pricing.map((plan) => (
              <div key={plan.tier} className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-white">{plan.tier}</h3>
                    <p className="mt-2 text-sm text-slate-400">{plan.note}</p>
                  </div>
                  <p className="font-mono text-4xl text-cyan-200">{plan.price}</p>
                </div>
                <ul className="mt-6 space-y-3 text-sm text-slate-300">
                  {plan.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                      <FlaskConical className="h-4 w-4 text-cyan-200" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
