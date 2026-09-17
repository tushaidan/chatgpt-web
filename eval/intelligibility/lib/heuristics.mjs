const FAILURE_LABELS = {
  EMPTY: '空回答或占位符',
  ENC: '乱码/替换字符/不可打印字符',
  TRACE: '工具调用日志当作回答',
  DOM: '无障碍树或 HTML/选择器 dump',
  JSON: '原始结构化载荷当作回答',
  SCREEN: '截图无文字解释',
  PLAN: '只描述下一步操作，无任务结果',
  MIX: '结论被日志淹没',
  LANG: '用户无法阅读的语言或界面字符串堆砌',
  WALL: '超长无结构文本',
}

const A11Y_RE = /\[(?:button|link|textbox|heading|img|image|listitem|menuitem|tab|checkbox|radio|combobox|navigation|banner|main|complementary|StaticText)\]/gi
const ROLE_RE = /\brole=["'](?:button|link|textbox|document|list|combobox|checkbox)/gi
const SELECTOR_RE = /(?:html|body|div|span|button|input)(?:\s*>\s*[.#\w[\]-]+){2,}|(?:nth-child\(\d+\)|css selector|#app\s*>)/gi
const TOOL_RE = /\b(?:browser_[a-z_]+|computer_[a-z_]+|playwright_[a-z_]+|puppeteer_[a-z_]+|click|type_text|browser_click|browser_type|navigate|screenshot|press_key|select_option)\s*\(|"tool(?:Call|_call)"\s*:|"function_call"\s*:|Action:\s*(?:click|type|scroll|navigate|screenshot|wait_for)/gi
const BASE64_RE = /data:image\/(?:png|jpe?g|webp);base64,[A-Za-z0-9+/=]{80,}/g
const PLACEHOLDER_RE = /^(n\/?a|null|undefined|none|empty|todo|placeholder|此处回答|暂无|（空）|\.\.\.|…)$/i
const PLAN_RE = /^(好的[，,.]?|我将|我来|接下来(?:我)?|让我|下一步|Now I will|I'll |I will |Let me |I am going to |Going to click)/i
const SENTENCE_RE = /[。！？.!?]/
const CJK_RE = /[\u4e00-\u9fff]/g
const LATIN_RE = /[A-Za-z]/g
const UI_STRING_RE = /\b(?:aria-label|innerText|outerHTML|data-testid|xpath|bbox|clickable)\b/gi

export function analyze(transcript) {
  const text = (transcript.final_answer || '').trim()
  const attachments = transcript.attachments || []
  const screenshots = attachments.filter(item => /screen|image|screenshot/i.test(String(item.type || '')))
  const query = transcript.user_query || ''
  const locale = transcript.locale || 'zh-CN'

  const failures = []
  const highlights = []
  const evidence = []

  const metrics = measureSurface(text)
  const dump = measureDump(text)
  const language = measureLanguage(text, locale)
  const structure = measureStructure(text)
  const answer = measureAnswer(text, query, dump, screenshots)

  if (!text) {
    const hasBareScreenshot = screenshots.length > 0 && screenshots.every(s => !String(s.caption || s.alt || '').trim())
    if (hasBareScreenshot)
      pushFailure(failures, evidence, highlights, 'SCREEN', '终局没有文字，只给了未说明的截图。', 0, 0)
    else
      pushFailure(failures, evidence, highlights, 'EMPTY', '终局回答为空。', 0, 0)
  }
  else if (PLACEHOLDER_RE.test(text)) {
    pushFailure(failures, evidence, highlights, 'EMPTY', `占位符回答：${text}`, 0, text.length)
  }

  if (metrics.replacementRatio > 0.01 || metrics.controlRatio > 0.02 || looksMojibake(text)) {
    pushFailure(failures, evidence, highlights, 'ENC', '出现乱码、替换字符或异常控制字符。', 0, Math.min(text.length, 80))
  }

  if (dump.jsonWhole)
    pushFailure(failures, evidence, highlights, 'JSON', '整段回答是原始 JSON。', 0, text.length)

  if (dump.domRatio > 0.28 || dump.a11yHits >= 4)
    pushFailure(failures, evidence, highlights, 'DOM', '回答主体是无障碍树、HTML 或 CSS 选择器 dump。', dump.domSpan.start, dump.domSpan.end)

  if (dump.toolRatio > 0.22 || dump.toolHits >= 3)
    pushFailure(failures, evidence, highlights, 'TRACE', '回答主体是工具调用/浏览器操作日志。', dump.toolSpan.start, dump.toolSpan.end)

  if (dump.base64Hits)
    pushFailure(failures, evidence, highlights, 'TRACE', '回答中夹带大段 base64 截图数据。', 0, Math.min(text.length, 120))

  if (text && answer.planOnly)
    pushFailure(failures, evidence, highlights, 'PLAN', '只宣布下一步操作，没有给出任务结果。', 0, Math.min(text.length, 80))

  if (text && dump.mixed && answer.hasNaturalSentence)
    pushFailure(failures, evidence, highlights, 'MIX', '有自然语言结论，但被轨迹/JSON/DOM 淹没。', dump.leakSpan.start, dump.leakSpan.end)

  if (text && language.mismatch && language.cjk + language.latin > 20)
    pushFailure(failures, evidence, highlights, 'LANG', '用户问题语言与回答语言明显不一致，或界面字符串堆砌。', 0, Math.min(text.length, 80))

  if (structure.wallOfText)
    pushFailure(failures, evidence, highlights, 'WALL', '文本过长且缺少标题/列表结构。', 0, Math.min(text.length, 80))

  if (screenshots.length && !text && !screenshots.some(s => String(s.caption || s.alt || '').trim())) {
    // already recorded SCREEN
  }
  else if (screenshots.length && text.length < 40 && screenshots.every(s => !String(s.caption || s.alt || '').trim()) && !answer.hasNaturalSentence) {
    pushFailure(failures, evidence, highlights, 'SCREEN', '截图缺少说明，文字也无法独立成答。', 0, text.length)
  }

  const dimensions = scoreDimensions({
    text,
    metrics,
    dump,
    language,
    structure,
    answer,
    screenshots,
    failures,
  })

  return {
    metrics,
    dump,
    language,
    structure,
    answer,
    screenshots: screenshots.length,
    failures,
    highlights,
    evidence,
    dimensions,
    failure_labels: FAILURE_LABELS,
  }
}

function measureSurface(text) {
  const chars = [...text]
  const n = Math.max(chars.length, 1)
  let replacement = 0
  let control = 0
  for (const ch of chars) {
    const code = ch.codePointAt(0)
    if (ch === '\uFFFD')
      replacement += 1
    if (code < 32 && ch !== '\n' && ch !== '\t' && ch !== '\r')
      control += 1
  }
  return {
    length: chars.length,
    replacementRatio: replacement / n,
    controlRatio: control / n,
  }
}

function measureDump(text) {
  const n = Math.max(text.length, 1)
  const a11yHits = countHits(text, A11Y_RE) + countHits(text, ROLE_RE)
  const selectorHits = countHits(text, SELECTOR_RE)
  const toolHits = countHits(text, TOOL_RE)
  const uiHits = countHits(text, UI_STRING_RE)
  const base64Hits = countHits(text, BASE64_RE)
  const htmlHits = countHits(text, /<\/?[a-z][\w:-]*\b[^>]*>/gi)

  const jsonWhole = isWholeJson(text)
  const jsonBlocks = countHits(text, /```json|{\s*"(?:tool|action|selector|role|name|arguments)"\s*:/g)
  const lineStats = dumpLineStats(text)

  const a11ySpan = firstSpan(text, A11Y_RE) || firstSpan(text, /RootWebArea|accessibility tree/i) || emptySpan()
  const toolSpan = firstSpan(text, TOOL_RE) || emptySpan()
  const leakSpan = a11ySpan.end ? a11ySpan : toolSpan

  const dumpChars = Math.max(estimateDumpChars(text), lineStats.dumpChars, jsonWhole ? text.length : 0)
  const dumpRatio = Math.min(1, dumpChars / n)
  const hitDomRatio = Math.min(1, (a11yHits * 18 + selectorHits * 24 + htmlHits * 8 + uiHits * 10) / n)
  const domRatio = Math.min(1, Math.max(hitDomRatio, (a11yHits + selectorHits) ? dumpRatio : 0))
  const toolRatio = Math.min(1, Math.max(
    (toolHits * 28 + base64Hits * 80) / n,
    toolHits ? lineStats.dumpChars / n : 0,
  ))

  return {
    a11yHits,
    selectorHits,
    toolHits,
    uiHits,
    base64Hits,
    htmlHits,
    jsonWhole,
    jsonBlocks,
    dumpChars,
    dumpRatio,
    domRatio,
    toolRatio,
    mixed: dumpChars > 80 && dumpRatio > 0.35,
    domSpan: a11ySpan,
    toolSpan,
    leakSpan,
    leadingHuman: leadingHumanText(text),
  }
}

function measureAnswer(text, query, dump, screenshots) {
  const human = dump.leadingHuman || ''
  const hasPunct = SENTENCE_RE.test(human || text)
  const humanLooksNatural = human.length >= 8
    && SENTENCE_RE.test(human)
    && naturalLanguageRatio(human) >= 0.35
    && dumpLineStats(human).dumpChars / Math.max(human.length, 1) < 0.3
  const hasNaturalSentence = humanLooksNatural && !dump.jsonWhole
  const planLead = PLAN_RE.test(text.trim()) || /我将|我来点击|Let me click|I will (?:now )?click|打开.+并点击/.test(text)
  const hasConcreteFact = /¥|￥|\$\s?\d|\d+\s*℃|\d+\s*%|结论[:：]|答案[:：]|结果[:：]|余票|已加入|合计|总计|不用带伞|会下雨|不会下雨|有票|没有票/.test(text)
  const planOnly = Boolean(text)
    && planLead
    && !hasConcreteFact
    && text.length < 280
    && dump.dumpRatio < 0.45
  const queryTokens = tokenize(query)
  const overlap = queryTokens.length
    ? queryTokens.filter(tok => text.toLowerCase().includes(tok)).length / queryTokens.length
    : 0
  const hasScreenshotCaption = screenshots.some(s => String(s.caption || s.alt || '').trim())
  return {
    hasNaturalSentence,
    planOnly,
    overlap,
    hasScreenshotCaption,
    hasPunct,
  }
}

function measureLanguage(text, locale) {
  const cjk = (text.match(CJK_RE) || []).length
  const latin = (text.match(LATIN_RE) || []).length
  const total = cjk + latin
  const wantsZh = /^zh/i.test(locale)
  const mismatch = total > 24 && (
    (wantsZh && cjk / total < 0.12 && latin / total > 0.7)
    || (!wantsZh && latin / total < 0.12 && cjk / total > 0.7)
  )
  return { cjk, latin, mismatch, naturalRatio: naturalLanguageRatio(text) }
}

function measureStructure(text) {
  const length = text.length
  const headings = countHits(text, /^#{1,3}\s/mg) + countHits(text, /(?:^|\n)[-*]\s/g)
  const wallOfText = length > 4500 && headings < 3 && !text.includes('```')
  const codeRatio = Math.min(1, codeFenceChars(text) / Math.max(length, 1))
  return { length, headings, wallOfText, codeRatio }
}

function scoreDimensions(ctx) {
  const { text, metrics, dump, language, structure, answer, screenshots, failures } = ctx
  const fail = code => failures.some(item => item.code === code)

  const surface = clamp01(
    1
    - metrics.replacementRatio * 12
    - metrics.controlRatio * 10
    - (fail('ENC') ? 0.7 : 0)
    - (fail('EMPTY') ? 1 : 0),
  )

  const audience = clamp01(
    (answer.hasNaturalSentence ? 0.7 : 0.15)
    + (dump.jsonWhole ? -0.7 : 0)
    + (dump.domRatio > 0.28 ? -0.6 : 0)
    + (dump.toolRatio > 0.22 ? -0.55 : 0)
    + (fail('PLAN') ? -0.45 : 0)
    + (fail('SCREEN') ? -0.5 : 0)
    + (text && dump.dumpRatio < 0.2 ? 0.3 : 0),
  )

  const natural_language = clamp01(
    language.naturalRatio * 0.85
    + (answer.hasNaturalSentence ? 0.2 : 0)
    - dump.domRatio * 0.7
    - dump.toolRatio * 0.6
    - (dump.jsonWhole ? 0.7 : 0)
    - (language.mismatch ? 0.2 : 0),
  )

  const extractable_answer = clamp01(
    (answer.hasNaturalSentence ? 0.55 : 0)
    + Math.min(0.25, answer.overlap)
    + (fail('PLAN') || fail('EMPTY') || fail('SCREEN') ? 0 : 0.2)
    - (dump.mixed ? 0.25 : 0)
    - (dump.jsonWhole ? 0.45 : 0)
    - (dump.domRatio > 0.4 ? 0.45 : 0),
  )

  const trace_leak = clamp01(
    1 - dump.dumpRatio * 0.9 - dump.domRatio * 0.5 - dump.toolRatio * 0.5 - (dump.jsonWhole ? 0.8 : 0),
  )

  const visual_explain = screenshots.length === 0
    ? (text ? 1 : 0)
    : clamp01(
      (answer.hasScreenshotCaption ? 0.7 : 0.15)
      + (answer.hasNaturalSentence ? 0.3 : 0)
      - (fail('SCREEN') ? 0.7 : 0),
    )

  const cognitive_load = clamp01(
    1
    - (structure.wallOfText ? 0.55 : 0)
    - Math.max(0, (structure.length - 6000) / 12000)
    - structure.codeRatio * 0.35,
  )

  const task_relevance = clamp01(
    0.35
    + Math.min(0.4, answer.overlap * 1.2)
    + (answer.hasNaturalSentence ? 0.25 : 0)
    - (fail('PLAN') ? 0.55 : 0)
    - (fail('EMPTY') ? 0.8 : 0),
  )

  return {
    surface,
    audience,
    natural_language,
    extractable_answer,
    trace_leak,
    visual_explain,
    cognitive_load,
    task_relevance,
  }
}

function pushFailure(failures, evidence, highlights, code, note, start, end) {
  if (failures.some(item => item.code === code && item.note === note))
    return
  failures.push({ code, label: FAILURE_LABELS[code], note })
  evidence.push(note)
  if (end > start)
    highlights.push({ start, end, kind: code === 'MIX' ? 'warn' : 'bad', note })
}

function countHits(text, re) {
  const copy = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`)
  return (text.match(copy) || []).length
}

function firstSpan(text, re) {
  const copy = new RegExp(re.source, re.flags.replace('g', ''))
  const match = copy.exec(text)
  if (!match)
    return null
  return { start: match.index, end: match.index + match[0].length }
}

function emptySpan() {
  return { start: 0, end: 0 }
}

function isWholeJson(text) {
  const trimmed = text.trim()
  if (!trimmed)
    return false
  if (!(trimmed.startsWith('{') || trimmed.startsWith('[')))
    return false
  try {
    JSON.parse(trimmed)
    return true
  }
  catch {
    return false
  }
}

function estimateDumpChars(text) {
  let dump = 0
  const patterns = [A11Y_RE, ROLE_RE, SELECTOR_RE, TOOL_RE, BASE64_RE, UI_STRING_RE]
  for (const re of patterns) {
    const copy = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`)
    let match = copy.exec(text)
    while (match) {
      dump += match[0].length
      match = copy.exec(text)
    }
  }
  if (isWholeJson(text))
    dump = Math.max(dump, text.length)
  return dump
}

function dumpLineStats(text) {
  const lines = String(text || '').split(/\n/)
  let dumpChars = 0
  let dumpLines = 0
  for (const line of lines) {
    if (isDumpLine(line)) {
      dumpChars += line.length + 1
      dumpLines += 1
    }
  }
  return { dumpChars, dumpLines }
}

function isDumpLine(line) {
  const t = String(line || '').trim()
  if (!t)
    return false
  if (/^RootWebArea\b/i.test(t))
    return true
  if (/^\[(?:button|link|textbox|heading|img|image|listitem|menuitem|tab|checkbox|radio|combobox|navigation|banner|main|complementary|StaticText)\]/.test(t))
    return true
  if (/^(?:html|body|div|span)\s*>/.test(t))
    return true
  if (/^(?:Action|Observation|Thought)\s*:/i.test(t))
    return true
  if (/^(?:browser_|computer_|playwright_|puppeteer_)/i.test(t))
    return true
  if (/nth-child\(\d+\)/.test(t) || /data:image\//.test(t))
    return true
  if (/[{[]/.test(t) && /"(?:tool|selector|function_call|tool_call|action|role)"/.test(t))
    return true
  if (/```(?:json|javascript|html)?/.test(t))
    return true
  return false
}

function leadingHumanText(text) {
  const cut = String(text || '').search(/\n\s*(?:```|RootWebArea\b|\[(?:button|link|heading|combobox|textbox|listitem)\]|(?:html|body|div)\s*>|Action\s*:|browser_[a-z_]+)/i)
  const head = cut === -1 ? text : text.slice(0, cut)
  return String(head || '').trim()
}

function naturalLanguageRatio(text) {
  if (!text)
    return 0
  const cjk = (text.match(CJK_RE) || []).length
  const letters = (text.match(/[A-Za-z\u4e00-\u9fff]/g) || []).length
  const symbols = (text.match(/[{}\[\]<>/=#_$:;\\|]/g) || []).length
  const denom = Math.max(letters + symbols, 1)
  const sentenceBonus = SENTENCE_RE.test(text) ? 0.12 : 0
  return clamp01((cjk + letters) / denom * 0.9 + sentenceBonus - symbols / denom * 0.35)
}

function looksMojibake(text) {
  if (!text)
    return false
  if (text.includes('\uFFFD'))
    return true
  const classic = /(?:Ã.|Â.|å.|æ.|ç.|ä.|é.|ä»|å¤|æ˜|åŒ)/g
  const hits = text.match(classic) || []
  return hits.length >= 6 && hits.join('').length / Math.max(text.length, 1) > 0.12
}

function codeFenceChars(text) {
  const blocks = text.match(/```[\s\S]*?```/g) || []
  return blocks.reduce((sum, block) => sum + block.length, 0)
}

function tokenize(query) {
  return String(query)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map(tok => tok.trim())
    .filter(tok => tok.length >= 2 && !['please', 'help', '帮我', '一下', 'the', 'and'].includes(tok))
}

function clamp01(value) {
  if (Number.isNaN(value))
    return 0
  return Math.max(0, Math.min(1, value))
}

export { FAILURE_LABELS }
