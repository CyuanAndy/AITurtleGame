import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChatBox, nextMessageId } from '../components/ChatBox'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { GuessModal } from '../components/GuessModal'
import { StorySurface } from '../components/StorySurface'
import { stories } from '../data/stories'
import { AiApiError, askAI, INVALID_AI_OUTPUT_MESSAGE, submitTruthGuess } from '../api'
import type { TAnswerKind, TMessage, TSessionStatus } from '../types'

const DIFFICULTY_LABEL = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
} as const

type TResultNavigateState = {
  outcome: 'win' | 'peek'
  storyId: string
  messages?: TMessage[]
}

/** 本地演示用会话 ID，与 TECH_DESIGN 中 sessionId 概念对齐；联调后改为后端返回 */
function demoSessionId(storyId: string): string {
  return `local-${storyId}`
}

function formatFriendlyAiError(error: unknown): string {
  if (error instanceof AiApiError) {
    if (error.message === INVALID_AI_OUTPUT_MESSAGE) {
      return '主持人回答格式异常。请重新提问，或把问题改成可判断真假的陈述。'
    }
    if (error.message.includes('VITE_API_BASE_URL')) {
      return '后端服务未配置：请在项目根目录 .env.local 设置 VITE_API_BASE_URL（例如 http://localhost:3000），保存后重启 dev。'
    }
    if (error.message.includes('尚未配置 DeepSeek')) {
      return '后端缺少 DeepSeek 配置：请在 `server` 目录通过环境变量设置 DEEPSEEK_API_KEY 并重启后端。'
    }
    if (error.message.includes('网络请求失败')) {
      return '网络连接异常，请检查网络后重试。'
    }
    if (error.status === 401 || error.status === 403) {
      return 'API 密钥无效或无权访问，请在 DeepSeek 控制台核对密钥。'
    }
    if (error.status === 429) {
      return '请求过于频繁，请稍后再试。'
    }
    if (error.status !== undefined && error.status >= 500) {
      return 'AI 服务暂时不可用，请稍后再试。'
    }
    if (
      error.message.includes('不是合法 JSON') ||
      error.message.includes('响应不是合法 JSON') ||
      error.message.includes('answer') ||
      error.message.includes('结构无效') ||
      error.message.includes('缺少 choices')
    ) {
      return '暂时无法获取有效回答，请稍后再试或换一种问法。'
    }
    return error.message
  }
  if (error instanceof Error) {
    return `出错了：${error.message}`
  }
  return '发生未知错误，请稍后重试。'
}

/** 游戏页：汤面 + 对话区 + 底栏操作（提交真相 / 查看汤底 / 结束游戏） */
export function Game() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const story = useMemo(
    () => (id ? stories.find((s) => s.id === id) : undefined),
    [id],
  )

  const sessionId = id ? demoSessionId(id) : 'local-unknown'

  const [messages, setMessages] = useState<TMessage[]>([])
  const [guessRemaining, setGuessRemaining] = useState(3)
  const [guessOpen, setGuessOpen] = useState(false)
  const [revealOpen, setRevealOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)
  const [aiSending, setAiSending] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  /** 本局会话状态：进行中 / 已揭晓跳转 / 已放弃 */
  const [gameStatus, setGameStatus] = useState<TSessionStatus>('playing')
  /** 防止在结束本局或跳转后，仍在途的 AI 回调写入消息 */
  const gameEndedRef = useRef(false)

  useEffect(() => {
    setMessages([])
    setGuessRemaining(3)
    setGameStatus('playing')
    setLastError(null)
    gameEndedRef.current = false
  }, [id])

  const onSendMessage = useCallback(
    async (text: string) => {
      if (!story || gameStatus !== 'playing' || gameEndedRef.current) return
      const userMsg: TMessage = {
        id: nextMessageId(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, userMsg])
      setAiSending(true)
      try {
        const answer = await askAI(text, story)
        if (gameEndedRef.current) return
        setLastError(null)
        const answerKind: TAnswerKind =
          answer === '是' ? 'YES' : answer === '不是' ? 'NO' : 'IRRELEVANT'
        const reply: TMessage = {
          id: nextMessageId(),
          role: 'assistant',
          content: answer,
          timestamp: Date.now(),
          answerKind,
        }
        setMessages((prev) => [...prev, reply])
      } catch (e) {
        if (gameEndedRef.current) return
        const friendlyError = formatFriendlyAiError(e)
        setLastError(friendlyError)
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId(),
            role: 'system',
            content: friendlyError,
            timestamp: Date.now(),
            systemTone: 'error',
          },
        ])
      } finally {
        setAiSending(false)
      }
    },
    [story, gameStatus],
  )

  const goResult = useCallback(
    (outcome: TResultNavigateState['outcome']) => {
      if (!id || gameEndedRef.current) return
      gameEndedRef.current = true
      setGameStatus('revealed')
      navigate(`/result/${sessionId}`, {
        state: { outcome, storyId: id, messages } satisfies TResultNavigateState,
      })
    },
    [id, navigate, sessionId, messages],
  )

  const handleGuessSubmit = useCallback(
    async (text: string) => {
      if (guessRemaining <= 0 || !story || gameStatus !== 'playing') return
      if (gameEndedRef.current) return

      // 演示快捷键：直接胜利（不走后端判定）
      const winByDemoKeyword = text.includes('通关')
      if (winByDemoKeyword) {
        setGuessOpen(false)
        goResult('win')
        return
      }

      try {
        const { win } = await submitTruthGuess(text, story)
        if (gameEndedRef.current) return
        setLastError(null)

        if (win) {
          setGuessOpen(false)
          goResult('win')
          return
        }

        setGuessRemaining((n) => Math.max(0, n - 1))
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId(),
            role: 'system',
            systemTone: 'neutral',
            content:
              '未猜中核心要素。可继续提问、再次提交真相，或选择「查看汤底」。',
            timestamp: Date.now(),
          },
        ])
        setGuessOpen(false)
      } catch (e) {
        if (gameEndedRef.current) return
        const friendlyError = formatFriendlyAiError(e)
        setLastError(friendlyError)
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId(),
            role: 'system',
            systemTone: 'error',
            content: friendlyError,
            timestamp: Date.now(),
          },
        ])
        setGuessOpen(false)
      }
    },
    [guessRemaining, goResult, story, gameStatus],
  )

  if (!id || !story) {
    return (
      <div className="relative min-h-svh bg-slate-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0)_0%,rgba(2,6,23,0.55)_100%)]" />
        <div className="relative mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center px-4 py-12 text-center">
          <p className="text-slate-400">未找到该故事，请从大厅重新选择。</p>
          <Link
            to="/"
            className="mt-6 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 shadow-lg hover:bg-amber-400"
          >
            返回大厅
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-svh overflow-hidden bg-slate-900">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-15%,rgba(251,191,36,0.07),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto flex h-full max-w-3xl flex-col px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:px-6 md:pb-8 md:pt-8">
        <nav className="mb-2 shrink-0 md:mb-5">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs text-amber-400/90 transition hover:text-amber-300 md:text-sm"
            onClick={() => {
              gameEndedRef.current = true
            }}
          >
            <span aria-hidden>←</span>
            返回大厅
          </Link>
        </nav>

        <header className="shrink-0 space-y-2 md:space-y-3">
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            <span className="rounded-md bg-slate-800/90 px-2 py-0.5 text-[11px] font-medium text-amber-400 ring-1 ring-amber-500/25 md:px-2.5 md:py-1 md:text-xs">
              {DIFFICULTY_LABEL[story.difficulty]}
            </span>
            {gameStatus === 'playing' ? (
              <span className="rounded-md bg-emerald-950/80 px-2 py-0.5 text-[11px] font-medium text-emerald-400 ring-1 ring-emerald-500/30 md:px-2.5 md:py-1 md:text-xs">
                进行中
              </span>
            ) : null}
            <span className="text-[11px] text-slate-500 md:text-xs">向主持人提问，仅会得到三类回答</span>
          </div>
          <StorySurface title={story.title} surface={story.surface} />
        </header>

        <div className="mt-2 flex min-h-0 flex-1 flex-col md:mt-5">
          {lastError ? (
            <div className="mb-2 flex items-start justify-between gap-2 rounded-lg border border-rose-500/35 bg-rose-950/40 px-2.5 py-1.5 text-[11px] text-rose-100 md:mb-3 md:gap-3 md:px-3 md:py-2 md:text-xs">
              <p className="leading-relaxed">{lastError}</p>
              <button
                type="button"
                className="shrink-0 rounded px-1.5 py-0.5 text-rose-200/80 hover:bg-rose-900/70 hover:text-rose-100"
                onClick={() => setLastError(null)}
                aria-label="关闭错误提示"
              >
                ×
              </button>
            </div>
          ) : null}
          <ChatBox
            messages={messages}
            onSendMessage={onSendMessage}
            isSending={aiSending || gameStatus !== 'playing'}
          />

          <div className="mt-2 flex flex-col gap-2 border-t border-slate-700/50 pt-2 md:mt-4 md:gap-3 md:pt-4">
            <p className="text-[11px] text-slate-500 md:text-xs">
              本局操作：提交完整结论、提前揭晓汤底，或结束本局返回大厅。
            </p>
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              <button
                type="button"
                disabled={guessRemaining <= 0 || gameStatus !== 'playing'}
                className="min-h-10 w-full touch-manipulation rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-slate-900 shadow-lg transition hover:bg-amber-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:w-auto"
                onClick={() => setGuessOpen(true)}
              >
                提交真相
              </button>
              <button
                type="button"
                disabled={gameStatus !== 'playing'}
                className="min-h-10 w-full touch-manipulation rounded-lg border border-amber-500/60 px-3 py-2 text-sm text-amber-300 transition hover:bg-slate-800/80 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:w-auto"
                onClick={() => setRevealOpen(true)}
              >
                查看汤底
              </button>
              <button
                type="button"
                disabled={gameStatus !== 'playing'}
                className="min-h-10 w-full touch-manipulation rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:w-auto"
                onClick={() => setEndOpen(true)}
              >
                结束游戏
              </button>
            </div>
          </div>
        </div>
      </div>

      <GuessModal
        open={guessOpen}
        remaining={guessRemaining}
        onClose={() => setGuessOpen(false)}
        onSubmit={handleGuessSubmit}
      />

      <ConfirmDialog
        open={revealOpen}
        title="确定查看汤底？"
        description="确认后将揭晓本局汤底，推理过程将告一段落（演示跳转至汤底页）。"
        confirmLabel="确定揭晓"
        cancelLabel="再想想"
        onCancel={() => setRevealOpen(false)}
        onConfirm={() => {
          setRevealOpen(false)
          goResult('peek')
        }}
      />

      <ConfirmDialog
        open={endOpen}
        title="确定结束本局？"
        description="结束后将返回大厅；本演示不会自动展示汤底。"
        confirmLabel="结束"
        cancelLabel="取消"
        onCancel={() => setEndOpen(false)}
        onConfirm={() => {
          gameEndedRef.current = true
          setGameStatus('aborted')
          setEndOpen(false)
          navigate('/')
        }}
      />
    </div>
  )
}
