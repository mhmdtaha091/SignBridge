/**
 * Sign language registry and metadata.
 * Adding a new language = adding an entry here + a vocab file + (optionally) a model.
 */

export type SignLanguage = 'asl' | 'psl'

export interface LanguageMeta {
  id: SignLanguage
  name: string
  nativeName: string
  flag: string
  /** Text direction for TTS output. */
  direction: 'ltr' | 'rtl'
}

export const LANGUAGES: Record<SignLanguage, LanguageMeta> = {
  asl: {
    id: 'asl',
    name: 'American Sign Language',
    nativeName: 'ASL',
    flag: '🇺🇸',
    direction: 'ltr',
  },
  psl: {
    id: 'psl',
    name: 'Pakistan Sign Language',
    nativeName: 'PSL',
    flag: '🇵🇰',
    direction: 'ltr',
  },
}

export const LANGUAGE_LIST: LanguageMeta[] = Object.values(LANGUAGES)
