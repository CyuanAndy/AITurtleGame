import type { TMessage as TMsg } from '../types'

type TMessageProps = {
  message: TMsg
}

export function Message({ message }: TMessageProps) {
  if (message.role === 'system') {
    const tone = message.systemTone ?? 'neutral'
    const isErr = tone === 'error'
    return (
      <div className="flex justify-center">
        <div
          role={isErr ? 'alert' : undefined}
          className={[
            'max-w-[min(100%,28rem)] rounded-lg border px-3 py-2.5 text-xs shadow-lg transition-colors',
            isErr
              ? 'animate-error-shake border-rose-500/45 bg-rose-950/50 text-left text-rose-100 ring-1 ring-rose-500/20'
              : tone === 'success'
                ? 'border-emerald-500/40 bg-emerald-950/40 text-center text-emerald-100/95 ring-1 ring-emerald-500/15'
                : 'border-slate-600/60 bg-slate-800/60 text-center text-slate-400',
          ].join(' ')}
        >
          {isErr ? (
            <div className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-rose-400" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" className="opacity-40" />
                  <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
                </svg>
              </span>
              <p className="min-w-0 flex-1 whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
          )}
        </div>
      </div>
    )
  }

  const isUser = message.role === 'user'
  return (
    <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser ? (
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-amber-500/40 bg-slate-800 text-xs font-medium text-amber-300 shadow-md transition-transform duration-200 hover:scale-105"
          aria-label="主持人"
          title="主持人"
        >
          <svg
            className="h-6 w-6 text-amber-300/90"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="8" r="3" />
            <path d="M5 20a7 7 0 0 1 14 0" />
            <path d="M18.5 5.5 20 4m-15 1.5L3.5 4" opacity="0.75" />
          </svg>
        </div>
      ) : null}

      <div
        className={`max-w-[min(92%,24rem)] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-lg transition-transform duration-150 active:scale-[0.99] ${
          isUser
            ? 'bg-amber-500 text-slate-950'
            : 'border border-slate-700/80 bg-slate-800 text-slate-100'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>

      {isUser ? (
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-sky-500/45 bg-slate-700 text-xs font-medium text-slate-100 shadow-md"
          aria-label="我"
          title="我"
        >
          <svg
            className="h-6 w-6 text-sky-200/95"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="8" r="3" />
            <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
            <path d="M8.5 6.5 7 5m8.5 1.5L17 5" opacity="0.75" />
          </svg>
        </div>
      ) : null}
    </div>
  )
}
