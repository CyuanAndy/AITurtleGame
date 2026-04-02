require('dotenv').config();
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 兼容多种启动目录：从 server/src、server、仓库根目录启动都能正确读取环境变量。
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envCandidates = [
  path.resolve(__dirname, '../.env.local'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(__dirname, '../../.env'),
]
for (const envPath of envCandidates) {
  dotenv.config({ path: envPath, override: false })
}

/** 创建 Express 应用实例：后续所有路由、中间件都挂在这个 app 上 */
const app = express()

/**
 * 监听端口：优先读环境变量 PORT（部署平台常用），否则默认 3000。
 * Number(...) 保证 listen 拿到的是数字类型。
 */
const PORT = Number(process.env.PORT) || 3000

function nowIso() {
  return new Date().toISOString()
}

function requestId() {
  return `req_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

function sendError(res, status, error, detail) {
  return res.status(status).json({
    ok: false,
    error,
    ...(detail ? { detail } : {}),
  })
}

/**
 * CORS 中间件：浏览器在「前端域名」请求「后端域名」时会先检查是否允许跨域。
 * origin 列出开发时常用的 Vite 地址；生产域名可再改成环境变量。
 */
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)

/** 解析 JSON 请求体（后续 POST /api/... 会用到；不影响纯 GET） */
app.use(express.json())

/**
 * 请求日志中间件：
 * - 记录 method / path / status / latency / requestId
 * - 便于联调和排查性能问题
 */
app.use((req, res, next) => {
  const startedAt = Date.now()
  const rid = requestId()
  req.requestId = rid
  const ua = req.get('user-agent') ?? 'unknown'
  const ip = req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown'
  console.log(`[${nowIso()}] -> ${rid} ${req.method} ${req.originalUrl} ip=${ip} ua="${ua}"`)
  res.on('finish', () => {
    const elapsed = Date.now() - startedAt
    console.log(
      `[${nowIso()}] <- ${rid} ${res.statusCode} ${req.method} ${req.originalUrl} ${elapsed}ms`,
    )
  })
  next()
})

/**
 * DeepSeek：使用环境变量读取 API Key（服务端私钥，只在这里使用）。
 * - DEEPSEEK_API_KEY：必填
 * - DEEPSEEK_BASE_URL：可选，默认 https://api.deepseek.com
 */
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '')

const DEEPSEEK_MODEL = 'deepseek-chat'
const CHAT_COMPLETIONS_PATH = '/v1/chat/completions'

const FEW_SHOT_BLOCK = [
  '【格式示例（与当前题目无关，仅演示 JSON 与语义）】',
  '问：死者是自杀吗？',
  '输出：{"answer":"NO"}',
  '',
  '问：现场是否有第三人留下的痕迹？',
  '输出：{"answer":"YES"}',
  '',
  '问：今天股市涨了吗？（与故事无关）',
  '输出：{"answer":"IRRELEVANT"}',
  '',
  '问：门是从内侧反锁的吗？',
  '输出：{"answer":"YES"}',
].join('\n')

const INVALID_AI_OUTPUT_MESSAGE =
  'AI 回答不符合规范，请重新提问或换一种说法。'

function buildSystemPrompt(story) {
  return [
    '你是海龟汤游戏的主持人。你只能依据下方「汤面」与「汤底」判断玩家当前这一句提问。',
    '',
    '【硬性规则】',
    '1. 你不得向玩家复述、摘抄或暗示完整汤底；不得输出推理过程或解释。',
    '2. 玩家界面上只能出现三种回答之一：「是」「不是」「无关」。',
    '3. 你必须通过且仅通过一个 JSON 对象表达结果：键名固定为 answer，取值只能是字符串 "YES"、"NO"、"IRRELEVANT" 之一（分别对应「是」「不是」「无关」。',
    '4. 除该 JSON 外不得输出任何字符：不要 Markdown、不要代码围栏、不要前后缀说明。',
    '5. YES：玩家陈述与汤底一致或为真；NO：与汤底矛盾或为假；IRRELEVANT：与汤底无关、无法据此判断、或脱离故事情境。',
    '',
    FEW_SHOT_BLOCK,
    '',
    '【本题材料】',
    `汤面：\n${story.surface}`,
    '',
    `汤底（仅供你内部判断，禁止对玩家展示或复述）：\n${story.bottom}`,
  ].join('\n')
}

function buildUserPrompt(question) {
  return [
    '现在请只回答玩家当前这一句。输出必须是单个 JSON 对象，例如 {"answer":"YES"}。',
    '',
    `玩家问：${question}`,
  ].join('\n')
}

function extractJsonObjectString(raw) {
  const t = String(raw || '').trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return t
  return t.slice(start, end + 1)
}

function normalizeAnswerField(value) {
  const v = typeof value === 'string' ? value.trim() : value
  if (v === 'YES' || v === 'NO' || v === 'IRRELEVANT') return v
  if (v === '是' || v === 'YES') return 'YES'
  if (v === '不是' || v === 'NO') return 'NO'
  if (v === '无关' || v === 'IRRELEVANT') return 'IRRELEVANT'
  return null
}

function parseAnswerPayload(raw) {
  const trimmed = extractJsonObjectString(raw)
  let parsed
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    throw new Error(INVALID_AI_OUTPUT_MESSAGE)
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(INVALID_AI_OUTPUT_MESSAGE)
  }

  const answer = parsed.answer
  const code = normalizeAnswerField(answer)
  if (!code) throw new Error(INVALID_AI_OUTPUT_MESSAGE)
  return code
}

function mapCodeToUiText(code) {
  if (code === 'YES') return '是'
  if (code === 'NO') return '不是'
  return '无关'
}

/** 测试接口：确认服务器与 /api 前缀路由工作正常 */
app.get('/api/test', (_req, res) => {
  res.json({
    ok: true,
    message: 'API 正常',
    time: new Date().toISOString(),
  })
})

/**
 * 提交真相（胜负判定）：
 * - 入参：{ text: 玩家结论字符串, story: { bottom: string } }
 * - 出参：{ ok: true, win: boolean }
 *
 * 说明：为实现“提交真相不依赖前端本地规则”，此处由后端调用 LLM 判定。
 * （当前 demo 仍可能经由前端传入 story.bottom；上线时应把 truth/core_conditions 全部放服务端。）
 */
const INVALID_GUESS_OUTPUT_MESSAGE = 'AI 判定输出不符合约定，请稍后再试。'

function normalizeGuessText(s) {
  return String(s)
    .trim()
    .replace(/\s+/g, '')
    .replace(/\u3000/g, '')
    .replace(/[，。、；：！？,.!?]/g, '')
}

function buildGuessSystemPrompt() {
  return [
    '你是海龟汤游戏的主持人。',
    '',
    '【硬性规则】',
    '1. 只根据已提供的「汤底（真相）」判断玩家提交的结论是否覆盖关键事实。',
    '2. 只能输出一个 JSON 对象：{ "win": true } 或 { "win": false }。',
    '3. 除该 JSON 外不得输出任何字符，禁止 Markdown/代码围栏/前后缀说明。',
    '',
    '判定含义：',
    '- win: 玩家提交结论表达了汤底中的关键因果/关键结论（即便使用了不同措辞），并且没有与汤底关键结论冲突。',
    '- win: 玩家提交结论与汤底关键因果/关键结论不一致，或遗漏了关键结论。',
  ].join('\n')
}

function buildGuessUserPrompt(truth, text) {
  return [
    '【输入】',
    `汤底（真相，仅供你内部判断）：\n${truth}`,
    '',
    `玩家提交的结论：\n${text}`,
  ].join('\n')
}

function parseWinPayload(raw) {
  const extracted = extractJsonObjectString(raw)
  let parsed
  try {
    parsed = JSON.parse(extracted)
  } catch {
    throw new Error(INVALID_GUESS_OUTPUT_MESSAGE)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(INVALID_GUESS_OUTPUT_MESSAGE)
  }
  const win = parsed.win
  if (win === true || win === false) return win
  if (typeof win === 'string') {
    const v = win.trim().toLowerCase()
    if (v === 'true') return true
    if (v === 'false') return false
    if (v === '是') return true
    if (v === '否') return false
  }
  throw new Error(INVALID_GUESS_OUTPUT_MESSAGE)
}

app.post('/api/guess', async (req, res) => {
  try {
    const text = req.body?.text
    const story = req.body?.story

    if (typeof text !== 'string' || text.trim().length === 0) {
      return sendError(res, 400, 'text 不能为空')
    }
    if (!story || typeof story !== 'object') {
      return sendError(res, 400, 'story 必须提供')
    }
    if (typeof story.bottom !== 'string' || story.bottom.trim().length === 0) {
      return sendError(res, 400, 'story.bottom 不能为空')
    }

    // 轻量级后端兜底：完全一致/包含则直接判定胜利，避免 LLM 偶发过严导致无法通关
    const normText = normalizeGuessText(text)
    const normTruth = normalizeGuessText(story.bottom)
    if (
      normText.length > 0 &&
      normTruth.length > 0 &&
      (normText === normTruth ||
        normText.includes(normTruth) ||
        normTruth.includes(normText))
    ) {
      return res.json({ ok: true, win: true })
    }
    if (!DEEPSEEK_API_KEY) {
      return sendError(
        res,
        500,
        '尚未配置 DeepSeek：请设置环境变量 DEEPSEEK_API_KEY 后重启服务器。',
      )
    }

    const url = `${DEEPSEEK_BASE_URL}${CHAT_COMPLETIONS_PATH}`
    const body = {
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: buildGuessSystemPrompt() },
        {
          role: 'user',
          content: buildGuessUserPrompt(story.bottom, text.trim()),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      top_p: 0.9,
    }

    let deepseekRes
    try {
      deepseekRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify(body),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return sendError(res, 502, `DeepSeek 网络请求失败：${msg}`)
    }

    const rawText = await deepseekRes.text()
    if (!deepseekRes.ok) {
      return sendError(
        res,
        502,
        `DeepSeek 请求失败（HTTP ${deepseekRes.status}）`,
        rawText.slice(0, 500),
      )
    }

    let data
    try {
      data = JSON.parse(rawText)
    } catch {
      return sendError(res, 502, 'DeepSeek 返回的不是合法 JSON', rawText.slice(0, 200))
    }

    const content = data?.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string') {
      return sendError(res, 502, INVALID_GUESS_OUTPUT_MESSAGE)
    }

    const win = parseWinPayload(content)

    return res.json({ ok: true, win })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return sendError(res, 500, '服务器处理失败', msg)
  }
})

/**
 * AI 对话接口：
 * - 入参：{ question: string, story: { surface: string, bottom: string } }
 * - 出参：{ ok: true, answer: '是'|'不是'|'无关', answerCode: 'YES'|'NO'|'IRRELEVANT' }
 */
app.post('/api/chat', async (req, res) => {
  try {
    const question = req.body?.question
    const story = req.body?.story

    if (typeof question !== 'string' || question.trim().length === 0) {
      return sendError(res, 400, 'question 不能为空')
    }
    if (!story || typeof story !== 'object') {
      return sendError(res, 400, 'story 必须提供')
    }
    if (typeof story.surface !== 'string' || story.surface.trim().length === 0) {
      return sendError(res, 400, 'story.surface 不能为空')
    }
    if (typeof story.bottom !== 'string' || story.bottom.trim().length === 0) {
      return sendError(res, 400, 'story.bottom 不能为空')
    }

    if (!DEEPSEEK_API_KEY) {
      return sendError(
        res,
        500,
        '尚未配置 DeepSeek：请设置环境变量 DEEPSEEK_API_KEY 后重启服务器。',
      )
    }

    const url = `${DEEPSEEK_BASE_URL}${CHAT_COMPLETIONS_PATH}`
    const body = {
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt(story) },
        { role: 'user', content: buildUserPrompt(question.trim()) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      top_p: 0.9,
    }

    let deepseekRes
    try {
      deepseekRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify(body),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return sendError(res, 502, `DeepSeek 网络请求失败：${msg}`)
    }

    const rawText = await deepseekRes.text()
    if (!deepseekRes.ok) {
      return sendError(
        res,
        502,
        `DeepSeek 请求失败（HTTP ${deepseekRes.status}）`,
        rawText.slice(0, 500),
      )
    }

    let data
    try {
      data = JSON.parse(rawText)
    } catch {
      return sendError(res, 502, 'DeepSeek 返回的不是合法 JSON', rawText.slice(0, 200))
    }

    const content = data?.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string') {
      return sendError(res, 502, INVALID_AI_OUTPUT_MESSAGE)
    }

    const answerCode = parseAnswerPayload(content)

    return res.json({
      ok: true,
      answerCode,
      answer: mapCodeToUiText(answerCode),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return sendError(res, 500, '服务器处理失败', msg)
  }
})

// 404 统一响应（JSON）
app.use((req, res) => {
  return sendError(res, 404, `接口不存在：${req.method} ${req.originalUrl}`)
})

// Express 全局错误处理兜底
app.use((err, req, res, _next) => {
  const msg = err instanceof Error ? err.message : String(err)
  console.error(
    `[${nowIso()}] !! ${req.requestId ?? 'req_unknown'} unhandled error: ${msg}`,
  )
  if (res.headersSent) return
  return sendError(res, 500, '服务器内部异常', msg)
})

/** 启动 HTTP 服务；回调在绑定端口成功后执行，用于打印日志 */
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
  console.log(`Try: GET http://localhost:${PORT}/api/test`)
})
