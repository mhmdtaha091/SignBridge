/**
 * The recognition vocabulary. v0 is the ASL fingerspelling alphabet; word
 * signs join in a later milestone (see docs/ROADMAP.md). Swapping this file
 * (plus recorded data) is how another sign language gets added.
 */

export interface LetterInfo {
  letter: string
  tip: string
  /** True for letters whose real sign involves motion (J, Z). */
  motion?: boolean
}

export const LETTERS: LetterInfo[] = [
  { letter: 'A', tip: 'Closed fist, thumb resting against the side of your index finger.' },
  { letter: 'B', tip: 'Fingers straight up and together, thumb folded across your palm.' },
  { letter: 'C', tip: 'Curve your whole hand like you’re holding a cup — a clear letter C.' },
  { letter: 'D', tip: 'Index finger points up; thumb and other fingers form a circle.' },
  { letter: 'E', tip: 'Fingertips curl down to touch the thumb tucked across the palm.' },
  { letter: 'F', tip: 'Index fingertip touches the thumb in a circle; other three fingers up.' },
  { letter: 'G', tip: 'Index finger and thumb point sideways, parallel, like a tiny pinch.' },
  { letter: 'H', tip: 'Index and middle fingers point sideways together; the rest closed.' },
  { letter: 'I', tip: 'Pinky finger straight up, all other fingers in a fist.' },
  { letter: 'J', tip: 'Sign I, then trace a J in the air with your pinky.', motion: true },
  { letter: 'K', tip: 'Index and middle fingers up in a V; thumb touches the middle finger’s base.' },
  { letter: 'L', tip: 'Index up and thumb out — your hand makes a clear capital L.' },
  { letter: 'M', tip: 'Thumb tucks under your first three fingers folded over it.' },
  { letter: 'N', tip: 'Thumb tucks under your first two fingers folded over it.' },
  { letter: 'O', tip: 'All fingertips meet the thumb in a round O shape.' },
  { letter: 'P', tip: 'Like K, but tipped to point downward.' },
  { letter: 'Q', tip: 'Like G, but pointing downward — thumb and index hang parallel.' },
  { letter: 'R', tip: 'Cross your index and middle fingers, the rest closed.' },
  { letter: 'S', tip: 'A solid fist with your thumb closed across the front of the fingers.' },
  { letter: 'T', tip: 'Thumb pokes up between your index and middle fingers in a fist.' },
  { letter: 'U', tip: 'Index and middle fingers straight up and together, like a tall U.' },
  { letter: 'V', tip: 'Index and middle fingers up and apart — a peace-sign V.' },
  { letter: 'W', tip: 'Index, middle, and ring fingers up and spread — three points of a W.' },
  { letter: 'X', tip: 'Index finger bent into a hook, the rest in a fist.' },
  { letter: 'Y', tip: 'Thumb and pinky stretched out wide, middle fingers closed — hang loose!' },
  { letter: 'Z', tip: 'Trace a Z in the air with your index finger.', motion: true },
]

export const LETTER_SET = new Set(LETTERS.map((l) => l.letter))

export function letterInfo(letter: string): LetterInfo | undefined {
  return LETTERS.find((l) => l.letter === letter.toUpperCase())
}

/** External reference for each letter on Lifeprint (Dr. Bill Vicars' ASL University). */
export function lifeprintUrl(letter: string): string {
  return `https://www.lifeprint.com/asl101/fingerspelling/abc.htm#${letter.toLowerCase()}`
}
