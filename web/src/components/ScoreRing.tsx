interface Props {
  score: number // 0–100
  size?: number
}

export default function ScoreRing({ score, size = 120 }: Props) {
  const r = 44
  const circ = 2 * Math.PI * r
  const pct = Math.min(1, Math.max(0, score / 100))
  const color =
    score >= 75 ? '#3CB878' // leaf
    : score >= 50 ? '#F59E0B' // amber
    : '#EF4444' // red

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className="-rotate-90"
      aria-label={`Score: ${score} out of 100`}
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <circle cx="50" cy="50" r={r} fill="none" stroke="#E2D9C9" strokeWidth="7" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${pct * circ} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.6s ease-out' }}
      />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-[18px] font-black"
        fill={color}
        transform="rotate(90 50 50)"
      >
        {Math.round(score)}
      </text>
    </svg>
  )
}
