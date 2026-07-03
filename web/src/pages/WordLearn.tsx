import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWordSigns } from '../config/vocabResolver'
import { useLanguageStore } from '../store/useLanguageStore'
import { LANGUAGES } from '../config/language'
import type { WordInfo } from '../config/vocab'
import { useSignStore } from '../store/useSignStore'

const CATEGORY_NAMES: Record<string, string> = {
  greeting: 'Greetings',
  need: 'Needs & Places',
  action: 'Actions',
  social: 'Social',
  food: 'Food & Drink',
}

export default function WordLearn() {
  const words = useWordSigns()
  const language = useLanguageStore((s) => s.language)
  const init = useSignStore((s) => s.init)
  const [modelAvailable, setModelAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    void init()
  }, [init])

  // Check if the word-sign model is available for the current language.
  useEffect(() => {
    const BASE = import.meta.env.BASE_URL
    const modelDir = language === 'psl' ? 'psl-gru-word-signs' : 'gru-word-signs'
    fetch(`${BASE}models/${modelDir}/vocab.json`, { method: 'HEAD' })
      .then((r) => setModelAvailable(r.ok))
      .catch(() => setModelAvailable(false))
  }, [language])

  const grouped = words.reduce<Record<string, WordInfo[]>>((acc, w) => {
    if (!acc[w.category]) acc[w.category] = []
    acc[w.category].push(w)
    return acc
  }, {})

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-black">{LANGUAGES[language].name} Word Signs</h1>
      <p className="mt-2 text-ink-700 max-w-xl">
        These are common {LANGUAGES[language].nativeName} signs you can use in everyday conversation.
        Tap a word to see the sign tip, then practice it live with your camera.
      </p>

      {Object.entries(CATEGORY_NAMES).map(([cat, label]) => {
        const words = grouped[cat]
        if (!words || words.length === 0) return null
        return (
          <div key={cat} className="mt-10">
            <h2 className="text-xl font-extrabold mb-4">{label}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {words.map((w) => (
                <Link
                  key={w.word}
                  to={`/words/${w.word}`}
                  className="group p-4 rounded-2xl bg-cream-100 border border-cream-200 hover:border-coral-300 hover:shadow-md transition-all"
                >
                  <span className="text-3xl">{w.emoji}</span>
                  <h3 className="mt-2 font-extrabold text-ink-900 group-hover:text-coral-600 transition-colors">
                    {w.word}
                  </h3>
                  <p className="mt-1 text-xs text-ink-500 line-clamp-2">{w.tip}</p>
                </Link>
              ))}
            </div>
          </div>
        )
      })}

      <div className="mt-12 flex gap-4 items-center flex-wrap">
        <Link
          to="/practice-words"
          className="px-6 py-3 rounded-full bg-coral-600 text-white font-extrabold hover:bg-coral-700 transition-colors"
        >
          Practice words →
        </Link>
        <Link
          to="/interpret?mode=words"
          className="px-6 py-3 rounded-full bg-cream-100 border-2 border-cream-300 text-ink-700 font-extrabold hover:bg-cream-200 transition-colors"
        >
          Free-form interpret →
        </Link>
        {modelAvailable === true && (
          <span className="px-3 py-1.5 rounded-full bg-leaf-100 text-leaf-700 text-xs font-bold">
            ✅ Model ready
          </span>
        )}
        {modelAvailable === false && (
          <span className="px-3 py-1.5 rounded-full bg-sun-100 text-sun-700 text-xs font-bold">
            ⚠️ Model not loaded
          </span>
        )}
      </div>
    </section>
  )
}
