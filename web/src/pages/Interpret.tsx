import { useCallback, useEffect, useRef, useState } from 'react'
import CameraView from '../components/CameraView'
import NeedsDataNotice from '../components/NeedsDataNotice'
import { StabilityGate } from '../recognition/stability'
import { isSpeechSupported, speak, stopSpeaking } from '../speech/tts'
import { activeClassifier, useSignStore } from '../store/useSignStore'
import StarterNotice from '../components/StarterNotice'
import type { TrackedFrame } from '../vision/useHandTracking'

export default function Interpret() {
  const { samples, init, loaded, usingStarter, starterAccuracy } = useSignStore()
  const hasData = samples.length > 0 || usingStarter
  const [text, setText] = useState('')
  const [live, setLive] = useState<{ label: string; confidence: number; progress: number } | null>(
    null,
  )

  useEffect(() => {
    void init()
  }, [init])

  const gateRef = useRef(new StabilityGate())

  const onFrame = useCallback((tracked: TrackedFrame) => {
    const state = useSignStore.getState()
    const prediction = tracked.features
      ? activeClassifier(state).predict(tracked.features)
      : null
    const gate = gateRef.current
    const emitted = gate.feed(prediction, tracked.timestampMs)

    setLive(
      prediction
        ? { label: prediction.label, confidence: prediction.confidence, progress: gate.progress }
        : null,
    )
    if (emitted) setText((t) => t + emitted)
  }, [])

  const words = text.trim()

  if (loaded && !hasData) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl font-black mb-8">Interpret</h1>
        <NeedsDataNotice feature="The interpreter" />
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-black">Interpret</h1>
      <p className="mt-3 text-ink-700 max-w-2xl">
        Fingerspell in front of the camera. Hold each letter steady for a beat — when the ring
        fills, the letter is added. Then press <strong>Speak</strong> (or it’s one tap away on
        every word).
      </p>
      {usingStarter && <StarterNotice accuracy={starterAccuracy} className="mt-5" />}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_minmax(300px,0.7fr)]">
        <CameraView onFrame={onFrame}>
          {live && (
            <div className="absolute bottom-4 right-4 grid place-items-center">
              <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90" aria-hidden="true">
                <circle cx="50" cy="50" r="44" fill="rgba(51,36,31,0.65)" />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke={live.progress >= 1 ? '#3CB878' : '#FFB02E'}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${live.progress * 276} 276`}
                />
              </svg>
              <span className="absolute text-4xl font-black text-white">{live.label}</span>
            </div>
          )}
        </CameraView>

        <div className="flex flex-col gap-4">
          <div
            className="flex-1 min-h-40 rounded-3xl bg-cream-100 border border-cream-200 p-5 text-3xl font-extrabold tracking-wide break-words"
            aria-live="polite"
            aria-label="Recognized text"
          >
            {text || <span className="text-ink-300 text-xl font-bold">Your words appear here…</span>}
            <span className="inline-block w-0.5 h-7 bg-coral-500 align-middle animate-pulse ml-0.5" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setText((t) => t + ' ')}
              className="px-4 py-3 rounded-2xl bg-cream-100 hover:bg-cream-200 border-2 border-cream-300 font-extrabold transition-colors"
            >
              Space
            </button>
            <button
              type="button"
              onClick={() => setText((t) => t.slice(0, -1))}
              className="px-4 py-3 rounded-2xl bg-cream-100 hover:bg-cream-200 border-2 border-cream-300 font-extrabold transition-colors"
            >
              ⌫ Undo letter
            </button>
            <button
              type="button"
              onClick={() => {
                setText('')
                stopSpeaking()
                gateRef.current.reset()
              }}
              className="px-4 py-3 rounded-2xl bg-coral-50 hover:bg-coral-100 text-coral-700 font-extrabold transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => speak(words)}
              disabled={!words || !isSpeechSupported()}
              className="px-4 py-3 rounded-2xl bg-leaf-500 hover:bg-leaf-600 text-white font-extrabold disabled:opacity-50 shadow-soft transition-colors"
            >
              🔊 Speak
            </button>
          </div>
          {!isSpeechSupported() && (
            <p className="text-sm text-ink-500">
              Speech output isn’t supported in this browser — the text above still works.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
