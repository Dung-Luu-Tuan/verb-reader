"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import VerbTable from "@/components/VerbTable";
import PronunciationModal from "@/components/PronunciationModal";
import { parsePdfText } from "@/lib/parsePdfText";
import { VerbItem } from "@/types/verb";
import { useAuth } from "@/lib/AuthContext";
import { useApi } from "@/lib/useApi";

const UploadZone = dynamic(
  () => import("@/components/UploadZone"),
  { ssr: false }
);

export default function Home() {
  const [verbs, setVerbs] = useState<VerbItem[]>([]);
  const [practiceWord, setPracticeWord] = useState<string | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const { user, logout } = useAuth();
  const api = useApi();

  const handleParsed = (text: string) => {
    const parsed = parsePdfText(text);
    setVerbs(parsed);
  };

  const handleLogout = async () => {
    await api.auth.logout();
    logout();
  };

  return (
    <main className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">500 Verbs PDF Reader</h1>

        {user ? (
          <div
            className="relative px-3 py-2 -mx-3 -my-2"
            onMouseEnter={() => setShowLogout(true)}
            onMouseLeave={() => setShowLogout(false)}
          >
            <span className="text-sm text-gray-600 cursor-pointer">
              {user.email}
            </span>
            {showLogout && (
              <button
                onClick={handleLogout}
                className="absolute right-0 top-8 bg-white border border-gray-100 text-sm text-gray-500 px-4 py-2 rounded-lg shadow-sm hover:text-gray-700 hover:bg-gray-100 whitespace-nowrap transition-colors"
              >
                Sign out
              </button>
            )}
          </div>
        ) : (
          <a
            href="/login"
            className="text-sm text-blue-600 hover:underline"
          >
            Sign in
          </a>
        )}
      </div>

      <UploadZone
        onParsed={handleParsed}
        onLoadSaved={(verbs) => setVerbs(verbs)}
      />

      {verbs.length > 0 && (
        <VerbTable
          data={verbs}
          onPractice={(word) => setPracticeWord(word)}
          onRemove={(verb) => setVerbs(prev => prev.filter(v => v.verb !== verb))}
        />
      )}

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
