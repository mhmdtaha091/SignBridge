import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface LessonState {
  currentLesson: string[]
  currentIndex: number
  scores: Record<string, number[]> // word → array of past scores
  bestScores: Record<string, number>

  startLesson: (words: string[]) => void
  recordScore: (word: string, score: number) => void
  advance: () => void
  resetLesson: () => void
  isComplete: () => boolean
}

/** Tutor lesson state, persisted locally. */
export const useLessonStore = create<LessonState>()(
  persist(
    (set, get) => ({
      currentLesson: [],
      currentIndex: 0,
      scores: {},
      bestScores: {},

      startLesson: (words) =>
        set({ currentLesson: words, currentIndex: 0 }),

      recordScore: (word, score) =>
        set((state) => {
          const prev = state.scores[word] ?? []
          const best = Math.max(state.bestScores[word] ?? 0, score)
          return {
            scores: { ...state.scores, [word]: [...prev, score] },
            bestScores: { ...state.bestScores, [word]: best },
          }
        }),

      advance: () =>
        set((state) => ({
          currentIndex: Math.min(
            state.currentIndex + 1,
            state.currentLesson.length,
          ),
        })),

      resetLesson: () =>
        set({ currentLesson: [], currentIndex: 0 }),

      isComplete: () => {
        const { currentIndex, currentLesson } = get()
        return currentIndex >= currentLesson.length
      },
    }),
    { name: 'signbridge-lesson' },
  ),
)
