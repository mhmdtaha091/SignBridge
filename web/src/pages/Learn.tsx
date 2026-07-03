import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import LazyHandSnapshot3D from '../components/LazyHandSnapshot3D'
import { useLetters } from '../config/vocabResolver'
import { referenceByLetter } from '../store/reference'
import { useLanguageStore } from '../store/useLanguageStore'
import { useSignStore, effectiveSamples } from '../store/useSignStore'
import { LANGUAGES } from '../config/language'

export default function Learn() {
  const letters = useLetters()
  const language = useLanguageStore((s) => s.language)
  const { samples, init, usingStarter, starterSamples } = useSignStore()

  useEffect(() => {
    void init()
  }, [init])

  const refs = useMemo(
    () => referenceByLetter(effectiveSamples({ samples, usingStarter, starterSamples })),
    [samples, usingStarter, starterSamples],
  )

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-black">Learn the {LANGUAGES[language].name} alphabet</h1>
      <p className="mt-3 text-ink-700 max-w-2xl">
        Tap any letter for tips and practice. Once you record samples in the Data Studio, your
        own hands become the 3D models on these cards.
      </p>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        {letters.map(({ letter, motion }) => {
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
                <LazyHandSnapshot3D features={ref} className="mt-1 w-full aspect-square" />
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
