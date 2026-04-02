import { useEffect, useState } from 'react'

type TGuessModalProps = {
  open: boolean
  remaining: number
  onClose: () => void
  /** 提交完整结论；由父组件处理判定与跳转 */
  onSubmit: (text: string) => void | Promise<void>
}

const MAX_LEN = 500

/** 「提交真相」：独立入口，与普通提问分流（PRD G-10） */
export function GuessModal({ open, remaining, onClose, onSubmit }: TGuessModalProps) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setText('')
      setSubmitting(false)
    }
  }, [open])

  if (!open) return null

  const disabled = remaining <= 0
  const disabledBySubmitting = disabled || submitting

  async function handleSubmit() {
    if (disabledBySubmitting) return
    const t = text.trim()
    if (t.length === 0) return
    setSubmitting(true)
    try {
      await Promise.resolve(onSubmit(t))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guess-title"
    >
      <div className="max-h-[min(90dvh,32rem)] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-600 border-b-0 bg-slate-900 p-4 shadow-lg sm:rounded-2xl sm:border-b">
        <h2 id="guess-title" className="text-lg font-medium text-amber-400">
          提交真相
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          用一段话写下你的结论（非单轮是/否问答）。剩余机会：
          <span className="font-medium text-slate-200"> {remaining} </span>
          次
        </p>
        <textarea
          value={text}
          disabled={disabledBySubmitting}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          rows={5}
          placeholder="写下你的推理结论…"
          className="mt-3 w-full resize-none rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/25 disabled:opacity-50"
        />
        <p className="mt-1 text-right text-xs text-slate-500">
          {text.length}/{MAX_LEN}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          提交后会由 AI 根据标准汤底判定胜负；亦可输入「通关」快速进入胜利页（演示快捷键）。
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            className="min-h-11 touch-manipulation rounded-lg px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 sm:min-h-0 sm:py-1.5"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            disabled={disabledBySubmitting || text.trim().length === 0}
            className="min-h-11 touch-manipulation rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-slate-900 hover:bg-amber-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:py-1.5"
            onClick={() => void handleSubmit()}
          >
            {submitting ? '判定中…' : '提交判定'}
          </button>
        </div>
      </div>
    </div>
  )
}
