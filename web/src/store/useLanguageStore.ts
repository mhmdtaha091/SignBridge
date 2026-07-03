import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SignLanguage } from '../config/language'

interface LanguageState {
  language: SignLanguage
  setLanguage: (lang: SignLanguage) => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'asl',
      setLanguage: (language) => set({ language }),
    }),
    { name: 'signbridge-language' },
  ),
)
