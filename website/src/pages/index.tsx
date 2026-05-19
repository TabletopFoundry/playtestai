import React, { useState } from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import CodeBlock from "@theme/CodeBlock";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import {
  Dice5,
  Gauge,
  GitCompareArrows,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const INSTALL_CMD = "git clone https://github.com/TabletopFoundry/playtestai.git && cd playtestai && npm install && npm run dev";

function InstallBar(): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="home-install" role="group" aria-label="Install command">
      <span className="home-install__prompt">$</span>
      <code>npx degit TabletopFoundry/playtestai my-game &amp;&amp; cd my-game &amp;&amp; npm i &amp;&amp; npm run dev</code>
      <button
        type="button"
        className="home-install__copy"
        onClick={onCopy}
        aria-label="Copy install command"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

type Feature = {
  icon: React.ReactNode;
  title: string;
  body: string;
};

const FEATURES: Feature[] = [
  {
    icon: <Dice5 size={22} strokeWidth={2.2} />,
    title: "Model your game in minutes",
    body: "Define players, win conditions, resources, and cards with custom stats. Import a deck from CSV or hand-tune the deck in the workbench.",
  },
  {
    icon: <Rocket size={22} strokeWidth={2.2} />,
    title: "10,000 playtests on demand",
    body: "Run batch simulations with Random, Greedy, and Balanced AI agents. Get results in seconds — no humans required, no servers to provision.",
  },
  {
    icon: <Gauge size={22} strokeWidth={2.2} />,
    title: "Diagnose balance, not vibes",
    body: "Win rates by seat, card power rankings, length histograms, dominant-strategy detection, and a single 0–100 balance score you can defend.",
  },
  {
    icon: <GitCompareArrows size={22} strokeWidth={2.2} />,
    title: "A/B test variants",
    body: "Duplicate a version, tweak the suspect cards, simulate both, and compare side-by-side. Promote winners, archive losers, keep history.",
  },
  {
    icon: <ShieldCheck size={22} strokeWidth={2.2} />,
    title: "Deterministic by design",
    body: "Same seed produces identical results. Replay a broken run, share it with a teammate, file it as a regression test.",
  },
  {
    icon: <Sparkles size={22} strokeWidth={2.2} />,
    title: "Local-first, zero-ops",
    body: "Everything runs in the browser against a local SQLite store. No accounts, no cloud, no telemetry — your designs are yours.",
  },
];

function FeatureCard({ icon, title, body }: Feature): React.ReactElement {
  return (
    <div className="feature-card">
      <div className="feature-card__icon" aria-hidden>
        {icon}
      </div>
      <h3 className="feature-card__title">{title}</h3>
      <p className="feature-card__body">{body}</p>
    </div>
  );
}

const SNIPPET = `// lib/simulation/engine.ts
import { runBatchSimulation } from "@/lib/simulation/engine";

const result = runBatchSimulation(version, {
  games: 2000,
  playerCount: 2,
  seed: 42,
  agentTypes: ["balanced", "greedy"],
});

console.log(result.summary.overallBalanceScore);   // 0–100
console.log(result.summary.dominantStrategy);      // "greedy" | "balanced" | null
console.log(result.summary.firstPlayerAdvantage);  // e.g. 0.07 = 7% edge
result.cardRankings.slice(0, 5).forEach((c) => {
  console.log(c.cardName, c.powerScore.toFixed(2));
});`;

export default function Home(): React.ReactElement {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} — AI playtesting for card games`}
      description={siteConfig.tagline}
    >
      <header className="home-hero">
        <span className="home-hero__eyebrow">v0.1 · MIT licensed · runs locally</span>
        <h1 className="home-hero__title">
          Balance your card game{" "}
          <span className="home-hero__title-accent">before humans touch it.</span>
        </h1>
        <p className="home-hero__subtitle">
          PlaytestAI runs thousands of automated playtests against your rules,
          flags broken openers and dominant strategies, and lets you A/B test
          fixes — all in the browser, no server required.
        </p>
        <div className="home-hero__ctas">
          <Link className="home-hero__cta-primary" to="/getting-started/quickstart">
            Get started → 5 min
          </Link>
          <Link
            className="home-hero__cta-secondary"
            to="https://github.com/TabletopFoundry/playtestai"
          >
            Star on GitHub
          </Link>
        </div>
        <InstallBar />
      </header>

      <section className="home-stats">
        <div className="home-stat">
          <div className="home-stat__number">10k</div>
          <div className="home-stat__label">games per batch</div>
        </div>
        <div className="home-stat">
          <div className="home-stat__number">141</div>
          <div className="home-stat__label">tests, all green</div>
        </div>
        <div className="home-stat">
          <div className="home-stat__number">0</div>
          <div className="home-stat__label">servers required</div>
        </div>
        <div className="home-stat">
          <div className="home-stat__number">3</div>
          <div className="home-stat__label">AI archetypes built-in</div>
        </div>
      </section>

      <section className="home-section">
        <h2 className="home-section__title">Everything a designer needs</h2>
        <p className="home-section__subtitle">
          The full loop from rules → simulation → diagnosis → fix, with no
          context-switching between tools.
        </p>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      <section className="home-section">
        <h2 className="home-section__title">Drop into your own pipeline</h2>
        <p className="home-section__subtitle">
          The simulation engine is plain TypeScript — call it from a script, a
          CI job, or your own UI.
        </p>
        <div className="home-snippet">
          <CodeBlock language="ts">{SNIPPET}</CodeBlock>
        </div>
      </section>

      <section className="home-final">
        <h2 className="home-final__title">Ship a fair game. Faster.</h2>
        <p className="home-final__body">
          Spend your scarce human playtests on fun, not on finding the math
          bugs. PlaytestAI catches the math bugs.
        </p>
        <div className="home-hero__ctas">
          <Link className="home-hero__cta-primary" to="/getting-started/quickstart">
            Read the quickstart
          </Link>
          <Link className="home-hero__cta-secondary" to="/why">
            Why PlaytestAI?
          </Link>
        </div>
      </section>
    </Layout>
  );
}
