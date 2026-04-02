import { useEffect, useRef, useState } from 'react'
import type { TMessage } from '../types'
import { Message } from './Message'

type TChatBoxProps = {
  messages: TMessage[]
  /** 用户点击发送或按回车发送时回调；由父组件追加消息（如对接 API） */
  onSendMessage: (text: string) => void | Promise<void>
  /** AI 请求中禁用输入，避免重复发送 */
  isSending?: boolean
}

function nextMessageId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `m-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function ChatLoadingRow() {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-900/50 px-3 py-2.5 text-sm text-slate-400 shadow-inner"
      role="status"
      aria-live="polite"
      aria-label="主持人正在思考"
    >
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full border border-amber-500/25 bg-amber-500/5"
          aria-hidden
        />
        <span
          className="absolute inset-0 animate-ping rounded-full border border-amber-400/20 opacity-40"
          style={{ animationDuration: '2s' }}
          aria-hidden
        />
        <span className="relative text-xs font-medium text-amber-400/90">…</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-300">主持人思考中</p>
        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="inline-flex gap-1" aria-hidden>
            <span className="chat-loading-dot inline-block h-1.5 w-1.5 rounded-full bg-amber-400/90" />
            <span className="chat-loading-dot inline-block h-1.5 w-1.5 rounded-full bg-amber-400/90" />
            <span className="chat-loading-dot inline-block h-1.5 w-1.5 rounded-full bg-amber-400/90" />
          </span>
          请稍候，正在根据汤面判断…
        </p>
      </div>
    </div>
  )
}

function ChatEmptyState() {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 px-2 py-6 text-center">
      <div className="relative" aria-hidden>
        <div className="animate-empty-glow absolute -inset-6 rounded-full bg-amber-500/10 blur-2xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/25 bg-slate-900/80 shadow-lg ring-1 ring-amber-500/10">
          <svg
            className="h-8 w-8 text-amber-400/85"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3a6 6 0 0 0-6 6v3a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V9a6 6 0 0 0-6-6Z" />
            <path d="M9 18v1a3 3 0 0 0 6 0v-1" opacity="0.7" />
          </svg>
        </div>
      </div>
      <div className="max-w-sm space-y-2">
        <p className="text-sm font-medium text-slate-200">从这里开始推理</p>
        <p className="text-pretty text-xs leading-relaxed text-slate-500">
          对话框输入<strong className="text-slate-400">一句可判断真假</strong>的陈述向主持人提问
        </p>
      </div>
      <ul className="max-w-xs space-y-2 text-left text-[11px] text-slate-500">
        <li className="flex gap-2">
          <span className="text-amber-500/80">·</span>
          <span>例如「死者是自杀吗？」而不是「怎么回事？」</span>
        </li>
      </ul>
    </div>
  )
}

export function ChatBox({ messages, onSendMessage, isSending = false }: TChatBoxProps) {
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, isSending])

  async function send() {
    const text = draft.trim()
    if (!text || isSending) return
    setDraft('')
    await Promise.resolve(onSendMessage(text))
  }

  const showEmpty = messages.length === 0 && !isSending
  const showThread = messages.length > 0 || isSending

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950/40 shadow-lg ring-1 ring-slate-800/40">
      <div
        ref={listRef}
        className={`min-h-0 flex-1 space-y-2.5 overflow-x-hidden overscroll-y-contain scroll-smooth p-2.5 md:space-y-3 md:p-4 ${
          showEmpty ? 'overflow-y-hidden' : 'overflow-y-auto'
        }`}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {showEmpty ? <ChatEmptyState /> : null}

        {showThread ? (
          <>
            {messages.map((m) => (
              <div key={m.id} className="animate-message-in">
                <Message message={m} />
              </div>
            ))}
            {isSending ? <ChatLoadingRow /> : null}
          </>
        ) : null}
      </div>

      <div className="flex shrink-0 items-stretch gap-2 border-t border-slate-700/60 bg-slate-900/50 p-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] md:p-4 md:pb-4">
        <label className="sr-only" htmlFor="chat-input">
          输入消息
        </label>
        <textarea
          id="chat-input"
          value={draft}
          aria-busy={isSending}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
          rows={1}
          placeholder="输入一句可判断真假的陈述…"
          disabled={isSending}
          className="h-11 min-h-11 flex-1 resize-none rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50 md:h-12 md:min-h-12"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={isSending}
          className="h-11 min-h-11 touch-manipulation shrink-0 rounded-xl bg-amber-500 px-4 text-sm font-medium text-slate-900 shadow-lg transition hover:bg-amber-400 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:cursor-not-allowed disabled:opacity-50 md:h-12 md:min-h-12 md:px-5"
        >
          {isSending ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />
              等待
            </span>
          ) : (
            '发送'
          )}
        </button>
      </div>
    </div>
  )
}

export { nextMessageId }
