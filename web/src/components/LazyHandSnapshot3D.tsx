import { useEffect, useRef, useState } from 'react'
import HandSnapshot3D from './HandSnapshot3D'

/**
 * Wraps HandSnapshot3D with an IntersectionObserver so the R3F Canvas is only
 * mounted when the card is near the viewport. This avoids the browser's WebGL
 * context cap (typically ~8–16 contexts) — the Learn gallery mounts 24+ cards.
 *
 * When not visible, renders a placeholder matching the same dimensions.
 */

interface Props {
  features: number[]
  className?: string
}

export default function LazyHandSnapshot3D({ features, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // If IntersectionObserver isn't available, just mount it.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }, // start loading before it's actually visible
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={className}>
      {visible ? (
        <HandSnapshot3D features={features} className="w-full aspect-square" />
      ) : (
        <div className="w-full aspect-square grid place-items-center text-4xl text-ink-300 bg-ink-900 rounded-2xl">
          ✋
        </div>
      )}
    </div>
  )
}
