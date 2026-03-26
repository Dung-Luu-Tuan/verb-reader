'use client';

import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { Capacitor } from '@capacitor/core';
import { Loader2, Mic, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Portal from './Portal';

interface Props {
  word: string;
  onClose: () => void;
}

export default function PronunciationModal({ word, onClose }: Props) {
  const [spoken, setSpoken] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [listening, setListening] = useState(false);

  const listeningRef = useRef(false); // web only
  const recognitionRef = useRef<any>(null);

  // Lock scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Xin permission 1 lần khi mount
  useEffect(() => {
    if (Capacitor.getPlatform() === 'web') return;
    SpeechRecognition.requestPermissions().catch(() => { });
  }, []);

  const stopRecognition = () => {
    // Web
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch { }
      recognitionRef.current = null;
    }
    // Mobile
    if (Capacitor.getPlatform() !== 'web') {
      SpeechRecognition.stop().catch(() => { });
    }
    listeningRef.current = false;
    setListening(false);
  };

  const handleClose = () => {
    stopRecognition();
    onClose();
  };

  // ─── MOBILE ──────────────────────────────────────────────────────────────────
  const startMobile = async () => {
    const permission = await SpeechRecognition.checkPermissions();
    if (permission.speechRecognition !== 'granted') {
      const req = await SpeechRecognition.requestPermissions();
      if (req.speechRecognition !== 'granted') {
        alert('Microphone permission denied');
        setListening(false);
        return;
      }
    }

    // Dọn session cũ
    try { await SpeechRecognition.stop(); } catch { }
    await new Promise((r) => setTimeout(r, 300));

    let transcript = '';
    try {
      // await trực tiếp — finally đảm bảo luôn dừng
      const result = await Promise.race([
        SpeechRecognition.start({
          language: 'en-US',
          maxResults: 1,
          partialResults: false,
          popup: false,
        }),
        // Tự hủy sau 7s nếu native không trả về
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), 7000)
        ),
      ]);
      transcript = (result as any)?.matches?.[0]?.toLowerCase().trim() || '';
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.log('Mobile speech result:', msg);
      // TIMEOUT → dọn native
      if (msg === 'TIMEOUT') {
        try { await SpeechRecognition.stop(); } catch { }
      }
    } finally {
      // LUÔN LUÔN chạy — không quan tâm lỗi gì
      setListening(false);
    }

    if (transcript) {
      setSpoken(transcript);
      setScore(transcript === word.toLowerCase() ? 100 : 0);
    }
  };

  // ─── WEB ─────────────────────────────────────────────────────────────────────
  const startWeb = async () => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert('Speech recognition not supported');
      setListening(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      alert('Microphone permission denied');
      setListening(false);
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch { }
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const r = event.results[0][0];
      const transcript = r.transcript.toLowerCase().trim();
      setSpoken(transcript);
      setScore(transcript === word.toLowerCase() ? Math.round((r.confidence ?? 0) * 100) : 0);
      recognitionRef.current = null;
      setListening(false);
    };

    recognition.onerror = (event: any) => {
      console.log('Web speech error:', event.error);
      if (event.error === 'not-allowed') alert('Microphone permission denied');
      recognitionRef.current = null;
      setListening(false);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };

    setTimeout(() => {
      try { recognition.start(); } catch (err) {
        console.log('Start error:', err);
        setListening(false);
      }
    }, 150);
  };

  // ─── ENTRY POINT ─────────────────────────────────────────────────────────────
  const startListening = async () => {
    if (listeningRef.current) return;
    listeningRef.current = true;
    setSpoken('');
    setScore(null);
    setListening(true);

    if (Capacitor.getPlatform() !== 'web') {
      await startMobile();
    } else {
      await startWeb();
    }

    listeningRef.current = false;
  };

  useEffect(() => {
    return () => { stopRecognition(); };
  }, []);

  useEffect(() => {
    setSpoken('');
    setScore(null);
    stopRecognition();
  }, [word]);

  return (
    <Portal>
      <div
        onClick={handleClose}
        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '50vw',
            minWidth: '320px',
          }}
          className="rounded-2xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-8"
        >
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>

          <h2 className="text-sm uppercase text-center mb-6 text-gray-400">
            Pronunciation Practice
          </h2>

          <div className="text-center mb-8">
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              {word}
            </div>
          </div>

          <button
            onClick={startListening}
            disabled={listening}
            className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl text-base font-medium transition
              ${listening
                ? 'bg-red-500 text-white animate-pulse cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
          >
            {listening ? (
              <><Loader2 className="animate-spin" size={20} />Listening...</>
            ) : (
              <><Mic size={20} />Speak</>
            )}
          </button>

          {spoken && (
            <div className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
              You said: <b>{spoken}</b>
            </div>
          )}

          {score !== null && (
            <div className="mt-5 text-center text-lg font-semibold">
              Score: {score}%
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
