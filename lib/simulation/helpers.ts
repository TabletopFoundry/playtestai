/**
 * Shared utility functions for the simulation engine modules.
 */

import type { CardDefinition } from "@/lib/types";

/** Safely read a numeric stat from a card, defaulting to 0. */
export function getStat(card: CardDefinition, key: string): number {
  return Number(card.stats[key] ?? 0);
}

/** Derived combat stats after resolving stat aliases (e.g. "reach" → damage). */
export interface DecomposedStats {
  damage: number;
  shield: number;
  score: number;
  economy: number;
  draw: number;
  combo: number;
  steal: number;
  custom: number;
}

/**
 * Decompose a card's raw stats into derived combat categories.
 *
 * Stat aliases (reach→damage, sustain→shield, points→score, gold/mana→economy)
 * are resolved here so callers share a single source of truth.
 *
 * @param extraStatWeightFn — scoring function for non-standard stats
 */
export function decomposeCardStats(
  card: CardDefinition,
  extraStatWeightFn: (card: CardDefinition) => number,
): DecomposedStats {
  return {
    damage: getStat(card, "damage") + getStat(card, "reach"),
    shield: getStat(card, "shield") + getStat(card, "sustain"),
    score: getStat(card, "score") + getStat(card, "points"),
    economy: getStat(card, "economy") + getStat(card, "gold") + getStat(card, "mana"),
    draw: getStat(card, "draw"),
    combo: getStat(card, "combo"),
    steal: getStat(card, "steal"),
    custom: extraStatWeightFn(card),
  };
}
