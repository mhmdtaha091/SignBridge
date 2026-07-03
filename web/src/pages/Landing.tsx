import { Link } from 'react-router-dom'

const features = [
  {
    emoji: '📖',
    title: 'Learn the alphabet',
    body: 'A friendly A–Z gallery of handshapes with tips for getting each one right. ASL and PSL.',
    to: '/learn',
    color: 'bg-sun-100',
  },
  {
    emoji: '🎯',
    title: 'Practice with your camera',
    body: 'Sign the letter on screen and get instant feedback. Build streaks, master every letter.',
    to: '/practice',
    color: 'bg-leaf-100',
  },
  {
    emoji: '🗣️',
    title: 'Be understood',
    body: 'Fingerspell in front of your camera and SignBridge speaks your words out loud.',
    to: '/interpret',
    color: 'bg-sky-100',
  },
]

export default function Landing() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 text-center">
        <p className="inline-block bg-coral-100 text-coral-700 font-extrabold text-sm px-4 py-1.5 rounded-full mb-6">
          Free · Open source · 100% private, on-device AI
        </p>
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-balance">
          Learn sign language.
          <br />
          <span className="text-coral-500">Be understood.</span>
        </h1>
        <p className="mt-6 text-lg text-ink-700 max-w-2xl mx-auto text-balance">
          SignBridge teaches you sign language with live feedback from your webcam — and turns your signing
          into spoken words. No account, no servers, no cost. Your camera feed never leaves your
          device. ASL and PSL supported.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link
            to="/learn"
            className="px-7 py-3.5 rounded-full bg-coral-500 hover:bg-coral-600 text-white font-extrabold text-lg shadow-lift transition-colors"
          >
            Start learning
          </Link>
          <Link
            to="/interpret"
            className="px-7 py-3.5 rounded-full bg-cream-100 hover:bg-cream-200 text-ink-900 font-extrabold text-lg border-2 border-cream-300 transition-colors"
          >
            Try the interpreter
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 grid gap-5 sm:grid-cols-3">
        {features.map((f) => (
          <Link
            key={f.title}
            to={f.to}
            className={`${f.color} rounded-3xl p-7 shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all`}
          >
            <span className="text-4xl" aria-hidden="true">
              {f.emoji}
            </span>
            <h2 className="mt-4 text-xl font-extrabold">{f.title}</h2>
            <p className="mt-2 text-ink-700">{f.body}</p>
          </Link>
        ))}
      </section>

      <section className="bg-cream-100 border-y border-cream-200">
        <div className="mx-auto max-w-6xl px-4 py-14 grid gap-8 sm:grid-cols-3 text-center">
          {[
            ['1', 'Allow your camera', 'SignBridge tracks 21 points on each hand — right in your browser.'],
            ['2', 'Teach it your hands', 'Record a few samples per letter in the Data Studio. Takes ~10 minutes.'],
            ['3', 'Sign away', 'Practice with instant feedback, or fingerspell and hear it spoken.'],
          ].map(([n, title, body]) => (
            <div key={n}>
              <span className="inline-grid place-items-center w-12 h-12 rounded-full bg-coral-500 text-white font-black text-xl shadow-soft">
                {n}
              </span>
              <h3 className="mt-4 font-extrabold text-lg">{title}</h3>
              <p className="mt-1 text-ink-700">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 text-center">
        <h2 className="text-3xl font-black">Why we built this</h2>
        <p className="mt-4 text-ink-700 text-lg">
          More than 70 million deaf people use sign language worldwide, yet most hearing people
          never learn a single sign. SignBridge lowers that barrier to zero: a free tool to start
          learning today, and a bridge for the moments when signing meets speech.
        </p>
        <Link to="/about" className="inline-block mt-5 font-extrabold text-coral-700 hover:underline">
          Read about the mission →
        </Link>
      </section>
    </>
  )
}
