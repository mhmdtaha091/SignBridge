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

// ── M3 word signs ──────────────────────────────────────────────────────────

export interface WordInfo {
  word: string
  tip: string
  /** Broad category for grouping in the learning gallery. */
  category: 'greeting' | 'need' | 'action' | 'social' | 'food'
  /** Emoji for the gallery card. */
  emoji: string
}

export const WORD_SIGNS: WordInfo[] = [
  { word: 'hello', tip: 'Open hand at your forehead, then wave outward — like a salute.', category: 'greeting', emoji: '👋' },
  { word: 'thank you', tip: 'Touch your lips with a flat hand, then bring it forward and down.', category: 'social', emoji: '🙏' },
  { word: 'please', tip: 'Flat hand circles clockwise over your chest.', category: 'social', emoji: '🥺' },
  { word: 'yes', tip: 'Make a fist and nod it forward like a head nodding yes.', category: 'social', emoji: '👍' },
  { word: 'no', tip: 'Index, middle, and thumb snap together twice — like a mouth saying no.', category: 'social', emoji: '👎' },
  { word: 'help', tip: 'Closed fist on one hand rests on the open palm of the other, then both move upward together.', category: 'need', emoji: '🆘' },
  { word: 'eat', tip: 'Bring your fingertips to your mouth like holding food.', category: 'food', emoji: '🍽️' },
  { word: 'drink', tip: 'Mime holding a cup and tipping it toward your mouth.', category: 'food', emoji: '🥤' },
  { word: 'sorry', tip: 'Make a fist and circle it clockwise over your chest.', category: 'social', emoji: '😔' },
  { word: 'love', tip: 'Cross your arms over your chest with closed fists.', category: 'social', emoji: '❤️' },
  { word: 'good', tip: 'Touch your lips with a flat hand, then bring it down to touch the other flat hand palm-up.', category: 'social', emoji: '✅' },
  { word: 'bad', tip: 'Touch your lips with a flat hand, then flip it downward.', category: 'social', emoji: '❌' },
  { word: 'more', tip: 'Bring the fingertips of both hands together repeatedly.', category: 'need', emoji: '➕' },
  { word: 'stop', tip: 'One flat hand chops down onto the other open palm.', category: 'action', emoji: '✋' },
  { word: 'go', tip: 'Both index fingers point outward, then sweep away from your body.', category: 'action', emoji: '🚶' },
  { word: 'want', tip: 'Both hands reach forward with open palms up, then pull toward your chest.', category: 'need', emoji: '🤲' },
  { word: 'need', tip: 'Index finger bent into a hook, pull downward like pulling something toward you.', category: 'need', emoji: '📌' },
  { word: 'home', tip: 'Touch your chin with the fingertips of a flat hand, then touch your cheekbone.', category: 'need', emoji: '🏠' },
  { word: 'school', tip: 'Clap your hands twice softly — like a teacher getting attention.', category: 'need', emoji: '🏫' },
  { word: 'work', tip: 'Tap the heel of one fist on top of the other fist twice.', category: 'action', emoji: '💼' },
  { word: 'friend', tip: 'Hook both index fingers together, then reverse and hook again.', category: 'social', emoji: '🤝' },
  { word: 'family', tip: 'Both hands make F handshapes, touch thumbs together, then circle outward and together.', category: 'social', emoji: '👨‍👩‍👧' },
  { word: 'water', tip: 'Tap your chin with the index finger of a W handshape twice.', category: 'food', emoji: '💧' },
  { word: 'food', tip: 'Bring your fingertips to your mouth twice — the general sign for food/eating.', category: 'food', emoji: '🍕' },
  { word: 'bathroom', tip: 'Tap the side of your chin with the thumb of a T handshape twice.', category: 'need', emoji: '🚻' },
]

export const WORD_SET = new Set(WORD_SIGNS.map((w) => w.word))

export function wordInfo(word: string): WordInfo | undefined {
  return WORD_SIGNS.find((w) => w.word === word.toLowerCase())
}
