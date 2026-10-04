'use client';

import { VerbItem } from '@/types/verb';
import { ProgressMap, isDue, isMastered, isNew } from '@/lib/srs';
import { useMemo, useState } from 'react';
import MobileVerbCard from './MobileVerbCard';

const PAGE_SIZE = 8;

type Filter = 'all' | 'due' | 'new' | 'mastered';

interface Props {
  data: VerbItem[];
  progressMap: ProgressMap;
  onMarkKnown: (id: number) => void;
  onPractice: (word: string) => void;
}

export default function VerbTable({ data, progressMap, onMarkKnown, onPractice }: Props) {
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<Filter>('all');
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const speak = async (text: string, id: number, audioUrl?: string) => {
    if (typeof window === 'undefined') return;

    // Prefer a real human-recorded pronunciation clip when we have one.
    if (audioUrl) {
      try {
        setSpeakingId(id);
        const audio = new Audio(audioUrl);
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error('audio-failed'));
          audio.play().catch(reject);
        });
        setSpeakingId(null);
        return;
      } catch {
        // fall through to TTS below
      }
    }

    try {
      const [{ Capacitor }, { TextToSpeech }] = await Promise.all([
        import('@capacitor/core'),
        import('@capacitor-community/text-to-speech'),
      ]);

      if (Capacitor.isNativePlatform?.()) {
        setSpeakingId(id);
        await TextToSpeech.speak({
          text,
          lang: 'en-US',
          rate: 0.9,
          pitch: 1.0,
          volume: 1.0,
          category: 'ambient',
        });
        setSpeakingId(null);
        return;
      }
    } catch {
      // Web fallback below
    }

    const hasSpeechApi = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
    if (!hasSpeechApi) {
      alert('Thiết bị không hỗ trợ phát âm Web Speech API.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.onend = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const filtered = useMemo(() => {
    return data.filter((item) => {
      const searchMatch =
        item.verb.toLowerCase().includes(search.toLowerCase()) ||
        item.meaning.toLowerCase().includes(search.toLowerCase());

      const progress = progressMap[item.id];
      const filterMatch =
        selectedFilter === 'all'
          ? true
          : selectedFilter === 'due'
            ? isDue(progress) && !isNew(progress)
            : selectedFilter === 'new'
              ? isNew(progress)
              : isMastered(progress);

      return searchMatch && filterMatch;
    });
  }, [data, progressMap, search, selectedFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const goToPage = (nextPage: number) => {
    setPage(Math.max(1, Math.min(nextPage, totalPages)));
  };

  const getPhoneticForVerb = (verb: string) => {
    const entry = data.find((item) => item.verb.toLowerCase() === verb.toLowerCase());
    return entry?.phonetic ?? undefined;
  };

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'due', label: 'Cần ôn' },
    { key: 'new', label: 'Từ mới' },
    { key: 'mastered', label: 'Đã thuộc' },
  ];

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white/80 p-4 shadow-[0_20px_60px_rgba(148,163,184,0.14)] backdrop-blur-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Danh sách từ</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">Bộ từ có sẵn</h2>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm từ hoặc nghĩa..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white sm:w-64"
          />

          <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1">
            {filters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => {
                  setSelectedFilter(filter.key);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                  selectedFilter === filter.key
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {paginated.map((item) => (
          <MobileVerbCard
            key={item.id}
            item={item}
            speakingId={speakingId}
            progress={progressMap[item.id]}
            onSpeak={speak}
            onMarkKnown={onMarkKnown}
            getPhonetic={getPhoneticForVerb}
            onPractice={onPractice}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
          <p className="text-sm text-slate-600">
            Hiển thị {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filtered.length)} / {filtered.length}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trước
            </button>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
