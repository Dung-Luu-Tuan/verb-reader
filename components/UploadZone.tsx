'use client';

import { useState } from 'react';
import type * as PDFJS from 'pdfjs-dist';

export default function UploadZone({
  onParsed,
}: {
  onParsed: (text: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const loadPdfFromBuffer = async (arrayBuffer: ArrayBuffer) => {
    const pdfjsLib =
      (await import('pdfjs-dist/legacy/build/pdf')) as unknown as typeof PDFJS;

    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
    }).promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      const strings = content.items.map((item: any) => item.str);

      fullText += strings.join(' ') + '\n';
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

    const response = await fetch('/500_Verbs_Full_Final.pdf');
    const buffer = await response.arrayBuffer();

    await loadPdfFromBuffer(buffer);
    setLoading(false);
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-200/60 dark:border-slate-800 p-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Get Started
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Select a data source to begin
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          {/* Upload PDF */}
          <label className="group relative flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] cursor-pointer">
            <span>Upload PDF</span>

            <input
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) =>
                e.target.files && handleUpload(e.target.files[0])
              }
            />
          </label>

          {/* Built-in PDF */}
          <button
            onClick={handleUseBuiltIn}
            className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all active:scale-[0.98]"
          >
            <span>Use Demo Data</span>
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <p className="mt-6 text-center text-sm text-slate-500 animate-pulse">
            ⏳ Reading PDF...
          </p>
        )}
      </div>
    </div>
  );
}
