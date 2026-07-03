import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { FilledHand } from './ProceduralHand'

/**
 * A lightweight 3D hand renderer for a single static hand pose.
 * Uses the filled procedural hand — palm surface, tapered fingers,
 * skin tones — so it looks like a real hand, not a wireframe.
 *
 * Designed for the Learn gallery and letter detail cards.
 */

interface Props {
  /** 63-dim (single hand) or 159-dim (full two-hand, extracts right hand). */
  features: number[]
  className?: string
}

function featuresToVectors(features: number[]): THREE.Vector3[] {
  const isFull = features.length === 159
  const offset = isFull ? 63 : 0
  const pts: THREE.Vector3[] = []
  for (let i = 0; i < 21; i++) {
    pts.push(
      new THREE.Vector3(
        features[offset + i * 3],
        features[offset + i * 3 + 1],
        features[offset + i * 3 + 2],
      ),
    )
  }
  return pts
}

function StaticHand({ features }: { features: number[] }) {
  const verts = useMemo(() => featuresToVectors(features), [features])
  return <FilledHand verts={verts} />
}

export default function HandSnapshot3D({ features, className }: Props) {
  return (
    <div
      className={`rounded-2xl overflow-hidden bg-ink-900 ${className ?? ''}`}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0.35, -0.18, 1.1], fov: 35 }}
        style={{ width: '100%', aspectRatio: '1' }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 2, 2]} intensity={0.7} />
        <directionalLight position={[-1, -0.5, -1]} intensity={0.3} />
        <StaticHand features={features} />
      </Canvas>
    </div>
  )
}
