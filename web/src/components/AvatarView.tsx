import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { featureToPose, featureSequenceToVector3Frames } from '../tutor/featureConverter'
import { defaultPose } from './ProceduralHand'

/**
 * A 3D hand avatar using CapsuleGeometry for organic-looking fingers
 * and a proper palm body — not a wireframe skeleton.
 *
 * Animates smoothly between frames when given a sequence.
 */

interface Props {
  frames?: THREE.Vector3[][]
  pose?: THREE.Vector3[]
  featureFrames?: number[][]
  featurePose?: number[]
  autoRotate?: boolean
  className?: string
}

// ── Colors ────────────────────────────────────────────────────────────────

const SKIN = '#D4A574'
const PALM_DARK = '#C4956A'
const NAIL = '#F0DCC8'
const PALM_LIGHT = '#DEB887'

// ── Bone pairs (for animated finger segments between landmarks) ──────────

const BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
]

const MCP_SET = new Set([1, 5, 9, 13, 17])
const TIP_SET = new Set([4, 8, 12, 16, 20])

// Radius per bone pair
function boneRadius(a: number, b: number): number {
  // Palm connections
  if (a === 0) return 0.04
  // Finger bones — taper from MCP (thick) to tip (thin)
  const chainPos = b % 4 // rough position along finger
  return THREE.MathUtils.lerp(0.04, 0.018, chainPos / 4)
}

function boneColor(a: number, b: number): string {
  if (a === 0) return PALM_DARK
  if (b === 4 || b === 8 || b === 12 || b === 16 || b === 20) return NAIL
  return SKIN
}

function jointColor(i: number): string {
  if (i === 0) return PALM_DARK
  if (TIP_SET.has(i)) return NAIL
  return SKIN
}

function jointRadius(i: number): number {
  if (i === 0) return 0.045
  if (MCP_SET.has(i)) return 0.042
  if (TIP_SET.has(i)) return 0.018
  return 0.028
}

// ── Animated hand mesh ────────────────────────────────────────────────────

function AnimatedHand({
  frames,
  pose,
  featureFrames,
  featurePose,
}: {
  frames?: THREE.Vector3[][]
  pose?: THREE.Vector3[]
  featureFrames?: number[][]
  featurePose?: number[]
}) {
  const groupRef = useRef<THREE.Group>(null)
  const animTimeRef = useRef(0)
  const capsuleRefs = useRef<(THREE.Mesh | null)[]>(new Array(BONES.length).fill(null))
  const jointRefs = useRef<(THREE.Mesh | null)[]>(new Array(21).fill(null))
  const palmRef = useRef<THREE.Mesh | null>(null)

  // Convert feature arrays
  const convertedFrames = useMemo(
    () => (featureFrames ? featureSequenceToVector3Frames(featureFrames) : undefined),
    [featureFrames],
  )
  const convertedPose = useMemo(
    () => (featurePose ? featureToPose(featurePose) : undefined),
    [featurePose],
  )

  const effectiveFrames = frames ?? convertedFrames
  const effectivePose = pose ?? convertedPose

  const verts = useMemo(() => {
    if (effectivePose && effectivePose.length >= 21) return effectivePose
    if (effectiveFrames && effectiveFrames.length > 0) return effectiveFrames[0]
    return defaultPose()
  }, [effectivePose, effectiveFrames])

  // Palm center for the initial render
  const palmCenter = useMemo(() => {
    const wrist = verts[0]
    const middleMcp = verts[9]
    if (!wrist || !middleMcp) return new THREE.Vector3(0, -0.04, -0.02)
    return new THREE.Vector3().addVectors(wrist, middleMcp).multiplyScalar(0.55)
  }, [verts])

  const palmRadius = useMemo(() => {
    const im = verts[5]
    const pm = verts[17]
    if (!im || !pm) return 0.04
    return new THREE.Vector3().subVectors(im, pm).length() * 0.55
  }, [verts])

  // Animation loop
  useFrame((_, delta) => {
    if (!effectiveFrames || effectiveFrames.length < 2) return
    animTimeRef.current += delta
    const frameDuration = 0.1
    const idx = Math.floor(animTimeRef.current / frameDuration) % effectiveFrames.length
    const nidx = (idx + 1) % effectiveFrames.length
    const cur = effectiveFrames[idx]
    const next = effectiveFrames[nidx]
    if (!cur || !next) return

    const t = (animTimeRef.current / frameDuration) % 1
    const lerp = (i: number) => new THREE.Vector3().lerpVectors(cur[i], next[i], t)

    // Update capsules (bones)
    capsuleRefs.current.forEach((mesh, bi) => {
      if (!mesh) return
      const [a, b] = BONES[bi]
      const from = lerp(a)
      const to = lerp(b)
      const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5)
      const dir = new THREE.Vector3().subVectors(to, from)
      const len = dir.length()
      if (len < 0.001) return
      mesh.position.copy(mid)
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
      // Scale the capsule to match
      const r = boneRadius(a, b)
      const bodyLen = Math.max(0.001, len - r * 2)
      mesh.scale.set(1, bodyLen / (mesh.userData.baseLen || 1), 1)
    })

    // Update joints
    jointRefs.current.forEach((mesh, ji) => {
      if (!mesh) return
      mesh.position.copy(lerp(ji))
    })

    // Update palm center
    if (palmRef.current) {
      const w = lerp(0)
      const mm = lerp(9)
      const pc = new THREE.Vector3().addVectors(w, mm).multiplyScalar(0.55)
      palmRef.current.position.copy(pc)
    }
  })

  return (
    <group ref={groupRef} scale={[2.5, -2.5, 2.5]} position={[0, -0.2, 0]}>
      {/* Palm body */}
      <mesh ref={palmRef} position={palmCenter} scale={[1, 0.6, 0.5]}>
        <sphereGeometry args={[palmRadius, 16, 12]} />
        <meshStandardMaterial color={PALM_LIGHT} roughness={0.7} metalness={0.02} />
      </mesh>

      {/* Bone capsules */}
      {BONES.map(([a, b], bi) => {
        const from = verts[a]
        const to = verts[b]
        if (!from || !to) return null
        const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5)
        const dir = new THREE.Vector3().subVectors(to, from)
        const len = dir.length()
        if (len < 0.001) return null
        const r = boneRadius(a, b)
        const bodyLen = Math.max(0.001, len - r * 2)
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir.normalize(),
        )
        return (
          <mesh
            key={`b-${a}-${b}`}
            ref={(el) => { capsuleRefs.current[bi] = el }}
            position={mid}
            quaternion={quat}
            userData={{ baseLen: bodyLen }}
          >
            <capsuleGeometry args={[r, bodyLen, 8, 12]} />
            <meshStandardMaterial
              color={boneColor(a, b)}
              roughness={0.7}
              metalness={0.02}
            />
          </mesh>
        )
      })}

      {/* Joint spheres */}
      {verts.map((v, i) => (
        <mesh
          key={`j-${i}`}
          ref={(el) => { jointRefs.current[i] = el }}
          position={v}
        >
          <sphereGeometry args={[jointRadius(i), 12, 8]} />
          <meshStandardMaterial
            color={jointColor(i)}
            roughness={0.65}
            metalness={0.02}
          />
        </mesh>
      ))}
    </group>
  )
}

// ── Export ────────────────────────────────────────────────────────────────

export default function AvatarView({
  frames,
  pose,
  featureFrames,
  featurePose,
  autoRotate = true,
  className,
}: Props) {
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
        <AnimatedHand
          frames={frames}
          pose={pose}
          featureFrames={featureFrames}
          featurePose={featurePose}
        />
        {autoRotate && (
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={1}
            target={[0, -0.15, 0]}
          />
        )}
      </Canvas>
    </div>
  )
}
