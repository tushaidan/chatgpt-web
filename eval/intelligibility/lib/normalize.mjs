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

  if (typeof raw === 'string')
    return fromDialogueText(raw, sourceName)

  if (typeof raw !== 'object')
    throw new Error(`${sourceName} 不是对象或数组`)

  if (Array.isArray(raw.runs))
    return raw.runs.flatMap((item, i) => loadTranscripts(item, `${sourceName}.runs[${i}]`))

  if (Array.isArray(raw.transcripts))
    return raw.transcripts.flatMap((item, i) => loadTranscripts(item, `${sourceName}.transcripts[${i}]`))

  if (isChatGPTWebState(raw))
    return fromChatGPTWeb(raw, sourceName)

  if (isOpsClawPayload(raw))
    return fromOpsClaw(raw, sourceName)

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

export function isOpsClawPayload(obj) {
  if (!obj || typeof obj !== 'object')
    return false
  const hasAgent = Boolean(obj.agentId || obj.agent_id || obj.agentName || obj.agent_name)
  const hasThread = Array.isArray(obj.turns) || Array.isArray(obj.records)
    || Array.isArray(obj.conversation?.messages)
    || (Array.isArray(obj.messages) && obj.messages.some(m => m.role || m.type || m.sender))
  return hasAgent && hasThread
}

export function fromOpsClaw(raw, sourceName = 'opsclaw') {
  const agent = String(raw.agentName || raw.agent_name || raw.agent || '监控专家')
  const target = {
    browser: 'OpsClaw Web Console',
    url: raw.entry_url || raw.url || '',
    viewport: '',
  }
  const meta = {
    agent,
    scenario: raw.scenario || 'monitoring',
    locale: 'zh-CN',
    target,
    expected: raw._expected ?? null,
  }

  if (Array.isArray(raw.turns) && raw.turns.some(t => t.query || t.question || t.prompt)) {
    return raw.turns.map((turn, i) => normalizeTranscript({
      run_id: String(turn.id || turn.case_id || `${sourceName}-turn-${i + 1}`),
      agent,
      scenario: turn.scenario || meta.scenario,
      locale: 'zh-CN',
      target,
      user_query: turn.query || turn.question || turn.prompt || '',
      final_answer: turn.answer || turn.reply || turn.final_answer || '',
      messages: [
        { role: 'user', channel: 'user_visible', content: turn.query || turn.question || '' },
        { role: 'assistant', channel: 'user_visible', content: turn.answer || turn.reply || '' },
      ],
      _expected: turn._expected,
    }, `${sourceName}#${i}`))
  }

  const messages = raw.records || raw.messages || raw.conversation?.messages || []
  return fromMessageThread(messages, meta, sourceName)
}

export function fromDialogueText(text, sourceName = 'paste') {
  const source = String(text || '').trim()
  if (!source)
    return []

  if (/^##\s+\S/m.test(source)) {
    return source.split(/^##\s+/m).map(s => s.trim()).filter(Boolean).map((block, i) => {
      const nl = block.indexOf('\n')
      const run_id = (nl === -1 ? block : block.slice(0, nl)).trim() || `${sourceName}-${i + 1}`
      const body = nl === -1 ? '' : block.slice(nl + 1)
      const { user, assistant } = splitRoles(body)
      return normalizeTranscript({
        run_id,
        agent: '监控专家',
        scenario: 'monitoring',
        locale: 'zh-CN',
        target: { browser: 'OpsClaw Web Console' },
        user_query: user,
        final_answer: assistant,
      }, run_id)
    })
  }

  const { user, assistant } = splitRoles(source)
  return [normalizeTranscript({
    run_id: sourceName,
    agent: '监控专家',
    scenario: 'monitoring',
    locale: 'zh-CN',
    target: { browser: 'OpsClaw Web Console' },
    user_query: user,
    final_answer: assistant,
  }, sourceName)]
}

function fromMessageThread(messages, meta, sourceName) {
  const transcripts = []
  let pendingUser = ''
  messages.forEach((item, index) => {
    const role = mapOpsRole(item)
    const content = String(item.content ?? item.text ?? item.message ?? item.answer ?? '')
    if (role === 'tool' || item.channel === 'trace')
      return
    if (role === 'user') {
      pendingUser = content
      return
    }
    if (role === 'assistant' && (pendingUser || content)) {
      transcripts.push(normalizeTranscript({
        run_id: String(item.id || `${sourceName}-turn-${transcripts.length + 1}`),
        agent: meta.agent,
        scenario: item.scenario || meta.scenario,
        locale: meta.locale,
        target: meta.target,
        user_query: pendingUser,
        final_answer: content,
        _expected: item._expected || meta.expected,
      }, `${sourceName}#${index}`))
      pendingUser = ''
    }
  })
  return transcripts
}

function mapOpsRole(item) {
  const raw = String(item.role || item.type || item.sender || item.from || '').toLowerCase()
  if (['user', 'human', 'query', 'question'].includes(raw) || raw.includes('用户'))
    return 'user'
  if (['tool', 'function', 'trace'].includes(raw))
    return 'tool'
  return 'assistant'
}

function splitRoles(body) {
  const userMatch = String(body).match(/(?:用户|User|Human)[:：]\s*([\s\S]*?)(?=(?:监控专家|助手|Agent|Assistant)[:：]|$)/i)
  const asstMatch = String(body).match(/(?:监控专家|助手|Agent|Assistant)[:：]\s*([\s\S]*)$/i)
  return {
    user: userMatch?.[1]?.trim() || '',
    assistant: asstMatch?.[1]?.trim() || '',
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
