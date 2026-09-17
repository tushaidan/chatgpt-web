# 浏览器 Agent 回答可理解度评测

本目录是「人能不能看懂智能体回答」的可运行评测器。方案说明见 [docs/browser-agent-intelligibility-eval.md](../../docs/browser-agent-intelligibility-eval.md)。

## 一句话

任务成功率只说明 Agent **做成了没有**；本工具只说明用户最终看到的文字 **能不能读懂**。两件事正交，报告必须把原文暴露出来。

## 运行

```bash
# 使用自带夹具生成 HTML / Markdown / JSON 报告
node eval/intelligibility/cli.mjs

# 评测自己的轨迹文件或目录
node eval/intelligibility/cli.mjs path/to/transcripts.json --out eval/intelligibility/out

# 可选：叠加 LLM Judge（需要 OPENAI_API_KEY）
node eval/intelligibility/cli.mjs path/to/transcripts.json --judge

# 夹具回归
node eval/intelligibility/test.mjs
```

也可使用根目录脚本：`pnpm eval:intelligibility`。

输出：

- `out/report.html`：给人看的报告，逐条展示原文和「人能看懂吗」
- `out/report.md`：便于贴到 PR / 评审
- `out/report.json`：便于接 CI

## 输入格式

最小字段：

```json
{
  "run_id": "task-001",
  "agent": "my-browser-agent",
  "scenario": "extract",
  "locale": "zh-CN",
  "target": { "browser": "chromium", "url": "https://example.com" },
  "user_query": "今天北京天气？",
  "final_answer": "今天北京晴，12～21℃，不用带伞。",
  "messages": [
    { "role": "assistant", "channel": "user_visible", "content": "今天北京晴，12～21℃，不用带伞。" },
    { "role": "tool", "channel": "trace", "content": "browser_click(#search)" }
  ]
}
```

`channel`：

- `user_visible`：用户看得到，计入可理解度
- `trace` / `thought`：内部轨迹，只作对照，不当作答案

也支持：

- `{ "runs": [ ... ] }` 批量
- 本仓库 ChatGPT Web 本地会话导出（`chat[].data[].inversion`）

完整字段见 `schema.json`，判定阈值见 `rubric.json`。
