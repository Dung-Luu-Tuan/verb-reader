import { Volume2 } from "lucide-react";
import { VerbItem } from "@/types/verb";

interface MobileVerbCardProps {
  item: VerbItem;
  speakingId: number | null;
  onSpeak: (text: string, id: number) => void;
  getPhonetic: (verb: string) => string | undefined;
  onPractice: (word: string) => void
}

export default function MobileVerbCard({
  item,
  speakingId,
  onSpeak,
  getPhonetic,
  onPractice,
}: MobileVerbCardProps) {
  const phonetic = getPhonetic(item.verb) ?? item.phonetic;

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition
      ${
        speakingId === item.id
          ? "bg-yellow-50 border-yellow-300"
          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      }`}
    >
      <div className="space-y-3">
        {/* Verb */}
        <div className="flex items-center justify-between">
          <h2
            onClick={() => onSpeak(item.verb, item.id)}
            className="text-xl font-bold text-blue-600 dark:text-blue-400 cursor-pointer"
          >
            {item.verb}
          </h2>

          <button
            onClick={() => onSpeak(item.verb, item.id)}
            className="text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition"
          >
            <Volume2 size={20} />
          </button>
        </div>

        {/* Phonetic */}
        {phonetic && (
          <div className="text-sm text-gray-500 dark:text-gray-400 italic">
            {phonetic}
          </div>
        )}

        {/* Meaning */}
        <div className="text-gray-700 dark:text-gray-300 text-sm">
          {item.meaning}
        </div>

        {/* Example */}
        <div
          onClick={() => onSpeak(item.exampleEn, item.id)}
          className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition"
        >
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {item.exampleEn}
          </p>

          {item.exampleVi && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {item.exampleVi}
            </p>
          )}
        </div>

        {/* Practice Button */}
        <button
          onClick={() => onPractice(item.verb)}
          className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          🎤 Practice
        </button>
      </div>
    </div>
  );
}