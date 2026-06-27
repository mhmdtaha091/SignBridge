import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

/**
 * A stylized 3D hand avatar built from MediaPipe landmarks.
 *
 * Each frame = 21 3D points (x,y,z normalized). The avatar renders:
 * - Bone segments connecting the landmark topology
 * - Small spheres at each joint
 * - A subtle auto-rotation for depth perception
 *
 * Animates between frames when given a sequence.
 */

interface Props {
  /** Landmark sequence to animate. 21 landmarks per frame. */
  frames?: THREE.Vector3[][]
  /** Static pose to display (21 landmarks). */
  pose?: THREE.Vector3[]
  /** Auto-rotate speed (0 = disabled). */
  autoRotate?: boolean
  className?: string
}

// MediaPipe hand bone topology (same as drawing.ts).
const BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],   // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],   // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17], // palm edge
]

function HandMesh({ frames, pose }: { frames?: THREE.Vector3[][]; pose?: THREE.Vector3[] }) {
  const groupRef = useRef<THREE.Group>(null)
  const frameIndexRef = useRef(0)
  const animTimeRef = useRef(0)

  // Current frame vertices.
  const verts = useMemo(() => {
    if (pose && pose.length >= 21) return pose
    if (frames && frames.length > 0) return frames[0]
    // Default open-palm pose.
    return defaultPose()
  }, [pose, frames])

  useFrame((_, delta) => {
    if (!frames || frames.length < 2) return
    animTimeRef.current += delta
    const frameDuration = 0.1 // 100ms per frame
    frameIndexRef.current = Math.floor(animTimeRef.current / frameDuration) % frames.length

    // Lerp between current and next frame.
    const cur = frames[frameIndexRef.current]
    const next = frames[(frameIndexRef.current + 1) % frames.length]
    if (!groupRef.current || !cur || !next) return

    const t = (animTimeRef.current / frameDuration) % 1
    groupRef.current.children.forEach((bone, i) => {
      if (i < BONES.length) {
        const [a, b] = BONES[i]
        const mid = new THREE.Vector3().lerpVectors(
          new THREE.Vector3().lerpVectors(cur[a], next[a], t),
          new THREE.Vector3().lerpVectors(cur[b], next[b], t),
          0.5,
        )
        bone.position.copy(mid)
      }
    })
  })

  return (
    <group ref={groupRef} scale={[2.5, -2.5, 2.5]} position={[0, -0.2, 0]}>
      {/* Bones */}
      {BONES.map(([a, b]) => {
        const from = verts[a]
        const to = verts[b]
        if (!from || !to) return null
        const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5)
        const dir = new THREE.Vector3().subVectors(to, from)
        const len = dir.length()
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir.normalize(),
        )
        return (
          <mesh key={`${a}-${b}`} position={mid} quaternion={quat}>
            <cylinderGeometry args={[0.012, 0.012, len, 8]} />
            <meshStandardMaterial color="#FFB02E" />
          </mesh>
        )
      })}
      {/* Joints */}
      {verts.map((v, i) => (
        <mesh key={`j-${i}`} position={v}>
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshStandardMaterial color={i === 0 ? '#FF6B4A' : '#FFB02E'} />
        </mesh>
      ))}
    </group>
  )
}

function defaultPose(): THREE.Vector3[] {
  // A simplified open palm in the same normalized space as MediaPipe.
  const pts: [number, number, number][] = [
    [0, 0, 0], [0.03, -0.06, 0.01], [0.06, -0.10, 0.02], [0.08, -0.14, 0.03], [0.09, -0.17, 0.04], // thumb
    [0.01, -0.08, 0], [0.02, -0.17, 0.01], [0.02, -0.24, 0.02], [0.02, -0.30, 0.03], // index
    [0, -0.07, 0], [0, -0.18, 0.01], [0, -0.26, 0.02], [0, -0.32, 0.03], // middle
    [-0.01, -0.06, 0], [-0.02, -0.16, 0.01], [-0.03, -0.23, 0.02], [-0.04, -0.28, 0.03], // ring
    [-0.02, -0.05, 0], [-0.04, -0.14, 0.01], [-0.05, -0.20, 0.02], [-0.06, -0.25, 0.03], // pinky
  ]
  return pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))
}

export default function AvatarView({ frames, pose, autoRotate = true, className }: Props) {
  return (
    <div className={`rounded-3xl overflow-hidden bg-ink-900 ${className ?? ''}`}>
      <Canvas
        camera={{ position: [0, 0, 1.5], fov: 45 }}
        style={{ width: '100%', aspectRatio: '1' }}
        gl={{ antialias: true, alpha: false }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 2, 2]} intensity={0.8} />
        <directionalLight position={[-1, -1, -1]} intensity={0.3} />
        <HandMesh frames={frames} pose={pose} />
        {autoRotate && <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={1}
          target={[0, -0.15, 0]}
        />}
      </Canvas>
    </div>
  )
}
