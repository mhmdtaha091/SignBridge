import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import HandSnapshot3D from '../components/HandSnapshot3D'
import { LinkButton } from '../components/ui/Button'
import { getLetterInfo } from '../config/vocabResolver'
import { useLanguageStore } from '../store/useLanguageStore'
import { referenceByLetter } from '../store/reference'
import { effectiveSamples, sampleCounts, useSignStore } from '../store/useSignStore'

export default function LetterDetail() {
  const { letter: param } = useParams()
  const letter = (param ?? '').toUpperCase()
  const language = useLanguageStore((s) => s.language)
  const info = getLetterInfo(letter)
  const { samples, init, usingStarter, starterSamples } = useSignStore()

  useEffect(() => {
    void init()
  }, [init])

  const ref = referenceByLetter(effectiveSamples({ samples, usingStarter, starterSamples })).get(
    letter,
  )
  const count = sampleCounts(samples).get(letter) ?? 0

  if (!info) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl font-black">That's not a letter we know</h1>
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
            <HandSnapshot3D features={ref} className="mt-2 w-full aspect-square" />
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
          <h1 className="text-3xl font-black">How to sign "{info.letter}"</h1>
          <p className="mt-3 text-lg text-ink-700">{info.tip}</p>
          {info.motion && (
            <p className="mt-3 rounded-2xl bg-sky-100 text-sky-700 font-bold p-4 text-sm">
              This letter involves motion in real ASL. SignBridge recognizes its final handshape
              — follow the link below to see the full movement.
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton to="/practice">
              Practice it live
            </LinkButton>
            {language === 'asl' ? (
              <LinkButton
                variant="secondary"
                href={`https://www.lifeprint.com/asl101/fingerspelling/abc.htm#${info.letter.toLowerCase()}`}
                target="_blank"
                rel="noreferrer"
              >
                See it signed (Lifeprint) ↗
              </LinkButton>
            ) : (
              <LinkButton
                variant="secondary"
                href={`https://www.youtube.com/results?search_query=PSL+pakistan+sign+language+letter+${info.letter}`}
                target="_blank"
                rel="noreferrer"
              >
                Find PSL video reference ↗
              </LinkButton>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
