export type GradeResult = {
  correct: boolean;
  feedback: string;
  suggestion: string;
};

export type TranslateAttempt = {
  answer: string;
  correct: boolean;
  feedback: string;
  suggestion: string;
  at: string;
};

export type TranslateRecord = {
  id: string;
  vietnamese: string;
  expectedEnglish?: string;
  focusVerb?: string;
  focusMeaning?: string;
  practiceLevel?: "easy" | "normal" | "hard";
  createdAt: string;
  solvedAt?: string;
  attempts: TranslateAttempt[];
};

export const TRANSLATE_HISTORY_KEY = "verb-reader-translate-history-v1";
const HISTORY_LIMIT = 100;

export function parseModelJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? trimmed).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("Gemini không trả về JSON hợp lệ.");
  }
  return JSON.parse(raw.slice(start, end + 1)) as unknown;
}

export function readSentence(value: unknown): string {
  if (!value || typeof value !== "object") {
    throw new Error("Gemini không trả về câu tiếng Việt.");
  }
  const vietnamese = (value as { vietnamese?: unknown }).vietnamese;
  if (typeof vietnamese !== "string" || !vietnamese.trim()) {
    throw new Error("Gemini không trả về câu tiếng Việt.");
  }
  return vietnamese.trim();
}

export function readGrade(value: unknown): GradeResult {
  if (!value || typeof value !== "object") {
    throw new Error("Gemini không trả về kết quả chấm.");
  }
  const record = value as { correct?: unknown; feedback?: unknown; suggestion?: unknown };
  if (typeof record.correct !== "boolean") {
    throw new Error("Gemini không trả về kết quả chấm.");
  }
  return {
    correct: record.correct,
    feedback: typeof record.feedback === "string" ? record.feedback.trim() : "",
    suggestion: typeof record.suggestion === "string" ? record.suggestion.trim() : "",
  };
}

export function upsertRecord(records: TranslateRecord[], record: TranslateRecord): TranslateRecord[] {
  const index = records.findIndex((item) => item.id === record.id);
  const next = index === -1 ? [record, ...records] : records.map((item) => (item.id === record.id ? record : item));
  return next.slice(0, HISTORY_LIMIT);
}

export function loadHistory(): TranslateRecord[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(TRANSLATE_HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { records?: TranslateRecord[] };
    return Array.isArray(parsed.records) ? parsed.records : [];
  } catch {
    return [];
  }
}

export function saveHistory(records: TranslateRecord[]): void {
  localStorage.setItem(TRANSLATE_HISTORY_KEY, JSON.stringify({ records }));
}
