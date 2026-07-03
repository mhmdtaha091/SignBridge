import type { LetterInfo, WordInfo } from './vocab'

/**
 * Pakistani Sign Language (PSL) vocabulary.
 *
 * PSL uses the two-handed BANZSL fingerspelling system (shared with British
 * Sign Language and Australian Sign Language), fundamentally different from
 * ASL's one-handed alphabet.
 *
 * Vowels (A, E, I, O, U): dominant index finger touches the corresponding
 * fingertip of the base hand (thumb through pinky).
 *
 * Most consonants: distinct two-handed configurations.
 *
 * References:
 *   - BSL Fingerspelling Alphabet (Royal Association for Deaf People)
 *   - UAlpha40 dataset (Mendeley Data, DOI: 10.17632/3pvnnckxyb)
 *   - PSL is NOT fully standardized — regional variations exist
 */

export const PSL_LETTERS: LetterInfo[] = [
  { letter: 'A', tip: 'Dominant index finger touches the tip of your base-hand thumb.' },
  { letter: 'B', tip: 'Both hands open flat, palms facing each other, fingers together — like binoculars.' },
  { letter: 'C', tip: 'Dominant hand forms a C shape by curving all fingers and thumb.' },
  { letter: 'D', tip: 'Both index fingers point up, other fingers closed — tips nearly touching.' },
  { letter: 'E', tip: 'Dominant index finger touches the tip of your base-hand index finger.' },
  { letter: 'F', tip: 'Index and middle fingers of both hands extended and crossed at the tips.' },
  { letter: 'G', tip: 'Both hands make fists with index fingers pointing at each other.' },
  { letter: 'H', tip: 'Dominant hand swipes across the open palm of base hand — like wiping a surface.', motion: true },
  { letter: 'I', tip: 'Dominant index finger touches the tip of your base-hand middle finger.' },
  { letter: 'J', tip: 'Trace a J shape on the palm of your base hand with your dominant index.', motion: true },
  { letter: 'K', tip: 'Dominant index finger hooks over base-hand index finger forming an X.' },
  { letter: 'L', tip: 'Both hands form L shapes with index and thumb — thumbs nearly touching.' },
  { letter: 'M', tip: 'Three fingers of dominant hand rest on the palm of your base hand.' },
  { letter: 'N', tip: 'Two fingers of dominant hand rest on the palm of your base hand.' },
  { letter: 'O', tip: 'Dominant index finger touches the tip of your base-hand ring finger.' },
  { letter: 'P', tip: 'Dominant index and middle extended, touching base-hand extended index and middle.' },
  { letter: 'Q', tip: 'Dominant index hooks onto base-hand index — like linking a chain.' },
  { letter: 'R', tip: 'Dominant index finger curls and taps on the back of base hand.' },
  { letter: 'S', tip: 'Both hands interlock their little fingers, palms facing each other.' },
  { letter: 'T', tip: 'Dominant index taps on the palm of your base hand.' },
  { letter: 'U', tip: 'Dominant index finger touches the tip of your base-hand pinky.' },
  { letter: 'V', tip: 'Index and middle of both hands form V shapes, tips nearly touching.' },
  { letter: 'W', tip: 'Fingers of both hands interlock together — like clasping hands.' },
  { letter: 'X', tip: 'Both index fingers form hooks that link together and pull apart.' },
  { letter: 'Y', tip: 'Dominant index touches base-hand index, then both hands rotate outward.' },
  { letter: 'Z', tip: 'Side of dominant hand rests at right angle on base palm, then slides forward.', motion: true },
]

/**
 * Starter PSL word signs. These are common signs used in daily conversation
 * across Pakistan. Descriptions are simplified — full PSL word-sign models
 * require training on PSL datasets (e.g. UAlpha40, WLPSL).
 */
export const PSL_WORD_SIGNS: WordInfo[] = [
  // Greetings
  { word: 'hello', tip: 'Open hand waves side to side — universal greeting.', category: 'greeting', emoji: '👋' },
  { word: 'goodbye', tip: 'Open hand waves with fingers opening and closing.', category: 'greeting', emoji: '👋' },
  { word: 'how are you', tip: 'Both hands open upward, moving outward from chest.', category: 'greeting', emoji: '🤔' },
  { word: 'good morning', tip: 'One hand rises like the sun, then both hands form a "good" sign.', category: 'greeting', emoji: '🌅' },
  // Social
  { word: 'thank you', tip: 'Flat hand touches chin, then moves forward and down.', category: 'social', emoji: '🙏' },
  { word: 'yes', tip: 'Make a fist and nod it forward — affirmation gesture.', category: 'social', emoji: '👍' },
  { word: 'no', tip: 'Index finger waves side to side — negation gesture.', category: 'social', emoji: '👎' },
  { word: 'please', tip: 'Flat hand circles over chest clockwise.', category: 'social', emoji: '🥺' },
  { word: 'sorry', tip: 'Make a fist and circle it over your chest.', category: 'social', emoji: '😔' },
  { word: 'love', tip: 'Arms crossed over chest with closed fists — hug yourself.', category: 'social', emoji: '❤️' },
  { word: 'good', tip: 'Thumbs up with both hands — widely used across Pakistan.', category: 'social', emoji: '✅' },
  { word: 'bad', tip: 'Thumbs down with both hands.', category: 'social', emoji: '❌' },
  { word: 'friend', tip: 'Both index fingers hook together, then reverse.', category: 'social', emoji: '🤝' },
  { word: 'family', tip: 'Both hands form F shapes, thumbs touch, circle outward.', category: 'social', emoji: '👨‍👩‍👧' },
  { word: 'welcome', tip: 'Open hand sweeps inward toward your chest.', category: 'social', emoji: '🤗' },
  // Needs & Places
  { word: 'help', tip: 'Fist rests on open palm, both move upward together.', category: 'need', emoji: '🆘' },
  { word: 'more', tip: 'Bring fingertips of both hands together repeatedly.', category: 'need', emoji: '➕' },
  { word: 'want', tip: 'Both hands reach forward, palms up, pull toward chest.', category: 'need', emoji: '🤲' },
  { word: 'need', tip: 'Index finger bent into a hook, pull downward.', category: 'need', emoji: '📌' },
  { word: 'home', tip: 'Touch chin with flat fingertips, then touch cheekbone.', category: 'need', emoji: '🏠' },
  { word: 'school', tip: 'Both hands form books opening in front of you.', category: 'need', emoji: '🏫' },
  { word: 'hospital', tip: 'Cross both index fingers on your forehead.', category: 'need', emoji: '🏥' },
  { word: 'mosque', tip: 'Both hands open upward, then forehead touches fingertips.', category: 'need', emoji: '🕌' },
  // Actions
  { word: 'go', tip: 'Both index fingers point outward, sweep away from body.', category: 'action', emoji: '🚶' },
  { word: 'come', tip: 'Both hands sweep inward toward your chest.', category: 'action', emoji: '🫴' },
  { word: 'stop', tip: 'One flat hand chops down onto the other open palm.', category: 'action', emoji: '✋' },
  { word: 'work', tip: 'Tap heel of one fist on top of the other fist twice.', category: 'action', emoji: '💼' },
  { word: 'play', tip: 'Both hands shake loosely at chest level — relaxed motion.', category: 'action', emoji: '🎮' },
  { word: 'sleep', tip: 'Both palms together, tilt head to rest on them.', category: 'action', emoji: '😴' },
  { word: 'sit', tip: 'Both hands flat, palms down, push downward.', category: 'action', emoji: '🪑' },
  { word: 'stand', tip: 'Index and middle fingers form legs, stand on opposite palm.', category: 'action', emoji: '🧍' },
  { word: 'walk', tip: 'Both hands flat, alternate pushing forward — like feet walking.', category: 'action', emoji: '🚶‍♂️' },
  { word: 'run', tip: 'Both index fingers extended, quickly alternate forward.', category: 'action', emoji: '🏃' },
  { word: 'read', tip: 'Both hands open like a book in front of you.', category: 'action', emoji: '📖' },
  // Food & Drink
  { word: 'eat', tip: 'Bring fingertips to your mouth, mimicking eating with hand.', category: 'food', emoji: '🍽️' },
  { word: 'drink', tip: 'Mime holding a cup and tipping toward your mouth.', category: 'food', emoji: '🥤' },
  { word: 'water', tip: 'Tap your chin twice with the index finger.', category: 'food', emoji: '💧' },
  { word: 'food', tip: 'Bring fingertips to your mouth twice.', category: 'food', emoji: '🍕' },
  { word: 'tea', tip: 'Thumb and index pinch, mime drinking from a cup.', category: 'food', emoji: '🍵' },
  { word: 'milk', tip: 'Mime milking a cow with both hands.', category: 'food', emoji: '🥛' },
  { word: 'bread', tip: 'Both hands flat, one slices across the other.', category: 'food', emoji: '🍞' },
  { word: 'fruit', tip: 'Both hands form small circles near mouth.', category: 'food', emoji: '🍎' },
  // Communication & Feelings
  { word: 'name', tip: 'Index and middle fingers tap on opposite wrist.', category: 'social', emoji: '📛' },
  { word: 'understand', tip: 'Index finger taps temple, then opens palm outward.', category: 'social', emoji: '💡' },
  { word: 'happy', tip: 'Both hands flat, circle upward in front of chest.', category: 'social', emoji: '😊' },
  { word: 'sad', tip: 'Both hands slide down from eyes, palms facing face.', category: 'social', emoji: '😢' },
  { word: 'angry', tip: 'Both fists shake near chest, face shows tension.', category: 'social', emoji: '😠' },
  { word: 'beautiful', tip: 'Open hand circles face clockwise, palm facing face.', category: 'social', emoji: '✨' },
  // Numbers & Time (common in basic PSL)
  { word: 'today', tip: 'Both index fingers point down in front of you.', category: 'need', emoji: '📅' },
  { word: 'tomorrow', tip: 'Index finger touches cheek, then rotates forward.', category: 'need', emoji: '🔜' },
  { word: 'yesterday', tip: 'Index finger touches cheek, then rotates backward.', category: 'need', emoji: '⏪' },
  { word: 'morning', tip: 'One hand rises up like the sun.', category: 'need', emoji: '🌄' },
  { word: 'night', tip: 'Both hands close downward like the sun setting.', category: 'need', emoji: '🌙' },
]
