"use client";

import { useState } from "react";
import type * as PDFJS from "pdfjs-dist";

export default function UploadZone({
  onParsed,
}: {
  onParsed: (text: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const loadPdfFromBuffer = async (
    arrayBuffer: ArrayBuffer
  ) => {
    const pdfjsLib = (await import(
      "pdfjs-dist/legacy/build/pdf"
    )) as unknown as typeof PDFJS;

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "/pdf.worker.min.js";

    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
    }).promise;

    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      const strings = content.items.map(
        (item: any) => item.str
      );

      fullText += strings.join(" ") + "\n";
    }

    onParsed(fullText);
  };

  const handleUpload = async (file: File) => {
    setLoading(true);
    const buffer = await file.arrayBuffer();
    await loadPdfFromBuffer(buffer);
    setLoading(false);
  };

  const handleUseBuiltIn = async () => {
    setLoading(true);

    const response = await fetch(
      "/500_Verbs_Full_Final.pdf"
    );
    const buffer = await response.arrayBuffer();

    await loadPdfFromBuffer(buffer);
    setLoading(false);
  };

  return (
    <div className="p-6 border-2 border-dashed rounded-2xl text-center bg-gray-50 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">
        Import PDF
      </h2>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {/* Built-in file button */}
        <button
          onClick={handleUseBuiltIn}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl transition shadow"
        >
          📘 Use 500_Verbs_Full_Final.pdf
        </button>

        {/* Upload button */}
        <label className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl cursor-pointer transition shadow">
          📤 Upload PDF
          <input
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) =>
              e.target.files &&
              handleUpload(e.target.files[0])
            }
          />
        </label>
      </div>

      {loading && (
        <p className="mt-4 text-gray-600 animate-pulse">
          ⏳ Reading PDF...
        </p>
      )}
    </div>
  );
}