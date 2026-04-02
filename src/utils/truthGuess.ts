/**
 * 本地「提交真相」判定（演示用）。
 * 上线后应由后端依据 truth / core_conditions 与 TECH_DESIGN §7.2 判定。
 */

function normalizeTruthText(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, '')
    .replace(/\u3000/g, '')
    .replace(/[，。、；：！？,.!?]/g, '')
}

function lcsLength(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array<number>(n + 1).fill(0),
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }
  return dp[m][n]
}

/** 玩家侧常见表述与题库用词的差异（只改用户文本再比，避免误改标准汤底里的「那半根火柴」等） */
function userTextForCompare(u: string): string {
  return u.replace(/半根签/g, '短签').replace(/抽到半根火柴/g, '抽到短火柴')
}

/**
 * 若用户结论与标准汤底足够接近，则视为猜中（本机 MVP）。
 *
 * 注意：这是**字面相似度（LCS）**，不是语义模型。若你**多写**了题库没有的情节（例如「先扔行李」），
 * 整段变长、与标准汤底的字符重合比例会被拉低，容易判负——这是预期行为。
 *
 * 规则：
 * - 规范化后完全一致，或一方包含另一方全文 → 猜中
 * - 否则计算 LCS，满足任一：
 *   - LCS / min(len) ≥ 0.72
 *   - 2×LCS / (len u + len b) ≥ 0.48（两边都较长、中间多插几句时更友好）
 * - 再对用户文做少量同义归一后重复上述两式（缓解「短签」写成「半根签」等）
 */
export function evaluateTruthGuess(userText: string, bottom: string): boolean {
  const u = normalizeTruthText(userText)
  const b = normalizeTruthText(bottom)
  if (u.length === 0 || b.length === 0) return false
  if (u === b) return true
  if (u.includes(b) || b.includes(u)) return true

  const tryMatch = (a: string, c: string): boolean => {
    const lcs = lcsLength(a, c)
    const shorter = Math.min(a.length, c.length)
    const ratioShort = shorter > 0 ? lcs / shorter : 0
    const ratioDice = a.length + c.length > 0 ? (2 * lcs) / (a.length + c.length) : 0
    return ratioShort >= 0.72 || ratioDice >= 0.48
  }

  if (tryMatch(u, b)) return true
  const u2 = userTextForCompare(u)
  if (u2 !== u && tryMatch(u2, b)) return true

  return false
}
