# 监控专家（OpsClaw）可理解度评测

评测对象不是 chatgpt-web 本身，而是这个问答入口里的 **监控专家**：

https://opsone-cn-wulan-env148-d01.console.intra.env148.shuguang.com/aiops/opsclaw/my-conversation?agentId=a3fda524-7f2c-4c52-94ca-7b4198941a14

`agentId=a3fda524-7f2c-4c52-94ca-7b4198941a14`

## 评什么

值班人员 **不打开 Prometheus、不读工具 JSON**，能否看懂终局回答。

任务有没有查到数是另一件事。本套题专门抓这些坏回答：

- 把 Alertmanager JSON 丢给用户
- 只回 PromQL
- 只回时序点 / IP 列表
- 「我将打开 Prometheus 并点击面板」
- 有一句结论，但后面跟整页 Grafana dump

## 怎么跑

```bash
pnpm eval:monitoring-expert
# 或
node eval/intelligibility/cli.mjs --suite opsclaw-monitoring-expert
```

行为：

1. 探测问答入口是否可达
2. 若 `live/` 或 `transcripts/` 里有实网对话，就评实网
3. 否则评 `fixtures/` 合成对照，并在报告里标明 **不是实网成绩**
4. 合成模式下附上 12 道应贴进页面的值班题

把页面回答放入 `live/`（推荐，可提交）或 `transcripts/`（被 gitignore）后重跑，报告就会变成实评。

当前实评报告见 [`live-report/`](./live-report/)。

内网机器上若已登录，可带 Cookie 再探活：

```bash
OPSCLAW_COOKIE='session=...' pnpm eval:monitoring-expert
```

## 值班题

见 `cases.json`。先问「有没有 P1」「5xx 有没有异常」「要不要扩容」这类要结论的题，不要先问开放闲聊。
