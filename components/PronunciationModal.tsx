'use client'

import { SpeechRecognition } from "@capacitor-community/speech-recognition"
import { Capacitor } from "@capacitor/core"
import { Loader2, Mic, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import Portal from "./Portal"

interface Props {
  word: string
  onClose: () => void
}

export default function PronunciationModal({ word, onClose }: Props) {

  const [spoken, setSpoken] = useState("")
  const [score, setScore] = useState<number | null>(null)
  const [listening, setListening] = useState(false)

  const recognitionRef = useRef<any>(null)

  // Lock scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Init mobile permission
  useEffect(() => {
    const init = async () => {
      if (Capacitor.getPlatform() === "web") return
      try {
        await SpeechRecognition.requestPermissions()
      } catch (err) {
        console.log(err)
      }
    }
    init()
  }, [])

  // Cleanup khi unmount
  useEffect(() => {
    return () => stopRecognition()
  }, [])

  // Reset khi đổi word
  useEffect(() => {
    setSpoken("")
    setScore(null)
    stopRecognition()
  }, [word])

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null
        recognitionRef.current.onresult = null
        recognitionRef.current.onerror = null
        recognitionRef.current.stop()
      } catch {}
      recognitionRef.current = null
    }

    if (Capacitor.getPlatform() !== "web") {
      try {
        SpeechRecognition.stop()
      } catch {}
    }

    setListening(false)
  }

  const handleClose = () => {
    stopRecognition()
    onClose()
  }

  const startListening = async () => {

    if (listening) return

    // =====================
    // MOBILE
    // =====================
    if (Capacitor.getPlatform() !== "web") {
      try {
        const permission = await SpeechRecognition.checkPermissions()

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

        setSpoken(transcript)
        setScore(transcript === word.toLowerCase() ? 100 : 0)
        setListening(false)

      } catch (err) {
        console.log("Speech error:", err)
        setListening(false)
      }

      return
    }

    // =====================
    // WEB
    // =====================

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      alert("Speech recognition not supported")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
    } catch {
      alert("Microphone permission denied")
      return
    }

    // ✅ Dùng stopRecognition để null handlers trước khi stop
    stopRecognition()

    const recognition = new SpeechRecognitionAPI()
    recognitionRef.current = recognition

    recognition.lang = "en-US"
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = false

    setListening(true)

    recognition.onresult = (event: any) => {
      const result = event.results[0][0]
      const transcript = result.transcript.toLowerCase().trim()
      const confidence = result.confidence ?? 0

      setSpoken(transcript)
      setScore(transcript === word.toLowerCase() ? Math.round(confidence * 100) : 0)
    }

    recognition.onerror = (event: any) => {
      console.log("Speech error:", event.error)
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
    }

    setTimeout(() => {
      try {
        recognition.start()
      } catch (err) {
        console.log("Start error:", err)
        setListening(false)
      }
    }, 250)
  }

  return (
    <Portal>
      <div
        onClick={handleClose}
        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "50vw",
            minWidth: "320px",
          }}
          className="rounded-2xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-8"
        >

          {/* Close */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>

          {/* Title */}
          <h2 className="text-sm uppercase text-center mb-6 text-gray-400">
            Pronunciation Practice
          </h2>

          {/* Word */}
          <div className="text-center mb-8">
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              {word}
            </div>
          </div>

          {/* Speak button */}
          <button
            onClick={startListening}
            disabled={listening}
            className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl text-base font-medium transition
              ${listening
                ? "bg-red-500 text-white animate-pulse cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
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
              You said: <b>{spoken}</b>
            </div>
          )}

          {/* Score */}
          {score !== null && (
            <div className="mt-5 text-center text-lg font-semibold">
              Score: {score}%
            </div>
          )}

        </div>
      </div>
    </Portal>
  )
}