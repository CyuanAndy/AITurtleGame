# API 文档（本地开发）

Base URL（本地）：`http://localhost:3000`

统一响应约定：
- 成功：`{ ok: true, ... }`
- 失败：`{ ok: false, error: string, detail?: string }`

---

## 1) 健康检查

### `GET /api/test`

说明：用于确认服务已启动。

成功示例：

```json
{
  "ok": true,
  "message": "API 正常",
  "time": "2026-03-30T13:23:35.381Z"
}
```

---

## 2) AI 对话

### `POST /api/chat`

说明：常规问答，返回「是 / 不是 / 无关」。

请求体：

```json
{
  "question": "死者是自杀吗？",
  "story": {
    "surface": "汤面文本",
    "bottom": "汤底文本"
  }
}
```

成功示例：

```json
{
  "ok": true,
  "answerCode": "NO",
  "answer": "不是"
}
```

常见错误：
- `400`：`question` / `story` 参数缺失
- `500`：未配置 `DEEPSEEK_API_KEY`
- `502`：上游 DeepSeek 网络或响应异常

---

## 3) 提交真相判定

### `POST /api/guess`

说明：提交完整结论，返回是否猜中核心要素。

请求体：

```json
{
  "text": "他是灯塔看守人，忘记检查灯光导致船只触礁。",
  "story": {
    "bottom": "标准汤底文本"
  }
}
```

成功示例：

```json
{
  "ok": true,
  "win": true
}
```

常见错误：
- `400`：`text` / `story.bottom` 缺失
- `500`：未配置 `DEEPSEEK_API_KEY`
- `502`：上游 DeepSeek 网络或响应异常

---

## 4) 404 与全局错误

- 未匹配接口时返回：

```json
{
  "ok": false,
  "error": "接口不存在：GET /api/unknown"
}
```

- 未捕获异常时返回：

```json
{
  "ok": false,
  "error": "服务器内部异常",
  "detail": "..."
}
```

---

## 5) 日志说明

服务已内置请求日志，格式类似：

- 入站：`[time] -> req_xxx METHOD /path ip=... ua="..."`
- 出站：`[time] <- req_xxx 200 METHOD /path 123ms`

用于联调时定位慢请求、错误请求。
