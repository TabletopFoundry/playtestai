/**
 * Core game mechanics — deck manipulation, card resolution, damage,
 * and win-condition evaluation.
 */

import type { CardDefinition, GameVersion } from "@/lib/types";
import { COMBAT, IMPACT_WEIGHTS, PASSIVE_SCORING } from "./constants";
import { type PlayerState, chooseTarget, extraStatWeight } from "./agents";
import { decomposeCardStats } from "./helpers";
import { shuffle } from "./rng";

export function expandDeck(cards: CardDefinition[]) {
  return cards.flatMap((card) =>
    Array.from({ length: Math.max(1, card.quantity) }, () => ({
      ...card,
      stats: { ...card.stats },
    })),
  );
}

export function drawCards(player: PlayerState, count: number, rng: () => number) {
  for (let index = 0; index < count; index += 1) {
    if (player.deck.length === 0 && player.discard.length > 0) {
      player.deck = shuffle(player.discard, rng);
      player.discard = [];
    }

    const next = player.deck.shift();
    if (!next) {
      break;
    }

    player.hand.push(next);
  }
}

export function applyDamage(target: PlayerState, incomingDamage: number) {
  const absorbed = Math.min(target.shield, incomingDamage);
  target.shield -= absorbed;
  const damage = incomingDamage - absorbed;
  target.health = Math.max(0, target.health - damage);
  target.score = Math.max(0, target.score - Math.floor(damage / COMBAT.damageScorePenaltyDivisor));
  if (target.health === 0) {
    target.alive = false;
  }
  return damage;
}

export function resolveCardPlay(
  card: CardDefinition,
  player: PlayerState,
  players: PlayerState[],
  round: number,
  maxTurns: number,
  rng: () => number,
) {
  player.resources -= card.cost;
  const cardIndex = player.hand.findIndex((handCard) => handCard.id === card.id);
  if (cardIndex !== -1) {
    player.hand.splice(cardIndex, 1);
  }
  player.discard.push(card);

  const stats = decomposeCardStats(card, extraStatWeight);
  const damage = stats.damage + Math.floor(player.boardPower / COMBAT.boardPowerDivisor);
  const { shield, score, economy, draw, combo, steal, custom } = stats;

  player.boardPower += card.power + combo;
  player.score += card.power + score;
  player.health += shield > 0 ? Math.floor(shield / COMBAT.shieldHealDivisor) : 0;
  player.shield += shield;
  player.incomeBoost += economy;
  player.extraDraw += draw;

  let actualDamage = 0;
  const target = chooseTarget(player, players, rng);
  if (target && damage > 0) {
    actualDamage = applyDamage(target, damage);
    if (!target.alive) {
      player.score += COMBAT.killBonus;
    }
  }

  if (target && steal > 0) {
    const stolen = Math.min(target.score, steal);
    target.score -= stolen;
    player.score += stolen;
  }

  const w = IMPACT_WEIGHTS;
  const phaseWeight = round / Math.max(1, maxTurns);
  return {
    cardId: card.id,
    impact:
      card.power * w.power +
      score * w.score +
      actualDamage * w.damage +
      shield * w.shield +
      economy * (phaseWeight < w.economyPhaseCutoff ? w.economyEarly : w.economyLate) +
      draw * w.draw +
      custom * w.custom,
  };
}

export function aggregateStartingResources(version: GameVersion) {
  return version.resources.reduce((total, resource) => total + resource.startAmount, 0);
}

export function aggregateIncome(version: GameVersion) {
  return version.resources.reduce((total, resource) => total + resource.gainPerTurn, 0);
}

export function determineWinner(players: PlayerState[], version: GameVersion) {
  const alivePlayers = players.filter((player) => player.alive);

  if (version.winConditionType === "last_standing" && alivePlayers.length === 1) {
    return alivePlayers[0];
  }

  if (version.winConditionType === "first_to_x") {
    const thresholdWinner = players
      .filter((player) => player.score >= version.targetScore)
      .sort((left, right) => right.score - left.score || right.boardPower - left.boardPower || left.position - right.position)[0];
    if (thresholdWinner) {
      return thresholdWinner;
    }
  }

  return null;
}

export function fallbackWinner(players: PlayerState[], version: GameVersion) {
  return [...players].sort((left, right) => {
    if (version.winConditionType === "last_standing") {
      return right.health - left.health || right.score - left.score || left.position - right.position;
    }

    return right.score - left.score || right.boardPower - left.boardPower || right.health - left.health || left.position - right.position;
  })[0];
}

export function applyEndOfRoundScoring(players: PlayerState[]) {
  players.forEach((player) => {
    if (!player.alive) {
      return;
    }

    player.score +=
      Math.max(PASSIVE_SCORING.minPassive, Math.floor(player.boardPower / PASSIVE_SCORING.boardPowerDivisor)) +
      Math.floor(player.resources / PASSIVE_SCORING.resourceDivisor);
    player.shield = Math.max(0, player.shield - PASSIVE_SCORING.shieldDecay);
  });
}
