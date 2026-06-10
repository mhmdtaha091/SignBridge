import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { LabeledSample } from '../recognition/types'

export interface SampleRecord extends LabeledSample {
  id?: number
  createdAt: number
}

interface SignBridgeDB extends DBSchema {
  samples: {
    key: number
    value: SampleRecord
    indexes: { 'by-label': string }
  }
}

let db: Promise<IDBPDatabase<SignBridgeDB>> | null = null

function getDb() {
  db ??= openDB<SignBridgeDB>('signbridge', 1, {
    upgrade(database) {
      const store = database.createObjectStore('samples', {
        keyPath: 'id',
        autoIncrement: true,
      })
      store.createIndex('by-label', 'label')
    },
  })
  return db
}

export async function getAllSamples(): Promise<SampleRecord[]> {
  return (await getDb()).getAll('samples')
}

export async function addSampleRecords(records: Omit<SampleRecord, 'id'>[]): Promise<void> {
  const tx = (await getDb()).transaction('samples', 'readwrite')
  await Promise.all(records.map((r) => tx.store.add(r as SampleRecord)))
  await tx.done
}

export async function deleteSamplesByLabel(label: string): Promise<void> {
  const tx = (await getDb()).transaction('samples', 'readwrite')
  let cursor = await tx.store.index('by-label').openCursor(IDBKeyRange.only(label))
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }
  await tx.done
}

export async function clearAllSamples(): Promise<void> {
  await (await getDb()).clear('samples')
}
