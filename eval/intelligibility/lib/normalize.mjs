/**
 * 把多种输入归一成评测用的 transcript 列表。
 * 支持：单条轨迹、{ runs: [] }、chatgpt-web 本地会话导出。
 */

export function loadTranscripts(raw, sourceName = 'input') {
  if (raw == null)
    return []

  if (Array.isArray(raw)) {
    return raw.flatMap((item, i) => loadTranscripts(item, `${sourceName}[${i}]`))
  }

  if (typeof raw !== 'object')
    throw new Error(`${sourceName} 不是对象或数组`)

  if (Array.isArray(raw.runs))
    return raw.runs.flatMap((item, i) => loadTranscripts(item, `${sourceName}.runs[${i}]`))

  if (Array.isArray(raw.transcripts))
    return raw.transcripts.flatMap((item, i) => loadTranscripts(item, `${sourceName}.transcripts[${i}]`))

  if (isChatGPTWebState(raw))
    return fromChatGPTWeb(raw, sourceName)

  return [normalizeTranscript(raw, sourceName)]
}

export function isChatGPTWebState(obj) {
  return Boolean(obj && Array.isArray(obj.chat) && obj.chat[0] && Array.isArray(obj.chat[0].data))
}

export function fromChatGPTWeb(state, sourceName = 'chatgpt-web') {
  const history = Array.isArray(state.history) ? state.history : []
  return state.chat.map((conv, index) => {
    const meta = history.find(item => item.uuid === conv.uuid)
    const messages = (conv.data || []).map((item) => {
      const inversion = Boolean(item.inversion)
      return {
        role: inversion ? 'user' : 'assistant',
        channel: 'user_visible',
        content: String(item.text ?? ''),
        error: Boolean(item.error),
      }
    })
    const lastUser = [...messages].reverse().find(m => m.role === 'user')
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
    return normalizeTranscript({
      run_id: `${sourceName}-${conv.uuid ?? index}`,
      agent: 'chatgpt-web',
      scenario: 'chat-ui',
      locale: 'zh-CN',
      target: { browser: 'web-ui' },
      user_query: lastUser?.content || meta?.title || '',
      messages,
      final_answer: lastAssistant?.content || '',
    }, `${sourceName}#${conv.uuid ?? index}`)
  })
}

export function normalizeTranscript(raw, sourceName = 'transcript') {
  const messages = Array.isArray(raw.messages)
    ? raw.messages.map(normalizeMessage)
    : []

  const userQuery = String(raw.user_query ?? raw.query ?? raw.prompt ?? '').trim()
  const finalAnswer = pickFinalAnswer(raw, messages)

  return {
    run_id: String(raw.run_id ?? raw.id ?? sourceName),
    agent: String(raw.agent ?? 'browser-agent'),
    scenario: String(raw.scenario ?? 'unspecified'),
    locale: String(raw.locale ?? inferLocale(userQuery, finalAnswer)),
    target: {
      browser: raw.target?.browser ?? raw.browser ?? 'unknown',
      url: raw.target?.url ?? raw.url ?? '',
      viewport: raw.target?.viewport ?? '',
    },
    user_query: userQuery,
    messages,
    final_answer: finalAnswer,
    attachments: collectAttachments(raw, messages),
    _expected: raw._expected ?? null,
    _source: sourceName,
  }
}

export function pickFinalAnswer(raw, messages = []) {
  if (typeof raw.final_answer === 'string' && raw.final_answer.trim())
    return raw.final_answer

  const visibleAssistant = [...messages].reverse().find((m) => {
    return m.role === 'assistant' && m.channel === 'user_visible' && m.content.trim()
  })
  if (visibleAssistant)
    return visibleAssistant.content

  const anyAssistant = [...messages].reverse().find(m => m.role === 'assistant' && m.content.trim())
  if (anyAssistant)
    return anyAssistant.content

  return ''
}

export function collectTraceText(transcript) {
  return (transcript.messages || [])
    .filter(m => m.channel === 'trace' || m.role === 'tool' || m.channel === 'thought')
    .map(m => m.content)
    .join('\n')
}

function normalizeMessage(message) {
  const role = ['user', 'assistant', 'tool', 'system'].includes(message.role)
    ? message.role
    : 'assistant'
  const channel = ['user_visible', 'trace', 'thought'].includes(message.channel)
    ? message.channel
    : (role === 'tool' ? 'trace' : 'user_visible')

  return {
    role,
    channel,
    name: message.name ? String(message.name) : '',
    content: String(message.content ?? message.text ?? ''),
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
  }
}

function collectAttachments(raw, messages) {
  const fromRoot = Array.isArray(raw.attachments) ? raw.attachments : []
  const fromMessages = messages.flatMap(m => m.attachments || [])
  return [...fromRoot, ...fromMessages]
}

function inferLocale(query, answer) {
  const sample = `${query}\n${answer}`
  const cjk = (sample.match(/[\u4e00-\u9fff]/g) || []).length
  return cjk >= 4 ? 'zh-CN' : 'en'
}
