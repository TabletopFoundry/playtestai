/**
 * Analytics, histograms, balance scoring, and result summarisation.
 */

import type {
  AgentType,
  CardRanking,
  GameVersion,
  HistogramBucket,
  SimulationBatchResult,
  SimulationConfig,
  StrategyBreakdown,
} from "@/lib/types";
import { clamp } from "@/lib/utils";
import {
  BALANCE_PENALTIES,
  BALANCE_SCORE_RANGE,
  BATCH,
  FLAG_THRESHOLDS,
  POWER_SCORE_WEIGHTS,
  RECOMMENDATION_THRESHOLDS,
} from "./constants";

export function buildHistogram(values: number[], bucketSize: number, formatBucket?: (start: number, end: number) => string): HistogramBucket[] {
  if (!values.length) {
    return [];
  }

  const buckets = new Map<string, number>();

  for (const value of values) {
    const start = Math.floor(value / bucketSize) * bucketSize;
    const end = start + bucketSize - 1;
    const label = formatBucket ? formatBucket(start, end) : `${start}-${end}`;
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  }

  return Array.from(buckets.entries())
    .map(([bucket, count]) => ({ bucket, count }))
    .sort((left, right) => Number(left.bucket.split("-")[0]) - Number(right.bucket.split("-")[0]));
}

export interface CardStats {
  name: string;
  totalPlays: number;
  winnerPlays: number;
  totalImpact: number;
  gamesWithPlay: number;
}

export interface BatchAccumulator {
  turns: number[];
  winnerScores: number[];
  allScores: number[];
  positionWins: number[];
  strategyWins: Record<AgentType, number>;
  cardMap: Map<string, CardStats>;
}

export function summariseResult(
  version: GameVersion,
  config: SimulationConfig,
  state: BatchAccumulator,
): SimulationBatchResult {
  const { turns, winnerScores, allScores, positionWins, strategyWins, cardMap } = state;
  const games = config.games;
  const winRatesByPosition = positionWins.map((wins, index) => ({
    position: index + 1,
    wins,
    winRate: (wins / games) * 100,
  }));

  const strategyBreakdown: StrategyBreakdown[] = (["random", "greedy", "balanced"] as AgentType[]).map((agent) => ({
    agent,
    wins: strategyWins[agent],
    winRate: (strategyWins[agent] / games) * 100,
  }));

  const pw = POWER_SCORE_WEIGHTS;
  const cardRankings: CardRanking[] = Array.from(cardMap.entries())
    .map(([cardId, stats]) => {
      const winCorrelation = stats.totalPlays ? (stats.winnerPlays / stats.totalPlays) * 100 : 0;
      const averageImpact = stats.totalPlays ? stats.totalImpact / stats.totalPlays : 0;
      const inclusionRate = (stats.gamesWithPlay / games) * 100;
      const powerScore = averageImpact * pw.averageImpact + winCorrelation * pw.winCorrelation + inclusionRate * pw.inclusionRate;

      return {
        cardId,
        cardName: stats.name,
        totalPlays: stats.totalPlays,
        winnerPlays: stats.winnerPlays,
        winCorrelation,
        averageImpact,
        inclusionRate,
        powerScore,
      };
    })
    .sort((left, right) => right.powerScore - left.powerScore);

  const averageTurns = turns.reduce((total, value) => total + value, 0) / Math.max(1, turns.length);
  const averageWinningScore = winnerScores.reduce((total, value) => total + value, 0) / Math.max(1, winnerScores.length);
  const firstPositionRate = winRatesByPosition[0]?.winRate ?? 0;
  const averageOtherPositionRate =
    winRatesByPosition.length > 1
      ? winRatesByPosition.slice(1).reduce((total, entry) => total + entry.winRate, 0) / (winRatesByPosition.length - 1)
      : firstPositionRate;
  const firstPlayerAdvantage = firstPositionRate - averageOtherPositionRate;

  const dominant = [...strategyBreakdown].sort((left, right) => right.winRate - left.winRate)[0] ?? { agent: "random" as AgentType, wins: 0, winRate: 0 };
  const positionalSpread =
    Math.max(...winRatesByPosition.map((entry) => entry.winRate)) -
    Math.min(...winRatesByPosition.map((entry) => entry.winRate));
  const cardConcentration = (cardRankings[0]?.winCorrelation ?? 0) - BATCH.cardConcentrationBaseline;

  const bp = BALANCE_PENALTIES;
  const balancePenalty =
    positionalSpread * bp.positionalSpread +
    Math.max(0, dominant.winRate - bp.dominanceThreshold) * bp.dominanceMultiplier +
    Math.max(0, cardConcentration) * bp.cardConcentrationMultiplier +
    (averageTurns < version.maxTurns * bp.shortGameFraction ? bp.shortGamePenalty : 0) +
    (averageTurns > version.maxTurns * bp.longGameFraction ? bp.longGamePenalty : 0);
  const overallBalanceScore = clamp(100 - balancePenalty, BALANCE_SCORE_RANGE.min, BALANCE_SCORE_RANGE.max);

  const ft = FLAG_THRESHOLDS;
  const flaggedIssues: string[] = [];
  if (firstPlayerAdvantage > ft.firstPlayerAdvantage) {
    flaggedIssues.push(`Seat 1 is overperforming by ${firstPlayerAdvantage.toFixed(1)} percentage points.`);
  }
  if (dominant.winRate > ft.dominantStrategy) {
    flaggedIssues.push(`${dominant.agent} strategy is dominant at ${dominant.winRate.toFixed(1)}% wins.`);
  }
  if ((cardRankings[0]?.winCorrelation ?? 0) > ft.cardConcentration) {
    flaggedIssues.push(`${cardRankings[0]?.cardName} is highly concentrated in winning lines.`);
  }
  if (averageTurns < version.maxTurns * bp.shortGameFraction) {
    flaggedIssues.push("Games are ending too quickly for most decks to stabilize.");
  }

  const rt = RECOMMENDATION_THRESHOLDS;
  const recommendation =
    overallBalanceScore >= rt.healthy
      ? "Variant looks healthy. Move to human playtests and confirm edge cases."
      : overallBalanceScore >= rt.playable
        ? "Playable with tuning. Target the flagged positions and top-ranked cards before the next batch."
        : "Major balance drift detected. Rework costs, economy spikes, or opener tempo before more testing.";

  return {
    generatedAt: new Date().toISOString(),
    config,
    winRatesByPosition,
    strategyBreakdown,
    gameLengthHistogram: buildHistogram(turns, 2, (start, end) => `${start}-${end}`),
    scoreDistribution: buildHistogram(allScores, 5, (start, end) => `${start}-${end}`),
    cardRankings,
    summary: {
      overallBalanceScore,
      averageTurns,
      averageWinningScore,
      firstPlayerAdvantage,
      dominantStrategy: dominant.winRate > ft.dominantStrategy ? dominant.agent : null,
      dominantStrategyWinRate: dominant.winRate,
      recommendation,
      flaggedIssues,
    },
  };
}
