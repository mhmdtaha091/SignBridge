import { useState } from 'react'

export default function Interpret() {
  const [mode, setMode] = useState<'fingerspelling' | 'words'>('fingerspelling')

  return (
    <div>
      {/* Mode toggle */}
      <div className="mx-auto max-w-6xl px-4 pt-8 flex items-center gap-4">
        <h1 className="text-4xl font-black">Interpret</h1>
        <div className="flex bg-cream-100 rounded-full p-1 border border-cream-200">
          <button
            type="button"
            onClick={() => setMode('fingerspelling')}
            className={`px-4 py-1.5 rounded-full text-sm font-extrabold transition-colors ${
              mode === 'fingerspelling'
                ? 'bg-coral-600 text-white shadow-sm'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            ABC
          </button>
          <button
            type="button"
            onClick={() => setMode('words')}
            className={`px-4 py-1.5 rounded-full text-sm font-extrabold transition-colors ${
              mode === 'words'
                ? 'bg-coral-600 text-white shadow-sm'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            Words
          </button>
        </div>
      </div>

      {mode === 'fingerspelling' ? (
        <FingerspellingInterpret key="finger" />
      ) : (
        <WordSignInterpret key="word" />
      )}
    </div>
  )
}

// ── Fingerspelling mode ──────────────────────────────────────────────────

import { useCallback, useEffect, useRef } from 'react'
import CameraView from '../components/CameraView'
import NeedsDataNotice from '../components/NeedsDataNotice'
import { StabilityGate } from '../recognition/stability'
import { isSpeechSupported, speak, stopSpeaking } from '../speech/tts'
import { activeClassifier, useSignStore } from '../store/useSignStore'
import StarterNotice from '../components/StarterNotice'
import type { TrackedFrame } from '../vision/useHandTracking'

function FingerspellingInterpret() {
  const { samples, init, loaded, usingStarter, starterAccuracy } = useSignStore()
  const hasData = samples.length > 0 || usingStarter
  const [text, setText] = useState('')
  const [live, setLive] = useState<{ label: string; confidence: number; progress: number } | null>(null)

  useEffect(() => { void init() }, [init])

  const gateRef = useRef(new StabilityGate())

  const onFrame = useCallback((tracked: TrackedFrame) => {
    const state = useSignStore.getState()
    const prediction = tracked.features ? activeClassifier(state).predict(tracked.features) : null
    const gate = gateRef.current
    const emitted = gate.feed(prediction, tracked.timestampMs)
    setLive(prediction ? { label: prediction.label, confidence: prediction.confidence, progress: gate.progress } : null)
    if (emitted) setText((t) => t + emitted)
  }, [])

  const words = text.trim()

  if (loaded && !hasData) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <NeedsDataNotice feature="The interpreter" />
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-ink-700 max-w-2xl">
        Fingerspell in front of the camera. Hold each letter steady for a beat — when the ring
        fills, the letter is added. Then press <strong>Speak</strong>.
      </p>
      {usingStarter && <StarterNotice accuracy={starterAccuracy} className="mt-5" />}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_minmax(300px,0.7fr)]">
        <CameraView onFrame={onFrame}>
          {live && (
            <div className="absolute bottom-4 right-4 grid place-items-center">
              <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90" aria-hidden="true">
                <circle cx="50" cy="50" r="44" fill="rgba(51,36,31,0.65)" />
                <circle cx="50" cy="50" r="44" fill="none"
                  stroke={live.progress >= 1 ? '#3CB878' : '#FFB02E'}
                  strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={`${live.progress * 276} 276`} />
              </svg>
              <span className="absolute text-4xl font-black text-white">{live.label}</span>
            </div>
          )}
        </CameraView>

        <div className="flex flex-col gap-4">
          <div className="flex-1 min-h-40 rounded-3xl bg-cream-100 border border-cream-200 p-5 text-3xl font-extrabold tracking-wide break-words" aria-live="polite" aria-label="Recognized text">
            {text || <span className="text-ink-300 text-xl font-bold">Your letters appear here…</span>}
            <span className="inline-block w-0.5 h-7 bg-coral-500 align-middle animate-pulse ml-0.5" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setText((t) => t + ' ')} className="px-4 py-3 rounded-2xl bg-cream-100 hover:bg-cream-200 border-2 border-cream-300 font-extrabold transition-colors">Space</button>
            <button type="button" onClick={() => setText((t) => t.slice(0, -1))} className="px-4 py-3 rounded-2xl bg-cream-100 hover:bg-cream-200 border-2 border-cream-300 font-extrabold transition-colors">⌫ Undo</button>
            <button type="button" onClick={() => { setText(''); stopSpeaking(); gateRef.current.reset() }} className="px-4 py-3 rounded-2xl bg-coral-50 hover:bg-coral-100 text-coral-700 font-extrabold transition-colors">Clear</button>
            <button type="button" onClick={() => speak(words)} disabled={!words || !isSpeechSupported()} className="px-4 py-3 rounded-2xl bg-leaf-500 hover:bg-leaf-600 text-white font-extrabold disabled:opacity-50 shadow-soft transition-colors">🔊 Speak</button>
          </div>
          {!isSpeechSupported() && <p className="text-sm text-ink-500">Speech output isn't supported in this browser.</p>}
        </div>
      </div>
    </section>
  )
}

// ── Word-sign mode ────────────────────────────────────────────────────────

import { GruSequenceClassifier } from '../recognition/sequenceClassifier'
import type { SequenceClassifier } from '../recognition/types'
import { SignGate } from '../recognition/signGate'
import { useFullTracking } from '../vision/useFullTracking'
import type { FullTrackedFrame } from '../vision/types'
import FullCameraView from '../components/FullCameraView'

function WordSignInterpret() {
  const { init, loaded } = useSignStore()
  const [text, setText] = useState('')
  const [live, setLive] = useState<{ label: string; confidence: number; progress: number } | null>(null)
  const [trackingStatus, setTrackingStatus] = useState<'loading-model' | 'requesting-camera' | 'running' | 'denied' | 'no-camera' | 'error'>('loading-model')
  const [modelReady, setModelReady] = useState(false)
  const [modelLoadError, setModelLoadError] = useState(false)

  useEffect(() => { void init() }, [init])

  // Attempt to load the GRU word-sign model. Falls back gracefully if the
  // model hasn't been trained/exported yet (file not found).
  useEffect(() => {
    const BASE = import.meta.env.BASE_URL
    fetch(`${BASE}models/gru-word-signs/vocab.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((vocab: { labels: string[]; val_accuracy?: number }) =>
        GruSequenceClassifier.fromURL(
          `${BASE}models/gru-word-signs/model.json`,
          vocab.labels,
        ),
      )
      .then((cls) => {
        classifierRef.current = cls
        setModelReady(true)
      })
      .catch(() => {
        setModelLoadError(true)
      })
  }, [])

  const classifierRef = useRef<SequenceClassifier>(GruSequenceClassifier.empty())
  const gateRef = useRef(new SignGate({ minFrames: 6, minConfidence: 0.4, cooldownMs: 1200 }))

  const onFrame = useCallback((tracked: FullTrackedFrame) => {
    const prediction = classifierRef.current.feedFrame(tracked.features, tracked.timestampMs)
    const gate = gateRef.current
    const emitted = gate.feed(prediction, tracked.timestampMs)
    setLive(
      prediction
        ? { label: prediction.label, confidence: prediction.confidence, progress: gate.progress }
        : null,
    )
    if (emitted) setText((t) => (t ? t + ' ' + emitted.label : emitted.label))
  }, [])

  const { videoRef, canvasRef, status, fps } = useFullTracking({
    onFrame,
    drawOverlay: true,
    trackPose: true,
  })

  useEffect(() => { setTrackingStatus(status) }, [status])

  const words = text.trim()
  const showNotice = !modelReady && loaded && modelLoadError

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-ink-700 max-w-2xl">
        Sign a word in front of the camera. Hold the sign for a beat — when recognized, it's
        added to the text. Press <strong>Speak</strong> to hear it aloud.
      </p>
      {showNotice && (
        <div className="mt-5 p-4 rounded-2xl bg-sun-50 border border-sun-200 text-ink-700 text-sm">
          ⚠️ The word-sign model isn't available yet. Run the Colab training notebook
          (<code>ml/colab/signbridge_m3_train.ipynb</code>) to train the GRU model on WLASL,
          then copy the output to <code>web/public/models/gru-word-signs/</code>.
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_minmax(300px,0.7fr)]">
        <FullCameraView videoRef={videoRef} canvasRef={canvasRef} status={trackingStatus} fps={fps}>
          {live && (
            <div className="absolute bottom-4 right-4 grid place-items-center">
              <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90" aria-hidden="true">
                <circle cx="50" cy="50" r="44" fill="rgba(51,36,31,0.65)" />
                <circle cx="50" cy="50" r="44" fill="none"
                  stroke={live.progress >= 1 ? '#3CB878' : '#FFB02E'}
                  strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={`${live.progress * 276} 276`} />
              </svg>
              <span className="absolute text-2xl font-black text-white capitalize">{live.label}</span>
            </div>
          )}
        </FullCameraView>

        <div className="flex flex-col gap-4">
          <div className="flex-1 min-h-40 rounded-3xl bg-cream-100 border border-cream-200 p-5 text-3xl font-extrabold tracking-wide break-words" aria-live="polite" aria-label="Recognized text">
            {text || <span className="text-ink-300 text-xl font-bold">Recognized words appear here…</span>}
            <span className="inline-block w-0.5 h-7 bg-coral-500 align-middle animate-pulse ml-0.5" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setText((t) => t + ' ')} className="px-4 py-3 rounded-2xl bg-cream-100 hover:bg-cream-200 border-2 border-cream-300 font-extrabold transition-colors">Space</button>
            <button type="button" onClick={() => setText((t) => t.split(' ').slice(0, -1).join(' '))} className="px-4 py-3 rounded-2xl bg-cream-100 hover:bg-cream-200 border-2 border-cream-300 font-extrabold transition-colors">⌫ Undo word</button>
            <button type="button" onClick={() => { setText(''); stopSpeaking(); gateRef.current.reset() }} className="px-4 py-3 rounded-2xl bg-coral-50 hover:bg-coral-100 text-coral-700 font-extrabold transition-colors">Clear</button>
            <button type="button" onClick={() => speak(words)} disabled={!words || !isSpeechSupported()} className="px-4 py-3 rounded-2xl bg-leaf-500 hover:bg-leaf-600 text-white font-extrabold disabled:opacity-50 shadow-soft transition-colors">🔊 Speak</button>
          </div>
        </div>
      </div>
    </section>
  )
}
