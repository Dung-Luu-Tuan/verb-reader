'use client';

import { useState, useMemo } from 'react';
import { VerbItem } from '@/types/verb';

export default function VerbTable({ data }: { data: VerbItem[] }) {
  const [search, setSearch] = useState('');
  const [alphabet, setAlphabet] = useState('');
  const [speakingId, setSpeakingId] = useState<number | null>(null);

  const speak = (text: string, id: number) => {
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
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Alphabet filter */}
        <div className="relative w-full sm:w-40">
          <select
            value={alphabet}
            onChange={(e) => setAlphabet(e.target.value)}
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
      <div className="hidden md:block overflow-auto max-h-[600px] border rounded-2xl shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 sticky top-0 text-gray-700">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Verb</th>
              <th className="p-3 text-left">Meaning</th>
              <th className="p-3 text-left">Example (EN)</th>
              <th className="p-3 text-left">Example (VI)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
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

      {/* MOBILE CARD VIEW */}
      <div className="md:hidden space-y-4">
        {filtered.map((item) => (
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
              className="text-xl font-bold text-blue-600 cursor-pointer mb-2"
            >
              {item.verb}
            </div>

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
