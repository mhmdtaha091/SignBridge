import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import HandDiagram from '../components/HandDiagram'
import { LETTERS } from '../config/vocab'
import { useSignStore } from '../store/useSignStore'
import type { SampleRecord } from '../store/samplesDb'

/** A representative recorded sample per letter (the middle one, by time). */
export function referenceByLetter(samples: SampleRecord[]): Map<string, number[]> {
  const grouped = new Map<string, SampleRecord[]>()
  for (const s of samples) {
    const list = grouped.get(s.label) ?? []
    list.push(s)
    grouped.set(s.label, list)
  }
  const refs = new Map<string, number[]>()
  for (const [label, list] of grouped) {
    list.sort((a, b) => a.createdAt - b.createdAt)
    refs.set(label, list[Math.floor(list.length / 2)].features)
  }
  return refs
}

export default function Learn() {
  const { samples, init } = useSignStore()

  useEffect(() => {
    void init()
  }, [init])

  const refs = useMemo(() => referenceByLetter(samples), [samples])

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-black">Learn the ASL alphabet</h1>
      <p className="mt-3 text-ink-700 max-w-2xl">
        Tap any letter for tips and practice. Once you record samples in the Data Studio, your
        own hands become the diagrams on these cards.
      </p>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        {LETTERS.map(({ letter, motion }) => {
          const ref = refs.get(letter)
          return (
            <Link
              key={letter}
              to={`/learn/${letter.toLowerCase()}`}
              className="group rounded-3xl bg-cream-100 border border-cream-200 p-4 text-center shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black">{letter}</span>
                {motion && (
                  <span className="text-[10px] font-extrabold bg-sky-100 text-sky-700 rounded-full px-2 py-0.5">
                    MOTION
                  </span>
                )}
              </div>
              {ref ? (
                <HandDiagram features={ref} className="mt-1 w-full aspect-square" />
              ) : (
                <div className="mt-1 w-full aspect-square grid place-items-center text-4xl text-ink-300 group-hover:text-ink-500 transition-colors">
                  ✋
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
