type TConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '确定',
  cancelLabel = '取消',
  onConfirm,
  onCancel,
}: TConfirmDialogProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="w-full max-w-sm rounded-t-2xl border border-slate-600 border-b-0 bg-slate-900 p-4 shadow-lg sm:rounded-2xl sm:border-b">
        <h2 id="confirm-title" className="text-lg font-medium text-slate-100">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
        <div className="mt-4 flex flex-wrap justify-end gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            className="min-h-11 touch-manipulation rounded-lg px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 sm:min-h-0 sm:py-1.5"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="min-h-11 touch-manipulation rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-slate-900 active:scale-[0.98] sm:min-h-0 sm:py-1.5"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
