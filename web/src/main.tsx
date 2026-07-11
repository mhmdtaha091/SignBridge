import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'

// Register PWA service worker for offline support.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // SW registration fails on localhost with some browsers; not an error.
  })
}
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Learn from './pages/Learn'
import LetterDetail from './pages/LetterDetail'
import Practice from './pages/Practice'
import Interpret from './pages/Interpret'
import WordLearn from './pages/WordLearn'
import WordDetail from './pages/WordDetail'
import WordPractice from './pages/WordPractice'
import DataStudio from './pages/DataStudio'
import TutorMode from './pages/TutorMode'
import About from './pages/About'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="learn" element={<Learn />} />
          <Route path="learn/:letter" element={<LetterDetail />} />
          <Route path="practice" element={<Practice />} />
          <Route path="words" element={<WordLearn />} />
          <Route path="words/:word" element={<WordDetail />} />
          <Route path="practice-words" element={<WordPractice />} />
          <Route path="interpret" element={<Interpret />} />
          <Route path="studio" element={<DataStudio />} />
          <Route path="tutor" element={<TutorMode />} />
          <Route path="about" element={<About />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
