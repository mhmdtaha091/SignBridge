import * as THREE from 'three'

/**
 * A proper 3D hand built from 21 MediaPipe landmarks.
 * Uses CapsuleGeometry for fingers (rounded, organic), a filled palm body,
 * and skin-tone materials. Looks like a stylized hand, not a wireframe.
 */

// ── Colors ────────────────────────────────────────────────────────────────

const SKIN = '#D4A574'
const PALM_DARK = '#C4956A'
const NAIL = '#F0DCC8'
const PALM_LIGHT = '#DEB887'

// ── Finger chains ─────────────────────────────────────────────────────────

export const FINGER_CHAINS: Record<string, number[]> = {
  thumb: [0, 1, 2, 3, 4],
  index: [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring: [13, 14, 15, 16],
  pinky: [17, 18, 19, 20],
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Place a capsule between two points. CapsuleGeometry = cylinder + two hemispherical caps. */
function CapsuleBetween({
  from,
  to,
  radius,
  color,
}: {
  from: THREE.Vector3
  to: THREE.Vector3
  radius: number
  color: string
}) {
  const dir = new THREE.Vector3().subVectors(to, from)
  const len = dir.length()
  if (len < 0.001) return null

  // CapsuleGeometry(length, radius) creates a capsule along Y axis
  // of total height = length + 2*radius
  const bodyLen = Math.max(0.001, len - radius * 2)
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5)
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.normalize(),
  )

  return (
    <mesh position={mid} quaternion={quat}>
      <capsuleGeometry args={[radius, bodyLen, 8, 12]} />
      <meshStandardMaterial
        color={color}
        roughness={0.7}
        metalness={0.02}
      />
    </mesh>
  )
}

/** A sphere joint. */
function Joint({
  pos,
  radius,
  color,
}: {
  pos: THREE.Vector3
  radius: number
  color: string
}) {
  return (
    <mesh position={pos}>
      <sphereGeometry args={[radius, 12, 8]} />
      <meshStandardMaterial color={color} roughness={0.65} metalness={0.02} />
    </mesh>
  )
}

// ── Palm body ─────────────────────────────────────────────────────────────

/**
 * Build a palm-like body from the wrist + MCP landmarks.
 * Uses overlapping capsules + a central sphere to create a rounded palm shape.
 */
function PalmBody({ verts }: { verts: THREE.Vector3[] }) {
  const wrist = verts[0]
  const indexMcp = verts[5]
  const middleMcp = verts[9]
  const pinkyMcp = verts[17]
  const thumbBase = verts[1]

  if (!wrist || !middleMcp) return null

  // Palm center (roughly halfway between wrist and middle MCP)
  const palmCenter = new THREE.Vector3().addVectors(wrist, middleMcp).multiplyScalar(0.55)
  // Slightly behind the plane of landmarks for depth
  palmCenter.z -= 0.02

  // Width of palm
  const palmWidth = indexMcp && pinkyMcp
    ? new THREE.Vector3().subVectors(indexMcp, pinkyMcp).length()
    : 0.06

  const palmRadius = palmWidth * 0.55

  return (
    <>
      {/* Central palm blob — flattened sphere */}
      <mesh position={palmCenter} scale={[1, 0.6, 0.5]}>
        <sphereGeometry args={[palmRadius, 16, 12]} />
        <meshStandardMaterial
          color={PALM_LIGHT}
          roughness={0.7}
          metalness={0.02}
        />
      </mesh>

      {/* Wrist to palm center */}
      {wrist && (
        <CapsuleBetween from={wrist} to={palmCenter} radius={palmRadius * 0.55} color={PALM_DARK} />
      )}

      {/* Palm to thumb base */}
      {thumbBase && (
        <CapsuleBetween from={palmCenter} to={thumbBase} radius={palmRadius * 0.45} color={PALM_DARK} />
      )}

      {/* Palm to index MCP */}
      {indexMcp && (
        <CapsuleBetween from={palmCenter} to={indexMcp} radius={palmRadius * 0.45} color={PALM_LIGHT} />
      )}

      {/* Palm to pinky MCP */}
      {pinkyMcp && (
        <CapsuleBetween from={palmCenter} to={pinkyMcp} radius={palmRadius * 0.4} color={PALM_LIGHT} />
      )}

      {/* Heel of palm (wrist area) */}
      {wrist && (
        <Joint pos={wrist} radius={palmRadius * 0.55} color={PALM_DARK} />
      )}
    </>
  )
}

// ── Complete finger ───────────────────────────────────────────────────────

function Finger({ indices, verts }: { indices: number[]; verts: THREE.Vector3[] }) {
  const segments: Array<{
    from: THREE.Vector3
    to: THREE.Vector3
    r: number
    color: string
  }> = []

  for (let s = 0; s < indices.length - 1; s++) {
    const from = verts[indices[s]]
    const to = verts[indices[s + 1]]
    if (!from || !to) continue

    // Taper from base to tip
    const t = s / Math.max(1, indices.length - 2)
    const r = THREE.MathUtils.lerp(0.04, 0.018, t)
    const isTip = s === indices.length - 2
    segments.push({ from, to, r, color: isTip ? NAIL : SKIN })
  }

  return (
    <>
      {segments.map((seg, i) => (
        <CapsuleBetween key={i} {...seg} radius={seg.r} color={seg.color} />
      ))}
    </>
  )
}

// ── Joint bumps at knuckles ───────────────────────────────────────────────

const MCP_SET = new Set([1, 5, 9, 13, 17])

function Knuckles({ verts }: { verts: THREE.Vector3[] }) {
  return (
    <>
      {verts.map((v, i) => {
        const isMcp = MCP_SET.has(i)
        const isWrist = i === 0
        const isTip = i === 4 || i === 8 || i === 12 || i === 16 || i === 20
        if (isWrist) return null // wrist handled by palm
        if (isTip) {
          // Fingertip cap
          return <Joint key={`tip-${i}`} pos={v} radius={0.018} color={NAIL} />
        }
        return (
          <Joint
            key={`j-${i}`}
            pos={v}
            radius={isMcp ? 0.042 : 0.028}
            color={SKIN}
          />
        )
      })}
    </>
  )
}

// ── Public: filled hand (for gallery) ─────────────────────────────────────

interface Props {
  verts: THREE.Vector3[]
}

export function FilledHand({ verts }: Props) {
  return (
    <group scale={[2.5, -2.5, 2.5]} position={[0, -0.2, 0]}>
      <PalmBody verts={verts} />
      {Object.values(FINGER_CHAINS).map((chain, i) => (
        <Finger key={i} indices={chain} verts={verts} />
      ))}
      <Knuckles verts={verts} />
    </group>
  )
}

// ── Default open palm ─────────────────────────────────────────────────────

export function defaultPose(): THREE.Vector3[] {
  const pts: [number, number, number][] = [
    [0, 0, 0], [0.03, -0.06, 0.01], [0.06, -0.10, 0.02], [0.08, -0.14, 0.03], [0.09, -0.17, 0.04],
    [0.01, -0.08, 0], [0.02, -0.17, 0.01], [0.02, -0.24, 0.02], [0.02, -0.30, 0.03],
    [0, -0.07, 0], [0, -0.18, 0.01], [0, -0.26, 0.02], [0, -0.32, 0.03],
    [-0.01, -0.06, 0], [-0.02, -0.16, 0.01], [-0.03, -0.23, 0.02], [-0.04, -0.28, 0.03],
    [-0.02, -0.05, 0], [-0.04, -0.14, 0.01], [-0.05, -0.20, 0.02], [-0.06, -0.25, 0.03],
  ]
  return pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))
}
