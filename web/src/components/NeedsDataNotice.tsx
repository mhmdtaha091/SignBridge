import { Link } from 'react-router-dom'

/** Friendly empty state shown when a live feature has no training data yet. */
export default function NeedsDataNotice({ feature }: { feature: string }) {
  return (
    <div className="rounded-3xl bg-sun-100 border-2 border-sun-400/40 p-8 text-center">
      <span className="text-5xl" aria-hidden="true">
        👋
      </span>
      <h2 className="mt-4 text-2xl font-extrabold">First, teach SignBridge your hands</h2>
      <p className="mt-2 text-ink-700 max-w-md mx-auto">
        {feature} uses a tiny model trained on <em>your</em> hands, right in your browser. Record
        a few quick samples per letter in the Data Studio — about ten minutes for the whole
        alphabet — and you’re set.
      </p>
      <Link
        to="/studio"
        className="inline-block mt-5 px-6 py-3 rounded-full bg-coral-500 hover:bg-coral-600 text-white font-extrabold shadow-soft transition-colors"
      >
        Open the Data Studio
      </Link>
    </div>
  )
}
