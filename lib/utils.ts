/**
 * Shared utility functions used across the application.
 *
 * @module utils
 */

import { clsx } from "clsx";
import type { AgentType, CardDefinition } from "@/lib/types";

/** Merge class names, filtering out falsy values. */
export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

/** Format an ISO date string for display (e.g. "Jan 5, 3:42 PM"). */
export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

/** Format a number as a percentage string (e.g. `12.3%`). */
export function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

/** Convert a display string to a URL-safe slug (max 48 chars). */
export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/** Parse a comma-separated `key:value` string into a stats record. */
export function parseStatsText(input: string) {
  return input
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .reduce<Record<string, number>>((acc, segment) => {
      const [rawKey, rawValue] = segment.split(":").map((part) => part.trim());
      if (!rawKey || rawValue === undefined) {
        return acc;
      }

      const numeric = Number(rawValue);
      if (Number.isFinite(numeric)) {
        acc[rawKey] = numeric;
      }

      return acc;
    }, {});
}

/** Serialise a stats record into a human-readable `key:value` string. */
export function stringifyStats(stats: Record<string, number>) {
  return Object.entries(stats)
    .map(([key, value]) => `${key}:${value}`)
    .join(", ");
}

/** Sum all numeric stat values on a card. */
export function statsScore(card: CardDefinition) {
  return Object.values(card.stats).reduce((total, value) => total + value, 0);
}

/** Capitalise the first letter of an agent type for display. */
export function agentLabel(agent: AgentType) {
  return agent.charAt(0).toUpperCase() + agent.slice(1);
}

/** Clamp a value between a minimum and maximum (inclusive). */
export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Create a deep clone of a value via JSON round-trip. */
export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
