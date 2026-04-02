import { Link } from 'react-router-dom'

/** 大厅卡片所需最小字段；可与 `TStoryListItem` / `stories.ts` 中条目兼容 */
export type TGameCardStory = {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  tags?: string[]
}

const DIFFICULTY_LABEL: Record<TGameCardStory['difficulty'], string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

const DIFFICULTY_STYLE: Record<TGameCardStory['difficulty'], string> = {
  easy: 'bg-emerald-950/80 text-emerald-300 ring-emerald-500/30',
  medium: 'bg-amber-950/80 text-amber-300 ring-amber-500/30',
  hard: 'bg-rose-950/80 text-rose-300 ring-rose-500/30',
}

type TGameCardProps = {
  story: TGameCardStory
}

export function GameCard({ story }: TGameCardProps) {
  return (
    <Link
      to={`/game/${story.id}`}
      className={[
        'group relative block overflow-hidden rounded-lg border border-slate-700/80 bg-slate-800/50 p-4 shadow-lg',
        'transition-all duration-300',
        'hover:-translate-y-1 hover:scale-[1.01] hover:border-amber-300/80 hover:bg-slate-800/90 hover:shadow-xl hover:shadow-amber-500/15',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
        'card-hover-float',
      ].join(' ')}
      aria-label={`开始游戏：${story.title}，难度${DIFFICULTY_LABEL[story.difficulty]}`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-amber-300/8 to-transparent opacity-40 transition-opacity duration-300 group-hover:opacity-80"
        aria-hidden
      />
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="line-clamp-1 min-w-0 flex-1 text-base font-medium leading-snug text-slate-100 group-hover:text-amber-100 md:text-lg">
          {story.title}
        </h2>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 md:px-2.5 md:py-1 md:text-xs ${DIFFICULTY_STYLE[story.difficulty]}`}
        >
          {DIFFICULTY_LABEL[story.difficulty]}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(story.tags?.slice(0, 2) ?? ['悬疑', '推理']).map((tag) => (
          <span
            key={`${story.id}-${tag}`}
            className="rounded-md border border-slate-600/70 bg-slate-800/70 px-2 py-0.5 text-[11px] text-slate-300 transition group-hover:border-amber-400/40 group-hover:text-amber-100/90"
          >
            {tag}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500 transition group-hover:text-slate-400">
        点击进入推理
      </p>
    </Link>
  )
}
