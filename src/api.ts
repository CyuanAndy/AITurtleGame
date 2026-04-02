/**
 * AI 调用：由前端调用后端代理。
 * 前端不再直连 DeepSeek，以避免暴露 API Key。
 */
import type { TStory } from './data/stories'

/** 题目数据；`askAI` 第二参数类型 */
export type Story = TStory

/** 后端判题不符合约定时抛出，便于前端提示用户重新提问 */
export const INVALID_AI_OUTPUT_MESSAGE =
  'AI 回答不符合规范，请重新提问或换一种说法。'

/** 后端 API 基址；例如 http://localhost:3000 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return API_BASE_URL ? `${API_BASE_URL}${p}` : p
}

export class AiApiError extends Error {
  readonly status?: number
  readonly detail?: string

  constructor(message: string, options?: { status?: number; detail?: string }) {
    super(message)
    this.name = 'AiApiError'
    this.status = options?.status
    this.detail = options?.detail
  }
}

type TChatOk = { ok: true; answer: string }
type TChatErr = { ok: false; error: string; detail?: string }

/**
 * 调用后端 AI 对话接口：POST /api/chat
 * 返回值：中文答案（'是' | '不是' | '无关'）
 */
export async function askAI(question: string, story: Story): Promise<string> {
  const q = question.trim()
  if (!q) throw new AiApiError('问题不能为空')

  // 按你的要求：前端直接调用后端接口（由后端代理 DeepSeek）
  const chatUrl = 'http://localhost:3000/api/chat'

  let res: Response
  try {
    res = await fetch(chatUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, story }),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new AiApiError(`网络请求失败：${msg}`)
  }

  let json: TChatOk | TChatErr
  try {
    json = (await res.json()) as TChatOk | TChatErr
  } catch {
    throw new AiApiError('服务器返回的不是合法 JSON', { status: res.status })
  }

  if (!res.ok || !json.ok) {
    const err = (json as TChatErr).error ?? '请求失败'
    const detail = (json as TChatErr).detail
    throw new AiApiError(err, { status: res.status, detail })
  }

  const ans = (json as TChatOk).answer
  if (ans !== '是' && ans !== '不是' && ans !== '无关') {
    throw new AiApiError(INVALID_AI_OUTPUT_MESSAGE)
  }

  return ans
}

type TGuessOk = { ok: true; win: boolean }
type TGuessErr = { ok: false; error: string; detail?: string }

/**
 * 提交真相胜负判定：
 * POST /api/guess
 * 返回 win 表示是否猜中核心要素。
 */
export async function submitTruthGuess(
  text: string,
  story: Story,
): Promise<{ win: boolean }> {
  const t = text.trim()
  if (!t) throw new AiApiError('text 不能为空')

  if (!API_BASE_URL) {
    throw new AiApiError(
      '未配置 VITE_API_BASE_URL。请在项目根目录 .env.local 中设置为 http://localhost:3000 后重启 dev。',
    )
  }

  let res: Response
  try {
    res = await fetch(apiUrl('/api/guess'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: t, story }),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new AiApiError(`网络请求失败：${msg}`)
  }

  let json: TGuessOk | TGuessErr
  try {
    json = (await res.json()) as TGuessOk | TGuessErr
  } catch {
    throw new AiApiError('服务器返回的不是合法 JSON', { status: res.status })
  }

  if (!res.ok || !json.ok) {
    const err = (json as TGuessErr).error ?? '请求失败'
    const detail = (json as TGuessErr).detail
    throw new AiApiError(err, { status: res.status, detail })
  }

  return { win: (json as TGuessOk).win }
}
