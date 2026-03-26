'use client';

import { VerbItem } from '@/types/verb';
import { useEffect, useMemo, useState } from 'react';
import MobileVerbCard from './MobileVerbCard';
import { useAuth } from '@/lib/AuthContext';
import { useApi } from '@/lib/useApi';
import Pagination from './Pagination';

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
  onRemove?: (verb: string) => void;
}

export default function VerbTable({ data, onPractice, onRemove }: Props) {
  const [search, setSearch] = useState('');
  const [alphabet, setAlphabet] = useState('');
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [phoneticMap, setPhoneticMap] = useState<Record<string, string>>({});
  const { accessToken } = useAuth();
  const [savedVerbs, setSavedVerbs] = useState<Set<string>>(new Set());

  const api = useApi();

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

  const handleSave = async (item: VerbItem) => {
    if (!accessToken) return;

    const isSaved = savedVerbs.has(item.verb);

    if (isSaved) {
      await api.savedVerbs.remove(item.verb);
      setSavedVerbs(prev => { const s = new Set(prev); s.delete(item.verb); return s; });
      onRemove?.(item.verb);
    } else {
      await api.savedVerbs.save(item);
      setSavedVerbs(prev => new Set(prev).add(item.verb));
    }
  };

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

  useEffect(() => {
    if (!accessToken) return;
    api.savedVerbs.getAll().then((data) => {
      setSavedVerbs(new Set((data as VerbItem[]).map((v) => v.verb)));
    });
  }, [accessToken]);

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
      <div className="hidden md:block overflow-auto max-h-[650px] border border-gray-300 dark:border-gray-600 rounded-2xl shadow-sm custom-scrollbar">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 text-gray-700 dark:text-gray-300">
            <tr>
              <th className="p-2 text-left">#</th>
              <th className="p-3 text-left">Verb</th>
              <th className="p-3 text-left">Phonetic</th>
              <th className="p-3 text-left">Meaning</th>
              <th className="p-3 text-left">Example (EN)</th>
              <th className="p-3 text-left">Example (VI)</th>
              <th className="p-3 text-center">Practice</th>
              {accessToken && <th className="p-3 text-center">Save</th>}
            </tr>
          </thead>
          <tbody>
            {paginated.map((item, index) => (
              <tr
                key={item.id}
                className={`border-t hover:bg-gray-50 dark:hover:bg-gray-700 transition ${speakingId === item.id ? 'bg-yellow-100 dark:bg-yellow-400' : ''
                  }`}
              >
                <td className="p-2">{(index + 1) + (page - 1) * PAGE_SIZE}</td>

                <td
                  className="p-3 text-blue-600 dark:text-blue-400 font-medium cursor-pointer hover:underline text-nowrap"
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
                {accessToken && (
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleSave(item)}
                      className="px-2 py-1 text-sm rounded-lg transition"
                      title={savedVerbs.has(item.verb) ? 'Unsave' : 'Save'}
                    >
                      {savedVerbs.has(item.verb) ? '🔖' : '🤍'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={goToPage}
      />

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
