import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docs: [
    "intro",
    {
      type: "category",
      label: "Getting Started",
      collapsed: false,
      items: [
        "getting-started/quickstart",
        "getting-started/installation",
        "getting-started/your-first-game",
      ],
    },
    {
      type: "category",
      label: "Core Concepts",
      collapsed: false,
      items: [
        "concepts/overview",
        "concepts/projects-and-versions",
        "concepts/simulation-model",
        "concepts/agents",
        "concepts/balance-score",
      ],
    },
    {
      type: "category",
      label: "Guides",
      items: [
        "guides/your-first-simulation",
        "guides/ab-testing-versions",
        "guides/csv-import",
        "guides/reading-balance-reports",
        "guides/tuning-card-stats",
        "guides/deterministic-replay",
      ],
    },
    {
      type: "category",
      label: "Reference",
      items: [
        "reference/api",
        "reference/configuration",
        "reference/simulation-constants",
        "reference/data-model",
        "reference/cli-scripts",
      ],
    },
    "troubleshooting",
    "why",
    "contributing",
    "changelog",
  ],
};

export default sidebars;
