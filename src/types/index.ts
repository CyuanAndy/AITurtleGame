/** 题目列表（不含 truth / core_conditions） */
export type TStoryListItem = {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  tags?: string[]
  teaser?: string
}

/** 游戏页可见的汤面信息 */
export type TStoryForGame = TStoryListItem & {
  surface: string
}

export type TAnswerKind = 'YES' | 'NO' | 'IRRELEVANT'

export type TMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  answerKind?: TAnswerKind
  rejudged?: boolean
  /** 仅 system：区分提示语气，便于样式与无障碍 */
  systemTone?: 'neutral' | 'error' | 'success'
}

export type TSessionStatus = 'playing' | 'revealed' | 'aborted'

export type TSessionOutcome = 'win' | 'peek' | 'aborted' | null

export type TSession = {
  sessionId: string
  storyId: string
  status: TSessionStatus
  outcome: TSessionOutcome
}
