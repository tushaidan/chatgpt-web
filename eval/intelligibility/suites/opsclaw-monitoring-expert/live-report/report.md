# 监控专家实网回答可理解度评测报告

> 核心问题：值班人员不打开 Prometheus、不看工具 JSON，能否看懂监控专家的终局回答？

- 对象：监控专家
- 问答入口：https://opsone-cn-wulan-env148-d01.console.intra.env148.shuguang.com/aiops/opsclaw/my-conversation?agentId=a3fda524-7f2c-4c52-94ca-7b4198941a14
- agentId：`a3fda524-7f2c-4c52-94ca-7b4198941a14`
- 模式：实网采集（`live/` 或 `transcripts/`）
- 入口探测：**不可达** ENOTFOUND（opsone-cn-wulan-env148-d01.console.intra.env148.shuguang.com）
- 生成时间：2026-09-17T06:24:09.563Z
- 样本数：11
- 平均分：81.2
- **人能看懂**：63.6%（7）
- **部分能看懂**：18.2%（2）
- **人看不懂**：18.2%（2）
- 发布门槛：可读率 ≥ 85% 且不可读率 ≤ 5% → 未通过

## 失败类型分布

| 代码 | 含义 | 命中次数 |
| --- | --- | ---: |
| MIX | 结论被日志淹没 | 2 |
| ALERTJSON | 告警平台原始 JSON 当作回答 | 1 |
| JSON | 原始结构化载荷当作回答 | 1 |

## 逐条判定（必须暴露原文）

### live-01-alert-triage · 人看不懂 · 28

- 场景：alert / 浏览器：OpsClaw Web Console / 来源：heuristic
- 人能看懂吗：**人看不懂**
- 判定摘要：终局回答是告警平台原始 JSON。
- 失败类型：ALERTJSON 告警平台原始 JSON 当作回答

**用户问题**

```text
现在最紧急的告警是哪一条？影响什么业务？我先处理谁？
```

**智能体终局回答（用户可见原文）**

```text
我来查询当前系统中最紧急的告警。
告警明细（共 787 条）
{"primaryKey":"id","columns":[{"title":"告警ID","dataIndex":"id","width":80},{"title":"告警级别","dataIndex":"alarmLevel","type":"alarmLevel","width":80},{"title":"告警项ID","dataIndex":"ruleCode"},{"title":"告警项名称","dataIndex":"ruleName"},{"title":"告警对象","dataIndex":"itemName"},{"title":"产品","dataIndex":"product","width":80},{"title":"时间","dataIndex":"startTime","type":"time"},{"title":"状态","dataIndex":"status","width":80}],"data":[{"id":"112045","alarmLevel":"p1","ruleCode":"checkDSWConnection","ruleName":"所有DSW端口均无法连通","itemName":"network","product":"network","startTime":1789622077000,"status":"观察中"},{"id":"112037","alarmLevel":"p1","ruleCode":"tianji_sr_monitor_alarm","ruleName":"Tianji组件未达终态","itemName":"PanguChunkserver#(d21f05010.cloud.f05.amtest148)","product":"cds","startTime":1789620005000,"status":"告警中"},{"id":"112034","alarmLevel":"p1","ruleCode":"checkDSWConnection","ruleName":"所有DSW端口均无法连通","itemName":"network","product":"network","startTime":1789619684000,"status":"观察中"},{"id":"111457","alarmLevel":"p1","ruleCode":"PanguMasterStatus","ruleName":"pangu_master服务角色状态异常会导致盘古集群存在异常风险。","itemName":"PanguMaster#","product":"cds","startTime":1789531076000,"status":"告警中"},{"id":"111206","alarmLevel":"p1","ruleCode":"checkTianjiLogMonitorMetric","ruleName":"Tianjimon日志Metric产出数据异常","itemName":"tianjimon","product":"tianjimon","startTime":1789489544000,"status":"告警中"},{"id":"110012","alarmLevel":"p1","ruleCode":"suspected_physical_machine_down","ruleName":"对服务器进行ping探测失败，疑似宕机。","itemName":"d21f05131.cloud.f06.amtest148","product":"tlog","startTime":1789358767000,"status":"告警中"},{"id":"105367","alarmLevel":"p1","ruleCode":"dns_request_qps_zero_alarm","ruleName":"DNS请求QPS跌至0，可能影响网络中所有应用程序的正常访问。","itemName":"lightBasicBindServerRole#(d21f05005.cloud.f05.amtest148)","product":"tianji","startTime":1788808373000,"status":"告警中"},{"id":"105075","alarmLevel":"p1","ruleCode":"vpc_ggw-check_gw_coredump","ruleName":"vpc网关机器存在core文件，可能导致单机网络中断","itemName":"Xgw#(d21f03001.cloud.f03.amtest148)","product":"vpc","startTime":1788788127000,"status":"告警中"}],"pageSize":10}
任务已完成。
本次对话为技能激活与知识库检索过程，未产生需留存的分析报告、数据集或配置脚本等产物，无需生成文件。
```

### live-02-cpu-90 · 人能看懂 · 100

- 场景：metric / 浏览器：OpsClaw Web Console / 来源：heuristic
- 人能看懂吗：**人能看懂**
- 判定摘要：终局回答是自然语言，普通人不用看轨迹也能理解结论。

**用户问题**

```text
帮我找出来哪些服务cpu持续90%以上的
```

**智能体终局回答（用户可见原文）**

```text
我来帮您查询哪些服务的 CPU 持续在 90% 以上。
组合查询结果
调用链：get_metric_data
已查询物理机、集群和容器三个维度的CPU使用率指标，当前没有发现CPU使用率持续90%以上的服务。知识库中定义的CPU使用率预警阈值为85%，但用户要求的是90%更高阈值，所有查询均返回空结果。
Step 1: get_metric_data（异常判断/排名结果）
● 指标/字段：{__name__="cpu_host", __value__="util_avg"}
● 判断条件：最新值 >= 90（按 host 分组取每组最新一条）
● 扫描对象数：0
● 命中数：0
未发现符合条件的对象。
Step 2: get_metric_data（异常判断/排名结果）
● 指标/字段：{__name__="cpu_cluster", __value__="util_avg"}
● 判断条件：最新值 >= 90（按 cluster 分组取每组最新一条）
● 扫描对象数：0
● 命中数：0
未发现符合条件的对象。
Step 3: get_metric_data（异常判断/排名结果）
● 指标/字段：{__name__="docker_cpu_usage", __value__="cpu_usage_avg"}
● 判断条件：最新值 >= 90（按 dockerName 分组取每组最新一条）
● 扫描对象数：0
● 命中数：0
未发现符合条件的对象。当前系统中没有发现 CPU 使用率持续 90% 以上的服务。根据 sre-metric 的查询结果，当前系统中没有发现 CPU 使用率持续高于 90% 的服务。
查询依据
维度	指标名	判断条件	扫描对象数	命中数
物理机	cpu_host（util_avg）	最新值 ≥ 90%，按 host 分组	0	0
集群	cpu_cluster（util_avg）	最新值 ≥ 90%，按 cluster 分组	0	0
容器	docker_cpu_usage（cpu_usage_avg）	最新值 ≥ 90%，按 dockerName 分组	0	0
三个维度的查询均返回 0 条命中记录，说明当前没有任何物理机、集群或容器的 CPU 使用率达到 90% 以上。知识库中定义的预警阈值为 85%，但即使用更低的阈值标准，本次查询也未发现超标对象。
```

### live-03-apigw-5xx · 人能看懂 · 100

- 场景：metric / 浏览器：OpsClaw Web Console / 来源：heuristic
- 人能看懂吗：**人能看懂**
- 判定摘要：终局回答是自然语言，普通人不用看轨迹也能理解结论。

**用户问题**

```text
最近 15 分钟API网关 5xx 有没有异常
```

**智能体终局回答（用户可见原文）**

```text
我来查询 API 网关最近 15 分钟是否有 5xx 异常。先检索相关知识库，再查询指标数据。
我来查询 API 网关最近 15 分钟是否有 5xx 异常。
知识库检索未命中，我直接通过指标查询 API 网关最近 15 分钟的 5xx 错误情况。
未查询到结果
调用接口：lookup_metric_source
查询参数：{}
查询成功（LLM 输出解析失败，数据从工具响应直接提取）
提示：请确认 service（服务名）/ metric_name / label_name / promql 是否正确。list_label_value 需要正确的 PromQL 表达式。根据 sre-metric 的查询结果，API 网关（apigateway）服务中未找到与 5xx 错误相关的指标。
该服务的指标库中没有包含 HTTP 5xx 状态码、错误率或类似语义的监控项。如果需要监控 API 网关的 5xx 异常，可能需要：
1. 确认 5xx 指标是否在其他数据源（如 Prometheus）中采集
2. 检查是否需要先配置相关监控规则
如果您需要进一步排查，可以告知我是否有具体的指标名称或 PromQL 表达式，我可以帮您查询对应的时序数据。
```

### live-04-host-offline · 人能看懂 · 100

- 场景：alert / 浏览器：OpsClaw Web Console / 来源：heuristic
- 人能看懂吗：**人能看懂**
- 判定摘要：终局回答是自然语言，普通人不用看轨迹也能理解结论。

**用户问题**

```text
有哪些服务器离线的
```

**智能体终局回答（用户可见原文）**

```text
我来查询当前有哪些服务器离线的告警。
当前系统中没有查询到"服务器离线"相关的未关闭告警。
如果您想扩大排查范围，可以尝试：
● 查询其他关键词如「主机不可达」「机器宕机」「host offline」等
● 或指定具体产品（如 ECS、天基等）进行查询
```

### live-05-not-ready · 人能看懂 · 100

- 场景：health / 浏览器：OpsClaw Web Console / 来源：heuristic
- 人能看懂吗：**人能看懂**
- 判定摘要：终局回答是自然语言，普通人不用看轨迹也能理解结论。

**用户问题**

```text
有哪些服务不达终态
```

**智能体终局回答（用户可见原文）**

```text
我来查询当前有哪些服务不达终态。这个问题属于产品健康诊断，应该使用 sre-blueprint 技能。
诊断执行失败: 未找到产品 的集群信息
关键发现
1. 错误: 未找到产品 的集群信息之前的查询因为缺少产品代码而失败。"有哪些服务不达终态"需要一个具体的产品代码才能查询。
请问您想查询哪个产品的终态状态？例如：
● ASO（专有云平台运维系统）
● ECS（云服务器）
● RDS（云数据库）
● Tianji（天基/底座）
● 其他产品...
请告诉我产品名称，我来为您诊断该产品的终态情况。根据 sre-blueprint 技能的设计，必须提供产品代码才能查询终态状态，不支持全局/默认产品查询。
请告诉我您想诊断哪个产品的终态？
例如：
● aso — 专有云平台运维系统
● ecs — 云服务器
● rds — 云数据库
● tianji — 天基（底座）
● vpc — 专有网络
● slb — 负载均衡
● cds — 云定义存储
● 其他产品...
您可以直接说产品名称或缩写，我来为您查询该产品的终态状态和异常组件。
```

### live-06-stability-dashboard · 人能看懂 · 100

- 场景：dashboard / 浏览器：OpsClaw Web Console / 来源：heuristic
- 人能看懂吗：**人能看懂**
- 判定摘要：终局回答是自然语言，普通人不用看轨迹也能理解结论。

**用户问题**

```text
稳定性大盘中有哪些指标波动需要关注
```

**智能体终局回答（用户可见原文）**

```text
我来查询稳定性大盘中有哪些指标波动需要关注。这个问题属于大盘知识问答，应该使用 sre-dashboard 技能（场景4：稳定性大盘知识问答）。
稳定性大盘中需要重点关注的指标波动主要集中在服务可用性、资源使用率阈值以及系统底层健康状态三个维度。根据内置知识库，以下是各维度中关键的高风险指标及其告警阈值：
1. 服务可用性指标（最高优先级）
这类指标通常直接反映核心服务是否中断或不可用，一旦触发告警需立即介入。
● 服务存活/错误标志：Diamond/Jmenv/MetaQ/Tair/Zookeeper/Dubbo等中间件：_collection_flag 或 _error_flag 等于 1 表示服务异常。
● 网关与路由状态：XGW Core Dump 存在 core dump 文件（>0），可能导致单台机器网络中断。
2. 资源使用率临界值（性能风险）
● 主机内存：使用率 >99% 且可用内存 <1GB，极易触发 OOM Kill。
● JVM 堆内存：使用率 >0.93 (93%)，可能导致 Full GC 频繁。
● VPC Virtualmaster CPU：使用率 >80%。
3. 系统底层与健康检查（稳定性基石）
● Kernel OOM Process Check：1800 秒内 OOM Kill 次数 >=12。
● NTP 偏移量：偏移超过 100ms。
● TCP 重传率：最大重传率 >10。
● DNS 配置/服务状态：dns_state != 0。
建议关注策略：
1. P1 级告警优先处理。
2. 趋势观察：对于 CPU、内存、IO 等资源类指标，关注持续高位运行的趋势。
3. 关联分析：TCP 重传率高时往往伴随应用层超时。
系统内置的稳定性大盘共覆盖 38 个产品。这些大盘用于监控各产品核心服务的稳定性。已列出稳定性大盘中需要关注的指标波动类型及阈值，涵盖服务可用性、资源使用率、系统健康状态等维度。
```

### live-07-flap-5min · 部分能看懂 · 72

- 场景：alert / 浏览器：OpsClaw Web Console / 来源：heuristic
- 人能看懂吗：**部分能看懂**
- 判定摘要：有自然语言结论，但被轨迹/JSON/DOM 淹没。
- 失败类型：MIX 结论被日志淹没

**用户问题**

```text
目前有哪些告警短时间（5分支）内一直在重复告警、恢复的，拉个清单
```

**智能体终局回答（用户可见原文）**

```text
告警明细（共 4 条）
{"primaryKey":"id","columns":[{"title":"告警ID","dataIndex":"id","width":80},{"title":"告警级别","dataIndex":"alarmLevel","type":"alarmLevel","width":80},{"title":"告警项ID","dataIndex":"ruleCode"},{"title":"告警项名称","dataIndex":"ruleName"},{"title":"告警对象","dataIndex":"itemName"},{"title":"产品","dataIndex":"product","width":80},{"title":"时间","dataIndex":"startTime","type":"time"},{"title":"次数","dataIndex":"alarmCount","type":"number"},{"title":"状态","dataIndex":"status","width":80}],"data":[{"id":"112060","alarmLevel":"p1","ruleCode":"dns_request_srps_alarm","ruleName":"dns产品单机srps解析成功率低于40告警","itemName":"lightBasicBindServerRole#(d21f05005.cloud.f05.amtest148)","product":"tianji","startTime":1789623855000,"alarmCount":1,"status":"告警中"},{"id":"112059","alarmLevel":"p1","ruleCode":"tianji_machine_monitor_alarm","ruleName":"集群中的服务器进入异常状态，请通过天基Portal查看详情","itemName":"vm010148004124","product":"ecs","startTime":1789623692000,"alarmCount":1,"status":"告警中"},{"id":"112058","alarmLevel":"p2","ruleCode":"one_console_request_timeout_alarm","ruleName":"产品中的某个接口响应超时，单次响应时长超过30秒。","itemName":"one-console-aliyun-com#","product":"oneConsole","startTime":1789623675000,"alarmCount":1,"status":"告警中"},{"id":"112057","alarmLevel":"p1","ruleCode":"checkDSWConnection","ruleName":"所有DSW端口均无法连通","itemName":"network","product":"network","startTime":1789623614000,"alarmCount":1,"status":"观察中"}],"pageSize":10}

已查询到当前 4 条近期活跃的告警（3 条 P1、1 条 P2），其中包含 DNS 解析成功率低、ECS 服务器异常状态、OneConsole 接口超时以及网络 DSW 端口不通等问题。本次查询未获取到最近 5 分钟内发生多次状态翻转（告警-恢复-告警）的告警数据，当前系统中暂无此类频繁抖动的告警记录。建议您可以尝试扩大时间范围（如最近 1 小时）再次查询，以捕获更多潜在的状态翻转事件。
```

### live-08-flap-1h · 人能看懂 · 93

- 场景：alert / 浏览器：OpsClaw Web Console / 来源：heuristic
- 人能看懂吗：**人能看懂**
- 判定摘要：终局回答是自然语言，普通人不用看轨迹也能理解结论。

**用户问题**

```text
最近1小时有哪些告警频繁抖动
```

**智能体终局回答（用户可见原文）**

```text
我来查询最近 1 小时内频繁抖动（告警-恢复-告警）的告警。

本次查询未获取到最近 1 小时内频繁抖动（告警与恢复之间多次切换）的告警数据，当前系统中暂无此类波动记录。建议您可以尝试进一步扩大时间范围（如最近 6 小时或 24 小时）再次查询，以捕获更多潜在的抖动事件。
```

### live-09-flap-24h · 部分能看懂 · 72

- 场景：alert / 浏览器：OpsClaw Web Console / 来源：heuristic
- 人能看懂吗：**部分能看懂**
- 判定摘要：有自然语言结论，但被轨迹/JSON/DOM 淹没。
- 失败类型：MIX 结论被日志淹没

**用户问题**

```text
最近24小时有哪些告警频繁抖动
```

**智能体终局回答（用户可见原文）**

```text
我来查询最近 24 小时内频繁抖动（告警-恢复-告警）的告警。
告警明细（共 320 条）
{"primaryKey":"id","columns":[{"title":"告警ID","dataIndex":"id","width":80},{"title":"告警级别","dataIndex":"alarmLevel","type":"alarmLevel","width":80},{"title":"告警项ID","dataIndex":"ruleCode"},{"title":"告警项名称","dataIndex":"ruleName"},{"title":"告警对象","dataIndex":"itemName"},{"title":"产品","dataIndex":"product","width":80},{"title":"时间","dataIndex":"startTime","type":"time"},{"title":"次数","dataIndex":"alarmCount","type":"number"},{"title":"状态","dataIndex":"status","width":80}],"data":[{"id":"111754","alarmLevel":"p1","ruleCode":"workflow_activity_fail_alarm","ruleName":"OSS workflow activity失败告警","itemName":"ChijiMonitor#","product":"cds","startTime":1789575367000,"alarmCount":135,"status":"关闭"},{"id":"111505","alarmLevel":"p2","ruleCode":"noe_inspect_switch_snmp_status_check","ruleName":"检查交换机snmp状态是否异常","itemName":"CSW-VM-VPC-G1-1.AMTEST148","product":"network","startTime":1789538759000,"alarmCount":115,"status":"关闭"},{"id":"111704","alarmLevel":"p2","ruleCode":"noe_inspect_switch_snmp_status_check","ruleName":"检查交换机snmp状态是否异常","itemName":"DSW-VM-G1-P-2.AMTEST148","product":"network","startTime":1789566060000,"alarmCount":109,"status":"关闭"},{"id":"111808","alarmLevel":"p2","ruleCode":"noe_inspect_switch_snmp_status_check","ruleName":"检查交换机snmp状态是否异常","itemName":"ISW-VM-G1-2.AMTEST148","product":"network","startTime":1789581660000,"alarmCount":101,"status":"关闭"},{"id":"111866","alarmLevel":"p2","ruleCode":"noe_inspect_switch_snmp_status_check","ruleName":"检查交换机snmp状态是否异常","itemName":"LSW-VM-G1-2.AMTEST148","product":"network","startTime":1789593060000,"alarmCount":89,"status":"告警中"},{"id":"111709","alarmLevel":"p2","ruleCode":"argus_agent_down_alarm","ruleName":"Argus agent心跳停止","itemName":"vm010148004124","product":"ecs","startTime":1789567075000,"alarmCount":81,"status":"关闭"},{"id":"111606","alarmLevel":"p3","ruleCode":"tianji_sr_monitor_alarm","ruleName":"Tianji组件未达终态","itemName":"ScheduleUnitImporter#(d21f05120.cloud.f06.amtest148)","product":"tianji","startTime":1789554065000,"alarmCount":80,"status":"关闭"},{"id":"111504","alarmLevel":"p1","ruleCode":"tianji_sr_monitor_alarm","ruleName":"Tianji组件未达终态","itemName":"PanguBackup#(d21f05120.cloud.f06.amtest148)","product":"tianji","startTime":1789538705000,"alarmCount":78,"status":"关闭"},{"id":"111884","alarmLevel":"p1","ruleCode":"dns_request_srps_alarm","ruleName":"dns产品单机srps解析成功率低于40告警","itemName":"lightBasicBindServerRole#(d21f05105.cloud.f06.amtest148)","product":"tianji","startTime":1789595415000,"alarmCount":42,"status":"关闭"},{"id":"111545","alarmLevel":"p1","ruleCode":"checkDSWConnection","ruleName":"所有DSW端口均无法连通","itemName":"network","product":"network","startTime":1789546027000,"alarmCount":26,"status":"关闭"},{"id":"112037","alarmLevel":"p1","ruleCode":"tianji_sr_monitor_alarm","ruleName":"Tianji组件未达终态","itemName":"PanguChunkserver#(d21f05010.cloud.f05.amtest148)","product":"cds","startTime":1789620005000,"alarmCount":8,"status":"告警中"},{"id":"112045","alarmLevel":"p1","ruleCode":"checkDSWConnection","ruleName":"所有DSW端口均无法连通","itemName":"network","product":"network","startTime":1789622077000,"alarmCount":4,"status":"观察中"}],"pageSize":10}

共查到 320 条最近 24 小时内频繁抖动的告警，主要集中在以下几类：
1. 网络交换机 SNMP 状态异常 (noe_inspect_switch_snmp_status_check) - P2 级别，抖动次数高达 115 次
2. DNS 解析成功率低 (dns_request_srps_alarm) - P1 级别
3. Tianji 组件未达终态 (tianji_sr_monitor_alarm) - P1/P3 级别
4. DSW 端口连通性故障 (checkDSWConnection) - P1 级别
5. 数据库 IOPS 数值异常 (MINIRDS-DBNODE-MYSQL-custins_iops_value_error) - P3 级别
建议优先关注 P1 级别的 DNS 解析、DSW 连通性及 Tianji 组件终态问题，这些可能影响核心服务稳定性。本次查询未获取到最近 24 小时内频繁抖动（告警-恢复-告警）的告警数据，当前系统中暂无此类波动记录。建议您可以尝试调整查询条件或扩大时间范围再次查询。
📊 整体情况总结
本次查询结果为空，未命中符合"频繁抖动"特征的告警事件。可能的原因包括：
1. 最近 24 小时内确实没有发生多次状态翻转的告警
2. "频繁抖动"的判定阈值较高，实际发生的翻转次数未达到系统定义的抖动标准
3. 相关告警可能已被自动抑制或合并
```

### live-10-acs-get-cost · 人能看懂 · 100

- 场景：alert-def / 浏览器：OpsClaw Web Console / 来源：heuristic
- 人能看懂吗：**人能看懂**
- 判定摘要：终局回答是自然语言，普通人不用看轨迹也能理解结论。

**用户问题**

```text
acs-acs_control get_request_cost_avg_cost_too_high_alarm 告警含义与阈值
```

**智能体终局回答（用户可见原文）**

```text
我来查询该告警规则的含义与阈值配置。
根据 alert-info 告警定义总册，关于 acs-acs_control 服务下 get_request_cost_avg_cost_too_high_alarm 的告警定义、监控项、等级、周期及表达式信息如下：
1. 告警基本信息
● 告警名称：Get 请求耗时过高
● Code：get_request_cost_avg_cost_too_high_alarm
● 产品/服务：acs / acs-acs_control
● 监控指标：get_request_cost
● 告警源：tianjimon
2. 告警等级与触发条件（告警表达式）
该告警包含三个等级，分别对应不同的阈值和连续触发次数要求（times=3 表示连续 3 个检查周期满足条件即触发）。
告警等级	告警表达式 (customExpress)	触发条件说明
P1	$avg > 2000	Get 请求平均耗时超过 2000ms，且连续 3 次检查均满足此条件。
P2	$avg > 1000	Get 请求平均耗时超过 1000ms，且连续 3 次检查均满足此条件。
P3	$avg > 500	Get 请求平均耗时超过 500ms，且连续 3 次检查均满足此条件。
注：$avg 代表监控指标 get_request_cost 的平均值。
3. 检查周期
● 检查周期：60 秒
○ 系统每 60 秒采集一次 get_request_cost 指标数据并评估是否满足上述表达式条件。
4. 其他配置
● 静默时间：1800 秒
已查询完成，get_request_cost_avg_cost_too_high_alarm 告警表示 ACS 控制面 Get 请求平均耗时过高（P1: >2000ms, P2: >1000ms, P3: >500ms），检查周期为 60 秒。
```

### live-11-ebs-dashboard · 人看不懂 · 28

- 场景：dashboard / 浏览器：OpsClaw Web Console / 来源：heuristic
- 人能看懂吗：**人看不懂**
- 判定摘要：终局回答把原始 JSON 载荷当作结果。
- 失败类型：JSON 原始结构化载荷当作回答

**用户问题**

```text
检测EBS 异常大盘
```

**智能体终局回答（用户可见原文）**

```text
我来帮您查询 EBS 相关的异常大盘。
{"id": "ebs"}
EBS 异常大盘的面板树已展示，您可以查看其中的具体监控卡片和指标详情。
```
