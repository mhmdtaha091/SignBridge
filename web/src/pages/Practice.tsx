import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CameraView from '../components/CameraView'
import NeedsDataNotice from '../components/NeedsDataNotice'
import { useLetters } from '../config/vocabResolver'
import { useLanguageStore } from '../store/useLanguageStore'
import { StabilityGate } from '../recognition/stability'
import { useProgressStore } from '../store/useProgressStore'
import {
  activeClassifier,
  effectiveSamples,
  sampleCounts,
  useSignStore,
} from '../store/useSignStore'
import StarterNotice from '../components/StarterNotice'
import type { TrackedFrame } from '../vision/useHandTracking'

type Verdict = { kind: 'correct' } | { kind: 'wrong'; saw: string } | null

function nextLetter(pool: string[], current: string | null): string {
  const options = pool.filter((l) => l !== current)
  return options[Math.floor(Math.random() * options.length)] ?? pool[0]
}

export default function Practice() {
  const letters = useLetters()
  const language = useLanguageStore((s) => s.language)
  const { samples, init, loaded, usingStarter, starterSamples, starterAccuracy } = useSignStore()
  const { streak, bestStreak, mastery, recordAttempt } = useProgressStore()
  const [target, setTarget] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<Verdict>(null)

  useEffect(() => {
    void init()
  }, [init])

  // Only quiz letters the classifier actually knows (own data, else starter).
  const pool = useMemo(() => {
    const counts = sampleCounts(effectiveSamples({ samples, usingStarter, starterSamples }))
    return letters.map((l) => l.letter).filter((l) => (counts.get(l) ?? 0) >= 5)
  }, [samples, usingStarter, starterSamples, letters])

  // Render-phase state adjustment (the React-sanctioned pattern): keep the
  // target inside the pool of letters the classifier knows.
  if (pool.length >= 2 && (target === null || !pool.includes(target))) {
    setTarget(nextLetter(pool, null))
  }

  const gateRef = useRef(new StabilityGate({ minFrames: 6 }))
  const targetRef = useRef(target)
  const lockRef = useRef(false) // ignore frames while showing a verdict
  useEffect(() => {
    targetRef.current = target
  }, [target])

  const advance = useCallback(
    (correct: boolean, saw: string) => {
      const t = targetRef.current
      if (!t) return
      lockRef.current = true
      recordAttempt(t, correct)
      setVerdict(correct ? { kind: 'correct' } : { kind: 'wrong', saw })
      setTimeout(() => {
        setVerdict(null)
        if (correct) setTarget((cur) => nextLetter(pool, cur))
        gateRef.current.reset()
        lockRef.current = false
      }, correct ? 1100 : 1600)
    },
    [pool, recordAttempt],
  )

  const onFrame = useCallback(
    (tracked: TrackedFrame) => {
      if (lockRef.current || !targetRef.current) return
      const state = useSignStore.getState()
      const prediction = tracked.features
        ? activeClassifier(state).predict(tracked.features)
        : null
      const emitted = gateRef.current.feed(prediction, tracked.timestampMs)
      if (emitted) advance(emitted === targetRef.current, emitted)
    },
    [advance],
  )

  if (loaded && pool.length < 2) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl font-black mb-8">Practice</h1>
        <NeedsDataNotice feature="Practice mode" />
      </section>
    )
  }

  const info = target ? letters.find((l) => l.letter === target) : undefined

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">Practice</h1>
          <p className="mt-2 text-ink-700">Sign the letter shown — hold it until it counts.</p>
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

      {usingStarter && <StarterNotice accuracy={starterAccuracy} className="mt-6" />}

      {language === 'psl' && (
        <div className="mt-5 p-4 rounded-2xl bg-sun-50 border border-sun-200 text-ink-700 text-sm">
          ⚠️ PSL letter recognition is not yet available — the camera still uses the
          ASL model. PSL uses a two-handed fingerspelling system (BANZSL) that differs
          from ASL's one-handed alphabet. Switch to ASL for letter practice, or record
          your own PSL samples in the Data Studio.
        </div>
      )}

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
          <p className="font-bold text-ink-500">Sign this letter</p>
          <p className="text-[7rem] leading-none font-black mt-2">{target}</p>
          {info && <p className="mt-4 text-ink-700">{info.tip}</p>}
          {verdict?.kind === 'correct' && (
            <p className="mt-4 text-2xl font-extrabold text-leaf-700">Nice! ✓</p>
          )}
          {verdict?.kind === 'wrong' && (
            <p className="mt-4 text-xl font-extrabold text-coral-700">
              That looked like “{verdict.saw}” — try again
            </p>
          )}
          <button
            type="button"
            onClick={() => setTarget((cur) => nextLetter(pool, cur))}
            className="mt-6 px-5 py-2.5 rounded-full bg-cream-50 border-2 border-cream-300 font-bold text-ink-700 hover:bg-cream-200 transition-colors"
          >
            Skip →
          </button>
        </div>

        <CameraView onFrame={onFrame} />
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-extrabold mb-3">Letter mastery</h2>
        <div className="grid grid-cols-7 sm:grid-cols-13 gap-1.5">
          {letters.map(({ letter }) => {
            const stats = mastery[letter]
            const rate = stats && stats.attempts > 0 ? stats.correct / stats.attempts : null
            return (
              <div
                key={letter}
                title={
                  stats
                    ? `${letter}: ${stats.correct}/${stats.attempts} correct`
                    : `${letter}: not practiced yet`
                }
                className={`aspect-square grid place-items-center rounded-xl font-extrabold ${
                  rate === null
                    ? 'bg-cream-100 text-ink-300'
                    : rate >= 0.8
                      ? 'bg-leaf-500 text-white'
                      : rate >= 0.5
                        ? 'bg-sun-400 text-ink-900'
                        : 'bg-coral-200 text-coral-700'
                }`}
              >
                {letter}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
