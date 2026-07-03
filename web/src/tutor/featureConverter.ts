import * as THREE from 'three'

/**
 * Converts SignBridge normalized feature vectors to THREE.Vector3 arrays
 * that AvatarView can render.
 *
 * Feature vector layout (from vision/types.ts):
 *   [leftHand(63) | rightHand(63) | poseUpper(33)] = 159 total
 *   Each hand: 21 landmarks × (x, y, z)
 *
 * For avatar display we extract the right hand (indices 63–125) by default,
 * since the dominant signing hand is what learners need to see.
 */

const RIGHT_HAND_OFFSET = 63
const LANDMARK_COUNT = 21

/**
 * Convert a single 63-dim (single hand) or 159-dim (full) feature vector
 * to 21 THREE.Vector3 points for the right hand.
 */
export function featureToPose(features: number[]): THREE.Vector3[] {
  const isFull = features.length === 159
  const offset = isFull ? RIGHT_HAND_OFFSET : 0
  const pts: THREE.Vector3[] = []
  for (let i = 0; i < LANDMARK_COUNT; i++) {
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

/**
 * Convert a sequence of feature vectors to an array of THREE.Vector3[] frames
 * suitable for AvatarView animation.
 */
export function featureSequenceToVector3Frames(
  features: number[][],
): THREE.Vector3[][] {
  return features.map((f) => featureToPose(f))
}
