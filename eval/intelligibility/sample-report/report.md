# 浏览器 Agent 回答可理解度评测报告（夹具样例）

> 核心问题：不看工具轨迹、不了解浏览器自动化的普通人，能否看懂智能体最终回答？

- 生成时间：2026-09-17T05:13:06.792Z
- 样本数：10
- 平均分：48.8
- **人能看懂**：30%（3）
- **部分能看懂**：10%（1）
- **人看不懂**：60%（6）
- 发布门槛：可读率 ≥ 85% 且不可读率 ≤ 5% → 未通过

## 失败类型分布

| 代码 | 含义 | 命中次数 |
| --- | --- | ---: |
| DOM | 无障碍树或 HTML/选择器 dump | 4 |
| LANG | 用户无法阅读的语言或界面字符串堆砌 | 4 |
| TRACE | 工具调用日志当作回答 | 3 |
| MIX | 结论被日志淹没 | 1 |
| SCREEN | 截图无文字解释 | 1 |
| PLAN | 只描述下一步操作，无任务结果 | 1 |
| ENC | 乱码/替换字符/不可打印字符 | 1 |
| JSON | 原始结构化载荷当作回答 | 1 |

## 逐条判定（必须暴露原文）

### fx-weather-readable · 人能看懂 · 93

- 场景：extract / 浏览器：chromium / 来源：heuristic
- 人能看懂吗：**人能看懂**
- 判定摘要：终局回答是自然语言，普通人不用看轨迹也能理解结论。

**用户问题**

```text
帮我看一下今天北京天气，要不要带伞？
```

**智能体终局回答（用户可见原文）**

```text
今天北京晴到多云，气温 12～21℃，降水概率约 10%，空气质量良。

结论：白天不用带伞。早晚略凉，出门建议加一件薄外套。
```

<details><summary>内部轨迹摘录（不计入「人能看懂」的正文）</summary>

```text
open https://weather.example.com
```

</details>

### fx-a11y-dump-unreadable · 人看不懂 · 28

- 场景：search / 浏览器：chromium / 来源：heuristic
- 人能看懂吗：**人看不懂**
- 判定摘要：回答主体是无障碍树、HTML 或 CSS 选择器 dump。 用户问题语言与回答语言明显不一致，或界面字符串堆砌。
- 失败类型：DOM 无障碍树或 HTML/选择器 dump；LANG 用户无法阅读的语言或界面字符串堆砌

**用户问题**

```text
搜索附近的咖啡店
```

**智能体终局回答（用户可见原文）**

```text
RootWebArea "Google"
  [heading] Google
  [combobox] Search
  [button] Google Search
  [button] I'm Feeling Lucky
  [link] Gmail
  [link] Images
  html > body > div#app > div.main > form > input.gLFyf
  [listitem] Starbucks
  [listitem] Luckin Coffee
  [button] Directions
```

### fx-mixed-partial · 部分能看懂 · 48

- 场景：checkout / 浏览器：chromium / 来源：heuristic
- 人能看懂吗：**部分能看懂**
- 判定摘要：回答主体是无障碍树、HTML 或 CSS 选择器 dump。 回答主体是工具调用/浏览器操作日志。
- 失败类型：DOM 无障碍树或 HTML/选择器 dump；TRACE 工具调用日志当作回答；MIX 结论被日志淹没；LANG 用户无法阅读的语言或界面字符串堆砌

**用户问题**

```text
购物车现在多少钱？商品加进去了吗？
```

**智能体终局回答（用户可见原文）**

```text
商品已加入购物车，当前合计 ¥128。

```json
{
  "tool_call": "browser_click",
  "selector": "html > body > div#app > div.checkout > button.add-to-cart",
  "action": "click",
  "nth-child(3)": true,
  "aria-label": "Add to cart",
  "trace": ["click", "wait_for", "screenshot"]
}
```
RootWebArea "Cart"
  [button] Checkout
  [heading] Order summary
  html > body > div > span.price
```

### fx-screenshot-only-unreadable · 人看不懂 · 15

- 场景：extract / 浏览器：chromium / 来源：heuristic
- 人能看懂吗：**人看不懂**
- 判定摘要：终局没有文字，只给了未说明的截图。
- 失败类型：SCREEN 截图无文字解释

**用户问题**

```text
这个页面的标题和第一段在说什么？
```

**智能体终局回答（用户可见原文）**

```text
（空）
```

### fx-plan-only-unreadable · 人看不懂 · 28

- 场景：search / 浏览器：chromium / 来源：heuristic
- 人能看懂吗：**人看不懂**
- 判定摘要：只宣布下一步操作，没有给出任务结果。
- 失败类型：PLAN 只描述下一步操作，无任务结果

**用户问题**

```text
今天上海会下雨吗？
```

**智能体终局回答（用户可见原文）**

```text
好的，我将打开天气网站并点击搜索按钮。
```

### fx-mojibake-unreadable · 人看不懂 · 28

- 场景：extract / 浏览器：chromium / 来源：heuristic
- 人能看懂吗：**人看不懂**
- 判定摘要：出现乱码、替换字符或异常控制字符。
- 失败类型：ENC 乱码/替换字符/不可打印字符

**用户问题**

```text
页面上的活动名称是什么？
```

**智能体终局回答（用户可见原文）**

```text
ä»Šå¤©åŒ—äº¬æ™´å¤©æ°”Ã¤Â¸Â­Ã¦â€“â€¡ä¹±ç Ã¥â€ â€¦Ã¥Â®Â¹Ã¤Â¸ÂÃ¥ÂÂ¯Ã¨Â¯Â»
```

### fx-json-payload-unreadable · 人看不懂 · 28

- 场景：extract / 浏览器：chromium / 来源：heuristic
- 人能看懂吗：**人看不懂**
- 判定摘要：整段回答是原始 JSON。 回答主体是无障碍树、HTML 或 CSS 选择器 dump。
- 失败类型：JSON 原始结构化载荷当作回答；DOM 无障碍树或 HTML/选择器 dump；TRACE 工具调用日志当作回答；LANG 用户无法阅读的语言或界面字符串堆砌

**用户问题**

```text
北京今天气温多少度？
```

**智能体终局回答（用户可见原文）**

```text
{"status":"ok","tool_call":"browser_navigate","selector":"html > body > div#root > span.temp","data":{"city":"Beijing","temp":21,"aqi":64}}
```

### fx-product-compare-readable · 人能看懂 · 99

- 场景：extract / 浏览器：chromium / 来源：heuristic
- 人能看懂吗：**人能看懂**
- 判定摘要：终局回答是自然语言，普通人不用看轨迹也能理解结论。

**用户问题**

```text
Compare the iPhone 15 and Pixel 8 camera in one short table.
```

**智能体终局回答（用户可见原文）**

```text
Here is a short camera comparison from the product pages:

| Item | iPhone 15 | Pixel 8 |
| --- | --- | --- |
| Main sensor | 48 MP | 50 MP |
| Video | 4K60 | 4K60 |
| Night mode | Yes | Yes, typically stronger |

Bottom line: Pixel 8 is better in night shots; iPhone 15 is more consistent in video.
```

### 09-chatgpt-web-export.json-1002 · 人能看懂 · 93

- 场景：chat-ui / 浏览器：web-ui / 来源：heuristic
- 人能看懂吗：**人能看懂**
- 判定摘要：终局回答是自然语言，普通人不用看轨迹也能理解结论。

**用户问题**

```text
帮我看看明天杭州到上海的高铁还有票吗？
```

**智能体终局回答（用户可见原文）**

```text
明天杭州到上海高铁仍有余票。较宽松的班次是 G7369（08:28 开）和 G7531（14:05 开），二等座都有票。建议优先买早上这趟，行程约 1 小时 15 分。
```

### 09-chatgpt-web-export.json-1003 · 人看不懂 · 28

- 场景：chat-ui / 浏览器：web-ui / 来源：heuristic
- 人能看懂吗：**人看不懂**
- 判定摘要：回答主体是无障碍树、HTML 或 CSS 选择器 dump。 回答主体是工具调用/浏览器操作日志。
- 失败类型：DOM 无障碍树或 HTML/选择器 dump；TRACE 工具调用日志当作回答；LANG 用户无法阅读的语言或界面字符串堆砌

**用户问题**

```text
这个报错是什么意思？
```

**智能体终局回答（用户可见原文）**

```text
browser_click("html > body > div#root > button.error")
Action: screenshot
[heading] Error
[button] Retry
{"function_call":"wait_for","selector":"nth-child(2)"}
```
