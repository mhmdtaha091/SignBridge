/** Thin wrapper around the Web Speech API with a friendly default voice. */

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang.startsWith('en') && v.localService) ??
    voices.find((v) => v.lang.startsWith('en')) ??
    voices[0] ??
    null
  )
}

export function speak(text: string): void {
  if (!isSpeechSupported() || !text.trim()) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = pickVoice()
  if (voice) utterance.voice = voice
  utterance.rate = 0.95
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel()
}
