import type { SampleRecord } from './samplesDb'

/** A representative recorded sample per letter (the middle one, by time). */
export function referenceByLetter(samples: SampleRecord[]): Map<string, number[]> {
  const grouped = new Map<string, SampleRecord[]>()
  for (const s of samples) {
    const list = grouped.get(s.label) ?? []
    list.push(s)
    grouped.set(s.label, list)
  }
  const refs = new Map<string, number[]>()
  for (const [label, list] of grouped) {
    list.sort((a, b) => a.createdAt - b.createdAt)
    refs.set(label, list[Math.floor(list.length / 2)].features)
  }
  return refs
}
