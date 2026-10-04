import type { GradeResult } from "@/lib/translateSession";

type Seed = { verb: string; meaning: string; level?: string; exampleVi: string } | null;

async function postTranslate<T>(body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Không gọi được máy chủ. Kiểm tra mạng rồi thử lại.");
  }

  const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(data?.error || "Không gọi được Gemini.");
  }
  if (!data) {
    throw new Error("Máy chủ trả về dữ liệu không đọc được.");
  }
  return data;
}

export async function generateVietnameseSentence(seed: Seed, avoid: string[]): Promise<string> {
  const data = await postTranslate<{ vietnamese?: string }>({ action: "generate", seed, avoid });
  if (!data.vietnamese?.trim()) {
    throw new Error("Gemini không trả về câu tiếng Việt.");
  }
  return data.vietnamese.trim();
}

export async function gradeTranslation(input: {
  vietnamese: string;
  answer: string;
  focusVerb?: string;
  focusMeaning?: string;
}): Promise<GradeResult> {
  const data = await postTranslate<Partial<GradeResult>>({ action: "grade", ...input });
  if (typeof data.correct !== "boolean") {
    throw new Error("Gemini không trả về kết quả chấm.");
  }
  return {
    correct: data.correct,
    feedback: typeof data.feedback === "string" ? data.feedback : "",
    suggestion: typeof data.suggestion === "string" ? data.suggestion : "",
  };
}
