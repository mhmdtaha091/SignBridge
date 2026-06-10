import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Learn from './pages/Learn'
import LetterDetail from './pages/LetterDetail'
import Practice from './pages/Practice'
import Interpret from './pages/Interpret'
import DataStudio from './pages/DataStudio'
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
          <Route path="interpret" element={<Interpret />} />
          <Route path="studio" element={<DataStudio />} />
          <Route path="about" element={<About />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
