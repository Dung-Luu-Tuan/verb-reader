'use client'

import { SpeechRecognition } from "@capacitor-community/speech-recognition"
import { Capacitor } from "@capacitor/core"
import { Loader2, Mic, X } from 'lucide-react'
import { useEffect, useState } from 'react'
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

  const startListening = async () => {
    // ===== MOBILE (Android / iOS) =====
    if (Capacitor.getPlatform() !== "web") {

      try {
        const permission = await SpeechRecognition.requestPermissions()

        if (permission.speechRecognition !== "granted") {
          alert("Microphone permission denied")
          return
        }

        setListening(true)

        const result = await SpeechRecognition.start({
          language: "en-US",
          maxResults: 1,
          partialResults: false
        })

        const transcript = result.matches?.[0]?.toLowerCase().trim() || ""
        const confidence = 1 // plugin không trả confidence

        console.log("Transcript:", transcript)

        setSpoken(transcript)

        if (transcript !== word.toLowerCase()) {
          setScore(0)
        } else {
          setScore(Math.round(confidence * 100))
        }

        setListening(false)

      } catch (err) {
        console.log("Speech error:", err)
        setListening(false)
      }

      return
    }

    // ===== WEB (code cũ của bạn) =====

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      alert("Speech recognition not supported on this device")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop())
    } catch (err: any) {
      console.log("Mic error:", err)
      alert("Microphone permission denied")
      return
    }

    const recognition = new SpeechRecognitionAPI()

    recognition.lang = "en-US"
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = true

    setListening(true)

    recognition.onstart = () => {
      console.log("🎤 Speech started")
    }

    recognition.onresult = (event: any) => {
      const result = event.results[0][0]

      const transcript = result.transcript.toLowerCase().trim()
      const confidence = result.confidence ?? 0

      console.log("Transcript:", transcript)
      console.log("Confidence:", confidence)

      setSpoken(transcript)

      if (transcript !== word.toLowerCase()) {
        setScore(0)
      } else {
        setScore(Math.round(confidence * 100))
      }

      recognition.stop()
      setListening(false)
    }

    recognition.onerror = (event: any) => {
      console.log("❌ Speech error:", event.error)
      setListening(false)
    }

    recognition.onend = () => {
      console.log("Speech ended")
      setListening(false)
    }

    setTimeout(() => {
      try {
        recognition.start()
      } catch (err) {
        console.log("Start error:", err)
        setListening(false)
      }
    }, 400)
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
