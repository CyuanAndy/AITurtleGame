import { useState } from 'react'

type TStorySurfaceProps = {
  title: string
  surface: string
}

export function StorySurface({ title, surface }: TStorySurfaceProps) {
  const [open, setOpen] = useState(surface.length <= 200)

  return (
    <section className="rounded-xl border border-slate-700/80 bg-slate-800/40 p-4 shadow-lg ring-1 ring-slate-800/30 transition-shadow duration-300 hover:shadow-xl">
      <h1 className="text-xl font-medium text-amber-400">{title}</h1>
      <div className="mt-2 text-sm leading-relaxed text-slate-300">
        {open ? (
          surface
        ) : (
          <>
            <p className="line-clamp-4">{surface}</p>
            <button
              type="button"
              className="mt-2 text-amber-400 underline"
              onClick={() => setOpen(true)}
            >
              展开全文
            </button>
          </>
        )}
      </div>
    </section>
  )
}
