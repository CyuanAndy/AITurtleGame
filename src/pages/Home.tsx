import { GameCard } from '../components/GameCard'
import { useStories } from '../hooks/useStories'

export function Home() {
  const { stories, loading } = useStories()

  return (
    <div className="relative min-h-svh overflow-hidden bg-slate-900">
      {/* 氛围：暗角与微弱光晕 */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(251,191,36,0.08),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0)_0%,rgba(2,6,23,0.55)_100%)]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-svh max-w-6xl flex-col px-4 py-10 md:px-6 md:py-14">
        <header className="mb-10 text-center md:mb-12">
          <p className="mb-3 text-xs uppercase tracking-[0.35em] text-amber-500/70">
            Mystery · Deduction
          </p>
          <h1 className="bg-gradient-to-b from-amber-200 to-amber-500 bg-clip-text text-4xl font-semibold tracking-tight text-transparent drop-shadow-sm md:text-5xl">
            AI海龟汤
          </h1>
          <div
            className="mx-auto mt-5 h-px max-w-xs bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"
            aria-hidden
          />
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-sm leading-relaxed text-slate-400 md:text-base">
            这里是推理与想象交界的大厅。选一则故事，像聊天一样向主持人提问——
            你只会得到「是」「不是」或「无关」。在碎片线索里拼出真相，或选择在谜底揭晓前转身离开。
          </p>
          <p className="mt-3 text-xs text-slate-500">
            点击卡片进入游戏；回答从不解释，悬念留给你。
          </p>
        </header>

        <section aria-labelledby="lobby-heading">
          <h2 id="lobby-heading" className="sr-only">
            题目列表
          </h2>
          {loading ? (
            <div className="space-y-3" aria-busy="true" aria-label="载入题目中">
              <div className="mx-auto h-4 max-w-xs animate-pulse rounded bg-slate-700/60" />
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="min-w-0">
                    <div className="animate-pulse rounded-lg border border-slate-700/50 bg-slate-800/40 p-4 shadow-lg">
                      <div className="h-5 w-3/4 rounded bg-slate-600/50" />
                      <div className="mt-4 h-3 w-1/3 rounded bg-slate-700/60" />
                      <div className="mt-6 h-3 w-1/2 rounded bg-slate-700/40" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : stories.length === 0 ? (
            <p className="text-center text-sm text-slate-500">暂无题目</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {stories.map((story) => (
                <li key={story.id} className="min-w-0">
                  <GameCard story={story} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
