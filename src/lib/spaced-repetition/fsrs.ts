/**
 * FSRS-4.5 Spaced Repetition Algorithm
 * Based on: https://github.com/open-spaced-repetition/fsrs4anki
 * Adapted for VocaFlow
 */

export type FSRSState = 0 | 1 | 2 | 3; // New | Learning | Review | Relearning
export type FSRSRating = 1 | 2 | 3 | 4; // Again | Hard | Good | Easy

export interface FSRSCard {
  state: FSRSState;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  last_review: Date | null;
}

export interface FSRSResult {
  card: FSRSCard;
  next_review: Date;
  scheduled_days: number;
}

const FSRS_PARAMS = {
  w: [
    0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0589,
    1.5330, 0.1544, 1.0070, 1.9395, 0.1100, 0.2900, 2.2700, 0.1400,
    2.9898, 0.5100, 0.4300,
  ],
  DECAY: -0.5,
  FACTOR: 19 / 81,
  REQUEST_RETENTION: 0.9,
};

function initDifficulty(rating: FSRSRating): number {
  const { w } = FSRS_PARAMS;
  return Math.min(Math.max(w[4] - Math.exp(w[5] * (rating - 1)) + 1, 1), 10);
}

function initStability(rating: FSRSRating): number {
  const { w } = FSRS_PARAMS;
  return Math.max(w[rating - 1], 0.1);
}

function nextDifficulty(d: number, rating: FSRSRating): number {
  const { w } = FSRS_PARAMS;
  const nextD = d - w[6] * (rating - 3);
  return Math.min(Math.max(meanReversion(FSRS_PARAMS.w[4], nextD), 1), 10);
}

function meanReversion(init: number, current: number): number {
  return FSRS_PARAMS.w[7] * init + (1 - FSRS_PARAMS.w[7]) * current;
}

function nextRecallStability(d: number, s: number, r: number, rating: FSRSRating): number {
  const { w } = FSRS_PARAMS;
  const hardPenalty = rating === 2 ? w[15] : 1;
  const easyBonus = rating === 4 ? w[16] : 1;
  return (
    s *
    (Math.exp(w[8]) *
      (11 - d) *
      Math.pow(s, -w[9]) *
      (Math.exp((1 - r) * w[10]) - 1) *
      hardPenalty *
      easyBonus)
  );
}

function nextForgetStability(d: number, s: number, r: number): number {
  const { w } = FSRS_PARAMS;
  return (
    w[11] *
    Math.pow(d, -w[12]) *
    (Math.pow(s + 1, w[13]) - 1) *
    Math.exp((1 - r) * w[14])
  );
}

function forgettingCurve(elapsedDays: number, stability: number): number {
  const { DECAY, FACTOR } = FSRS_PARAMS;
  return Math.pow(1 + FACTOR * (elapsedDays / stability), DECAY);
}

function nextInterval(stability: number): number {
  const { FACTOR, DECAY, REQUEST_RETENTION } = FSRS_PARAMS;
  const interval =
    (stability / FACTOR) *
    (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1);
  return Math.max(Math.round(interval), 1);
}

export function selfRatingToFSRS(rating: "again" | "hard" | "good" | "easy"): FSRSRating {
  const map: Record<string, FSRSRating> = {
    again: 1,
    hard: 2,
    good: 3,
    easy: 4,
  };
  return map[rating];
}

export function fsrsSchedule(
  card: FSRSCard,
  rating: FSRSRating,
  now: Date = new Date()
): FSRSResult {
  const newCard: FSRSCard = { ...card };
  let scheduledDays = 0;

  const elapsedDays = card.last_review
    ? Math.max(
        0,
        Math.round(
          (now.getTime() - card.last_review.getTime()) / (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  newCard.elapsed_days = elapsedDays;
  newCard.reps += 1;
  newCard.last_review = now;

  if (card.state === 0) {
    // New card
    newCard.difficulty = initDifficulty(rating);
    newCard.stability = initStability(rating);

    if (rating === 1) {
      newCard.state = 1; // Learning
      scheduledDays = 0;
    } else if (rating === 2) {
      newCard.state = 1;
      scheduledDays = 1;
    } else if (rating === 3) {
      newCard.state = 2; // Review
      scheduledDays = nextInterval(newCard.stability);
    } else {
      newCard.state = 2;
      newCard.stability = Math.max(
        newCard.stability * FSRS_PARAMS.w[16],
        0.1
      );
      scheduledDays = nextInterval(newCard.stability);
    }
  } else if (card.state === 1 || card.state === 3) {
    // Learning / Relearning
    if (rating === 1) {
      newCard.state = card.state;
      scheduledDays = 0;
    } else if (rating === 2) {
      newCard.state = card.state;
      scheduledDays = 1;
    } else {
      newCard.state = 2;
      newCard.stability = initStability(rating);
      scheduledDays = nextInterval(newCard.stability);
    }
  } else {
    // Review state
    const r = forgettingCurve(elapsedDays, card.stability);
    newCard.difficulty = nextDifficulty(card.difficulty, rating);

    if (rating === 1) {
      newCard.lapses += 1;
      newCard.state = 3; // Relearning
      newCard.stability = nextForgetStability(newCard.difficulty, card.stability, r);
      scheduledDays = 0;
    } else {
      newCard.state = 2;
      newCard.stability = nextRecallStability(newCard.difficulty, card.stability, r, rating);
      scheduledDays = nextInterval(newCard.stability);
    }
  }

  newCard.scheduled_days = scheduledDays;
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + scheduledDays);

  return { card: newCard, next_review: nextReview, scheduled_days: scheduledDays };
}

export function newFSRSCard(): FSRSCard {
  return {
    state: 0,
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    last_review: null,
  };
}
