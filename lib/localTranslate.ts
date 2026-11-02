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
  | { kind: "near"; text: string; expected: string }
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

function wordsAreSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length < 4) return false;
  if (long.startsWith(short) && long.length - short.length <= 3) return true;
  if (short.endsWith("e") && long.startsWith(short.slice(0, -1)) && long.length - short.length <= 3) return true;
  if (Math.abs(a.length - b.length) <= 1) {
    let diffs = 0;
    let i = 0;
    let j = 0;
    while (i < a.length || j < b.length) {
      if (i < a.length && j < b.length && a[i] === b[j]) {
        i++;
        j++;
      } else {
        diffs++;
        if (diffs > 1) return false;
        if (a.length > b.length) i++;
        else if (b.length > a.length) j++;
        else {
          i++;
          j++;
        }
      }
    }
    return true;
  }
  return false;
}

export function diffAnswer(answer: string, expected: string): WordMark[] {
  const source = tokenize(answer);
  const target = tokenize(expected);
  const rows = source.length + 1;
  const cols = target.length + 1;
  const length = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      length[i][j] = wordsAreSimilar(source[i - 1].key, target[j - 1].key)
        ? length[i - 1][j - 1] + 1
        : Math.max(length[i - 1][j], length[i][j - 1]);
    }
  }

  const matches: { sourceIndex: number; targetIndex: number }[] = [];
  let i = source.length;
  let j = target.length;
  while (i > 0 && j > 0) {
    if (wordsAreSimilar(source[i - 1].key, target[j - 1].key)) {
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
    if (source[match.sourceIndex].key === target[match.targetIndex].key) {
      marks.push({ kind: "match", text: source[match.sourceIndex].text });
    } else {
      marks.push({ kind: "near", text: source[match.sourceIndex].text, expected: target[match.targetIndex].text });
    }
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
  const exact = marks.filter((mark) => mark.kind === "match").map((mark) => mark.text);
  const near = marks.filter((mark) => mark.kind === "near").map((mark) => mark.text);
  const extras = marks.filter((mark) => mark.kind === "extra").length;
  const fixes = marks.reduce((count, mark) => count + (mark.kind === "gap" ? mark.to.length : 0), 0);
  const parts: string[] = [];
  const allCorrect = [...exact, ...near];
  parts.push(allCorrect.length > 0 ? `Đúng: ${allCorrect.join(", ")}.` : "Chưa có từ nào khớp câu mẫu.");
  if (near.length > 0) parts.push(`${near.length} từ gần đúng, cần sửa dạng từ.`);
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
  const allMatched = marks.every((m) => m.kind === "match" || m.kind === "near");
  if (allMatched) {
    const hasNear = marks.some((m) => m.kind === "near");
    return { correct: true, feedback: hasNear ? "Gần đúng! Kiểm tra lại dạng từ." : "Khớp với câu mẫu.", suggestion };
  }

  const expectedTokenCount = tokenize(expected).length;
  const matchCount = marks.filter((m) => m.kind === "match").length;
  const nearCount = marks.filter((m) => m.kind === "near").length;
  const totalMatched = matchCount + nearCount;
  const matchRatio = expectedTokenCount > 0 ? totalMatched / expectedTokenCount : 0;

  const score = stringSimilarity.compareTwoStrings(normalizedAnswer, normalizedExpected);

  const answerTokens = normalizedAnswer.split(" ");
  const expectedCW = contentWords(expected);
  const covered = expectedCW.filter((w) => answerTokens.some((t) => t === w || wordsAreSimilar(t, w))).length;
  const coverage = expectedCW.length === 0 ? score : covered / expectedCW.length;
  const longEnough = answerTokens.length >= Math.max(3, Math.floor(normalizedExpected.split(" ").length * 0.6));

  const correct = matchRatio >= 0.8 || score >= 0.8 || (coverage >= 0.8 && score >= 0.45 && longEnough);

  if (correct) {
    const hasNear = nearCount > 0;
    return { correct: true, feedback: hasNear ? "Gần đúng! Kiểm tra lại dạng từ." : "Gần khớp với câu mẫu.", suggestion };
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
