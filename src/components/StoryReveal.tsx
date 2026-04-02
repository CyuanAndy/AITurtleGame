type TStoryRevealProps = {
  title: string
  truth: string
}

/** 汤底展示；当前为占位文案，揭晓后由接口填充 */
export function StoryReveal({ title, truth }: TStoryRevealProps) {
  return (
    <section className="rounded-lg border border-amber-500/30 bg-slate-800/60 p-6 shadow-lg">
      <h2 className="text-xl font-medium text-amber-400">{title}</h2>
      <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
        {truth}
      </div>
    </section>
  )
}
