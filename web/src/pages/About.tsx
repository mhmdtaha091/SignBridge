export default function About() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-black">About SignBridge</h1>

      <div className="mt-6 space-y-5 text-lg text-ink-700">
        <p>
          SignBridge is a free, open-source web app that teaches American Sign Language
          fingerspelling and interprets it live — sign in front of your camera and hear your
          words spoken aloud.
        </p>
        <p>
          <strong className="text-ink-900">Privacy first.</strong> All computer vision runs
          entirely in your browser using on-device machine learning. Your camera feed is never
          uploaded, stored, or shared. There are no accounts, no analytics, and no servers.
        </p>
        <p>
          <strong className="text-ink-900">Honest scope.</strong> SignBridge recognizes ASL
          fingerspelling (A–Z) and is growing toward a fixed vocabulary of common signs. It is a
          learning tool and a fingerspelling interpreter — not a full conversational ASL
          translator, which remains an open research problem. Sign language is far richer than
          fingerspelling: grammar lives in motion, space, and facial expression. We encourage
          everyone to learn from Deaf teachers and communities.
        </p>
        <p>
          <strong className="text-ink-900">Open source, forever free.</strong> The entire project
          is MIT-licensed. Contributions are welcome — from code to sign-language expertise to
          donated (landmark-only) training samples via the Data Studio.
        </p>
      </div>
    </section>
  )
}
