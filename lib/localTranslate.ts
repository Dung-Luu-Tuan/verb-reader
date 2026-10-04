import stringSimilarity from "string-similarity";
import type { GradeResult } from "@/lib/translateSession";
import type { CefrLevel, VerbItem } from "@/types/verb";

export type PracticeLevel = "easy" | "normal" | "hard";

export const PRACTICE_LEVEL_KEY = "verb-reader-translate-level";

export function readPracticeLevel(value: string | null): PracticeLevel {
  if (value === "easy" || value === "normal" || value === "hard") return value;
  return "easy";
}

export function practiceLevelFor(level: CefrLevel | undefined): PracticeLevel {
  if (level === "A1") return "easy";
  if (level === "A2" || level === "B1") return "normal";
  return "hard";
}

export function countByPracticeLevel(verbs: VerbItem[]): Record<PracticeLevel, number> {
  const counts: Record<PracticeLevel, number> = { easy: 0, normal: 0, hard: 0 };
  for (const verb of verbs) {
    if (!verb.exampleVi.trim() || !verb.exampleEn.trim()) continue;
    counts[practiceLevelFor(verb.level)] += 1;
  }
  return counts;
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "in",
  "on",
  "at",
  "for",
  "and",
  "or",
  "but",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "am",
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "me",
  "him",
  "her",
  "us",
  "them",
  "my",
  "your",
  "his",
  "their",
  "our",
  "its",
  "this",
  "that",
  "these",
  "those",
  "with",
  "from",
  "by",
  "as",
  "if",
  "so",
  "not",
]);

export function normalizeEnglish(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contentWords(text: string): string[] {
  return normalizeEnglish(text)
    .split(" ")
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

export type WordMark =
  | { kind: "match"; text: string }
  | { kind: "extra"; text: string }
  | { kind: "gap"; from: string[]; to: string[] };

function tokenize(text: string): { text: string; key: string }[] {
  return text
    .replace(/[’‘]/g, "'")
    .split(/\s+/)
    .map((part) => part.replace(/^[^a-z0-9']+|[^a-z0-9']+$/gi, ""))
    .filter(Boolean)
    .map((text) => ({ text, key: text.toLowerCase() }));
}

export function diffAnswer(answer: string, expected: string): WordMark[] {
  const source = tokenize(answer);
  const target = tokenize(expected);
  const rows = source.length + 1;
  const cols = target.length + 1;
  const length = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      length[i][j] =
        source[i - 1].key === target[j - 1].key
          ? length[i - 1][j - 1] + 1
          : Math.max(length[i - 1][j], length[i][j - 1]);
    }
  }

  const matches: { sourceIndex: number; targetIndex: number }[] = [];
  let i = source.length;
  let j = target.length;
  while (i > 0 && j > 0) {
    if (source[i - 1].key === target[j - 1].key) {
      matches.push({ sourceIndex: i - 1, targetIndex: j - 1 });
      i -= 1;
      j -= 1;
    } else if (length[i - 1][j] >= length[i][j - 1]) {
      i -= 1;
    } else {
      j -= 1;
    }
  }
  matches.reverse();

  const marks: WordMark[] = [];
  let sourceCursor = 0;
  let targetCursor = 0;
  const pushGap = (from: string[], to: string[]) => {
    if (to.length === 0) {
      for (const text of from) marks.push({ kind: "extra", text });
      return;
    }
    if (from.length > 0 || to.length > 0) marks.push({ kind: "gap", from, to });
  };

  for (const match of matches) {
    pushGap(
      source.slice(sourceCursor, match.sourceIndex).map((token) => token.text),
      target.slice(targetCursor, match.targetIndex).map((token) => token.text),
    );
    marks.push({ kind: "match", text: source[match.sourceIndex].text });
    sourceCursor = match.sourceIndex + 1;
    targetCursor = match.targetIndex + 1;
  }
  pushGap(
    source.slice(sourceCursor).map((token) => token.text),
    target.slice(targetCursor).map((token) => token.text),
  );
  return marks;
}

export function hintLines(marks: WordMark[]): string[] {
  const lines: string[] = [];
  for (const mark of marks) {
    if (mark.kind !== "gap") continue;
    mark.to.forEach((word, index) => {
      if (mark.from.length === 0) {
        lines.push(`Thêm từ “${word}”`);
      } else if (mark.to.length === 1) {
        lines.push(`Sửa “${mark.from.join(" ")}” thành ${word}`);
      } else if (mark.from[index]) {
        lines.push(`Sửa “${mark.from[index]}” thành ${word}`);
      } else {
        lines.push(`Thêm từ “${word}”`);
      }
    });
  }
  return lines;
}

export function mistakeSummary(marks: WordMark[]): string {
  const correct = marks.filter((mark) => mark.kind === "match").map((mark) => mark.text);
  const extras = marks.filter((mark) => mark.kind === "extra").length;
  const fixes = marks.reduce((count, mark) => count + (mark.kind === "gap" ? mark.to.length : 0), 0);
  const parts: string[] = [];
  parts.push(correct.length > 0 ? `Đúng: ${correct.join(", ")}.` : "Chưa có từ nào khớp câu mẫu.");
  if (fixes > 0) parts.push(`${fixes} từ cần sửa.`);
  if (extras > 0) parts.push(`${extras} từ thừa.`);
  return parts.join(" ");
}

export function gradeAgainstSample(answer: string, expected: string): GradeResult {
  const normalizedAnswer = normalizeEnglish(answer);
  const normalizedExpected = normalizeEnglish(expected);
  const suggestion = expected.trim();

  if (!normalizedAnswer) {
    return { correct: false, feedback: "Điền bản dịch tiếng Anh trước khi nộp.", suggestion };
  }

  const marks = diffAnswer(answer, expected);
  if (marks.every((mark) => mark.kind === "match")) {
    return { correct: true, feedback: "Khớp với câu mẫu.", suggestion };
  }

  const score = stringSimilarity.compareTwoStrings(normalizedAnswer, normalizedExpected);
  const expectedWords = contentWords(expected);
  const answerWords = new Set(normalizedAnswer.split(" "));
  const covered = expectedWords.filter((word) => answerWords.has(word)).length;
  const coverage = expectedWords.length === 0 ? score : covered / expectedWords.length;
  const longEnough = normalizedAnswer.split(" ").length >= Math.max(3, Math.floor(normalizedExpected.split(" ").length * 0.6));
  const correct = score >= 0.72 || (coverage >= 0.8 && score >= 0.4 && longEnough);

  if (correct) {
    return { correct: true, feedback: "Khớp với câu mẫu.", suggestion };
  }
  return { correct: false, feedback: mistakeSummary(marks), suggestion };
}

export function pickPracticeVerb(
  verbs: VerbItem[],
  level: PracticeLevel,
  recentVietnamese: string[],
  recentVerbs: string[],
): VerbItem | null {
  const usable = verbs.filter(
    (verb) => verb.exampleVi.trim() && verb.exampleEn.trim() && practiceLevelFor(verb.level) === level,
  );
  if (usable.length === 0) return null;

  const seenSentences = new Set(recentVietnamese);
  const seenVerbs = new Set(recentVerbs.slice(0, 24));
  const fresh = usable.filter((verb) => !seenSentences.has(verb.exampleVi) && !seenVerbs.has(verb.verb));
  const unusedSentences = usable.filter((verb) => !seenSentences.has(verb.exampleVi));
  const pool = fresh.length > 0 ? fresh : unusedSentences.length > 0 ? unusedSentences : usable;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}
