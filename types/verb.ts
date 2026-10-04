export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface VerbItem {
  id: number;
  verb: string;
  phonetic?: string;
  meaning: string;
  exampleEn: string;
  exampleVi: string;
  category?: string;
  level?: CefrLevel;
  /** Real human-recorded pronunciation audio, when available. */
  audioUs?: string;
  audioUk?: string;
}
