import { VerbItem } from "@/types/verb";

export function parsePdfText(text: string): VerbItem[] {
  const result: VerbItem[] = [];

  const regex =
    /(\d+)\s+([A-Z][a-zA-Z\s-]+?)\s+(.+?)\s+([A-Z][^.]*?\.)\s+(.+?)(?=\n?\d+\s+[A-Z]|$)/gs;

  let match;

  while ((match = regex.exec(text)) !== null) {
    result.push({
      id: Number(match[1]),
      verb: match[2].trim(),
      meaning: match[3].trim(),
      exampleEn: match[4].trim(),
      exampleVi: match[5].trim(),
    });
  }

  return result;
}
