'use client';

import { useState } from 'react';
import type * as PDFJS from 'pdfjs-dist';
import { useAuth } from '@/lib/AuthContext';
import { VerbItem } from '@/types/verb';
import { useApi } from '@/lib/useApi';

export default function UploadZone({
  onParsed,
  onLoadSaved
}: {
  onParsed: (text: string) => void;
  onLoadSaved: (verbs: VerbItem[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const { accessToken } = useAuth();
  const api = useApi()

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

  const handleLoadSaved = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await api.savedVerbs.getAll();
      onLoadSaved(data);
    } catch (err) {
      console.error('Failed to load saved verbs:', err);
    } finally {
      setLoading(false);
    }
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
        {/* Buttons */}
        <div className="flex flex-col gap-3">
          {/* Upload PDF */}
          <label className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-xl hover:opacity-90 transition-all active:scale-[0.98] cursor-pointer">
            <span>📄 Upload PDF</span>
            <input
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
            />
          </label>

          {/* Demo Data */}
          <button
            onClick={handleUseBuiltIn}
            className="flex items-center justify-center gap-2 w-full px-6 py-3.5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-[0.98]"
          >
            <span>🗂 Demo Data</span>
          </button>

          {/* My Saved Words */}
          {accessToken && (
            <button
              onClick={handleLoadSaved}
              className="flex items-center justify-center gap-2 w-full px-6 py-3.5 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-medium rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all active:scale-[0.98]"
            >
              <span>🔖 My Saved Words</span>
            </button>
          )}
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
