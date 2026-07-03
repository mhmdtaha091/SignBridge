import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import FullCameraView from '../components/FullCameraView'
import ModelStatusBanner from '../components/ModelStatusBanner'
import NeedsDataNotice from '../components/NeedsDataNotice'
import { useWordSigns, getWordInfo } from '../config/vocabResolver'
import { useLanguageStore } from '../store/useLanguageStore'
import { SignGate } from '../recognition/signGate'
import { GruSequenceClassifier } from '../recognition/sequenceClassifier'
import type { SequenceClassifier } from '../recognition/types'
import { useProgressStore } from '../store/useProgressStore'
import { useSignStore } from '../store/useSignStore'
import { useFullTracking, type FullTrackingStatus } from '../vision/useFullTracking'
import type { FullTrackedFrame } from '../vision/types'

type Verdict = { kind: 'correct' } | { kind: 'wrong'; saw: string } | null

function nextWord(pool: string[], current: string | null): string {
  const options = pool.filter((w) => w !== current)
  return options[Math.floor(Math.random() * options.length)] ?? pool[0]
}

export default function WordPractice() {
  const [searchParams] = useSearchParams()
  const preselect = searchParams.get('target')

  const words = useWordSigns()
  const language = useLanguageStore((s) => s.language)
  const { init } = useSignStore()
  const { streak, bestStreak, recordWordAttempt, wordMastery } = useProgressStore()
  const [target, setTarget] = useState<string | null>(preselect ?? null)
  const [verdict, setVerdict] = useState<Verdict>(null)
  const [trackingStatus, setTrackingStatus] = useState<FullTrackingStatus>('loading-model')

  useEffect(() => {
    void init()
  }, [init])

  const pool = useMemo(() => words.map((w) => w.word), [words])

  if (pool.length >= 1 && (target === null || !pool.includes(target))) {
    setTarget(nextWord(pool, preselect))
  }

  const classifierRef = useRef<SequenceClassifier>(GruSequenceClassifier.empty())
  const gateRef = useRef(new SignGate({ minFrames: 6, minConfidence: 0.4, cooldownMs: 1200 }))
  const targetRef = useRef(target)
  const lockRef = useRef(false)
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [modelVocabSize, setModelVocabSize] = useState<number | undefined>()
  const [modelAccuracy, setModelAccuracy] = useState<number | undefined>()
  const [modelError, setModelError] = useState<string | undefined>()
  const [loadAttempt, setLoadAttempt] = useState(0)

  // Attempt to load the GRU word-sign model for the current language.
  useEffect(() => {
    let cancelled = false
    setModelStatus('loading')
    setModelError(undefined)

    const BASE = import.meta.env.BASE_URL
    const modelDir = language === 'psl' ? 'psl-gru-word-signs' : 'gru-word-signs'
    fetch(`${BASE}models/${modelDir}/vocab.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((vocab: { labels: string[]; val_accuracy?: number }) => {
        if (cancelled) return
        setModelVocabSize(vocab.labels.length)
        if (vocab.val_accuracy != null) setModelAccuracy(vocab.val_accuracy)
        return GruSequenceClassifier.fromURL(
          `${BASE}models/${modelDir}/model.json`,
          vocab.labels,
        )
      })
      .then((cls) => {
        if (cancelled || !cls) return
        classifierRef.current = cls
        setModelStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setModelStatus('error')
        setModelError(err instanceof Error ? err.message : 'Unknown error loading model')
      })
    return () => { cancelled = true }
  }, [loadAttempt, language])

  function handleRetry() {
    setLoadAttempt((n) => n + 1)
  }

  useEffect(() => {
    targetRef.current = target
  }, [target])

  const advance = useCallback(
    (correct: boolean, saw: string) => {
      const t = targetRef.current
      if (!t) return
      lockRef.current = true
      recordWordAttempt(t, correct)
      setVerdict(correct ? { kind: 'correct' } : { kind: 'wrong', saw })
      setTimeout(() => {
        setVerdict(null)
        if (correct) setTarget((cur) => nextWord(pool, cur))
        gateRef.current.reset()
        lockRef.current = false
      }, correct ? 1200 : 1800)
    },
    [pool, recordWordAttempt],
  )

  const onFrame = useCallback(
    (tracked: FullTrackedFrame) => {
      if (lockRef.current || !targetRef.current) return
      const prediction = classifierRef.current.feedFrame(tracked.features, tracked.timestampMs)
      const emitted = gateRef.current.feed(prediction, tracked.timestampMs)
      if (emitted) advance(emitted.label === targetRef.current, emitted.label)
    },
    [advance],
  )

  const { videoRef, canvasRef, status, fps } = useFullTracking({
    onFrame,
    drawOverlay: true,
    trackPose: true,
  })

  useEffect(() => {
    setTrackingStatus(status)
  }, [status])

  const info = target ? getWordInfo(target) : undefined

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">Practice Words</h1>
          <p className="mt-2 text-ink-700">
            Sign the word shown — hold it until it registers.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 rounded-2xl bg-sun-100 font-extrabold">
            🔥 Streak <span className="tabular-nums">{streak}</span>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-sky-100 font-extrabold">
            🏆 Best <span className="tabular-nums">{bestStreak}</span>
          </div>
        </div>
      </div>

      {modelStatus !== 'ready' && (
        <ModelStatusBanner
          status={modelStatus}
          vocabSize={modelVocabSize}
          accuracy={modelAccuracy}
          errorMessage={modelError}
          onRetry={handleRetry}
          className="mt-6"
        />
      )}

      {modelStatus === 'error' ? (
        <NeedsDataNotice
          feature="The word-sign model couldn't be loaded. You can still use fingerspelling practice in the meantime."
        />
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(260px,0.55fr)_1fr]">
          <div
            className={`rounded-3xl p-8 text-center self-start transition-colors ${
              verdict?.kind === 'correct'
                ? 'bg-leaf-100'
                : verdict?.kind === 'wrong'
                  ? 'bg-coral-100'
                  : 'bg-cream-100 border border-cream-200'
            }`}
            aria-live="polite"
          >
            <p className="font-bold text-ink-500">Sign this word</p>
            <p className="text-5xl leading-none font-black mt-2 capitalize">{target}</p>
            {info && (
              <p className="mt-4 text-ink-700 text-sm">
                <span className="text-2xl">{info.emoji}</span>{' '}
                {info.tip}
              </p>
            )}
            {verdict?.kind === 'correct' && (
              <p className="mt-4 text-2xl font-extrabold text-leaf-700">Nice! ✓</p>
            )}
            {verdict?.kind === 'wrong' && (
              <p className="mt-4 text-xl font-extrabold text-coral-700">
                That looked like "{verdict.saw}" — try again
              </p>
            )}
            <button
              type="button"
              onClick={() => setTarget((cur) => nextWord(pool, cur))}
              className="mt-6 px-5 py-2.5 rounded-full bg-cream-50 border-2 border-cream-300 font-bold text-ink-700 hover:bg-cream-200 transition-colors"
            >
              Skip →
            </button>
          </div>

          <FullCameraView
            videoRef={videoRef}
            canvasRef={canvasRef}
            status={trackingStatus}
            fps={fps}
          />
        </div>
      )}

      {/* Word mastery heatmap */}
      <div className="mt-10">
        <h2 className="text-xl font-extrabold mb-3">Word mastery</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-1.5">
          {words.map(({ word: w, emoji }) => {
            const stats = wordMastery[w]
            const rate = stats && stats.attempts > 0 ? stats.correct / stats.attempts : null
            return (
              <div
                key={w}
                title={
                  stats
                    ? `${w}: ${stats.correct}/${stats.attempts} correct`
                    : `${w}: not practiced yet`
                }
                className={`aspect-square grid place-items-center rounded-xl font-extrabold text-xs text-center p-1 ${
                  rate === null
                    ? 'bg-cream-100 text-ink-300'
                    : rate >= 0.8
                      ? 'bg-leaf-500 text-white'
                      : rate >= 0.5
                        ? 'bg-sun-400 text-ink-900'
                        : 'bg-coral-200 text-coral-700'
                }`}
              >
                <span>{emoji}</span>
                <span className="leading-tight">{w}</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
