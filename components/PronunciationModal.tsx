'use client'

import { useState, useEffect } from 'react'
import stringSimilarity from 'string-similarity'
import { Mic, Loader2, X } from 'lucide-react'
import Portal from './Portal'

interface Props {
  word: string
  onClose: () => void
}

export default function PronunciationModal({ word, onClose }: Props) {
  const [spoken, setSpoken] = useState('')
  const [score, setScore] = useState<number | null>(null)
  const [listening, setListening] = useState(false)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert("Speech recognition not supported on this device")
      return
    }

    const recognition = new SpeechRecognition()

    recognition.lang = "en-US"
    recognition.interimResults = false
    recognition.maxAlternatives = 3
    recognition.continuous = false

    setListening(true)

    recognition.onresult = (event: any) => {
      const target = word.toLowerCase().trim()

      let bestTranscript = ""
      let bestScore = 0

      // duyệt tất cả alternatives
      for (let i = 0; i < event.results[0].length; i++) {
        const alt = event.results[0][i]

        const transcript = alt.transcript.toLowerCase().trim()
        const confidence = alt.confidence || 0

        const similarity = stringSimilarity.compareTwoStrings(
          transcript,
          target
        )

        const score = similarity * confidence

        if (score > bestScore) {
          bestScore = score
          bestTranscript = transcript
        }
      }

      setSpoken(bestTranscript)

      const finalScore = Math.round(bestScore * 100)

      setScore(finalScore)
      setListening(false)
    }

    recognition.onerror = (err: any) => {
      console.error("Speech recognition error:", err)
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
    }

    try {
      recognition.start()
    } catch (err) {
      console.error(err)
      setListening(false)
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md">
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
          className="
            rounded-2xl shadow-2xl
            bg-white dark:bg-gray-900
            border border-gray-200 dark:border-gray-700
            p-8
          "
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition"
          >
            <X size={20} />
          </button>

          {/* Title */}
          <h2 className="text-sm font-medium tracking-widest uppercase text-center mb-6 text-gray-400 dark:text-gray-500">
            Pronunciation Practice
          </h2>

          {/* Word */}
          <div className="text-center mb-8">
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              {word}
            </div>
          </div>

          {/* Button */}
          <button
            onClick={startListening}
            disabled={listening}
            className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl text-base font-medium transition
              ${listening
                ? 'bg-red-500 text-white animate-pulse cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white'
              }`}
          >
            {listening ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Listening...
              </>
            ) : (
              <>
                <Mic size={20} />
                Speak
              </>
            )}
          </button>

          {/* Spoken */}
          {spoken && (
            <div className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
              You said:{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {spoken}
              </span>
            </div>
          )}

          {/* Score */}
          {score !== null && (
            <div className="mt-5">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-500 dark:text-gray-400">Pronunciation score</span>
                <span className={`font-semibold ${score > 80
                  ? 'text-green-500'
                  : score > 50
                    ? 'text-yellow-500'
                    : 'text-red-500'
                  }`}>
                  {score}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${score > 80
                    ? 'bg-green-500'
                    : score > 50
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                    }`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Portal>
  )
}
