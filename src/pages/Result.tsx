import { useId, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Message } from '../components/Message'
import { stories } from '../data/stories'
import type { TMessage } from '../types'

type TResultLocationState = {
  outcome?: 'win' | 'peek'
  storyId?: string
  /** 本局对话快照；从游戏页传入，无则仅展示汤底 */
  messages?: TMessage[]
}

export function Result() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const location = useLocation()
  const state = (location.state ?? null) as TResultLocationState | null

  const storyIdFromState = state?.storyId
  const storyIdFromSession =
    sessionId?.startsWith('local-') ? sessionId.slice('local-'.length) : undefined
  const resolvedStoryId = storyIdFromState ?? storyIdFromSession

  const story = resolvedStoryId
    ? stories.find((s) => s.id === resolvedStoryId)
    : undefined

  const outcome = state?.outcome ?? 'peek'
  const historyMessages = state?.messages?.filter((m) => m.role !== 'system') ?? []
  const showHistory = historyMessages.length > 0
  const [historyOpen, setHistoryOpen] = useState(false)
  const historyPanelId = useId()

  return (
    <div className="relative min-h-svh overflow-hidden bg-slate-900 text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(251,191,36,0.12),transparent_55%)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0)_0%,rgba(2,6,23,0.65)_100%)]" />

      <div className="relative mx-auto flex min-h-svh max-w-2xl flex-col gap-8 px-4 py-10 md:px-6 md:py-14">
        <header className="text-center">
          <p
            className={`result-animate-title text-xs uppercase tracking-[0.35em] ${
              outcome === 'win' ? 'text-amber-400' : 'text-slate-500'
            }`}
          >
            {outcome === 'win' ? '真相揭晓 · 胜利' : '汤底揭晓'}
          </p>
          {story ? (
            <h1 className="result-animate-title-delay mt-3 text-3xl font-semibold tracking-tight text-amber-100 md:text-4xl">
              {story.title}
            </h1>
          ) : (
            <h1 className="result-animate-title-delay mt-3 text-2xl font-semibold text-slate-300">
              游戏结果
            </h1>
          )}
          <div
            className="result-animate-divider mx-auto mt-6 h-px max-w-xs bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"
            aria-hidden
          />
        </header>

        <section
          className="result-animate-truth rounded-xl border border-amber-500/35 bg-gradient-to-b from-slate-800/90 to-slate-900/95 px-6 py-8 shadow-2xl md:px-8 md:py-10"
          aria-labelledby="truth-heading"
        >
          <h2 id="truth-heading" className="sr-only">
            汤底
          </h2>
          {story ? (
            <div className="whitespace-pre-wrap text-base leading-[1.85] text-slate-100 md:text-lg md:leading-[1.9]">
              {story.bottom}
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-slate-400">
              未匹配到本地故事。请从游戏页通过「查看汤底」或胜利流程进入本页。
            </p>
          )}
        </section>

        {showHistory ? (
          <section
            className="overflow-hidden rounded-xl border border-slate-600/70 bg-slate-950/60 shadow-lg ring-1 ring-amber-500/10"
            aria-labelledby="result-history-heading"
          >
            {/* 整块方框：标题、说明与展开入口同在边框内 */}
            <button
              type="button"
              id="result-history-toggle"
              aria-expanded={historyOpen}
              aria-controls={historyOpen ? historyPanelId : undefined}
              onClick={() => setHistoryOpen((o) => !o)}
              className="flex w-full touch-manipulation items-start justify-between gap-3 p-4 text-left transition hover:bg-slate-900/50 active:bg-slate-900/70"
            >
              <div className="min-w-0 flex-1">
                <h3 id="result-history-heading" className="text-sm font-medium text-amber-400/90">
                  推理过程
                </h3>
                <p className="mt-1.5 text-pretty text-xs leading-relaxed text-slate-500">
                  本局你与主持人的对话记录
                </p>
              </div>
              <span className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
                <span className="tabular-nums text-xs font-medium text-amber-500/85">
                  {historyMessages.length} 条
                </span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`text-slate-400 transition-transform duration-200 ${
                    historyOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>
            {historyOpen ? (
              <div
                id={historyPanelId}
                role="region"
                aria-labelledby="result-history-heading"
                className="border-t border-slate-700/60 bg-slate-900/30"
              >
                <div className="max-h-[min(45dvh,360px)] space-y-3 overflow-y-auto overscroll-y-contain px-4 py-3 md:max-h-[min(50vh,420px)]">
                  {historyMessages.map((m) => (
                    <Message key={m.id} message={m} />
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : (
          <p className="text-center text-xs text-slate-600">
            本局无对话记录展示
          </p>
        )}

        <div className="flex flex-col items-center gap-4 pb-8">
          <Link
            to="/"
            className="inline-flex min-w-[200px] items-center justify-center rounded-lg bg-amber-500 px-8 py-3 text-base font-medium text-slate-900 shadow-lg transition hover:bg-amber-400 hover:shadow-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
          >
            再来一局
          </Link>
          <p className="font-mono text-[10px] text-slate-600">
            {sessionId ? `session · ${sessionId}` : ''}
          </p>
        </div>
      </div>
    </div>
  )
}
