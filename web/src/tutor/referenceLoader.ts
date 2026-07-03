/**
 * Client-side reference trajectory loader.
 *
 * Reference trajectories are stored as static JSON files in
 * public/references/{lang}/{word}.json — one file per word sign.
 * ASL references are at references/{word}.json for backward compat;
 * PSL references are at references/psl/{word}.json.
 * Each file contains the full landmark sequence for the "medoid"
 * (most typical) execution of that sign.
 *
 * Format:
 *   { "word": "hello", "frames": [[159 floats], ...], "numFrames": 45 }
 */

import type { SignLanguage } from '../config/language'

const cache = new Map<string, number[][]>()

function cacheKey(word: string, language: SignLanguage): string {
  return `${language}:${word.toLowerCase()}`
}

/**
 * Fetch and cache a reference trajectory for a word sign.
 * Returns the full frame sequence, or null if no reference exists.
 */
export async function loadReferenceTrajectory(
  word: string,
  language: SignLanguage = 'asl',
): Promise<number[][] | null> {
  const ck = cacheKey(word, language)
  if (cache.has(ck)) return cache.get(ck)!

  try {
    const BASE = import.meta.env.BASE_URL
    const prefix = language === 'psl' ? 'psl/' : ''
    const resp = await fetch(`${BASE}references/${prefix}${word.toLowerCase()}.json`)
    if (!resp.ok) return null
    const data: { word: string; frames: number[][]; numFrames: number } =
      await resp.json()
    if (!data.frames || data.frames.length === 0) return null
    cache.set(ck, data.frames)
    return data.frames
  } catch {
    return null
  }
}

/**
 * Synchronous cache lookup. Returns undefined if not yet loaded.
 */
export function getCachedTrajectory(
  word: string,
  language: SignLanguage = 'asl',
): number[][] | undefined {
  return cache.get(cacheKey(word, language))
}

/**
 * Preload a batch of word references (e.g. a lesson's worth).
 * Doesn't throw — failed loads are silently skipped (individual loads
 * will return null when accessed).
 */
export async function preloadReferences(
  words: string[],
  language: SignLanguage = 'asl',
): Promise<void> {
  await Promise.allSettled(words.map((w) => loadReferenceTrajectory(w, language)))
}
