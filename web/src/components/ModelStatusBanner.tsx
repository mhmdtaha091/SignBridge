/**
 * Shows the word-sign model's loading/ready/error status with a visual indicator.
 * Used by Interpret (Words mode), WordPractice, and WordLearn pages.
 */

interface Props {
  status: 'loading' | 'ready' | 'error' | 'idle'
  vocabSize?: number
  accuracy?: number
  errorMessage?: string
  onRetry?: () => void
  className?: string
}

export default function ModelStatusBanner({
  status,
  vocabSize,
  accuracy,
  errorMessage,
  onRetry,
  className,
}: Props) {
  if (status === 'idle') return null

  return (
    <div
      className={`rounded-2xl border p-4 text-sm ${className ?? ''} ${
        status === 'loading'
          ? 'bg-sky-50 border-sky-200 text-sky-800'
          : status === 'ready'
            ? 'bg-leaf-50 border-leaf-200 text-leaf-800'
            : 'bg-sun-50 border-sun-200 text-sun-800'
      }`}
      role="status"
    >
      <div className="flex items-center gap-2">
        {status === 'loading' && (
          <>
            <span className="inline-block w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            <span className="font-bold">Loading word recognition model…</span>
          </>
        )}
        {status === 'ready' && (
          <>
            <span className="text-lg">✅</span>
            <span className="font-bold">
              Model ready{vocabSize ? ` (${vocabSize} words)` : ''}
              {accuracy != null ? ` — ${Math.round(accuracy * 100)}% accurate` : ''}
            </span>
          </>
        )}
        {status === 'error' && (
          <div className="flex flex-wrap items-center gap-2 w-full">
            <span className="font-bold">⚠️ Model not available</span>
            <span className="flex-1 min-w-0 break-words">
              {errorMessage || 'Could not load the word recognition model.'}
            </span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="px-3 py-1 rounded-full bg-sun-200 hover:bg-sun-300 text-sun-900 font-bold text-xs transition-colors shrink-0"
              >
                Try again
              </button>
            )}
          </div>
        )}
      </div>
      {status === 'error' && (
        <p className="mt-2 text-xs opacity-75">
          You can still use fingerspelling (ABC mode) in the meantime.
        </p>
      )}
    </div>
  )
}
