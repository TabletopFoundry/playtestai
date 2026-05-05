/**
 * Simulation engine — orchestrates single-game simulation and batch execution.
 *
 * Delegates to focused modules:
 *   - `rng.ts` — deterministic PRNG and shuffle
 *   - `agents.ts` — agent strategies (card/target selection)
 *   - `mechanics.ts` — deck, combat, scoring, win conditions
 *   - `analytics.ts` — histograms, balance scoring, summarisation
 *   - `constants.ts` — all tuning parameters (no magic numbers)
 */

import type {
  AgentType,
  GameVersion,
  SimulationBatchResult,
  SimulationConfig,
  ValidationIssue,
} from "@/lib/types";
import { BATCH } from "./constants";
import { type PlayerState, chooseCard } from "./agents";
import { type CardStats, type BatchAccumulator, summariseResult } from "./analytics";
import {
  aggregateIncome,
  aggregateStartingResources,
  applyEndOfRoundScoring,
  determineWinner,
  drawCards,
  expandDeck,
  fallbackWinner,
  resolveCardPlay,
} from "./mechanics";
import { createRng, shuffle } from "./rng";

interface GamePlayRecord {
  cardId: string;
  impact: number;
  winnerPlay: boolean;
}

interface SingleGameResult {
  winnerPosition: number;
  winnerAgent: AgentType;
  turnsPlayed: number;
  finalScores: number[];
  plays: GamePlayRecord[];
}

export function validateVersionPlayable(version: GameVersion): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!version.cards.length) {
    issues.push({ severity: "error", message: "Add at least one card to the deck.", field: "cards" });
  }

  if (!version.resources.length) {
    issues.push({ severity: "error", message: "Add at least one resource before simulating.", field: "resources" });
  }

  if (version.playerCountMin > version.playerCountMax) {
    issues.push({ severity: "error", message: "Minimum players cannot exceed maximum players.", field: "playerCountMin" });
  }

  const totalCopies = version.cards.reduce((total, card) => total + card.quantity, 0);
  if (totalCopies < version.startingHandSize + 4) {
    issues.push({ severity: "error", message: "Deck is too small. Add more card copies for stable draws.", field: "cards" });
  }

  // Warnings
  if (version.cards.length > 0 && version.cards.some((card) => card.cost <= 0)) {
    issues.push({ severity: "warning", message: "Some cards have zero or negative cost — they can always be played.", field: "cards" });
  }

  if (version.maxTurns < 6) {
    issues.push({ severity: "warning", message: "Very short max turns may not produce meaningful simulation data.", field: "maxTurns" });
  }

  if (version.cards.length > 0) {
    const maxPower = Math.max(...version.cards.map((card) => card.power));
    const minPower = Math.min(...version.cards.map((card) => card.power));
    if (maxPower > 0 && minPower > 0 && maxPower / minPower > 10) {
      issues.push({ severity: "warning", message: "Large power spread between cards — may indicate balance issues.", field: "cards" });
    }
  }

  return issues;
}

function simulateSingleGame(version: GameVersion, config: SimulationConfig, seed: number): SingleGameResult {
  if (config.playerCount < 1) {
    throw new Error("Simulation requires at least one player.");
  }

  const rng = createRng(seed);
  const startingResources = aggregateStartingResources(version);
  const baseIncome = aggregateIncome(version);
  const deckTemplate = expandDeck(version.cards);
  const players: PlayerState[] = Array.from({ length: config.playerCount }, (_, index) => ({
    position: index + 1,
    agentType: config.agentTypes[index] ?? config.agentTypes[config.agentTypes.length - 1] ?? "random",
    health: version.startingHealth,
    score: 0,
    resources: startingResources,
    incomeBoost: 0,
    boardPower: 0,
    shield: 0,
    extraDraw: 0,
    deck: shuffle(deckTemplate, rng),
    hand: [],
    discard: [],
    alive: true,
  }));

  players.forEach((player) => drawCards(player, version.startingHandSize, rng));

  const plays: Array<{ position: number; cardId: string; impact: number }> = [];
  let winner = null as PlayerState | null;
  let turnsPlayed = 0;

  for (let round = 1; round <= version.maxTurns; round += 1) {
    turnsPlayed = round;

    for (const player of players) {
      if (!player.alive) {
        continue;
      }

      player.resources += baseIncome + player.incomeBoost;
      const drawsThisTurn = 1 + player.extraDraw;
      player.extraDraw = 0;
      drawCards(player, drawsThisTurn, rng);

      const legalCards = player.hand.filter((card) => card.cost <= player.resources);
      const chosen = chooseCard(legalCards, player, round, version.maxTurns, rng);
      if (chosen) {
        const play = resolveCardPlay(chosen, player, players, round, version.maxTurns, rng);
        plays.push({ position: player.position, cardId: play.cardId, impact: play.impact });
      }

      const directWinner = determineWinner(players, version);
      if (directWinner) {
        winner = directWinner;
        break;
      }
    }

    if (winner) {
      break;
    }

    applyEndOfRoundScoring(players);

    winner = determineWinner(players, version) ?? null;
    if (winner) {
      break;
    }

    const aliveCount = players.filter((player) => player.alive).length;
    if (aliveCount <= 1) {
      winner = players.find((player) => player.alive) ?? fallbackWinner(players, version) ?? null;
      break;
    }
  }

  winner ??= fallbackWinner(players, version) ?? null;

  if (!winner) {
    throw new Error("Simulation error: no winner could be determined. Check game rules.");
  }

  return {
    winnerPosition: winner.position,
    winnerAgent: winner.agentType,
    turnsPlayed,
    finalScores: players.map((player) => player.score),
    plays: plays.map((play) => ({
      cardId: play.cardId,
      impact: play.impact,
      winnerPlay: play.position === winner?.position,
    })),
  };
}

// ---------------------------------------------------------------------------
// Shared batch accumulation — single source of truth for both sync and async
// ---------------------------------------------------------------------------

function createAccumulator(version: GameVersion, config: SimulationConfig): BatchAccumulator {
  const cardMap = new Map<string, CardStats>();
  version.cards.forEach((card) => {
    cardMap.set(card.id, {
      name: card.name,
      totalPlays: 0,
      winnerPlays: 0,
      totalImpact: 0,
      gamesWithPlay: 0,
    });
  });

  return {
    turns: [],
    winnerScores: [],
    allScores: [],
    positionWins: Array.from({ length: config.playerCount }, () => 0),
    strategyWins: { random: 0, greedy: 0, balanced: 0 },
    cardMap,
  };
}

function accumulateGame(game: SingleGameResult, state: BatchAccumulator) {
  state.turns.push(game.turnsPlayed);
  const positionIndex = game.winnerPosition - 1;
  if (state.positionWins[positionIndex] !== undefined) {
    state.positionWins[positionIndex] += 1;
  }
  state.strategyWins[game.winnerAgent] += 1;
  state.winnerScores.push(game.finalScores[game.winnerPosition - 1] ?? 0);
  state.allScores.push(...game.finalScores);

  const seenInGame = new Set<string>();
  game.plays.forEach((play) => {
    const cardStats = state.cardMap.get(play.cardId);
    if (!cardStats) {
      return;
    }

    cardStats.totalPlays += 1;
    cardStats.totalImpact += play.impact;
    if (play.winnerPlay) {
      cardStats.winnerPlays += 1;
    }
    if (!seenInGame.has(play.cardId)) {
      cardStats.gamesWithPlay += 1;
      seenInGame.add(play.cardId);
    }
  });
}

function simulateGameOrThrow(version: GameVersion, config: SimulationConfig, gameIndex: number) {
  try {
    return simulateSingleGame(version, config, config.seed + gameIndex * BATCH.seedStride);
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new Error(`Simulation failed during game ${gameIndex + 1} of ${config.games}${detail}`);
  }
}

export function simulateBatch(version: GameVersion, config: SimulationConfig): SimulationBatchResult {
  const state = createAccumulator(version, config);

  for (let gameIndex = 0; gameIndex < config.games; gameIndex += 1) {
    accumulateGame(simulateGameOrThrow(version, config, gameIndex), state);
  }

  return summariseResult(version, config, state);
}

export async function simulateBatchAsync(
  version: GameVersion,
  config: SimulationConfig,
  onProgress?: (value: number) => void,
  signal?: AbortSignal,
) {
  const state = createAccumulator(version, config);
  const chunkSize = config.games >= 2000 ? 50 : 20;

  for (let gameIndex = 0; gameIndex < config.games; gameIndex += 1) {
    if (signal?.aborted) throw new DOMException("Simulation cancelled.", "AbortError");

    accumulateGame(simulateGameOrThrow(version, config, gameIndex), state);

    if ((gameIndex + 1) % chunkSize === 0 || gameIndex === config.games - 1) {
      onProgress?.(((gameIndex + 1) / config.games) * 100);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return summariseResult(version, config, state);
}
