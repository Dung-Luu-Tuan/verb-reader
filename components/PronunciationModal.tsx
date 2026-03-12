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

  const recognitionRef = useRef<any>(null);   // web only
  const safetyTimerRef = useRef<any>(null);
  const isMobileActiveRef = useRef(false);    // mobile only: đang có session thật không

  // Lock scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Init mobile permission
  useEffect(() => {
    const init = async () => {
      if (Capacitor.getPlatform() === 'web') return;
      try { await SpeechRecognition.requestPermissions(); } catch (err) { console.log(err); }
    };
    init();
  }, []);

  const clearSafetyTimer = () => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  };

  const stopRecognition = async () => {
    clearSafetyTimer();

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

    // Mobile: chỉ stop khi đang có session thật
    if (Capacitor.getPlatform() !== 'web' && isMobileActiveRef.current) {
      isMobileActiveRef.current = false;
      try { await SpeechRecognition.stop(); } catch { }
    }

    setListening(false);
  };

  const handleClose = () => {
    stopRecognition();
    onClose();
  };

  const startListening = async () => {
    if (listening) return;

    setSpoken('');
    setScore(null);

    // ─── MOBILE ───────────────────────────────────────────────────────────────
    if (Capacitor.getPlatform() !== 'web') {
      try {
        const permission = await SpeechRecognition.checkPermissions();
        if (permission.speechRecognition !== 'granted') {
          const req = await SpeechRecognition.requestPermissions();
          if (req.speechRecognition !== 'granted') {
            alert('Microphone permission denied');
            return;
          }
        }

        // Nếu có session cũ còn sót, kill nó trước
        if (isMobileActiveRef.current) {
          isMobileActiveRef.current = false;
          try { await SpeechRecognition.stop(); } catch { }
          await new Promise((r) => setTimeout(r, 150));
        }

        setListening(true);
        isMobileActiveRef.current = true;

        try {
          const result = await Promise.race([
            SpeechRecognition.start({
              language: 'en-US',
              maxResults: 1,
              partialResults: false,
              popup: false,
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('TIMEOUT')), 10000)
            ),
          ]);

          const transcript = (result as any)?.matches?.[0]?.toLowerCase().trim() || '';
          if (transcript) {
            setSpoken(transcript);
            setScore(transcript === word.toLowerCase() ? 100 : 0);
          }
        } catch (err: any) {
          console.log('Mobile speech error:', err?.message || err);
          if (err?.message === 'TIMEOUT') {
            try { await SpeechRecognition.stop(); } catch { }
          }
        } finally {
          isMobileActiveRef.current = false;
          setListening(false);
        }

        return;
      } catch (err: any) {
        console.log('Mobile outer error:', err);
        isMobileActiveRef.current = false;
        setListening(false);
        return;
      }
    }

    // ─── WEB ──────────────────────────────────────────────────────────────────
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert('Speech recognition not supported');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      alert('Microphone permission denied');
      return;
    }

    // Cleanup instance cũ (không gọi stopRecognition để tránh setListening sớm)
    clearSafetyTimer();
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

    const cleanup = () => {
      clearSafetyTimer();
      recognitionRef.current = null;
      setListening(false);
    };

    recognition.onresult = (event: any) => {
      const r = event.results[0][0];
      const transcript = r.transcript.toLowerCase().trim();
      setSpoken(transcript);
      setScore(transcript === word.toLowerCase() ? Math.round((r.confidence ?? 0) * 100) : 0);
      cleanup();
    };

    recognition.onerror = (event: any) => {
      console.log('Web speech error:', event.error);
      if (event.error === 'not-allowed') alert('Microphone permission denied');
      cleanup();
    };

    recognition.onend = () => {
      clearSafetyTimer();
      recognitionRef.current = null;
      setListening(false);
    };

    setListening(true);

    setTimeout(() => {
      try {
        recognition.start();
        safetyTimerRef.current = setTimeout(() => {
          console.log('Safety timeout');
          stopRecognition();
        }, 6000);
      } catch (err) {
        console.log('Start error:', err);
        cleanup();
      }
    }, 250);
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
