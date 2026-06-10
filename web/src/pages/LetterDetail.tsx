import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import HandDiagram from '../components/HandDiagram'
import { letterInfo, lifeprintUrl } from '../config/vocab'
import { sampleCounts, useSignStore } from '../store/useSignStore'
import { referenceByLetter } from './Learn'

export default function LetterDetail() {
  const { letter: param } = useParams()
  const letter = (param ?? '').toUpperCase()
  const info = letterInfo(letter)
  const { samples, init } = useSignStore()

  useEffect(() => {
    void init()
  }, [init])

  const ref = useMemo(() => referenceByLetter(samples).get(letter), [samples, letter])
  const count = sampleCounts(samples).get(letter) ?? 0

  if (!info) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl font-black">That’s not a letter we know</h1>
        <Link to="/learn" className="inline-block mt-4 font-extrabold text-coral-700 hover:underline">
          ← Back to the alphabet
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/learn" className="font-extrabold text-coral-700 hover:underline">
        ← Alphabet
      </Link>

      <div className="mt-6 grid gap-8 sm:grid-cols-[minmax(220px,0.6fr)_1fr] items-start">
        <div className="rounded-3xl bg-cream-100 border border-cream-200 p-6 text-center">
          <p className="text-8xl font-black">{info.letter}</p>
          {ref ? (
            <HandDiagram features={ref} className="mt-2 w-full aspect-square" />
          ) : (
            <div className="mt-4 text-ink-500 text-sm">
              <p className="text-5xl mb-2" aria-hidden="true">✋</p>
              Record this letter in the{' '}
              <Link to="/studio" className="font-bold text-coral-700 hover:underline">
                Data Studio
              </Link>{' '}
              to see your own handshape here.
            </div>
          )}
          {count > 0 && (
            <p className="mt-2 text-xs font-bold text-ink-500">{count} samples recorded</p>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-black">How to sign “{info.letter}”</h1>
          <p className="mt-3 text-lg text-ink-700">{info.tip}</p>
          {info.motion && (
            <p className="mt-3 rounded-2xl bg-sky-100 text-sky-700 font-bold p-4 text-sm">
              This letter involves motion in real ASL. SignBridge recognizes its final handshape
              — follow the link below to see the full movement.
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/practice"
              className="px-5 py-2.5 rounded-full bg-coral-500 hover:bg-coral-600 text-white font-extrabold shadow-soft transition-colors"
            >
              Practice it live
            </Link>
            <a
              href={lifeprintUrl(info.letter)}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 rounded-full bg-cream-100 hover:bg-cream-200 border-2 border-cream-300 font-extrabold text-ink-700 transition-colors"
            >
              See it signed (Lifeprint) ↗
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
