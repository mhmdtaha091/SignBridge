import { useCallback, useEffect, useRef, useState } from 'react'
import CameraView from '../components/CameraView'
import FullCameraView from '../components/FullCameraView'
import { useLetters } from '../config/vocabResolver'
import { useLanguageStore } from '../store/useLanguageStore'
import Button from '../components/ui/Button'
import { leaveOneOutAccuracy } from '../recognition/knn'
import { useSignStore, sampleCounts } from '../store/useSignStore'
import { useFullTracking, type FullTrackingStatus } from '../vision/useFullTracking'
import type { TrackedFrame } from '../vision/useHandTracking'
import type { FullTrackedFrame } from '../vision/types'

const SAMPLES_PER_RUN = 15
const TARGET_PER_LETTER = 15
const CAPTURE_INTERVAL_MS = 130

type RecordingPhase = 'idle' | 'countdown' | 'capturing'

export default function DataStudio() {
  const { samples, loaded, init, addSamples, deleteLabel, clearAll, importSamples, train, engine, mlp, mlpAccuracy, setEngine } =
    useSignStore()
  const language = useLanguageStore((s) => s.language)
  const letters = useLetters()
  const isPsl = language === 'psl'
  const [selected, setSelected] = useState('A')
  const [phase, setPhase] = useState<RecordingPhase>('idle')
  const [countdown, setCountdown] = useState(3)
  const [captured, setCaptured] = useState(0)
  const [looAcc, setLooAcc] = useState<number | null>(null)
  const [training, setTraining] = useState<{ epoch: number; total: number } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  // PSL tracking — uses FullTracking for both-hand capture.
  const [fullTrackingStatus, setFullTrackingStatus] = useState<FullTrackingStatus>('loading-model')

  useEffect(() => {
    void init()
  }, [init])

  const counts = sampleCounts(samples)
  const totalLetters = letters.filter((l) => (counts.get(l.letter) ?? 0) >= TARGET_PER_LETTER).length

  // Capture state lives in refs — onFrame fires from the vision loop, not React.
  const phaseRef = useRef<RecordingPhase>('idle')
  const bufferRef = useRef<number[][]>([])
  const lastCaptureRef = useRef(0)
  const selectedRef = useRef(selected)
  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  const startRecording = () => {
    setMessage(null)
    setLooAcc(null)
    setCaptured(0)
    bufferRef.current = []
    setPhase('countdown')
    phaseRef.current = 'countdown'
    setCountdown(3)
    let n = 3
    const tick = setInterval(() => {
      n -= 1
      if (n > 0) {
        setCountdown(n)
      } else {
        clearInterval(tick)
        setPhase('capturing')
        phaseRef.current = 'capturing'
      }
    }, 800)
  }

  const onFrame = useCallback(
    (tracked: TrackedFrame) => {
      if (phaseRef.current !== 'capturing' || !tracked.features) return
      if (tracked.timestampMs - lastCaptureRef.current < CAPTURE_INTERVAL_MS) return
      lastCaptureRef.current = tracked.timestampMs
      bufferRef.current.push(tracked.features)
      setCaptured(bufferRef.current.length)
      if (bufferRef.current.length >= SAMPLES_PER_RUN) {
        phaseRef.current = 'idle'
        setPhase('idle')
        const letter = selectedRef.current
        void addSamples(letter, bufferRef.current).then(() => {
          setMessage(`Saved ${SAMPLES_PER_RUN} samples for ${letter} ✓`)
        })
        bufferRef.current = []
      }
    },
    [addSamples],
  )

  // PSL full-tracking (both hands) — captures 159-dim features.
  const onFullFrame = useCallback(
    (tracked: FullTrackedFrame) => {
      if (phaseRef.current !== 'capturing' || !tracked.features?.length) return
      if (tracked.timestampMs - lastCaptureRef.current < CAPTURE_INTERVAL_MS) return
      lastCaptureRef.current = tracked.timestampMs
      bufferRef.current.push(tracked.features)
      setCaptured(bufferRef.current.length)
      if (bufferRef.current.length >= SAMPLES_PER_RUN) {
        phaseRef.current = 'idle'
        setPhase('idle')
        const letter = selectedRef.current
        void addSamples(letter, bufferRef.current).then(() => {
          setMessage(`Saved ${SAMPLES_PER_RUN} samples for ${letter} ✓`)
        })
        bufferRef.current = []
      }
    },
    [addSamples],
  )

  const { videoRef, canvasRef, status: ftStatus, fps } = useFullTracking({
    onFrame: onFullFrame,
    drawOverlay: true,
    trackPose: true,
  })
  useEffect(() => { setFullTrackingStatus(ftStatus) }, [ftStatus])

  const checkQuality = () => {
    setLooAcc(leaveOneOutAccuracy(samples))
  }

  const handleTrain = async () => {
    setTraining({ epoch: 0, total: 60 })
    setMessage(null)
    try {
      const acc = await train((epoch, total) => setTraining({ epoch, total }))
      setMessage(`Neural net trained — ${(acc * 100).toFixed(0)}% validation accuracy ✓`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Training failed.')
    } finally {
      setTraining(null)
    }
  }

  const exportJson = () => {
    const data = samples.map(({ label, features }) => ({ label, features }))
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `signbridge-samples-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (file: File) => {
    try {
      const added = await importSamples(JSON.parse(await file.text()))
      setMessage(`Imported ${added} samples ✓`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import failed.')
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-black">Data Studio</h1>
      <p className="mt-3 text-ink-700 max-w-2xl">
        Teach SignBridge your hands. Pick a letter, hold the handshape, and record a quick burst
        of samples — move your hand around a little while recording so the model learns every
        angle. Aim for {TARGET_PER_LETTER}+ samples per letter.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_minmax(320px,0.8fr)]">
        <div>
          {isPsl ? (
            <FullCameraView videoRef={videoRef} canvasRef={canvasRef} status={fullTrackingStatus} fps={fps}>
              {phase === 'countdown' && (
                <div className="absolute inset-0 grid place-items-center bg-ink-900/40">
                  <span className="text-8xl font-black text-white drop-shadow-lg" aria-live="assertive">
                    {countdown}
                  </span>
                </div>
              )}
              {phase === 'capturing' && (
                <div className="absolute bottom-4 inset-x-4">
                  <div className="bg-ink-900/70 backdrop-blur rounded-2xl p-3 text-center">
                    <p className="text-cream-50 font-extrabold">
                      Recording "{selected}" — show both hands, vary the angle
                    </p>
                    <div className="mt-2 h-3 rounded-full bg-ink-900/60 overflow-hidden">
                      <div
                        className="h-full bg-leaf-500 transition-all"
                        style={{ width: `${(captured / SAMPLES_PER_RUN) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </FullCameraView>
          ) : (
            <CameraView onFrame={onFrame}>
              {phase === 'countdown' && (
                <div className="absolute inset-0 grid place-items-center bg-ink-900/40">
                  <span className="text-8xl font-black text-white drop-shadow-lg" aria-live="assertive">
                    {countdown}
                  </span>
                </div>
              )}
              {phase === 'capturing' && (
                <div className="absolute bottom-4 inset-x-4">
                  <div className="bg-ink-900/70 backdrop-blur rounded-2xl p-3 text-center">
                    <p className="text-cream-50 font-extrabold">
                      Recording "{selected}" — keep the handshape, vary the angle
                    </p>
                    <div className="mt-2 h-3 rounded-full bg-ink-900/60 overflow-hidden">
                      <div
                        className="h-full bg-leaf-500 transition-all"
                        style={{ width: `${(captured / SAMPLES_PER_RUN) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CameraView>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              onClick={startRecording}
              disabled={phase !== 'idle'}
            >
              {phase === 'idle' ? `Record ${SAMPLES_PER_RUN} samples of "${selected}"` : 'Recording…'}
            </Button>
            {(counts.get(selected) ?? 0) > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => deleteLabel(selected)}
              >
                Delete "{selected}" samples ({counts.get(selected)})
              </Button>
            )}
          </div>
          {message && (
            <p role="status" className="mt-3 font-bold text-leaf-700">
              {message}
            </p>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="font-extrabold text-lg mb-3">
              Choose a letter
              <span className="ml-2 text-sm font-bold text-ink-500">
                {totalLetters}/{letters.length} ready
              </span>
            </h2>
            <div className="grid grid-cols-6 sm:grid-cols-7 gap-1.5">
              {letters.map(({ letter }) => {
                const count = counts.get(letter) ?? 0
                const ready = count >= TARGET_PER_LETTER
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => setSelected(letter)}
                    aria-pressed={selected === letter}
                    className={`relative aspect-square rounded-xl font-extrabold text-lg transition-all ${
                      selected === letter
                        ? 'bg-coral-500 text-white shadow-lift scale-105'
                        : ready
                          ? 'bg-leaf-100 text-leaf-700 hover:bg-leaf-100/70'
                          : count > 0
                            ? 'bg-sun-100 text-sun-700 hover:bg-sun-100/70'
                            : 'bg-cream-100 text-ink-500 hover:bg-cream-200'
                    }`}
                  >
                    {letter}
                    {count > 0 && (
                      <span className="absolute -top-1 -right-1 text-[10px] bg-ink-900 text-cream-50 rounded-full px-1 tabular-nums">
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-3xl bg-cream-100 border border-cream-200 p-5 space-y-4">
            <h2 className="font-extrabold text-lg">Recognition engine</h2>
            <p className="text-sm text-ink-700">
              {samples.length} samples recorded.{' '}
              {engine === 'mlp' && mlp
                ? `Using the trained neural net${mlpAccuracy ? ` (${(mlpAccuracy * 100).toFixed(0)}% val. accuracy)` : ''}.`
                : 'Using instant nearest-neighbour matching.'}
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="info"
                size="sm"
                onClick={checkQuality}
                disabled={samples.length < 10}
              >
                Check quality
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleTrain}
                disabled={samples.length < 30 || training !== null}
              >
                {training ? `Training… ${training.epoch}/${training.total}` : 'Train neural net'}
              </Button>
              {mlp && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEngine(engine === 'mlp' ? 'knn' : 'mlp')}
                >
                  Switch to {engine === 'mlp' ? 'KNN' : 'neural net'}
                </Button>
              )}
            </div>
            {looAcc !== null && (
              <p className="text-sm font-bold text-ink-900">
                Self-check accuracy: {(looAcc * 100).toFixed(1)}%{' '}
                <span className="font-normal text-ink-700">
                  (each sample classified against the rest)
                </span>
              </p>
            )}
          </div>

          <div className="rounded-3xl bg-cream-100 border border-cream-200 p-5 space-y-3">
            <h2 className="font-extrabold text-lg">Your data, your hands</h2>
            <p className="text-sm text-ink-700">
              Samples are hand-landmark coordinates only — never video — and stay in this
              browser. Export to back up, move devices, or contribute to the community dataset.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={exportJson}
                disabled={samples.length === 0}
              >
                Export JSON
              </Button>
              <label className="inline-flex items-center justify-center gap-2 font-extrabold rounded-full transition-colors px-4 py-2 bg-cream-50 border-2 border-cream-300 text-ink-700 cursor-pointer hover:bg-cream-200">
                Import JSON
                <input
                  type="file"
                  accept="application/json"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void handleImport(f)
                    e.target.value = ''
                  }}
                />
              </label>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (confirm('Delete ALL recorded samples and the trained model?')) void clearAll()
                }}
                disabled={samples.length === 0}
              >
                Clear everything
              </Button>
            </div>
          </div>

          {/* ── Community dataset contribution ────────────────────────── */}
          <div className="rounded-3xl bg-leaf-50 border border-leaf-200 p-5 space-y-3">
            <h2 className="font-extrabold text-lg flex items-center gap-2">
              🌍 Community Dataset
              <span className="text-xs font-bold bg-leaf-200 text-leaf-700 px-2 py-0.5 rounded-full">CC0</span>
            </h2>
            <p className="text-sm text-ink-700">
              SignBridge improves when more people contribute. Exported files contain only
              landmark coordinates (63 or 159 numbers per frame) — <strong>no images, no
              video, no identifying information</strong>. By contributing, you dedicate your
              landmark samples to the public domain (CC0) so they can help build better sign
              language recognition for everyone.
            </p>
            <p className="text-xs text-ink-500">
              Contribute via{' '}
              <a
                href="https://github.com/mhmdtaha091/SignBridge/issues/new?labels=community-dataset&title=Community+dataset+contribution"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-leaf-700 hover:underline"
              >
                GitHub Issues ↗
              </a>{' '}
              — attach your exported JSON and optionally note which signs and how many
              samples are included.
            </p>
          </div>

          {!loaded && <p className="text-ink-500">Loading your samples…</p>}
        </div>
      </div>
    </section>
  )
}
