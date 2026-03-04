"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import VerbTable from "@/components/VerbTable";
import { parsePdfText } from "@/lib/parsePdfText";
import { VerbItem } from "@/types/verb";

const UploadZone = dynamic(
  () => import("@/components/UploadZone"),
  { ssr: false }
);

export default function Home() {
  const [verbs, setVerbs] =
    useState<VerbItem[]>([]);

  const handleParsed = (text: string) => {
    const parsed = parsePdfText(text);
    setVerbs(parsed);
  };

  return (
    <main className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">
        500 Verbs PDF Reader
      </h1>

      <UploadZone onParsed={handleParsed} />

      {verbs.length > 0 && (
        <VerbTable data={verbs} />
      )}
    </main>
  );
}