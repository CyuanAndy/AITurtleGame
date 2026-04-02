import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { TMessage } from '../types'

const STORAGE_KEY = 'turtle_session_id'

type TGameSessionContextValue = {
  sessionId: string | null
  setSessionId: (id: string | null) => void
  messages: TMessage[]
  setMessages: React.Dispatch<React.SetStateAction<TMessage[]>>
  guessRemaining: number
  setGuessRemaining: React.Dispatch<React.SetStateAction<number>>
  rejudgeRemaining: number
  setRejudgeRemaining: React.Dispatch<React.SetStateAction<number>>
  readStoredSessionId: () => string | null
  persistSessionId: (id: string) => void
  clearStoredSession: () => void
}

const GameSessionContext = createContext<TGameSessionContextValue | null>(null)

export function GameSessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<TMessage[]>([])
  const [guessRemaining, setGuessRemaining] = useState(3)
  const [rejudgeRemaining, setRejudgeRemaining] = useState(3)

  const readStoredSessionId = useCallback((): string | null => {
    try {
      return localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  }, [])

  const persistSessionId = useCallback((id: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      /* ignore */
    }
  }, [])

  const clearStoredSession = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    setSessionId(null)
  }, [])

  const value = useMemo(
    () => ({
      sessionId,
      setSessionId,
      messages,
      setMessages,
      guessRemaining,
      setGuessRemaining,
      rejudgeRemaining,
      setRejudgeRemaining,
      readStoredSessionId,
      persistSessionId,
      clearStoredSession,
    }),
    [
      sessionId,
      messages,
      guessRemaining,
      rejudgeRemaining,
      readStoredSessionId,
      persistSessionId,
      clearStoredSession,
    ],
  )

  return (
    <GameSessionContext.Provider value={value}>
      {children}
    </GameSessionContext.Provider>
  )
}

export function useGameSession(): TGameSessionContextValue {
  const ctx = useContext(GameSessionContext)
  if (!ctx) {
    throw new Error('useGameSession must be used within GameSessionProvider')
  }
  return ctx
}
