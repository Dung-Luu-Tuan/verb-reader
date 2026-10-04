// Simple Leitner-box spaced repetition system.
// Each word moves through boxes 0-5. Box 0 = brand new / never reviewed.
// A correct recall advances a word to the next box and pushes its due date
// further into the future; a miss drops it back to box 1 and makes it due
// again immediately, so weak words resurface far more often than known ones.

export interface WordProgress {
  box: number; // 0 = new, 1-5 = increasing familiarity
  dueDate: string; // ISO yyyy-mm-dd, the day this word should be reviewed again
  lastReviewed?: string; // ISO yyyy-mm-dd of the last review, if any
  reviewCount: number;
}

export type ProgressMap = Record<number, WordProgress>;

// Days until next review, indexed by box (box 1 -> INTERVALS[0], etc).
const INTERVALS_DAYS = [1, 2, 4, 9, 16];
export const MASTERED_BOX = 5;

export function todayISO(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function addDaysISO(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

export function createNewProgress(): WordProgress {
  return { box: 0, dueDate: todayISO(), reviewCount: 0 };
}

/** Apply the result of one review to a word's progress, returning the new state. */
export function reviewWord(progress: WordProgress | undefined, correct: boolean): WordProgress {
  const current = progress ?? createNewProgress();
  const nextBox = correct ? Math.min(current.box + 1, MASTERED_BOX) : 1;
  const interval = INTERVALS_DAYS[Math.max(0, nextBox - 1)] ?? INTERVALS_DAYS[0];
  return {
    box: nextBox,
    dueDate: addDaysISO(interval),
    lastReviewed: todayISO(),
    reviewCount: current.reviewCount + 1,
  };
}

export function isDue(progress: WordProgress | undefined, on: string = todayISO()): boolean {
  if (!progress) return true; // never seen -> due now
  return progress.dueDate <= on;
}

export function isMastered(progress: WordProgress | undefined): boolean {
  return (progress?.box ?? 0) >= MASTERED_BOX;
}

export function isNew(progress: WordProgress | undefined): boolean {
  return !progress || progress.box === 0;
}

/** Migrate the old binary "savedIds" progress format to Leitner boxes. */
export function migrateFromSavedIds(savedIds: number[]): ProgressMap {
  const map: ProgressMap = {};
  for (const id of savedIds) {
    // Treat previously "known" words as reasonably familiar (box 4) rather
    // than instantly mastered, so they still resurface for a real check.
    map[id] = { box: 4, dueDate: addDaysISO(INTERVALS_DAYS[3]), reviewCount: 1, lastReviewed: todayISO() };
  }
  return map;
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build a review session: words due today first (weakest box first), then
 * top up with brand-new words if there aren't enough due words yet.
 */
export function buildReviewSession<T extends { id: number }>(
  words: T[],
  progressMap: ProgressMap,
  count: number
): T[] {
  const today = todayISO();
  const due = words.filter((w) => isDue(progressMap[w.id], today) && !isNew(progressMap[w.id]));
  const fresh = words.filter((w) => isNew(progressMap[w.id]));

  due.sort((a, b) => (progressMap[a.id]?.box ?? 0) - (progressMap[b.id]?.box ?? 0));

  const session = [...due, ...shuffle(fresh)].slice(0, count);
  return session.length > 0 ? session : shuffle(words).slice(0, count);
}

export interface ProgressStats {
  total: number;
  newCount: number;
  dueCount: number;
  masteredCount: number;
}

export function computeStats<T extends { id: number }>(words: T[], progressMap: ProgressMap): ProgressStats {
  const today = todayISO();
  let newCount = 0;
  let dueCount = 0;
  let masteredCount = 0;
  for (const w of words) {
    const p = progressMap[w.id];
    if (isNew(p)) newCount += 1;
    else if (isMastered(p)) masteredCount += 1;
    else if (isDue(p, today)) dueCount += 1;
  }
  return { total: words.length, newCount, dueCount, masteredCount };
}

export interface StreakData {
  count: number;
  lastActiveDate: string;
}

/** Update a daily streak counter based on "today" vs the last active day. */
export function bumpStreak(prev: StreakData | undefined): StreakData {
  const today = todayISO();
  if (!prev) return { count: 1, lastActiveDate: today };
  if (prev.lastActiveDate === today) return prev;

  const last = new Date(prev.lastActiveDate);
  const diffDays = Math.round((new Date(today).getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays === 1 ? { count: prev.count + 1, lastActiveDate: today } : { count: 1, lastActiveDate: today };
}
