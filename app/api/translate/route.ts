import { generateVietnameseSentence, gradeTranslation } from "@/lib/geminiTranslate";
import { NextResponse } from "next/server";

type Seed = { verb: string; meaning: string; level?: string; exampleVi: string };

function asSeed(value: unknown): Seed | null {
  if (!value || typeof value !== "object") return null;
  const seed = value as Partial<Seed>;
  if (typeof seed.verb !== "string" || typeof seed.meaning !== "string" || typeof seed.exampleVi !== "string") {
    return null;
  }
  return {
    verb: seed.verb.slice(0, 80),
    meaning: seed.meaning.slice(0, 160),
    level: typeof seed.level === "string" ? seed.level.slice(0, 8) : undefined,
    exampleVi: seed.exampleVi.slice(0, 400),
  };
}

function asAvoid(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").slice(0, 8).map((item) => item.slice(0, 400));
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const payload = body as {
    action?: unknown;
    seed?: unknown;
    avoid?: unknown;
    vietnamese?: unknown;
    answer?: unknown;
    focusVerb?: unknown;
    focusMeaning?: unknown;
  };

  try {
    if (payload.action === "generate") {
      const vietnamese = await generateVietnameseSentence(asSeed(payload.seed), asAvoid(payload.avoid));
      return NextResponse.json({ vietnamese });
    }

    if (payload.action === "grade") {
      if (typeof payload.vietnamese !== "string" || typeof payload.answer !== "string") {
        return NextResponse.json({ error: "Thiếu câu gốc hoặc bài làm." }, { status: 400 });
      }
      const grade = await gradeTranslation({
        vietnamese: payload.vietnamese.slice(0, 500),
        answer: payload.answer.slice(0, 1000),
        focusVerb: typeof payload.focusVerb === "string" ? payload.focusVerb.slice(0, 80) : undefined,
        focusMeaning: typeof payload.focusMeaning === "string" ? payload.focusMeaning.slice(0, 160) : undefined,
      });
      return NextResponse.json(grade);
    }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Không gọi được Gemini.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
