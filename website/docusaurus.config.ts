import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const GITHUB_URL = "https://github.com/TabletopFoundry/playtestai";

const config: Config = {
  title: "PlaytestAI",
  tagline:
    "Run thousands of AI playtests to balance your card game before the first prototype hits the table.",
  favicon: "img/favicon.svg",

  future: {
    v4: true,
  },

  url: "https://tabletopfoundry.github.io",
  baseUrl: "/playtestai/",

  organizationName: "TabletopFoundry",
  projectName: "playtestai",

  onBrokenLinks: "warn",

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },
  themes: ["@docusaurus/theme-mermaid"],

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl: `${GITHUB_URL}/edit/main/website/`,
          routeBasePath: "/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      {
        hashed: true,
        indexBlog: false,
        docsRouteBasePath: "/",
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      },
    ],
  ],

  themeConfig: {
    image: "img/og-image.svg",
    colorMode: {
      defaultMode: "dark",
      respectPrefersColorScheme: false,
    },
    metadata: [
      {
        name: "keywords",
        content:
          "board game, playtesting, balance, simulation, card game, game design, AI, tabletop",
      },
      { name: "og:type", content: "website" },
    ],
    navbar: {
      title: "PlaytestAI",
      logo: {
        alt: "PlaytestAI logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docs",
          position: "left",
          label: "Docs",
        },
        {
          to: "/getting-started/quickstart",
          label: "Quickstart",
          position: "left",
        },
        {
          to: "/reference/api",
          label: "API",
          position: "left",
        },
        {
          to: "/why",
          label: "Why PlaytestAI",
          position: "left",
        },
        {
          href: GITHUB_URL,
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            { label: "Quickstart", to: "/getting-started/quickstart" },
            { label: "Core Concepts", to: "/concepts/overview" },
            { label: "Guides", to: "/guides/your-first-simulation" },
            { label: "API Reference", to: "/reference/api" },
          ],
        },
        {
          title: "Project",
          items: [
            { label: "Why PlaytestAI", to: "/why" },
            { label: "Troubleshooting", to: "/troubleshooting" },
            { label: "Changelog", to: "/changelog" },
            { label: "Contributing", to: "/contributing" },
          ],
        },
        {
          title: "Community",
          items: [
            { label: "GitHub", href: GITHUB_URL },
            {
              label: "Issues",
              href: `${GITHUB_URL}/issues`,
            },
            {
              label: "Discussions",
              href: `${GITHUB_URL}/discussions`,
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} TabletopFoundry. Built with Docusaurus. MIT Licensed.`,
    },
    prism: {
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ["bash", "json", "typescript", "tsx"],
    },
    mermaid: {
      theme: { light: "neutral", dark: "dark" },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
