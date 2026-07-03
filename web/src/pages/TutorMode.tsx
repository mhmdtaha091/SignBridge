import { useCallback, useEffect, useRef, useState } from 'react'
// (Link unused in current tutor flow — kept for future lesson navigation)
import AvatarView from '../components/AvatarView'
import FullCameraView from '../components/FullCameraView'
import ScoreRing from '../components/ScoreRing'
import FeedbackBanner, { type FeedbackMessage } from '../components/FeedbackBanner'
import { useWordSigns, getWordInfo } from '../config/vocabResolver'
import { useLanguageStore } from '../store/useLanguageStore'
import { dtw } from '../recognition/dtw'
import { generateFeedback } from '../recognition/feedback'
import { useLessonStore } from '../store/useLessonStore'
import { useSignStore } from '../store/useSignStore'
import { loadReferenceTrajectory } from '../tutor/referenceLoader'
import { useFullTracking } from '../vision/useFullTracking'
import type { FullTrackedFrame } from '../vision/types'

type Phase = 'pick' | 'watch' | 'record' | 'score'

const DEFAULT_LESSON = ['hello', 'thank you', 'yes', 'no', 'love']

export default function TutorMode() {
  const words = useWordSigns()
  const language = useLanguageStore((s) => s.language)
  const init = useSignStore((s) => s.init)
  const { currentLesson, currentIndex, startLesson, recordScore, advance, resetLesson, isComplete, bestScores } = useLessonStore()
  const [phase, setPhase] = useState<Phase>('pick')
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<FeedbackMessage[]>([])
  const [trackingStatus, setTrackingStatus] = useState<'loading-model' | 'requesting-camera' | 'running' | 'denied' | 'no-camera' | 'error'>('loading-model')

  const recordBufferRef = useRef<number[][]>([])
  const recordStartRef = useRef(0)
  const recordingRef = useRef(false)

  // Reference trajectory for the current word (loaded from public/references/).
  const [refFrames, setRefFrames] = useState<number[][] | null>(null)
  const [refLoading, setRefLoading] = useState(false)
  const [refError, setRefError] = useState(false)
  const refFramesRef = useRef<number[][] | null>(null)

  // Keep the ref in sync so the onFrame callback can read latest without
  // being recreated (which would restart the camera loop).
  useEffect(() => {
    refFramesRef.current = refFrames
  }, [refFrames])

  useEffect(() => { void init() }, [init])

  // Start a lesson if not already in one.
  useEffect(() => {
    if (currentLesson.length === 0) {
      startLesson(DEFAULT_LESSON)
    }
  }, [currentLesson.length, startLesson])

  const currentWord = currentLesson[currentIndex] ?? DEFAULT_LESSON[0]
  const info = getWordInfo(currentWord)

  // Load reference trajectory whenever the word changes.
  useEffect(() => {
    let cancelled = false
    setRefLoading(true)
    setRefError(false)
    setRefFrames(null)
    loadReferenceTrajectory(currentWord, language).then((frames) => {
      if (cancelled) return
      if (frames) {
        setRefFrames(frames)
      } else {
        setRefError(true)
      }
      setRefLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [currentWord, language])

  // Record learner's attempt.
  const onFrame = useCallback((tracked: FullTrackedFrame) => {
    if (!recordingRef.current) return
    if (performance.now() - recordStartRef.current > 3000) {
      // Stop after 3 seconds.
      recordingRef.current = false
      const frames = recordBufferRef.current
      if (frames.length < 10) {
        setFeedback([{ message: 'Not enough hand data recorded. Try again with both hands visible.', kind: 'general' }])
        setPhase('watch')
        return
      }
      // Score against the reference trajectory for this word.
      const reference = refFramesRef.current
      if (!reference || reference.length === 0) {
        setFeedback([{ message: 'No reference available for this sign yet. Try another word!', kind: 'general' }])
        setPhase('watch')
        return
      }
      const result = dtw(reference, frames)
      const s = Math.round((1 - result.normalizedDistance) * 100)
      setScore(s)
      setFeedback(generateFeedback(frames, reference, result))
      recordScore(currentWord, s)
      setPhase('score')
      return
    }
    recordBufferRef.current.push(tracked.features)
  }, [currentWord, recordScore])

  const { videoRef, canvasRef, status, fps, handPresent } = useFullTracking({
    onFrame,
    drawOverlay: true,
    trackPose: true,
  })

  useEffect(() => { setTrackingStatus(status) }, [status])

  function handleStartRecord() {
    recordBufferRef.current = []
    recordStartRef.current = performance.now()
    recordingRef.current = true
    setPhase('record')
    setFeedback([])
  }

  function handleNextSign() {
    if (isComplete()) {
      resetLesson()
      setPhase('pick')
      return
    }
    advance()
    setPhase('watch')
    setFeedback([])
  }

  function handleRetry() {
    setPhase('watch')
    setFeedback([])
  }

  const lessonComplete = currentLesson.length > 0 && currentIndex >= currentLesson.length

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">3D Tutor</h1>
          <p className="mt-2 text-ink-700">
            Watch the avatar demonstrate a sign, then try it yourself. Get scored and get tips.
          </p>
        </div>
        <div className="flex gap-3 items-center">
          {!lessonComplete && currentLesson.length > 0 && (
            <span className="text-sm font-bold text-ink-500">
              Sign {currentIndex + 1} of {currentLesson.length}
            </span>
          )}
        </div>
      </div>

      {lessonComplete && (
        <div className="mt-8 p-8 rounded-3xl bg-leaf-50 border border-leaf-200 text-center">
          <p className="text-4xl">🎉</p>
          <h2 className="text-2xl font-black mt-4 text-leaf-800">Lesson Complete!</h2>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2 max-w-md mx-auto">
            {currentLesson.map((w) => {
              const best = bestScores[w]
              return (
                <div key={w} className="p-2 rounded-xl bg-white border border-leaf-100 text-center">
                  <p className="text-xs font-extrabold capitalize">{w}</p>
                  <p className={`text-lg font-black ${best >= 70 ? 'text-leaf-600' : best > 0 ? 'text-sun-600' : 'text-slate-300'}`}>
                    {best > 0 ? best : '-'}
                  </p>
                </div>
              )
            })}
          </div>
          <button
            type="button"
            onClick={handleNextSign}
            className="mt-6 px-6 py-3 rounded-full bg-coral-600 text-white font-extrabold hover:bg-coral-700 transition-colors"
          >
            Start New Lesson →
          </button>
        </div>
      )}

      {!lessonComplete && (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* Avatar side */}
          <div className="rounded-3xl bg-cream-100 border border-cream-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold capitalize">
                {info?.emoji} {currentWord}
              </h2>
              {phase !== 'record' && phase !== 'score' && (
                <span className="text-xs font-bold text-ink-400 bg-cream-200 px-2 py-1 rounded-full">
                  {refLoading ? 'Loading...' : refError ? 'No reference' : 'Watch the avatar'}
                </span>
              )}
            </div>
            {refLoading ? (
              <div className="aspect-square rounded-2xl bg-ink-900 flex items-center justify-center">
                <p className="text-cream-200 text-sm">Loading reference sign…</p>
              </div>
            ) : (
              <AvatarView
                featureFrames={refFrames ?? undefined}
                autoRotate={phase === 'watch' || phase === 'pick'}
                className="aspect-square"
              />
            )}
            {info && (
              <p className="mt-4 text-sm text-ink-600">{info.tip}</p>
            )}
            {refError && (
              <p className="mt-2 text-xs text-sun-700 bg-sun-50 rounded-xl p-2">
                ⚠️ No reference animation for this sign yet. You can still practice — your recording will be saved.
              </p>
            )}
          </div>

          {/* Learner camera side */}
          <div className="rounded-3xl bg-cream-100 border border-cream-200 p-6 flex flex-col">
            <h2 className="text-lg font-extrabold mb-4">Your turn</h2>
            <div className="flex-1">
              {phase === 'record' || phase === 'score' ? (
                <FullCameraView
                  videoRef={videoRef}
                  canvasRef={canvasRef}
                  status={trackingStatus}
                  fps={fps}
                  handPresent={handPresent}
                />
              ) : (
                <div className="aspect-square rounded-2xl bg-ink-900 flex items-center justify-center">
                  <p className="text-cream-200 text-sm text-center px-6">
                    Press "My Turn" when you're ready to sign
                  </p>
                </div>
              )}
            </div>

            {/* Score display */}
            {phase === 'score' && (
              <div className="mt-4 flex items-center gap-4 justify-center">
                <ScoreRing score={score} size={100} />
                <div className="text-left">
                  <p className="text-sm text-ink-500">Your score</p>
                  <p className={`text-3xl font-black ${
                    score >= 75 ? 'text-leaf-600' : score >= 50 ? 'text-sun-600' : 'text-coral-600'
                  }`}>
                    {score >= 75 ? 'Great!' : score >= 50 ? 'Good try' : 'Keep practicing'}
                  </p>
                </div>
              </div>
            )}

            <FeedbackBanner messages={feedback} onDismiss={() => setFeedback([])} />

            {/* Action buttons */}
            <div className="mt-4 flex gap-3 justify-center">
              {phase === 'watch' || phase === 'pick' ? (
                <>
                  <button
                    type="button"
                    onClick={handleStartRecord}
                    className="px-6 py-3 rounded-full bg-coral-600 text-white font-extrabold hover:bg-coral-700 transition-colors"
                  >
                    🎥 My Turn
                  </button>
                  <button
                    type="button"
                    onClick={handleNextSign}
                    className="px-6 py-3 rounded-full bg-cream-50 border-2 border-cream-300 text-ink-700 font-extrabold hover:bg-cream-200 transition-colors"
                  >
                    Skip →
                  </button>
                </>
              ) : phase === 'record' ? (
                <p className="text-sm font-bold text-coral-600 animate-pulse">
                  Sign now — recording your attempt…
                </p>
              ) : phase === 'score' ? (
                <>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="px-6 py-3 rounded-full bg-cream-50 border-2 border-cream-300 text-ink-700 font-extrabold hover:bg-cream-200 transition-colors"
                  >
                    🔄 Retry
                  </button>
                  <button
                    type="button"
                    onClick={handleNextSign}
                    className="px-6 py-3 rounded-full bg-coral-600 text-white font-extrabold hover:bg-coral-700 transition-colors"
                  >
                    Next sign →
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Best scores summary */}
      {Object.keys(bestScores).length > 0 && !lessonComplete && (
        <div className="mt-10">
          <h2 className="text-lg font-extrabold mb-3">Your scores</h2>
          <div className="flex flex-wrap gap-2">
            {words.filter((w) => bestScores[w.word] != null).map(({ word: w, emoji }) => (
              <div
                key={w}
                className={`px-3 py-2 rounded-xl text-sm font-extrabold capitalize ${
                  bestScores[w] >= 75
                    ? 'bg-leaf-100 text-leaf-700'
                    : bestScores[w] >= 50
                      ? 'bg-sun-100 text-sun-800'
                      : 'bg-coral-100 text-coral-700'
                }`}
              >
                {emoji} {w} — {bestScores[w]}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
