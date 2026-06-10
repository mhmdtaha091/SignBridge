import { useParams } from 'react-router-dom'

export default function LetterDetail() {
  const { letter } = useParams()
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-black">Letter {letter?.toUpperCase()}</h1>
    </section>
  )
}
