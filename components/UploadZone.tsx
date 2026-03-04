"use client";

import { useState } from "react";
import type * as PDFJS from "pdfjs-dist";

export default function UploadZone({
  onParsed,
}: {
  onParsed: (text: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleUpload = async (file: File) => {
    setLoading(true);

    const pdfjsLib = (await import(
      "pdfjs-dist/legacy/build/pdf"
    )) as unknown as typeof PDFJS;

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "/pdf.worker.min.js";

      
    const arrayBuffer = await file.arrayBuffer();

    console.log(arrayBuffer);

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
    setLoading(false);
  };

  return (
    <div className="p-6 border-2 border-dashed rounded-xl text-center bg-gray-50">
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) =>
          e.target.files && handleUpload(e.target.files[0])
        }
      />
      {loading && <p className="mt-3">Reading PDF...</p>}
    </div>
  );
}