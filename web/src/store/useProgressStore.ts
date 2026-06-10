import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LetterStats {
  attempts: number
  correct: number
}

interface ProgressState {
  streak: number
  bestStreak: number
  mastery: Record<string, LetterStats>
  recordAttempt: (letter: string, correct: boolean) => void
  resetStreak: () => void
}

/** Practice progress, persisted locally (no accounts, no servers). */
export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      streak: 0,
      bestStreak: 0,
      mastery: {},
      recordAttempt: (letter, correct) =>
        set((state) => {
          const prev = state.mastery[letter] ?? { attempts: 0, correct: 0 }
          const streak = correct ? state.streak + 1 : 0
          return {
            streak,
            bestStreak: Math.max(state.bestStreak, streak),
            mastery: {
              ...state.mastery,
              [letter]: {
                attempts: prev.attempts + 1,
                correct: prev.correct + (correct ? 1 : 0),
              },
            },
          }
        }),
      resetStreak: () => set({ streak: 0 }),
    }),
    { name: 'signbridge-progress' },
  ),
)
