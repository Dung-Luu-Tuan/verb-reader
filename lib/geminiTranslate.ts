import { parseModelJson, readGrade, readSentence, type GradeResult } from "@/lib/translateSession";

const MODEL = "gemini-3.8-flash";

type GeminiPart = { text?: string; thought?: boolean };
type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  error?: { message?: string };
  promptFeedback?: { blockReason?: string };
};

function requireApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Chưa cấu hình GEMINI_API_KEY trên server.");
  }
  return apiKey;
}

async function generateContent(prompt: string): Promise<string> {
  const apiKey = requireApiKey();
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            thinkingConfig: { thinkingLevel: "low" },
            responseMimeType: "application/json",
          },
        }),
      },
    );
  } catch {
    throw new Error("Không gọi được Gemini. Kiểm tra mạng rồi thử lại.");
  }

  let data: GeminiResponse;
  try {
    data = (await response.json()) as GeminiResponse;
  } catch {
    throw new Error("Gemini trả về dữ liệu không đọc được.");
  }

  if (!response.ok) {
    throw new Error(data.error?.message || `Gemini lỗi ${response.status}.`);
  }

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((part) => !part.thought && part.text)
    .map((part) => part.text)
    .join("")
    .trim();

  if (!text) {
    const reason = data.promptFeedback?.blockReason;
    throw new Error(reason ? `Gemini đã chặn yêu cầu (${reason}).` : "Gemini không trả về nội dung. Thử lại.");
  }

  return text;
}

export async function generateVietnameseSentence(
  seed: { verb: string; meaning: string; level?: string; exampleVi: string } | null,
  avoid: string[],
): Promise<string> {
  const avoidList = avoid
    .slice(0, 8)
    .map((sentence) => `- ${sentence}`)
    .join("\n");

  const seedBlock = seed
    ? `Câu phải thể hiện ý của động từ "${seed.verb}" (nghĩa: ${seed.meaning}${seed.level ? `, trình độ ${seed.level}` : ""}).
Không sao chép câu mẫu này: "${seed.exampleVi}".`
    : "Chọn một tình huống đời thường, trình độ khoảng A2–B1.";

  const prompt = `Tạo đúng một câu tiếng Việt tự nhiên, dùng trong đời sống, dài khoảng 8–16 từ, để người học dịch sang tiếng Anh.
${seedBlock}
${avoidList ? `Tránh lặp các câu sau:\n${avoidList}` : ""}
Không viết tiếng Anh. Không giải thích.
Trả về JSON đúng dạng {"vietnamese":"..."}`;

  const text = await generateContent(prompt);
  return readSentence(parseModelJson(text));
}

export async function gradeTranslation(input: {
  vietnamese: string;
  answer: string;
  focusVerb?: string;
  focusMeaning?: string;
}): Promise<GradeResult> {
  const focus = input.focusVerb
    ? `Động từ gợi ý nếu hợp ngữ cảnh: ${input.focusVerb}${input.focusMeaning ? ` (${input.focusMeaning})` : ""}. Cách diễn đạt khác vẫn được nếu đúng nghĩa.`
    : "Không có động từ bắt buộc.";

  const prompt = `Chấm bài dịch từ tiếng Việt sang tiếng Anh của người học.
Câu gốc: ${JSON.stringify(input.vietnamese)}
Bài làm: ${JSON.stringify(input.answer)}
${focus}

Tính là đúng khi giữ được ý chính và ngữ pháp tiếng Anh đọc được. Chấp nhận nhiều cách nói tương đương. Lỗi chính tả rất nhỏ vẫn tính đúng nếu nghĩa rõ.
Trả về JSON đúng dạng {"correct":true,"feedback":"1-2 câu tiếng Việt","suggestion":"một bản dịch tiếng Anh tự nhiên"}.
feedback nói rõ chỗ đúng hoặc chỗ sai. suggestion luôn là một bản dịch tự nhiên, kể cả khi bài đã đúng.`;

  const text = await generateContent(prompt);
  return readGrade(parseModelJson(text));
}
