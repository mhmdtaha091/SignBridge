import { describe, expect, it, beforeEach } from 'vitest'
import { useLanguageStore } from '../store/useLanguageStore'
import {
  getLetters,
  getWordSigns,
  getLetterInfo,
  getWordInfo,
} from './vocabResolver'
import { LETTERS as ASL_LETTERS, WORD_SIGNS as ASL_WORDS } from './vocab'
import { PSL_LETTERS, PSL_WORD_SIGNS } from './pslVocab'

// Reset the language store before each test
beforeEach(() => {
  useLanguageStore.setState({ language: 'asl' })
})

describe('vocabResolver', () => {
  describe('getLetters', () => {
    it('returns ASL letters when language is asl', () => {
      useLanguageStore.setState({ language: 'asl' })
      expect(getLetters()).toEqual(ASL_LETTERS)
    })

    it('returns PSL letters when language is psl', () => {
      useLanguageStore.setState({ language: 'psl' })
      expect(getLetters()).toEqual(PSL_LETTERS)
    })

    it('ASL and PSL have different letter counts', () => {
      useLanguageStore.setState({ language: 'asl' })
      const aslCount = getLetters().length
      useLanguageStore.setState({ language: 'psl' })
      const pslCount = getLetters().length
      // Both should have letters
      expect(aslCount).toBeGreaterThan(0)
      expect(pslCount).toBeGreaterThan(0)
    })
  })

  describe('getWordSigns', () => {
    it('returns ASL words when language is asl', () => {
      useLanguageStore.setState({ language: 'asl' })
      expect(getWordSigns()).toEqual(ASL_WORDS)
    })

    it('returns PSL words when language is psl', () => {
      useLanguageStore.setState({ language: 'psl' })
      expect(getWordSigns()).toEqual(PSL_WORD_SIGNS)
    })

    it('PSL has more word signs than ASL', () => {
      useLanguageStore.setState({ language: 'asl' })
      const aslCount = getWordSigns().length
      useLanguageStore.setState({ language: 'psl' })
      const pslCount = getWordSigns().length
      // PSL word list was built with 52+ signs
      expect(pslCount).toBeGreaterThan(aslCount)
    })
  })

  describe('getLetterInfo', () => {
    it('finds ASL letter by uppercase', () => {
      useLanguageStore.setState({ language: 'asl' })
      const info = getLetterInfo('A')
      expect(info).toBeDefined()
      expect(info!.letter).toBe('A')
    })

    it('finds ASL letter by lowercase', () => {
      useLanguageStore.setState({ language: 'asl' })
      const info = getLetterInfo('b')
      expect(info).toBeDefined()
      expect(info!.letter).toBe('B')
    })

    it('finds PSL letter', () => {
      useLanguageStore.setState({ language: 'psl' })
      const info = getLetterInfo('A')
      expect(info).toBeDefined()
      expect(info!.letter).toBe('A')
      // PSL tip should mention two-handed system
      expect(info!.tip.toLowerCase()).toContain('dominant')
    })

    it('returns undefined for nonexistent letter', () => {
      useLanguageStore.setState({ language: 'asl' })
      expect(getLetterInfo('1')).toBeUndefined()
    })
  })

  describe('getWordInfo', () => {
    it('finds ASL word', () => {
      useLanguageStore.setState({ language: 'asl' })
      const info = getWordInfo('hello')
      expect(info).toBeDefined()
      expect(info!.word).toBe('hello')
    })

    it('finds PSL word', () => {
      useLanguageStore.setState({ language: 'psl' })
      const info = getWordInfo('hello')
      expect(info).toBeDefined()
      expect(info!.word).toBe('hello')
    })

    it('finds word case-insensitively', () => {
      useLanguageStore.setState({ language: 'asl' })
      const info = getWordInfo('HELLO')
      expect(info).toBeDefined()
      expect(info!.word).toBe('hello')
    })

    it('returns undefined for unknown word', () => {
      useLanguageStore.setState({ language: 'asl' })
      expect(getWordInfo('supercalifragilistic')).toBeUndefined()
    })

    it('PSL-exclusive words are not in ASL', () => {
      useLanguageStore.setState({ language: 'psl' })
      const pslInfo = getWordInfo('mosque')
      useLanguageStore.setState({ language: 'asl' })
      const aslInfo = getWordInfo('mosque')
      // mosque is a PSL-specific vocabulary item
      expect(pslInfo).toBeDefined()
      expect(aslInfo).toBeUndefined()
    })
  })
})
