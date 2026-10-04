"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, type ReactNode } from "react";
import {
  loadHistory,
  saveHistory,
  upsertRecord,
  type TranslateRecord,
} from "@/lib/translateSession";
import {
  countByPracticeLevel,
  diffAnswer,
  gradeAgainstSample,
  hintLines,
  pickPracticeVerb,
  PRACTICE_LEVEL_KEY,
  readPracticeLevel,
  type PracticeLevel,
  type WordMark,
} from "@/lib/localTranslate";
import { VerbItem } from "@/types/verb";

const LEVEL_OPTIONS: { id: PracticeLevel; label: string; detail: string }[] = [
  { id: "easy", label: "Dễ", detail: "A1" },
  { id: "normal", label: "Bình thường", detail: "A2–B1" },
  { id: "hard", label: "Khó", detail: "B2–C1" },
];

function WordHints({ answer, expected }: { answer: string; expected: string }) {
  const [shown, setShown] = useState(0);
  const marks = diffAnswer(answer, expected);
  const lines = hintLines(marks);
  const revealedByGap = new Map<number, number>();
  let cursor = 0;
  marks.forEach((mark, index) => {
    if (mark.kind !== "gap") return;
    const count = Math.max(0, Math.min(mark.to.length, shown - cursor));
    revealedByGap.set(index, count);
    cursor += mark.to.length;
  });

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {marks.map((mark, index) => (
          <WordChips key={`${mark.kind}-${index}`} mark={mark} revealed={revealedByGap.get(index) ?? 0} />
        ))}
      </div>
      {shown > 0 && (
        <ul className="space-y-1">
          {lines.slice(0, shown).map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
      )}
      {shown < lines.length ? (
        <button type="button" onClick={() => setShown((count) => count + 1)} className="font-semibold underline">
          Gợi ý từ tiếp theo
        </button>
      ) : (
        lines.length > 0 && <p>Đã hiện hết từ cần sửa. Sửa câu rồi nộp lại.</p>
      )}
    </div>
  );
}

function WordChips({ mark, revealed }: { mark: WordMark; revealed: number }) {
  if (mark.kind === "match") {
    return <span className="rounded-lg bg-emerald-100 px-2 py-1 font-semibold text-emerald-800">{mark.text}</span>;
  }
  if (mark.kind === "extra") {
    return (
      <span className="rounded-lg bg-slate-200 px-2 py-1 text-slate-500">
        <span className="line-through">{mark.text}</span>
        <span className="ml-1 text-[10px] font-bold uppercase tracking-wide">thừa</span>
      </span>
    );
  }

  const chips: ReactNode[] = [];
  const done = revealed >= mark.to.length;
  if (done) {
    mark.to.forEach((word, index) => chips.push(<FixedWord key={`to-${index}`}>{word}</FixedWord>));
    return <>{chips}</>;
  }
  if (mark.to.length === 1) {
    mark.from.forEach((word, index) => chips.push(<WrongWord key={`from-${index}`}>{word}</WrongWord>));
    if (mark.from.length === 0) chips.push(<WrongWord key="missing">···</WrongWord>);
    return <>{chips}</>;
  }

  mark.to.forEach((word, index) => {
    if (index < revealed) chips.push(<FixedWord key={`to-${index}`}>{word}</FixedWord>);
    else if (mark.from[index]) chips.push(<WrongWord key={`from-${index}`}>{mark.from[index]}</WrongWord>);
    else chips.push(<WrongWord key={`blank-${index}`}>···</WrongWord>);
  });
  if (revealed < mark.to.length) {
    mark.from.slice(mark.to.length).forEach((word, index) => {
      chips.push(<WrongWord key={`rest-${index}`}>{word}</WrongWord>);
    });
  }
  return <>{chips}</>;
}

function FixedWord({ children }: { children: string }) {
  return <span className="rounded-lg bg-sky-100 px-2 py-1 font-semibold text-sky-800">{children}</span>;
}

function WrongWord({ children }: { children: string }) {
  return <span className="rounded-lg bg-amber-100 px-2 py-1 font-semibold text-amber-800">{children}</span>;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TranslatePage() {
  const [ready, setReady] = useState(false);
  const [verbs, setVerbs] = useState<VerbItem[]>([]);
  const [records, setRecords] = useState<TranslateRecord[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<{ sentenceId: string; message: string } | null>(null);
  const [practiceLevel, setPracticeLevel] = useState<PracticeLevel>("easy");

  useEffect(() => {
    const history = loadHistory();
    setPracticeLevel(readPracticeLevel(localStorage.getItem(PRACTICE_LEVEL_KEY)));
    setRecords(history);
    setCurrentId(history.find((record) => !record.solvedAt)?.id ?? null);
    setReady(true);

    fetch("/verbs.json")
      .then((res) => res.json())
      .then((data: VerbItem[]) => setVerbs(Array.isArray(data) ? data : []))
      .catch(() => setVerbs([]));
  }, []);

  const current = records.find((record) => record.id === currentId) ?? null;
  const lastAttempt = current?.attempts.at(-1) ?? null;
  const solved = Boolean(current?.solvedAt);

  const persist = (next: TranslateRecord[]) => {
    setRecords(next);
    saveHistory(next);
  };

  const levelCounts = countByPracticeLevel(verbs);
  const visibleError = error && error.sentenceId === (current?.id ?? "") ? error.message : "";

  const createSentence = (level = practiceLevel) => {
    setError(null);
    const recentVerbs = records.map((record) => record.focusVerb).filter((verb): verb is string => Boolean(verb));
    const seed = pickPracticeVerb(
      verbs,
      level,
      records.map((record) => record.vietnamese),
      recentVerbs,
    );
    if (!seed) {
      setError({
        sentenceId: current?.id ?? "",
        message: verbs.length === 0 ? "Bộ từ chưa sẵn sàng. Tải lại trang rồi thử lại." : "Mức này chưa có câu.",
      });
      return;
    }

    const record: TranslateRecord = {
      id: crypto.randomUUID(),
      vietnamese: seed.exampleVi,
      expectedEnglish: seed.exampleEn,
      focusVerb: seed.verb,
      focusMeaning: seed.meaning,
      practiceLevel: level,
      createdAt: new Date().toISOString(),
      attempts: [],
    };
    persist(upsertRecord(records, record));
    setCurrentId(record.id);
    setAnswer("");
  };

  const chooseLevel = (level: PracticeLevel) => {
    setPracticeLevel(level);
    localStorage.setItem(PRACTICE_LEVEL_KEY, level);
    if (current && !current.solvedAt && current.practiceLevel !== level) {
      createSentence(level);
    }
  };

  const submitAnswer = (event: FormEvent) => {
    event.preventDefault();
    if (!current || solved) return;
    const trimmed = answer.trim();
    if (!trimmed) {
      setError({ sentenceId: current.id, message: "Điền bản dịch tiếng Anh trước khi nộp." });
      return;
    }
    if (!current.expectedEnglish) {
      setError({ sentenceId: current.id, message: "Câu này không có đáp án mẫu. Bấm Đổi câu để lấy câu trong bộ từ." });
      return;
    }

    setError(null);
    const grade = gradeAgainstSample(trimmed, current.expectedEnglish);
    const now = new Date().toISOString();
    const updated: TranslateRecord = {
      ...current,
      solvedAt: grade.correct ? now : undefined,
      attempts: [
        ...current.attempts,
        {
          answer: trimmed,
          correct: grade.correct,
          feedback: grade.feedback,
          suggestion: grade.suggestion,
          at: now,
        },
      ],
    };
    persist(upsertRecord(records, updated));
  };

  const resume = (record: TranslateRecord) => {
    if (record.solvedAt) return;
    setCurrentId(record.id);
    setAnswer("");
    setError(null);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#eef5ff_0%,_#f8fafc_40%,_#f1f5f9_100%)] text-slate-800">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <header className="mb-6 rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-md sm:p-8">
          <Link href="/" className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            ← Verb Reader
          </Link>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Luyện dịch câu</h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Chọn mức dễ, bình thường hoặc khó. Mỗi lượt lấy một câu tiếng Việt trong bộ từ, bạn điền tiếng Anh rồi máy
            đối chiếu với câu mẫu. Lịch sử được giữ trên máy này.
          </p>
        </header>

        <section className="mb-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(148,163,184,0.18)]">
          <div className="mb-5 grid grid-cols-3 gap-2">
            {LEVEL_OPTIONS.map((option) => {
              const selected = practiceLevel === option.id;
              const count = levelCounts[option.id];
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => chooseLevel(option.id)}
                  className={`rounded-2xl px-2 py-3 text-center transition ${
                    selected ? "bg-slate-900 text-white" : "border border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="block text-sm font-bold">{option.label}</span>
                  <span className={`mt-1 block text-[11px] ${selected ? "text-slate-300" : "text-slate-500"}`}>
                    {count > 0 ? `${count} câu · ${option.detail}` : option.detail}
                  </span>
                </button>
              );
            })}
          </div>

          {current && !current.solvedAt && current.practiceLevel !== practiceLevel && (
            <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Câu đang mở không thuộc mức này.{" "}
              <button type="button" onClick={() => createSentence()} className="font-semibold underline">
                Lấy câu {LEVEL_OPTIONS.find((option) => option.id === practiceLevel)?.label.toLowerCase()}
              </button>
            </p>
          )}

          {!ready ? (
            <p className="text-sm text-slate-600">Đang tải lịch sử...</p>
          ) : !current ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="text-sm text-slate-600">Chưa có câu nào đang làm. Tạo một câu tiếng Việt để bắt đầu.</p>
              <button
                type="button"
                onClick={() => createSentence()}
                className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Tạo câu
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <span>{solved ? "Đã đúng" : `Lần thử ${current.attempts.length + 1}`}</span>
                <span>{formatWhen(current.createdAt)}</span>
              </div>

              <p className="text-2xl font-bold leading-snug text-slate-900">{current.vietnamese}</p>
              {current.focusMeaning && (
                <p className="mt-3 inline-flex rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">
                  Chủ đề: {current.focusMeaning}
                </p>
              )}

              <form onSubmit={submitAnswer} className="mt-5 space-y-3">
                <label className="block text-sm font-semibold text-slate-700" htmlFor="english-answer">
                  Bản dịch tiếng Anh
                </label>
                <textarea
                  id="english-answer"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  disabled={solved}
                  rows={3}
                  placeholder="Viết câu tiếng Anh của bạn"
                  className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none ring-blue-500 focus:ring-2 disabled:opacity-70"
                />

                {lastAttempt && (
                  <div
                    className={`rounded-2xl p-4 text-sm ${
                      lastAttempt.correct ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"
                    }`}
                  >
                    <p className="font-semibold">{lastAttempt.correct ? "Đúng" : "Chưa đúng"}</p>
                    {lastAttempt.feedback && <p className="mt-1">{lastAttempt.feedback}</p>}
                    {!lastAttempt.correct && current.expectedEnglish && (
                      <WordHints key={lastAttempt.at} answer={lastAttempt.answer} expected={current.expectedEnglish} />
                    )}
                    {lastAttempt.correct && lastAttempt.suggestion && (
                      <p className="mt-2 italic">Câu mẫu: {lastAttempt.suggestion}</p>
                    )}
                  </div>
                )}

                {visibleError && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{visibleError}</p>}

                <div className="flex flex-wrap gap-3">
                  {solved ? (
                    <button
                      type="button"
                      onClick={() => createSentence()}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Câu tiếp theo
                    </button>
                  ) : (
                    <>
                      <button
                        type="submit"
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                      >
                        {lastAttempt ? "Nộp lại" : "Nộp bài"}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          createSentence();
                        }}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                      >
                        Đổi câu
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
          )}

          {visibleError && !current && (
            <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{visibleError}</p>
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(148,163,184,0.18)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Lịch sử</h2>
            <span className="text-sm text-slate-500">{records.length} câu</span>
          </div>

          {records.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">Các câu và từng lần nộp sẽ hiện ở đây.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {records.map((record) => {
                const accepted = record.attempts.findLast((attempt) => attempt.correct);
                const active = record.id === currentId;
                return (
                  <li key={record.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-slate-900">{record.vietnamese}</p>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                          record.solvedAt ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {record.solvedAt ? "Đúng" : "Chưa xong"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatWhen(record.createdAt)} · {record.attempts.length} lần nộp
                      {active ? " · đang làm" : ""}
                    </p>
                    {accepted && <p className="mt-2 text-sm text-slate-700">{accepted.answer}</p>}
                    {record.attempts.length > 0 && (
                      <details className="mt-2 text-sm text-slate-600">
                        <summary className="cursor-pointer font-medium">Các lần nộp</summary>
                        <ol className="mt-2 space-y-2">
                          {record.attempts.map((attempt, index) => (
                            <li key={`${record.id}-${attempt.at}`}>
                              <span className="font-semibold">{attempt.correct ? "Đúng" : "Sai"} {index + 1}:</span>{" "}
                              {attempt.answer}
                              {attempt.feedback ? ` — ${attempt.feedback}` : ""}
                            </li>
                          ))}
                        </ol>
                      </details>
                    )}
                    {!record.solvedAt && !active && (
                      <button
                        type="button"
                        onClick={() => resume(record)}
                        className="mt-3 text-sm font-semibold text-blue-600"
                      >
                        Làm tiếp câu này
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
