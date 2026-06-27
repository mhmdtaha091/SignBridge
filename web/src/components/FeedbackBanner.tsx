export interface FeedbackMessage {
  message: string
  /** 'raise' | 'tuck' | 'speed' | 'general' */
  kind: 'raise' | 'tuck' | 'speed' | 'general'
}

interface Props {
  messages: FeedbackMessage[]
  onDismiss?: () => void
}

const ICONS: Record<string, string> = {
  raise: '⬆️',
  tuck: '🤏',
  speed: '⏱️',
  general: '💡',
}

export default function FeedbackBanner({ messages, onDismiss }: Props) {
  if (messages.length === 0) return null

  return (
    <div className="mt-4 space-y-2 animate-slide-up" role="alert">
      {messages.map((msg, i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-4 rounded-2xl bg-sun-50 border border-sun-200 text-ink-800"
        >
          <span className="text-xl shrink-0">{ICONS[msg.kind] ?? '💡'}</span>
          <p className="text-sm font-medium flex-1">{msg.message}</p>
          {onDismiss && i === messages.length - 1 && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-ink-400 hover:text-ink-600 shrink-0 text-xs font-bold"
              aria-label="Dismiss feedback"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
