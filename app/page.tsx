"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import VerbTable from "@/components/VerbTable";
import PronunciationModal from "@/components/PronunciationModal";
import { VerbItem } from "@/types/verb";
import {
  ProgressMap,
  StreakData,
  bumpStreak,
  buildReviewSession,
  computeStats,
  migrateFromSavedIds,
  reviewWord,
} from "@/lib/srs";

const STORAGE_KEY = "verb-reader-progress-v2";
const LEGACY_STORAGE_KEY = "verb-reader-progress-v1";
const REVIEW_SIZE = 10;

export default function Home() {
  const [verbs, setVerbs] = useState<VerbItem[]>([]);
  const [practiceWord, setPracticeWord] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<ProgressMap>({});
  const [streak, setStreak] = useState<StreakData>({ count: 0, lastActiveDate: "" });
  const [reviewWords, setReviewWords] = useState<VerbItem[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load progress (migrating the old binary saved/unsaved format if needed).
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { progress?: ProgressMap; streak?: StreakData };
        setProgressMap(parsed.progress ?? {});
        setStreak(bumpStreak(parsed.streak));
        return;
      } catch {
        // fall through to legacy migration
      }
    }

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy) as { savedIds?: number[] };
        setProgressMap(migrateFromSavedIds(parsed.savedIds ?? []));
      } catch {
        setProgressMap({});
      }
    }
    setStreak(bumpStreak(undefined));
  }, []);

  useEffect(() => {
    fetch("/verbs.json")
      .then((res) => res.json())
      .then((data: VerbItem[]) => {
        setVerbs(data);
        setIsLoading(false);
      })
      .catch(() => {
        setVerbs([]);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (isLoading) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ progress: progressMap, streak }));
  }, [progressMap, streak, isLoading]);

  const currentReviewWord = reviewWords[reviewIndex] ?? null;

  const startReview = (count = REVIEW_SIZE) => {
    const session = buildReviewSession(verbs, progressMap, count);
    setReviewWords(session);
    setReviewIndex(0);
    setIsReviewing(true);
  };

  const markReview = (correct: boolean) => {
    if (!currentReviewWord) return;

    setProgressMap((prev) => ({
      ...prev,
      [currentReviewWord.id]: reviewWord(prev[currentReviewWord.id], correct),
    }));

    const nextIndex = reviewIndex + 1;
    if (nextIndex >= reviewWords.length) {
      setIsReviewing(false);
      setReviewIndex(0);
      return;
    }
    setReviewIndex(nextIndex);
  };

  const markKnownFromList = (id: number) => {
    setProgressMap((prev) => ({ ...prev, [id]: reviewWord(prev[id], true) }));
  };

  const stats = useMemo(() => computeStats(verbs, progressMap), [verbs, progressMap]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#eef5ff_0%,_#f8fafc_40%,_#f1f5f9_100%)] text-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-md sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Verb Reader</p>
                {streak.count > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-orange-600">
                    🔥 {streak.count} ngày liên tục
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Ôn từ động từ tiếng Anh</h1>
              <p className="mt-2 max-w-xl text-sm text-slate-600 sm:text-base">
                Học theo card, nghe phát âm thật, luyện nói và ôn lại theo lịch lặp lại ngắt quãng (spaced repetition).
              </p>
              <Link
                href="/translate"
                className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Luyện dịch câu
              </Link>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:min-w-[340px]">
              <div className="rounded-2xl bg-slate-50 p-3 text-center">
                <div className="text-2xl font-black text-slate-900">{stats.total}</div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Từ</div>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3 text-center">
                <div className="text-2xl font-black text-amber-700">{stats.dueCount}</div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-amber-600">Cần ôn</div>
              </div>
              <div className="rounded-2xl bg-sky-50 p-3 text-center">
                <div className="text-2xl font-black text-sky-700">{stats.newCount}</div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-sky-600">Từ mới</div>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 text-center">
                <div className="text-2xl font-black text-emerald-700">{stats.masteredCount}</div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-600">Đã thuộc</div>
              </div>
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(148,163,184,0.18)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Chế độ ôn tập</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Flashcard theo lịch lặp lại</h2>
              </div>
              <button
                onClick={() => startReview(REVIEW_SIZE)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                {stats.dueCount > 0 ? `Ôn ${Math.min(REVIEW_SIZE, stats.dueCount)} từ cần ôn` : "Học từ mới"}
              </button>
            </div>

            {isReviewing && currentReviewWord ? (
              <div className="mt-5 rounded-3xl border border-violet-200 bg-violet-50 p-5">
                <div className="mb-4 flex items-center justify-between text-xs font-medium uppercase tracking-[0.2em] text-violet-600">
                  <span>Card {reviewIndex + 1}</span>
                  <span>{reviewWords.length} từ</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="text-4xl font-black tracking-tight text-slate-900">{currentReviewWord.verb}</div>
                    {currentReviewWord.level && (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-violet-600 shadow-sm">
                        {currentReviewWord.level}
                      </span>
                    )}
                  </div>
                  <div className="text-lg text-violet-700">{currentReviewWord.phonetic ?? "/ˈvɜːb/"}</div>
                  <div className="rounded-2xl bg-white p-4 text-sm text-slate-700 shadow-sm">
                    <p className="font-semibold text-slate-900">Nghĩa:</p>
                    <p className="mt-1">{currentReviewWord.meaning}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 text-sm text-slate-700 shadow-sm">
                    <p className="font-semibold text-slate-900">Ví dụ:</p>
                    <p className="mt-1 italic">“{currentReviewWord.exampleEn}”</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => setPracticeWord(currentReviewWord.verb)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                  >
                    Ghi âm
                  </button>
                  <button
                    onClick={() => markReview(true)}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                  >
                    Đã nhớ
                  </button>
                  <button
                    onClick={() => markReview(false)}
                    className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-400"
                  >
                    Học lại
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                {stats.dueCount > 0
                  ? `Có ${stats.dueCount} từ đã đến lịch ôn lại. Nhấn nút để bắt đầu.`
                  : "Không có từ nào cần ôn hôm nay — nhấn nút để học thêm từ mới."}
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-900 p-5 text-white shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Tổng quan</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-white/5 p-4">
                <div className="text-sm text-slate-300">Chuỗi ngày học liên tục</div>
                <div className="mt-2 text-3xl font-black">🔥 {streak.count}</div>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <div className="text-sm text-slate-300">Đã thuộc / Tổng số</div>
                <div className="mt-2 text-3xl font-black">
                  {stats.masteredCount}/{stats.total}
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <div className="text-sm text-slate-300">Lưu trữ</div>
                <div className="mt-2 text-base font-semibold text-sky-300">localStorage trên máy này</div>
              </div>
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-[0_20px_60px_rgba(148,163,184,0.12)]">
            Đang tải bộ từ có sẵn...
          </div>
        ) : (
          <VerbTable
            data={verbs}
            progressMap={progressMap}
            onMarkKnown={markKnownFromList}
            onPractice={(word) => setPracticeWord(word)}
          />
        )}
      </div>

      {practiceWord && (
        <PronunciationModal
          key={practiceWord}
          word={practiceWord}
          onClose={() => setPracticeWord(null)}
        />
      )}
    </main>
  );
}
