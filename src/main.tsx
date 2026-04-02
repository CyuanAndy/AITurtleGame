import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GameSessionProvider } from './contexts/GameSessionContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <GameSessionProvider>
        <App />
      </GameSessionProvider>
    </BrowserRouter>
  </StrictMode>,
)
