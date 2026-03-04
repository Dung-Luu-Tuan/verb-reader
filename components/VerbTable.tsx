"use client";

import { useState, useMemo } from "react";
import { VerbItem } from "@/types/verb";

export default function VerbTable({
  data,
}: {
  data: VerbItem[];
}) {
  const [search, setSearch] = useState("");
  const [alphabet, setAlphabet] = useState("");
  const [speakingId, setSpeakingId] =
    useState<number | null>(null);

  const speak = (text: string, id: number) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.onend = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const filtered = useMemo(() => {
    return data.filter((item) => {
      const matchSearch =
        item.verb
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchAlphabet = alphabet
        ? item.verb
            .toUpperCase()
            .startsWith(alphabet)
        : true;

      return matchSearch && matchAlphabet;
    });
  }, [data, search, alphabet]);

  return (
    <div className="mt-6 sm:mt-8 -mx-4 px-4 sm:mx-0 sm:px-0">
      {/* FILTER BAR */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          className="border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition p-2 rounded-lg w-full sm:w-60"
          placeholder="🔍 Search verb..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition p-2 rounded-lg w-full sm:w-40"
          value={alphabet}
          onChange={(e) =>
            setAlphabet(e.target.value)
          }
        >
          <option value="">All</option>
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ"
            .split("")
            .map((letter) => (
              <option key={letter}>
                {letter}
              </option>
            ))}
        </select>
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block overflow-auto max-h-[600px] border rounded-2xl shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 sticky top-0 text-gray-700">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">
                Verb
              </th>
              <th className="p-3 text-left">
                Meaning
              </th>
              <th className="p-3 text-left">
                Example (EN)
              </th>
              <th className="p-3 text-left">
                Example (VI)
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr
                key={item.id}
                className={`border-t hover:bg-gray-50 transition ${
                  speakingId === item.id
                    ? "bg-yellow-100"
                    : ""
                }`}
              >
                <td className="p-3">
                  {item.id}
                </td>

                <td
                  className="p-3 text-blue-600 font-medium cursor-pointer hover:underline"
                  onClick={() =>
                    speak(item.verb, item.id)
                  }
                >
                  🔊 {item.verb}
                </td>

                <td className="p-3 text-gray-700">
                  {item.meaning}
                </td>

                <td
                  className="p-3 text-green-600 cursor-pointer hover:underline"
                  onClick={() =>
                    speak(
                      item.exampleEn,
                      item.id
                    )
                  }
                >
                  🔊 {item.exampleEn}
                </td>

                <td className="p-3 text-gray-600">
                  {item.exampleVi}
                </td>
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
            className={`border rounded-xl p-4 shadow-sm transition ${
              speakingId === item.id
                ? "bg-yellow-50"
                : "bg-white"
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">
                #{item.id}
              </span>

              <span
                className="text-blue-600 font-semibold cursor-pointer"
                onClick={() =>
                  speak(item.verb, item.id)
                }
              >
                🔊 {item.verb}
              </span>
            </div>

            <p className="text-gray-700 mb-2">
              {item.meaning}
            </p>

            <p
              className="text-green-600 cursor-pointer mb-1"
              onClick={() =>
                speak(
                  item.exampleEn,
                  item.id
                )
              }
            >
              🔊 {item.exampleEn}
            </p>

            <p className="text-gray-600 text-sm">
              {item.exampleVi}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}