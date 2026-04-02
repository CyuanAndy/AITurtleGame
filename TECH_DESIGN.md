# AI海龟汤游戏技术设计

> 文档版本：v1.0  
> 状态：草案  
> 关联文档：`PRD.md`

---

## 1. 文档说明

### 1.1 文档定位

本文档描述 MVP 实现所需的 **技术选型、工程结构、数据模型、接口、AI 策略与安全约束**，与 `PRD.md` 产品规格对齐，供研发与评审使用。

### 1.2 范围说明

- **包含**：技术栈、前端目录约定、核心实体与消息结构、主流程、REST API 草案、Prompt 要点、非功能实现要点、验收技术映射、待确认项。
- **不包含**：具体视觉稿、运维手册、详细部署脚本（仅作方向性建议）。

---

## 2. 技术栈

### 2.1 分层选型

| 层级 | 选型 | 说明 |
|------|------|------|
| 前端 | **React** + **TypeScript** + **Vite** | 组件化、类型安全、快速开发与构建 |
| 样式 | **Tailwind CSS** | 与 PRD 深色悬疑调性一致，快速迭代布局与响应式 |
| 状态管理 | **React Hooks**（`useState`、`useContext`） | MVP 单页会话状态以 Context 聚合（当前 `storyId`、`sessionId`、消息列表、提交次数等）；**持久化与恢复见 §2.3** |
| 路由 | **React Router** | 大厅 `/`、游戏 `/game/:storyId`、汤底 `/result/:sessionId`（路径可按团队约定微调） |
| 后端 | **Node.js** + **Express** | 代理 AI、持有 `truth` / `core_conditions`、会话与限流；**可选**：前期可用 **MSW / 本地 mock JSON** 模拟接口，但**密钥与真实判题必须走服务端**后再联调 |
| AI API | **DeepSeek**（兼容 OpenAI Chat Completions 协议） | PRD 建议可抽象 `LLMProvider`，便于切换 Claude 等；**调用大模型时须启用 JSON 输出模式**，见 §7.1、§7.2 |
| 部署（建议） | 前端 **Vercel**；后端 Serverless 或独立主机 | 注意 Serverless 冷启动与超时；P95 &lt; 3s 需监控 |

### 2.2 敏感数据与密钥原则

`truth`、`core_conditions`、API Key **仅服务端**；前端永不持有完整汤底与核心锚点（与 PRD §11.1、§9.3 一致）。

### 2.3 状态持久化与恢复（防刷新）

为降低刷新导致的中断，并与会话恢复（PRD AC-3）对齐，约定如下：

- **本地标识**：创建会话成功后，将返回的 `sessionId` 写入 `localStorage`（键名由项目约定，如 `turtle_session_id`），供刷新后识别「进行中的一局」。
- **Context 初始化**：承载会话的 React Context 在初始化时应 **优先读取** `localStorage` 中的 `sessionId`。若存在有效值，则 **立即请求** `GET /api/sessions/:id`，用于恢复当前页面与对话状态（消息列表、`guessRemaining` / `rejudgeRemaining` 等以后端返回为准）。
- **失效处理**：若接口返回 **404**、**会话不存在**，或业务上会话已 **结束 / 揭晓 / 放弃**（与 PRD `status` 一致），则 **清除** 上述本地缓存，并将用户 **导航回游戏大厅**，避免停留在无效游戏态。
- **安全边界**：仅依赖服务端返回判定会话是否有效；**不得**仅根据本地缓存消息继续「离线游戏」，以免与真实进度不一致。

---

## 3. 项目结构

### 3.1 目录树（建议）

```
src/
  components/
    GameCard.tsx           # 大厅题目卡片（标题、难度、类型、导语）
    ChatBox.tsx            # 消息列表容器
    Message.tsx            # 单条消息（含「重新判定」入口）
    StorySurface.tsx       # 汤面展示（可折叠长文）
    GuessModal.tsx         # 「提交真相 / 我猜到了」独立表单（与普问分流）
    ConfirmDialog.tsx      # 二次确认（查看汤底、结束游戏）
    StoryReveal.tsx        # 汤底区展示（结果页可复用）
  pages/
    Home.tsx               # 游戏大厅（列表、筛选/排序可选）
    Game.tsx               # 游戏页（汤面 + 聊天 + 底部操作）
    Result.tsx             # 汤底页（汤底 + 只读对话 + 再来一局）
  contexts/
    GameSessionContext.tsx # 会话与消息、剩余提交/重新判定次数等（可选拆分）
  hooks/
    useStories.ts          # 拉取题目列表
    useSession.ts          # 创建会话、发消息、猜题、重新判定
  services/
    api.ts                 # fetch 封装、错误与重试
  data/                    # 仅开发期：mock / 静态 JSON（生产题目由后端 GET）
    stories.ts             # 可选：与后端 schema 一致的示例数据
  types/
    index.ts               # Story、Message、Session、API 枚举
  App.tsx
  main.tsx
```

---

## 4. 数据模型

### 4.1 Story（海龟汤题目）

与 PRD §11.1 对齐；**前端列表/游戏页**仅使用不含敏感字段的子集。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 题目唯一标识 |
| `title` | `string` | 标题 |
| `difficulty` | `'easy' \| 'medium' \| 'hard'` | 难度 |
| `category` | `string` | 类型标签（如：悬疑、日常、恐怖） |
| `surface` | `string` | 汤面（谜面） |
| `truth` | `string` | 汤底全文：**仅服务端存储**；仅通过揭晓后接口或汤底页逻辑下发 |
| `core_conditions` | `string[]` | 3–5 条核心事实锚点：**仅服务端**，用于 AI 判题与胜负，**不下发前端** |

**前端 DTO 示例**：`StoryListItem`（无 `truth`、`core_conditions`）；`StoryForGame`（含 `surface`，仍无 `truth` / `core_conditions`）。

### 4.2 Session（一局）

| 字段 | 类型 | 说明 |
|------|------|------|
| `sessionId` | `string` | 会话 ID（UUID，可存 `localStorage` / cookie） |
| `storyId` | `string` | 关联题目 |
| `status` | `'playing' \| 'revealed' \| 'aborted'` | 进行中 / 已揭晓 / 已放弃 |
| `outcome` | `'win' \| 'peek' \| 'aborted' \| null` | 可选：胜利揭晓 / 查看汤底 / 结束未揭晓，便于埋点 |

### 4.3 Message（对话消息）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 消息 ID |
| `role` | `'user' \| 'assistant' \| 'system'` | 用户 / AI / 系统提示（如「不完全对，继续努力」） |
| `content` | `string` | 文本内容 |
| `timestamp` | `number` | 时间戳（ms） |
| `answerKind` | `'YES' \| 'NO' \| 'IRRELEVANT' \| undefined` | 仅 AI 三类回答时有值，便于样式与重新判定 |
| `rejudged` | `boolean` | 是否已重新判定（PRD G-11） |

**说明**：`assistantMessageId` 用于 `rejudge` 接口路径；若后端用自增 ID，前后端约定字符串即可。

### 4.4 客户端状态（补充）

| 名称 | 说明 |
|------|------|
| `guessRemaining` | 单局「提交真相」剩余次数（默认 3，与前后端一致） |
| `rejudgeRemaining` | 单局「重新判定」剩余次数（建议默认 3，可配置） |

---

## 5. 核心流程

1. **进入大厅** → 拉取题目列表（`GET /api/stories`）→ 展示卡片。
2. **开始游戏** → `POST /api/sessions` 创建会话 → 将 `sessionId` 写入 `localStorage` → 跳转游戏页，展示汤面（`GET /api/stories/:id` 或会话内嵌元数据）。
3. **常规提问** → 用户输入 → `POST /api/sessions/:id/messages` → 服务端从 **数据库或缓存** 读取该会话的完整历史，**在服务端** 截取最近 **5–8 轮**（用户问 + AI 答计为一轮，具体上限可配置），再与本轮用户问题一并组装后调用 AI；响应解析为 `YES` / `NO` / `IRRELEVANT` → 前端仅展示「是」「不是」「无关」→ 追加消息历史。**前端不得自行截取「滑动窗口」并作为可信上下文提交**，以防篡改历史影响判题一致性。
4. **重新判定**（可选）→ 对某条 AI 消息 → `POST .../messages/:assistantMessageId/rejudge` → 服务端按 PRD §11.3 拉长或重放上下文后调用 AI；覆盖该条展示，标记 `rejudged`；扣减次数。
5. **提交真相** → 独立入口 → `POST .../guess` → 服务端按 §7.2 规则得到 `win` → `win: true`：胜利反馈 → 跳转汤底页；`win: false`：系统消息提示，扣减 `guessRemaining`。
6. **查看汤底** → 二次确认 → 标记揭晓 → 跳转汤底页，拉取含 `truth` 的展示数据。
7. **结束游戏** → 二次确认 → 清除或保留 `localStorage` 按产品约定；默认回大厅，`status: aborted`（与「查看汤底」区分）。
8. **再来一局** → 回大厅。

**防刷新与恢复**：应用加载或进入游戏相关路由时，若 `localStorage` 中已有 `sessionId`，应先执行 `GET /api/sessions/:id` 恢复状态；失败或会话已结束时按 §2.3 处理（详见 §2.3）。

---

## 6. API 设计

与 PRD §11.2 对齐。

### 6.1 REST 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/stories` | 题目列表（**不含** `truth`、`core_conditions`） |
| `GET` | `/api/stories/:id` | 单题详情（游戏页：**仅** `surface` 等安全字段） |
| `POST` | `/api/sessions` | body: `{ storyId }` → `{ sessionId, ... }` |
| `POST` | `/api/sessions/:id/messages` | body: `{ text }` → `{ answer: 'YES'\|'NO'\|'IRRELEVANT', assistantMessageId }` |
| `POST` | `/api/sessions/:id/guess` | body: `{ text }` → `{ win: boolean }`；**服务端校验单局 ≤3 次** |
| `POST` | `/api/sessions/:id/messages/:assistantMessageId/rejudge` | 重新判定 → `{ answer }` |
| `GET` | `/api/sessions/:id` | 恢复会话与消息列表（满足 AC-3 或产品明确「不恢复」策略） |
| `POST` | `/api/sessions/:id/reveal` | 可选：标记揭晓 |
| `DELETE` | `/api/sessions/:id` | 可选：结束并清理 |

### 6.2 响应与错误约定

常规问答、重新判定、提交真相等依赖 LLM 的接口，响应体应经后端 **解析严格 JSON**（见 §7.1、§7.2）；若解析失败或模型输出不合规，后端可重试或返回可映射错误码，前端提示重试（PRD G-9）。

---

## 7. AI 设计

与 PRD §11.3 一致。

### 7.1 常规问答（是 / 不是 / 无关）

**目标**：只输出三类，不剧透；与 `core_conditions` 对齐以减少不一致。

**调用参数（工程强制）**

- 调用 Chat Completions（或等价接口）时，**必须** 开启 **JSON 模式**，例如 OpenAI 兼容参数：`response_format: { "type": "json_object" }`（若所用模型/SDK 名称不同，以实现侧等价能力为准）。
- **滑动窗口**：截取最近 5–8 轮对话用于拼上下文的操作 **只能** 在 **服务端** 完成：从 **数据库或会话缓存** 读取该 `sessionId` 的权威消息序，再截取窗口后与本轮用户提问合并传入模型。**禁止** 信任前端上传的整段「历史」作为唯一上下文来源，以防止篡改导致判题失真。

**System Prompt（要点）**

- 角色：海龟汤主持人。
- 输入（服务端组装，不暴露给前端）：汤面、`truth`、`core_conditions`、**由服务端截取的** 最近 5–8 轮对话。
- 要求：严格依据汤底与核心条件判断玩家**当前问题**；**最终模型输出必须为单一 JSON 对象**，且仅含键 `answer`，取值为字符串 `"YES"`、`"NO"`、`"IRRELEVANT"` 之一（与界面文案「是 / 不是 / 无关」映射）。
- **格式硬约束**：在 System Prompt 中明确要求：**禁止** 输出 Markdown 代码围栏（例如用三个反引号包裹的 `json` 代码块）、**禁止** 在 JSON 前后附加任何说明文字、注释或多余键，确保响应可被后端稳定 `JSON.parse`。
- 禁止：复述汤底、额外解释（MVP 默认关闭「简短理由」）。

**User 片段模板（逻辑结构）**

```
你是一个海龟汤游戏的主持人。
当前故事的汤面是: {surface}
故事的汤底与核心事实锚点（仅供你内部判断，不得复述给玩家）已在系统上下文中提供。
玩家会向你提问。你必须只输出一个 JSON 对象，格式严格为：
{"answer":"YES"} 或 {"answer":"NO"} 或 {"answer":"IRRELEVANT"}
不要输出 markdown 代码块，不要输出任何除该 JSON 以外的字符。

语义对应关系：
1. 与汤底一致 → YES
2. 与汤底矛盾 → NO
3. 无法判断或无关 → IRRELEVANT

注意：
1. 严格根据汤底与 core_conditions 判断，不要额外编造情节。
2. 不要解释。不要透露汤底原文。

玩家问: {question}
```

**后端解析**：从模型原始响应中解析 JSON，读取 `answer` 字段并校验枚举；校验失败则按 §6.2 处理。

### 7.2 提交真相（胜负判定）

- 单独 Prompt 或独立请求；输入包含玩家完整结论、`truth`、`core_conditions`（均在服务端组装）。
- **调用参数**：与 §7.1 相同，**必须** 启用 `response_format: { "type": "json_object" }`（或等价能力）。
- **System / User 约束**：强制只输出 JSON，例如 **`{"win": true}`** 或 **`{"win": false}`**；**禁止** Markdown 代码围栏、前后缀说明文字；**不得**在 `win: false` 时返回汤底内容或等价复述。

**判定规则（MVP，量化）**

- 服务端将玩家结论与题目自带的 `core_conditions` 进行比对（可由 **大模型在 JSON 模式下输出 `win`**，或由程序规则 + 模型辅助，但 **阈值口径** 如下）。
- **MVP 约定**：若玩家结论 **涵盖** 了 `core_conditions` 中至少 **80%** 条所表达的 **核心因果 / 关键事实**（按条计数：单条条件是否被玩家结论合理覆盖，再计算覆盖比例），则判定为 **`win: true`**；否则为 **`win: false`**。
- 实现时应在 Prompt 中写明上述 80% 规则，并固定「何谓覆盖单条条件」的判法（例如由模型逐条标注是否命中，再计算比例），以保证可验收、可追溯。

### 7.3 重新判定

- 请求体携带：该条**用户原问题**、**AI 原回答**；上下文由服务端从存储中加载并按 PRD §11.3 选择窗口（可适当长于常规 5–8 轮）。
- **输出格式**：与 §7.1 一致，启用 JSON 模式，解析 `{"answer":"YES"|"NO"|"IRRELEVANT"}`；前端替换该条 AI 消息并标记 `rejudged`。

---

## 8. 安全与非功能（实现要点）

- **HTTPS**；**API Key** 仅环境变量 + 服务端。
- **输入**：前端最大长度（建议 500 字）、空内容拦截；后端截断或拒识。
- **内容安全**：对用户输入与模型输出走厂商或自建策略（PRD §9.3）。
- **性能**：首屏骨架屏；问答 P95 &lt; 3s 监控。
- **埋点**：进入大厅、开始游戏、发送问题、提交真相（含胜负）、重新判定（含是否变更）、查看汤底、结束游戏、错误（PRD §9.4）。

---

## 9. 与 PRD 验收映射（技术侧）

| AC | 技术实现要点 |
|----|----------------|
| AC-1 | `stories` 数据源 ≥3 条，含 `difficulty`、`category` |
| AC-2 | UI 仅展示「是/不是/无关」；后端返回枚举或严格解析 |
| AC-3 | `GET /api/sessions/:id` + `localStorage` 中 `sessionId` 恢复策略（§2.3、§5） |
| AC-4 | 揭晓后接口返回 `truth` 与一致 `storyId` |
| AC-5 | 结束游戏路由与 `status` 更新 |
| AC-6 | 全局错误提示与重试 |
| AC-7 | `guess` 接口次数校验 + 前端置灰与文案 |
| AC-8 | `rejudge` 更新单条消息 + 次数上限 |

---

## 10. 开放实现项（需与产品确认）

- 「结束游戏」后是否永久不可见汤底（PRD §15 开放问题 1）。
- 会话恢复失败时的用户提示文案与是否保留 `localStorage` 键的细则。
- 「提交真相」**80% 覆盖** 规则在上线后是否调整阈值，或引入程序化打分与模型结论的交叉校验（§7.2）。

---

**文档结束**
