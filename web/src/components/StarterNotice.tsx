import { Link } from 'react-router-dom'

/**
 * Shown when recognition is running on the bundled starter model (the user
 * hasn't recorded their own data). Sets expectations and points to the upgrade.
 */
export default function StarterNotice({
  accuracy,
  className = '',
}: {
  accuracy: number | null
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl bg-leaf-50 border-2 border-leaf-500/30 px-5 py-4 text-sm ${className}`}
    >
      <p className="font-extrabold text-leaf-800">✨ Using the built-in ASL starter model</p>
      <p className="mt-1 text-ink-700">
        Trained on a public fingerspelling dataset
        {accuracy != null && <> (~{Math.round(accuracy * 100)}% held-out accuracy)</>} so it works
        right away. For best results on <em>your</em> hands, record a few samples in the{' '}
        <Link to="/studio" className="font-bold underline decoration-2 underline-offset-2">
          Data Studio
        </Link>
        .
      </p>
    </div>
  )
}
