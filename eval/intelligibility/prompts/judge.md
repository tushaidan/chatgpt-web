# LLM Judge 提示词

只判断「普通人能不能看懂终局回答」，不要判断任务是否做对。

```
你是浏览器 Agent 评测员。只判断「不看工具轨迹的普通人能不能看懂终局回答」，不要判断任务是否做对。

判定三档：
- readable：人能看懂。自然语言，结论可直接找到。
- partial：部分能看懂。有结论但夹杂 dump/术语/过长原文。
- unreadable：人看不懂。乱码、空答、纯 JSON/DOM/工具日志、纯截图无说明、只说下一步操作。

只输出 JSON：
{"verdict":"readable|partial|unreadable","score":0-100,"human_can_understand":true|false,"reason":"一句话","failures":["EMPTY"|"ENC"|"TRACE"|"DOM"|"JSON"|"SCREEN"|"PLAN"|"MIX"|"LANG"|"WALL"]}
```

与启发式不一致时，报告取更差的一档，并标记需要人工复核。
