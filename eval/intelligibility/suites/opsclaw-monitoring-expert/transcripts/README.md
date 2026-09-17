# 把实网对话放到这里

当前 Cloud Agent 解析不了 `*.intra.env148.shuguang.com`，所以实评需要你从问答入口导出后放入本目录。

支持：

1. JSON：OpsClaw 导出会话、或本仓库 transcript schema
2. 纯文本：按下面格式粘贴为 `.txt`

```text
## me-alert-triage
用户：现在最紧急的告警是哪一条？影响什么业务？我先处理谁？
监控专家：（把页面上的最终回答原文贴在这里）
```

有文件后重新执行：

```bash
pnpm eval:monitoring-expert
```

工具会优先评分 `live/`，其次 `transcripts/`，都空才用合成夹具。实网样本请放 `../live/`，因为本目录的 `*.json` / `*.txt` 已被 gitignore。
