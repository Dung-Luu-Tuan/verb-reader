'use client';

import { useState, useMemo, useEffect } from 'react';
import { VerbItem } from '@/types/verb';

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

export default function VerbTable({ data }: { data: VerbItem[] }) {
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
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            🔍
          </span>

          <input
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition"
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
            className="w-full py-2 px-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition appearance-none"
          >
            <option value="">All letters</option>
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => (
              <option key={letter}>{letter}</option>
            ))}
          </select>

          {/* Dropdown icon */}
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            ▼
          </span>
        </div>
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block overflow-auto max-h-[600px] border rounded-2xl shadow-sm custom-scrollbar">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 sticky top-0 text-gray-700">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Verb</th>
              <th className="p-3 text-left">Phonetic</th>
              <th className="p-3 text-left">Meaning</th>
              <th className="p-3 text-left">Example (EN)</th>
              <th className="p-3 text-left">Example (VI)</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((item) => (
              <tr
                key={item.id}
                className={`border-t hover:bg-gray-50 transition ${
                  speakingId === item.id ? 'bg-yellow-100' : ''
                }`}
              >
                <td className="p-3">{item.id}</td>

                <td
                  className="p-3 text-blue-600 font-medium cursor-pointer hover:underline"
                  onClick={() => speak(item.verb, item.id)}
                >
                  🔊 {item.verb}
                </td>

                <td className="p-3 text-gray-500">
                  {getPhoneticForVerb(item.verb) ?? item.phonetic ?? ''}
                </td>

                <td className="p-3 text-gray-700">{item.meaning}</td>

                <td
                  className="p-3 text-green-600 cursor-pointer hover:underline"
                  onClick={() => speak(item.exampleEn, item.id)}
                >
                  🔊 {item.exampleEn}
                </td>

                <td className="p-3 text-gray-600">{item.exampleVi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 py-3">
          <p className="text-sm text-gray-600">
            Showing {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filtered.length)} / {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
                      {showEllipsis && <span className="px-1 text-gray-400">…</span>}
                      <button
                        onClick={() => goToPage(p)}
                        className={`min-w-8 px-2 py-1.5 rounded-lg text-sm font-medium transition ${
                          currentPage === p
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
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
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
             →
            </button>
          </div>
        </div>
      )}

      {/* MOBILE CARD VIEW */}
      <div className="md:hidden space-y-4">
        {paginated.map((item) => (
          <div
            key={item.id}
            className={`relative rounded-2xl border p-4 shadow-sm transition-all ${
              speakingId === item.id
                ? 'bg-yellow-50 border-yellow-300'
                : 'bg-white border-gray-200'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-400">
                Verb #{item.id}
              </span>

              <button
                onClick={() => speak(item.verb, item.id)}
                className="flex items-center gap-1 text-blue-600 font-semibold hover:text-blue-700"
              >
                🔊
              </button>
            </div>

            {/* Verb */}
            <div
              onClick={() => speak(item.verb, item.id)}
              className="text-xl font-bold text-blue-600 cursor-pointer mb-1"
            >
              {item.verb}
            </div>

            {/* Phonetic */}
            {(getPhoneticForVerb(item.verb) ?? item.phonetic) && (
              <div className="text-sm text-gray-500 mb-2">
                {getPhoneticForVerb(item.verb) ?? item.phonetic}
              </div>
            )}

            {/* Meaning */}
            <div className="text-gray-700 mb-3 leading-relaxed">
              {item.meaning}
            </div>

            {/* Example EN */}
            <div
              onClick={() => speak(item.exampleEn, item.id)}
              className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-2 cursor-pointer hover:bg-blue-100 transition"
            >
              <p className="text-xs text-blue-500 mb-1 font-medium">Example</p>

              <p className="text-blue-800 font-medium">🔊 {item.exampleEn}</p>
            </div>

            {/* Example VI */}
            {item.exampleVi && (
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1 font-medium">
                  Translation
                </p>

                <p className="text-gray-700">{item.exampleVi}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
