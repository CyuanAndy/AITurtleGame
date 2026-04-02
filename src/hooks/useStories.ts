import { useMemo } from 'react'
import { SAMPLE_STORIES } from '../data/stories'
import type { TStoryForGame } from '../types'

/** 后续可替换为 GET /api/stories */
export function useStories(): { stories: TStoryForGame[]; loading: boolean } {
  const stories = useMemo(() => SAMPLE_STORIES, [])
  return { stories, loading: false }
}
