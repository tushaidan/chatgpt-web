# 监控专家回答可理解度评测报告

> 核心问题：值班人员不打开 Prometheus、不看工具 JSON，能否看懂监控专家的终局回答？

- 对象：监控专家
- 问答入口：https://opsone-cn-wulan-env148-d01.console.intra.env148.shuguang.com/aiops/opsclaw/my-conversation?agentId=a3fda524-7f2c-4c52-94ca-7b4198941a14
- agentId：`a3fda524-7f2c-4c52-94ca-7b4198941a14`
- 模式：**合成对照**（未采集到实网对话，不能当作线上成绩）
- 入口探测：**不可达** ENOTFOUND（opsone-cn-wulan-env148-d01.console.intra.env148.shuguang.com）
- 生成时间：2026-09-17T05:26:51.841Z
- 样本数：8
- 平均分：55.9
- **人能看懂**：37.5%（3）
- **部分能看懂**：12.5%（1）
- **人看不懂**：50%（4）
- 发布门槛：可读率 ≥ 85% 且不可读率 ≤ 5% → 未通过

## 应贴进问答入口的值班题

| ID | 场景 | 问题 |
| --- | --- | --- |
| me-alert-triage | alert | 现在最紧急的告警是哪一条？影响什么业务？我先处理谁？ |
| me-cpu-hot | metric | 生产主机 CPU 持续 90% 以上，要不要扩容？用一句话说结论。 |
| me-5xx | metric | 最近 15 分钟网关 5xx 有没有异常？如果有，大概到什么量级？ |
| me-promql-explain | query | 用白话解释这句在看什么：sum(rate(http_requests_total{job="api"}[5m])) by (code) |
| me-disk-recover | alert | 昨晚 22:00 左右的磁盘告警后来恢复了吗？如果恢复了，大约什么时候？ |
| me-log-meaning | log | 这段报错对值班意味着什么？要不要叫人起来？Connection reset by peer on checkout |
| me-capacity | capacity | 按过去 7 天内存水位，明天大促内存够不够？差多少？ |
| me-dashboard | dashboard | 当前监控大盘最值得看的结论是什么？不要描述你点了哪个面板。 |
| me-silence | alert | cpu_usage_high 这条告警现在能不能静默？为什么？ |
| me-compare-hosts | metric | api-1 和 api-2 最近 30 分钟负载差在哪？哪台更危险？ |
| me-empty-state | alert | 当前有没有正在响的 P1？没有就直接说没有。 |
| me-next-click | workflow | 如果 5xx 在涨，我下一步应该先看哪个监控，还是先看日志？给值班指令，不要说你将去点击。 |

## 失败类型分布

| 代码 | 含义 | 命中次数 |
| --- | --- | ---: |
| LANG | 用户无法阅读的语言或界面字符串堆砌 | 3 |
| ALERTJSON | 告警平台原始 JSON 当作回答 | 1 |
| PROMQL | 原始 PromQL/查询语句当作回答 | 1 |
| SERIES | 时序点/主机列表 dump，没有结论 | 1 |
| DOM | 无障碍树或 HTML/选择器 dump | 1 |
| TRACE | 工具调用日志当作回答 | 1 |
| MIX | 结论被日志淹没 | 1 |
| PLAN | 只描述下一步操作，无任务结果 | 1 |

## 逐条判定（必须暴露原文）

### me-alert-triage · 人能看懂 · 93

- 场景：alert / 浏览器：OpsClaw Web Console / 来源：heuristic
- 人能看懂吗：**人能看懂**
- 判定摘要：终局回答是自然语言，普通人不用看轨迹也能理解结论。

**用户问题**

```text
现在最紧急的告警是哪一条？影响什么业务？我先处理谁？
```

**智能体终局回答（用户可见原文）**

```text
结论：先处理 P1 `checkout-5xx`，不要先看 CPU。

- 对象：checkout-api / 生产
- 现象：近 12 分钟 5xx 从 0.3% 升到 7.8%
- 影响：下单失败，收银台已有用户投诉迹象
- 建议：先看 gw-3 实例和下游 pay-svc，CPU 告警可以后置
```

### me-alert-json-unreadable · 人看不懂 · 28

- 场景：alert / 浏览器：OpsClaw Web Console / 来源：heuristic
- 人能看懂吗：**人看不懂**
- 判定摘要：终局回答是告警平台原始 JSON。 用户问题语言与回答语言明显不一致，或界面字符串堆砌。
- 失败类型：ALERTJSON 告警平台原始 JSON 当作回答；LANG 用户无法阅读的语言或界面字符串堆砌

**用户问题**

```text
现在最紧急的告警是哪一条？影响什么业务？我先处理谁？
```

**智能体终局回答（用户可见原文）**

```text
{"status":"success","alerts":[{"labels":{"alertname":"checkout-5xx","severity":"critical","instance":"gw-3"},"annotations":{"summary":"5xx high"},"fingerprint":"9af3","generatorURL":"http://prometheus/graph"}]}
```

### me-cpu-readable · 人能看懂 · 97

- 场景：metric / 浏览器：OpsClaw Web Console / 来源：heuristic
- 人能看懂吗：**人能看懂**
- 判定摘要：终局回答是自然语言，普通人不用看轨迹也能理解结论。

**用户问题**

```text
生产主机 CPU 持续 90% 以上，要不要扩容？用一句话说结论。
```

**智能体终局回答（用户可见原文）**

```text
结论：先不要扩容。这是单机批处理打满了 CPU，延迟没有一起涨。建议先看 job=batch 的进程，观察 15 分钟；若延迟也过 200ms 再扩。
```

### me-promql-unreadable · 人看不懂 · 28

- 场景：query / 浏览器：OpsClaw Web Console / 来源：heuristic
- 人能看懂吗：**人看不懂**
- 判定摘要：终局回答几乎只是 PromQL/查询语句。 用户问题语言与回答语言明显不一致，或界面字符串堆砌。
- 失败类型：PROMQL 原始 PromQL/查询语句当作回答；LANG 用户无法阅读的语言或界面字符串堆砌

**用户问题**

```text
最近 15 分钟网关 5xx 有没有异常？如果有，大概到什么量级？
```

**智能体终局回答（用户可见原文）**

```text
sum(rate(http_requests_total{job="gateway",code=~"5.."}[15m])) / sum(rate(http_requests_total{job="gateway"}[15m]))
```

### me-series-unreadable · 人看不懂 · 28

- 场景：metric / 浏览器：OpsClaw Web Console / 来源：heuristic
- 人能看懂吗：**人看不懂**
- 判定摘要：终局回答是时序点或主机列表 dump，没有给出口语结论。
- 失败类型：SERIES 时序点/主机列表 dump，没有结论

**用户问题**

```text
api-1 和 api-2 最近 30 分钟负载差在哪？哪台更危险？
```

**智能体终局回答（用户可见原文）**

```text
1710000000 0.21
1710000060 0.28
1710000120 0.66
1710000180 0.71
1710000240 0.84
1710000300 0.91
10.0.1.11 91
10.0.1.12 37
10.0.1.13 41
10.0.1.14 39
```

### me-mixed-partial · 部分能看懂 · 45

- 场景：alert / 浏览器：OpsClaw Web Console / 来源：heuristic
- 人能看懂吗：**部分能看懂**
- 判定摘要：回答主体是无障碍树、HTML 或 CSS 选择器 dump。 回答主体是工具调用/浏览器操作日志。
- 失败类型：DOM 无障碍树或 HTML/选择器 dump；TRACE 工具调用日志当作回答；MIX 结论被日志淹没；LANG 用户无法阅读的语言或界面字符串堆砌

**用户问题**

```text
昨晚 22:00 左右的磁盘告警后来恢复了吗？如果恢复了，大约什么时候？
```

**智能体终局回答（用户可见原文）**

```text
磁盘告警已恢复，大约 22:47。

```json
{"status":"resolved","alerts":[{"labels":{"alertname":"disk_usage_high","device":"/dev/vda1"},"annotations":{"description":"disk 92%"},"fingerprint":"ab12","generatorURL":"http://prometheus.internal/graph?g0.expr=node_filesystem_avail_bytes"}],"tool_call":"prometheus_query_range","selector":"html > body > div#grafana"}
```
RootWebArea "Alertmanager"
  [button] Silence
  [heading] disk_usage_high
  html > body > div > table > tr
```

### me-plan-unreadable · 人看不懂 · 28

- 场景：workflow / 浏览器：OpsClaw Web Console / 来源：heuristic
- 人能看懂吗：**人看不懂**
- 判定摘要：只宣布下一步操作，没有给出任务结果。
- 失败类型：PLAN 只描述下一步操作，无任务结果

**用户问题**

```text
如果 5xx 在涨，我下一步应该先看哪个监控，还是先看日志？给值班指令，不要说你将去点击。
```

**智能体终局回答（用户可见原文）**

```text
好的，我将打开 Prometheus 并点击 5xx 面板。
```

### 08-opsclaw-export-readable.json-turn-1 · 人能看懂 · 100

- 场景：monitoring / 浏览器：OpsClaw Web Console / 来源：heuristic
- 人能看懂吗：**人能看懂**
- 判定摘要：终局回答是自然语言，普通人不用看轨迹也能理解结论。

**用户问题**

```text
当前有没有正在响的 P1？没有就直接说没有。
```

**智能体终局回答（用户可见原文）**

```text
当前没有正在响的 P1。有 2 条 P3（磁盘预警、证书 30 天到期），都不需要叫人。
```
