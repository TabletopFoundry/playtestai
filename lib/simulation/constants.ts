/**
 * Tuning constants for the simulation engine.
 *
 * Every magic number from card valuation, damage resolution, balance scoring,
 * and issue flagging is centralised here so that the balance model can be
 * understood and tuned without reading implementation code.
 */

// ---------------------------------------------------------------------------
// Card value heuristics — used by `calculateCardValue` to rank cards for
// agent decision-making.  Each stat is weighted differently depending on
// whether the agent is evaluating for immediate impact, long-term strategy,
// or a finishing move.
// ---------------------------------------------------------------------------
export const CARD_VALUE_WEIGHTS = {
  immediate: {
    power: 1.4,
    damage: 2,
    score: 1.8,
    shield: 1,
    draw: 1.1,
    custom: 1,
  },
  strategic: {
    economy: 2.2,
    draw: 1.5,
    combo: 1.1,
    shield: 0.7,
    custom: 0.6,
  },
  finisher: {
    damage: 2.4,
    steal: 1.6,
    score: 1.4,
    power: 1,
  },
} as const;

// Phase thresholds that shift weight between immediate/strategic/finisher
export const PHASE_WEIGHTS = {
  /** Round fraction below which early-game weighting applies */
  earlyGameCutoff: 0.45,
  /** Round fraction above which finisher weighting kicks in */
  lateGameCutoff: 0.7,
  immediate: { early: 0.55, late: 0.8 },
  strategic: { early: 0.45, late: 0.15 },
  finisher: { early: 0.05, late: 0.25 },
} as const;

// ---------------------------------------------------------------------------
// Agent decision parameters
// ---------------------------------------------------------------------------
export const AGENT_WEIGHTS = {
  /** Greedy agent: finisher bonus and cost penalty per card */
  greedy: { finisherBonus: 0.25, costPenalty: 0.08 },
  /** Balanced agent: cost penalty and random jitter for variety */
  balanced: { costPenalty: 0.04, jitter: 0.9, shortlistSize: 3 },
} as const;

// ---------------------------------------------------------------------------
// Custom stat weight — any stat key not in the KNOWN_STATS set gets this
// per-unit multiplier in card value calculations.
// ---------------------------------------------------------------------------
export const CUSTOM_STAT_WEIGHT = 0.35;

// ---------------------------------------------------------------------------
// Combat & scoring constants
// ---------------------------------------------------------------------------
export const COMBAT = {
  /** Fraction of board power added to damage: `boardPower / boardPowerDivisor` */
  boardPowerDivisor: 6,
  /** Score penalty per point of unshielded damage: `damage / damageScorePenaltyDivisor` */
  damageScorePenaltyDivisor: 3,
  /** Bonus score awarded for eliminating an opponent */
  killBonus: 4,
  /** Shield healed per point of shield stat: `shield / shieldHealDivisor` */
  shieldHealDivisor: 2,
} as const;

// ---------------------------------------------------------------------------
// End-of-round passive scoring
// ---------------------------------------------------------------------------
export const PASSIVE_SCORING = {
  /** Minimum passive score per round */
  minPassive: 1,
  /** Board power divisor for passive score: `boardPower / boardPowerDivisor` */
  boardPowerDivisor: 2,
  /** Resource divisor for passive score: `resources / resourceDivisor` */
  resourceDivisor: 4,
  /** Shield decay per round */
  shieldDecay: 1,
} as const;

// ---------------------------------------------------------------------------
// Card impact calculation (used for card ranking analytics)
// ---------------------------------------------------------------------------
export const IMPACT_WEIGHTS = {
  power: 1.2,
  score: 1.6,
  damage: 1.8,
  shield: 0.8,
  draw: 1.2,
  custom: 1,
  /** Economy weight when in early game (phase < 0.5) */
  economyEarly: 2,
  /** Economy weight when in late game */
  economyLate: 0.8,
  /** Phase fraction threshold for economy weighting */
  economyPhaseCutoff: 0.5,
} as const;

// ---------------------------------------------------------------------------
// Power score calculation for card rankings
// ---------------------------------------------------------------------------
export const POWER_SCORE_WEIGHTS = {
  /** Weight for average impact in power score */
  averageImpact: 6,
  /** Weight for win correlation percentage in power score */
  winCorrelation: 0.4,
  /** Weight for inclusion rate percentage in power score */
  inclusionRate: 0.2,
} as const;

// ---------------------------------------------------------------------------
// Balance scoring — penalises deviations from a perfectly balanced game
// ---------------------------------------------------------------------------
export const BALANCE_PENALTIES = {
  /** Penalty per percentage-point of positional win-rate spread */
  positionalSpread: 0.9,
  /** Win-rate above which a strategy starts incurring a dominance penalty */
  dominanceThreshold: 45,
  /** Penalty multiplier per percentage-point above the dominance threshold */
  dominanceMultiplier: 1.2,
  /** Penalty multiplier for top card's win-correlation above 50% */
  cardConcentrationMultiplier: 0.35,
  /** Flat penalty when average game length < `maxTurns * shortGameFraction` */
  shortGamePenalty: 10,
  /** Fraction of maxTurns below which the short-game penalty applies */
  shortGameFraction: 0.35,
  /** Flat penalty when average game length > `maxTurns * longGameFraction` */
  longGamePenalty: 6,
  /** Fraction of maxTurns above which the long-game penalty applies */
  longGameFraction: 0.9,
} as const;

/** Floor and ceiling for the final balance score */
export const BALANCE_SCORE_RANGE = { min: 8, max: 100 } as const;

// ---------------------------------------------------------------------------
// Issue-flagging thresholds — values that trigger warnings in the report
// ---------------------------------------------------------------------------
export const FLAG_THRESHOLDS = {
  /** First-player advantage (percentage points) above which we flag */
  firstPlayerAdvantage: 8,
  /** Strategy win rate above which it's labelled dominant */
  dominantStrategy: 60,
  /** Card win-correlation above which the card is flagged as concentrated */
  cardConcentration: 65,
} as const;

// ---------------------------------------------------------------------------
// Recommendation tier thresholds
// ---------------------------------------------------------------------------
export const RECOMMENDATION_THRESHOLDS = {
  healthy: 80,
  playable: 60,
} as const;

// ---------------------------------------------------------------------------
// Batch simulation
// ---------------------------------------------------------------------------
export const BATCH = {
  /** Seed multiplier between successive games to spread the RNG space */
  seedStride: 17,
  /** Card concentration baseline (subtracted from top card's win correlation) */
  cardConcentrationBaseline: 50,
} as const;
