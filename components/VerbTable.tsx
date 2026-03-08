'use client';

import { VerbItem } from '@/types/verb';
import { useEffect, useMemo, useState } from 'react';
import MobileVerbCard from './MobileVerbCard';

const PAGE_SIZE = 10;

interface FullWordEntry {
  value?: {
    word?: string;
    phonetics?: {
      us?: string;
      uk?: string;
    };
  };
}

interface Props {
  data: VerbItem[];
  onPractice: (word: string) => void;
}

export default function VerbTable({ data, onPractice }: Props) {
  const [search, setSearch] = useState('');
  const [alphabet, setAlphabet] = useState('');
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [phoneticMap, setPhoneticMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const loadDictionary = async () => {
      try {
        const res = await fetch('/full-word.json');
        if (!res.ok) return;

        const json = (await res.json()) as FullWordEntry[];
        if (cancelled) return;

        const map: Record<string, string> = {};
        for (const entry of json) {
          const word = entry?.value?.word;
          if (!word) continue;

          const phonUS = entry.value?.phonetics?.us;
          const phonUK = entry.value?.phonetics?.uk;
          const phon = phonUS || phonUK;
          if (!phon) continue;

          map[word.toLowerCase()] = phon;
        }

        setPhoneticMap(map);
      } catch {
        // ignore errors; phonetic column will just be empty
      }
    };

    void loadDictionary();

    return () => {
      cancelled = true;
    };
  }, []);

  const getPhoneticForVerb = (verb: string): string | undefined => {
    const base = verb.split(' ')[0]?.toLowerCase();
    if (!base) return undefined;
    return phoneticMap[base];
  };

  const speak = async (text: string, id: number) => {
    if (typeof window === 'undefined') return;

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
    } catch (err) {
      // Fallback to Web Speech API below
      console.error('Capacitor TTS error', err);
    }

    const hasSpeechApi =
      'speechSynthesis' in window &&
      typeof SpeechSynthesisUtterance !== 'undefined';

    if (!hasSpeechApi) {
      alert('This device or browser does not support text-to-speech.');
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
      const matchSearch = item.verb
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchAlphabet = alphabet
        ? item.verb.toUpperCase().startsWith(alphabet)
        : true;

      return matchSearch && matchAlphabet;
    });
  }, [data, search, alphabet]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const paginated = useMemo(() => {
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page, totalPages]);

  const goToPage = (p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
  };

  const currentPage = Math.min(page, totalPages);

  return (
    <div className="mt-6 sm:mt-8 -mx-4 px-4 sm:mx-0 sm:px-0">
      {/* FILTER BAR */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">
            🔍
          </span>

          <input
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 focus:border-blue-500 dark:focus:border-blue-400 transition"
            placeholder="Search verb..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Alphabet filter */}
        <div className="relative w-full sm:w-40">
          <select
            value={alphabet}
            onChange={(e) => {
              setAlphabet(e.target.value);
              setPage(1);
            }}
            className="w-full py-2 px-3 rounded-xl border border-gray-300 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 focus:border-blue-500 dark:focus:border-blue-400 transition appearance-none"
          >
            <option value="">All letters</option>
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => (
              <option key={letter}>{letter}</option>
            ))}
          </select>

          {/* Dropdown icon */}
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            ▼
          </span>
        </div>
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block overflow-auto max-h-[600px] border border-gray-300 dark:border-gray-600 rounded-2xl shadow-sm custom-scrollbar">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 text-gray-700 dark:text-gray-300">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Verb</th>
              <th className="p-3 text-left">Phonetic</th>
              <th className="p-3 text-left">Meaning</th>
              <th className="p-3 text-left">Example (EN)</th>
              <th className="p-3 text-left">Example (VI)</th>
              <th className="p-3 text-center">Practice</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((item) => (
              <tr
                key={item.id}
                className={`border-t hover:bg-gray-50 dark:hover:bg-gray-700 transition ${speakingId === item.id ? 'bg-yellow-100 dark:bg-yellow-400' : ''
                  }`}
              >
                <td className="p-3">{item.id}</td>

                <td
                  className="p-3 text-blue-600 dark:text-blue-400 font-medium cursor-pointer hover:underline"
                  onClick={() => speak(item.verb, item.id)}
                >
                  🔊 {item.verb}
                </td>

                <td className="p-3 text-gray-500 dark:text-gray-400">
                  {getPhoneticForVerb(item.verb) ?? item.phonetic ?? ''}
                </td>

                <td className="p-3 text-gray-700 dark:text-gray-300">{item.meaning}</td>

                <td
                  className="p-3 text-green-600 dark:text-green-400 cursor-pointer hover:underline"
                  onClick={() => speak(item.exampleEn, item.id)}
                >
                  🔊 {item.exampleEn}
                </td>

                <td className="p-3 text-gray-600 dark:text-gray-400">{item.exampleVi}</td>

                <td className="p-3 text-center">
                  <button
                    onClick={() => onPractice(item.verb)}
                    className="px-2 py-1 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition"
                  >
                    🎤
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 py-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filtered.length)} / {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              ←
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (totalPages <= 7) return true;
                  if (p === 1 || p === totalPages) return true;
                  if (Math.abs(p - currentPage) <= 1) return true;
                  return false;
                })
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev !== undefined && p - prev > 1;
                  return (
                    <span key={p} className="flex items-center gap-1">
                      {showEllipsis && <span className="px-1 text-gray-400 dark:text-gray-500">…</span>}
                      <button
                        onClick={() => goToPage(p)}
                        className={`min-w-8 px-2 py-1.5 rounded-lg text-sm font-medium transition ${currentPage === p
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                      >
                        {p}
                      </button>
                    </span>
                  );
                })}
            </div>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* MOBILE CARD VIEW */}
      <div className="md:hidden space-y-4">
        {paginated.map((item) => (
          <MobileVerbCard
            key={item.id}
            item={item}
            speakingId={speakingId}
            onSpeak={speak}
            getPhonetic={getPhoneticForVerb}
            onPractice={onPractice}
          />
        ))}
      </div>
    </div>
  );
}
