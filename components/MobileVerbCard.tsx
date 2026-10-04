import { Volume2 } from "lucide-react";
import { VerbItem } from "@/types/verb";
import { WordProgress, isDue, isMastered, isNew } from "@/lib/srs";

interface MobileVerbCardProps {
  item: VerbItem;
  speakingId: number | null;
  progress?: WordProgress;
  onSpeak: (text: string, id: number, audioUrl?: string) => void;
  onMarkKnown: (id: number) => void;
  getPhonetic: (verb: string) => string | undefined;
  onPractice: (word: string) => void;
}

function statusLabel(progress?: WordProgress): { text: string; className: string } {
  if (isNew(progress)) return { text: "Mới", className: "bg-sky-100 text-sky-700" };
  if (isMastered(progress)) return { text: "✓ Đã thuộc", className: "bg-emerald-100 text-emerald-700" };
  if (isDue(progress)) return { text: "Cần ôn hôm nay", className: "bg-amber-100 text-amber-700" };
  return { text: `Hộp ${progress?.box ?? 1}`, className: "bg-slate-100 text-slate-600" };
}

export default function MobileVerbCard({
  item,
  speakingId,
  progress,
  onSpeak,
  onMarkKnown,
  getPhonetic,
  onPractice,
}: MobileVerbCardProps) {
  const phonetic = getPhonetic(item.verb) ?? item.phonetic ?? "/ˈvɜːb/";
  const status = statusLabel(progress);
  const mastered = isMastered(progress);

  return (
    <div
      className={`rounded-[26px] border p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition ${
        speakingId === item.id
          ? "border-amber-300 bg-amber-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Verb</span>
              {item.level && (
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600">
                  {item.level}
                </span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${status.className}`}>
                {status.text}
              </span>
            </div>
            <h2
              onClick={() => onSpeak(item.verb, item.id, item.audioUs)}
              className="cursor-pointer text-2xl font-black text-slate-900"
            >
              {item.verb}
            </h2>
          </div>

          <button
            onClick={() => onSpeak(item.verb, item.id, item.audioUs)}
            className="rounded-xl bg-sky-50 p-2 text-sky-600 transition hover:bg-sky-100"
            aria-label={`Listen to ${item.verb}`}
          >
            <Volume2 size={18} />
          </button>
        </div>

        {phonetic && (
          <div className="text-sm font-medium italic text-slate-500">{phonetic}</div>
        )}

        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Nghĩa</p>
          <p className="mt-2 text-sm font-medium text-slate-700">{item.meaning}</p>
        </div>

        <div
          onClick={() => onSpeak(item.exampleEn, item.id, item.audioUs)}
          className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-sky-200 hover:bg-sky-50"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Ví dụ</p>
          <p className="mt-2 text-sm font-medium text-slate-800">{item.exampleEn}</p>
          {item.exampleVi && (
            <p className="mt-2 text-xs text-slate-500">{item.exampleVi}</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onPractice(item.verb)}
            className="flex-1 rounded-xl bg-violet-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            🎤 Ghi âm
          </button>
          <button
            onClick={() => onMarkKnown(item.id)}
            className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              mastered
                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {mastered ? "✓ Đã thuộc" : "+ Đã nhớ"}
          </button>
        </div>
      </div>
    </div>
  );
}
