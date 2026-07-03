const CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
]

interface Props {
  /** Normalized 63-dim feature vector (x,y,z per landmark, wrist at origin). */
  features: number[]
  className?: string
}

/**
 * Renders a recorded handshape as a friendly SVG skeleton — your own recorded
 * samples become the reference diagrams in the Learn gallery.
 *
 * NOTE: For learner-facing views (Learn gallery, Letter detail), prefer
 * HandSnapshot3D — it renders a 3D hand with depth cues that are much
 * easier to understand than a flat 2D skeleton. This component remains
 * useful for Data Studio previews and other contexts where a fast
 * lightweight SVG is preferable to a full WebGL canvas.
 */
export default function HandDiagram({ features, className }: Props) {
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i < 21; i++) {
    xs.push(features[i * 3])
    ys.push(features[i * 3 + 1])
  }

  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const span = Math.max(maxX - minX, maxY - minY) || 1
  const pad = 0.15 * span

  // Fit into a 100×100 viewBox, mirrored horizontally so it reads like the
  // viewer's own right hand seen in a mirror.
  const sx = (x: number) => 100 - ((x - minX + pad) / (span + 2 * pad)) * 100
  const sy = (y: number) => ((y - minY + pad) / (span + 2 * pad)) * 100

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {CONNECTIONS.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={sx(xs[a])}
          y1={sy(ys[a])}
          x2={sx(xs[b])}
          y2={sy(ys[b])}
          stroke="#FF6B4A"
          strokeWidth={3.2}
          strokeLinecap="round"
        />
      ))}
      {xs.map((x, i) => (
        <circle key={i} cx={sx(x)} cy={sy(ys[i])} r={3.4} fill="#FFB02E" />
      ))}
    </svg>
  )
}
