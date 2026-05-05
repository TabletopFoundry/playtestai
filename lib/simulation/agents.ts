/**
 * Agent decision-making strategies for the simulation engine.
 *
 * Each agent type (random, greedy, balanced) implements different card
 * selection and target-selection heuristics.
 */

import type { AgentType, CardDefinition } from "@/lib/types";
import {
  AGENT_WEIGHTS,
  CARD_VALUE_WEIGHTS,
  CUSTOM_STAT_WEIGHT,
  PHASE_WEIGHTS,
} from "./constants";
import { decomposeCardStats } from "./helpers";

const KNOWN_STATS = new Set([
  "score",
  "damage",
  "shield",
  "draw",
  "economy",
  "gold",
  "mana",
  "points",
  "combo",
  "sustain",
  "reach",
  "steal",
]);

export interface PlayerState {
  position: number;
  agentType: AgentType;
  health: number;
  score: number;
  resources: number;
  incomeBoost: number;
  boardPower: number;
  shield: number;
  extraDraw: number;
  deck: CardDefinition[];
  hand: CardDefinition[];
  discard: CardDefinition[];
  alive: boolean;
}

export function extraStatWeight(card: CardDefinition) {
  return Object.entries(card.stats).reduce((total, [key, value]) => {
    if (KNOWN_STATS.has(key)) {
      return total;
    }
    return total + value * CUSTOM_STAT_WEIGHT;
  }, 0);
}

export function calculateCardValue(card: CardDefinition, round: number, maxTurns: number) {
  const { damage, shield, score, economy, draw, combo, steal, custom } = decomposeCardStats(card, extraStatWeight);

  const w = CARD_VALUE_WEIGHTS;
  const immediate = card.power * w.immediate.power + damage * w.immediate.damage + score * w.immediate.score + shield * w.immediate.shield + draw * w.immediate.draw + custom * w.immediate.custom;
  const strategic = economy * w.strategic.economy + draw * w.strategic.draw + combo * w.strategic.combo + shield * w.strategic.shield + custom * w.strategic.custom;
  const finisher = damage * w.finisher.damage + steal * w.finisher.steal + score * w.finisher.score + card.power * w.finisher.power;
  const phase = round / Math.max(1, maxTurns);

  const p = PHASE_WEIGHTS;
  return {
    immediate,
    strategic,
    finisher,
    blended:
      immediate * (phase < p.earlyGameCutoff ? p.immediate.early : p.immediate.late) +
      strategic * (phase < p.earlyGameCutoff ? p.strategic.early : p.strategic.late) +
      finisher * (phase > p.lateGameCutoff ? p.finisher.late : p.finisher.early),
  };
}

export function chooseTarget(player: PlayerState, players: PlayerState[], rng: () => number) {
  const opponents = players.filter((candidate) => candidate.position !== player.position && candidate.alive);
  if (opponents.length === 0) {
    return null;
  }

  if (player.agentType === "random") {
    return opponents[Math.floor(rng() * opponents.length)] ?? null;
  }

  if (player.agentType === "greedy") {
    return [...opponents].sort((left, right) => right.score + right.boardPower - (left.score + left.boardPower))[0] ?? null;
  }

  return [...opponents].sort((left, right) => right.boardPower + right.health - (left.boardPower + left.health))[0] ?? null;
}

export function chooseCard(
  legalCards: CardDefinition[],
  player: PlayerState,
  round: number,
  maxTurns: number,
  rng: () => number,
) {
  if (legalCards.length === 0) {
    return null;
  }

  if (player.agentType === "random") {
    return legalCards[Math.floor(rng() * legalCards.length)] ?? null;
  }

  const ranked = [...legalCards].sort((left, right) => {
    const leftValue = calculateCardValue(left, round, maxTurns);
    const rightValue = calculateCardValue(right, round, maxTurns);
    const g = AGENT_WEIGHTS.greedy;
    const b = AGENT_WEIGHTS.balanced;
    const leftScore =
      player.agentType === "greedy"
        ? leftValue.immediate + leftValue.finisher * g.finisherBonus - left.cost * g.costPenalty
        : leftValue.blended - left.cost * b.costPenalty + rng() * b.jitter;
    const rightScore =
      player.agentType === "greedy"
        ? rightValue.immediate + rightValue.finisher * g.finisherBonus - right.cost * g.costPenalty
        : rightValue.blended - right.cost * b.costPenalty + rng() * b.jitter;

    return rightScore - leftScore;
  });

  if (player.agentType === "balanced") {
    const shortlist = ranked.slice(0, Math.min(AGENT_WEIGHTS.balanced.shortlistSize, ranked.length));
    return shortlist[Math.floor(rng() * shortlist.length)] ?? ranked[0];
  }

  return ranked[0];
}
