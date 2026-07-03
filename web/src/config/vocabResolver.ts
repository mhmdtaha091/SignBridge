/**
 * Vocabulary resolver that dispatches to the active sign language's config.
 *
 * Instead of importing LETTERS / WORD_SIGNS directly from vocab.ts,
 * components use useLetters() / useWordSigns() from here. The resolver
 * reads the active language from useLanguageStore and returns the
 * corresponding vocabulary.
 *
 * Adding a new language = add an entry in language.ts, create its
 * vocab file, and add it to the maps below.
 */

import { useLanguageStore } from '../store/useLanguageStore'
import {
  LETTERS as ASL_LETTERS,
  WORD_SIGNS as ASL_WORDS,
  type LetterInfo,
  type WordInfo,
} from './vocab'
import { PSL_LETTERS, PSL_WORD_SIGNS } from './pslVocab'
import type { SignLanguage } from './language'

const letterMap: Record<SignLanguage, LetterInfo[]> = {
  asl: ASL_LETTERS,
  psl: PSL_LETTERS,
}

const wordMap: Record<SignLanguage, WordInfo[]> = {
  asl: ASL_WORDS,
  psl: PSL_WORD_SIGNS,
}

/** Get letters for the active language (non-reactive — call in callbacks). */
export function getLetters(): LetterInfo[] {
  return letterMap[useLanguageStore.getState().language]
}

/** Get word signs for the active language (non-reactive — call in callbacks). */
export function getWordSigns(): WordInfo[] {
  return wordMap[useLanguageStore.getState().language]
}

/** React hook — re-renders when language changes. */
export function useLetters(): LetterInfo[] {
  return useLanguageStore((s) => letterMap[s.language])
}

/** React hook — re-renders when language changes. */
export function useWordSigns(): WordInfo[] {
  return useLanguageStore((s) => wordMap[s.language])
}

/**
 * Look up a letter by its character, respecting the active language.
 * Non-reactive — for use in callbacks and utility functions.
 */
export function getLetterInfo(letter: string): LetterInfo | undefined {
  return getLetters().find((l) => l.letter === letter.toUpperCase())
}

/**
 * Look up a word sign by its label, respecting the active language.
 * Non-reactive — for use in callbacks and utility functions.
 */
export function getWordInfo(word: string): WordInfo | undefined {
  return getWordSigns().find((w) => w.word === word.toLowerCase())
}
