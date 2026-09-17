/**
 * 可选 LLM Judge。不提供 OPENAI_API_KEY 时跳过，不影响启发式报告。
 */

const JUDGE_PROMPT = `你是浏览器 Agent 评测员。只判断「不看工具轨迹的普通人能不能看懂终局回答」，不要判断任务是否做对。

判定三档：
- readable：人能看懂。自然语言，结论可直接找到。
- partial：部分能看懂。有结论但夹杂 dump/术语/过长原文。
- unreadable：人看不懂。乱码、空答、纯 JSON/DOM/工具日志、纯截图无说明、只说下一步操作。

只输出 JSON：
{"verdict":"readable|partial|unreadable","score":0-100,"human_can_understand":true|false,"reason":"一句话","failures":["EMPTY"|"ENC"|"TRACE"|"DOM"|"JSON"|"SCREEN"|"PLAN"|"MIX"|"LANG"|"WALL"]}
`

export async function judgeTranscript(transcript, options = {}) {
  if (!options.judge)
    return null

  const apiKey = options.apiKey || process.env.OPENAI_API_KEY
  const baseUrl = (options.baseUrl || process.env.OPENAI_API_BASE_URL || 'https://api.openai.com').replace(/\/$/, '')
  const model = options.model || process.env.OPENAI_API_MODEL || 'gpt-4o-mini'

  if (!apiKey)
    throw new Error('已开启 --judge，但未设置 OPENAI_API_KEY')

  const user = [
    `用户问题：${transcript.user_query || '（空）'}`,
    `期望语言：${transcript.locale || 'zh-CN'}`,
    '终局回答：',
    transcript.final_answer || '（空）',
  ].join('\n')

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: JUDGE_PROMPT },
        { role: 'user', content: user },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Judge HTTP ${response.status}: ${body.slice(0, 400)}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || '{}'
  const parsed = JSON.parse(content)
  const verdict = ['readable', 'partial', 'unreadable'].includes(parsed.verdict)
    ? parsed.verdict
    : 'unreadable'

  return {
    verdict,
    score: Number(parsed.score) || 0,
    human_can_understand: Boolean(parsed.human_can_understand),
    reason: String(parsed.reason || ''),
    failures: Array.isArray(parsed.failures) ? parsed.failures : [],
    model,
  }
}

export { JUDGE_PROMPT }
