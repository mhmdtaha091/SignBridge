import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getWordInfo } from '../config/vocabResolver'
import { useSignStore } from '../store/useSignStore'

export default function WordDetail() {
  const { word } = useParams<{ word: string }>()
  const info = word ? getWordInfo(word) : undefined
  const init = useSignStore((s) => s.init)

  useEffect(() => {
    void init()
  }, [init])

  if (!info) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12 text-center">
        <h1 className="text-4xl font-black">Word not found</h1>
        <p className="mt-4 text-ink-600">
          "{word}" is not in the vocabulary yet.
        </p>
        <Link
          to="/words"
          className="mt-6 inline-block px-6 py-3 rounded-full bg-coral-600 text-white font-extrabold"
        >
          ← Back to words
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <Link
        to="/words"
        className="text-ink-500 hover:text-coral-600 text-sm font-medium"
      >
        ← All words
      </Link>

      <div className="mt-6 flex items-start gap-6">
        <span className="text-6xl">{info.emoji}</span>
        <div>
          <h1 className="text-4xl font-black capitalize">{info.word}</h1>
          <p className="mt-3 text-lg text-ink-700">{info.tip}</p>
          <span className="inline-block mt-3 px-3 py-1 rounded-full bg-cream-100 border border-cream-200 text-sm text-ink-500 font-medium capitalize">
            {info.category}
          </span>
        </div>
      </div>

      <div className="mt-10 flex gap-4">
        <Link
          to={`/practice-words?target=${info.word}`}
          className="px-6 py-3 rounded-full bg-coral-600 text-white font-extrabold hover:bg-coral-700 transition-colors"
        >
          Practice this sign →
        </Link>
        <Link
          to={`/interpret?mode=words`}
          className="px-6 py-3 rounded-full bg-cream-100 border-2 border-cream-300 text-ink-700 font-extrabold hover:bg-cream-200 transition-colors"
        >
          Try in interpreter →
        </Link>
      </div>
    </section>
  )
}
