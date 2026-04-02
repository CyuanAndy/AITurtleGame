import { apiUrl } from '../api'

/** 创建会话、发消息、猜题、重新判定等；后端就绪后在此对接 */
export async function createSession(storyId: string): Promise<{ sessionId: string }> {
  const res = await fetch(apiUrl('/api/sessions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyId }),
  })
  if (!res.ok) {
    throw new Error(`createSession failed: ${res.status}`)
  }
  return res.json() as Promise<{ sessionId: string }>
}
