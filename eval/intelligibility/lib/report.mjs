import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const rubric = require('../rubric.json')

export function renderMarkdownReport(payload) {
  const { title, generated_at, summary, results } = payload
  const lines = [
    `# ${title}`,
    '',
    `> 核心问题：${summary.question}`,
    '',
    ...renderMarkdownMeta(payload),
    `- 生成时间：${generated_at}`,
    `- 样本数：${summary.total}`,
    `- 平均分：${summary.avg_score}`,
    `- **人能看懂**：${pct(summary.readable_rate)}（${summary.counts.readable}）`,
    `- **部分能看懂**：${pct(summary.partial_rate)}（${summary.counts.partial}）`,
    `- **人看不懂**：${pct(summary.unreadable_rate)}（${summary.counts.unreadable}）`,
    `- 发布门槛：可读率 ≥ ${pct(summary.gate.release_min_readable_rate)} 且不可读率 ≤ ${pct(summary.gate.release_max_unreadable_rate)} → ${summary.pass_gate ? '通过' : '未通过'}`,
    summary.needs_human_review ? `- 需人工复核（启发式与 Judge 不一致）：${summary.needs_human_review}` : '',
    '',
  ]

  if (payload.pending_cases?.length) {
    lines.push('## 应贴进问答入口的值班题', '')
    lines.push('| ID | 场景 | 问题 |', '| --- | --- | --- |')
    for (const item of payload.pending_cases)
      lines.push(`| ${item.id} | ${item.scenario} | ${item.query} |`)
    lines.push('')
  }

  lines.push('## 失败类型分布', '')

  const codes = Object.keys(summary.failure_counts)
  if (!codes.length) {
    lines.push('无失败类型命中。', '')
  }
  else {
    lines.push('| 代码 | 含义 | 命中次数 |', '| --- | --- | ---: |')
    for (const code of codes.sort((a, b) => summary.failure_counts[b] - summary.failure_counts[a]))
      lines.push(`| ${code} | ${rubric.failures[code] || code} | ${summary.failure_counts[code]} |`)
    lines.push('')
  }

  lines.push('## 逐条判定（必须暴露原文）', '')
  for (const item of results) {
    lines.push(`### ${item.run_id} · ${item.verdict_zh} · ${item.score}`)
    lines.push('')
    lines.push(`- 场景：${item.scenario} / 浏览器：${item.target?.browser || '-'} / 来源：${item.source}`)
    lines.push(`- 人能看懂吗：**${item.verdict_zh}**`)
    lines.push(`- 判定摘要：${item.summary}`)
    if (item.failures.length)
      lines.push(`- 失败类型：${item.failures.map(f => `${f.code} ${f.label}`).join('；')}`)
    lines.push('')
    lines.push('**用户问题**')
    lines.push('')
    lines.push('```text')
    lines.push(item.user_query || '（空）')
    lines.push('```')
    lines.push('')
    lines.push('**智能体终局回答（用户可见原文）**')
    lines.push('')
    lines.push('```text')
    lines.push(item.user_visible_text || '（空）')
    lines.push('```')
    lines.push('')
    if (item.trace_excerpt) {
      lines.push('<details><summary>内部轨迹摘录（不计入「人能看懂」的正文）</summary>')
      lines.push('')
      lines.push('```text')
      lines.push(item.trace_excerpt)
      lines.push('```')
      lines.push('')
      lines.push('</details>')
      lines.push('')
    }
  }

  return lines.filter((line, i, arr) => line !== '' || arr[i - 1] !== '').join('\n')
}

export function renderHtmlReport(payload) {
  const { title, generated_at, summary, results } = payload
  const rows = results.map((item, index) => {
    const annotated = annotateHtml(item.user_visible_text || '', item.highlights || [])
    const dimBars = rubric.dimensions.map((dim) => {
      const value = Number(item.dimensions?.[dim.id] ?? 0)
      return `<div class="dim"><span>${esc(dim.label_zh)}</span><i><b style="width:${Math.round(value * 100)}%"></b></i><em>${Math.round(value * 100)}</em></div>`
    }).join('')
    const fails = item.failures.length
      ? item.failures.map(f => `<span class="tag bad">${esc(f.code)} ${esc(f.label)}</span>`).join(' ')
      : '<span class="tag ok">无硬伤</span>'
    return `
<article class="case" id="case-${index}">
  <header>
    <div class="badge ${item.verdict}">${esc(item.verdict_zh)}</div>
    <div>
      <h3>${esc(item.run_id)}</h3>
      <p class="meta">${esc(item.scenario)} · ${esc(item.agent)} · ${esc(item.target?.browser || '')} · ${item.score} 分 · ${esc(item.source)}</p>
    </div>
  </header>
  <p class="ask"><strong>人能看懂吗？</strong>${esc(item.verdict_zh)}。${esc(item.summary)}</p>
  <div class="fails">${fails}</div>
  <div class="grid">
    <section>
      <h4>用户问题</h4>
      <pre>${esc(item.user_query || '（空）')}</pre>
      <h4>智能体终局回答（用户可见原文）</h4>
      <pre class="answer">${annotated || '<span class="empty">（空）</span>'}</pre>
    </section>
    <section>
      <h4>维度分</h4>
      ${dimBars}
      ${item.trace_excerpt ? `<h4>内部轨迹摘录</h4><pre class="trace">${esc(item.trace_excerpt)}</pre>` : ''}
    </section>
  </div>
</article>`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <style>
    :root { --bg:#0f1419; --card:#171e26; --ink:#e8eef6; --muted:#9aa8b7; --ok:#3dd68c; --warn:#f5c14a; --bad:#ff6b6b; --line:#243040; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: "IBM Plex Sans", "Noto Sans SC", sans-serif; background:var(--bg); color:var(--ink); line-height:1.55; }
    header.hero, main { max-width: 1120px; margin:0 auto; padding: 32px 20px; }
    header.hero h1 { margin:0 0 8px; font-size: 28px; }
    header.hero p { color: var(--muted); margin: 0 0 18px; }
    .kpis { display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; }
    .kpi { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:16px; }
    .kpi b { display:block; font-size:28px; }
    .kpi.readable b { color: var(--ok); }
    .kpi.partial b { color: var(--warn); }
    .kpi.unreadable b { color: var(--bad); }
    .gate { margin-top:16px; padding:10px 14px; border-radius:10px; display:inline-block; }
    .gate.pass { background:#123226; color:var(--ok); }
    .gate.fail { background:#3a1518; color:var(--bad); }
    .banner { margin-top:16px; padding:12px 14px; border-radius:10px; background:#171e26; border:1px solid var(--line); color:var(--muted); }
    .banner.bad { background:#3a1518; color:#ffd6d6; }
    table { width:100%; border-collapse: collapse; background:var(--card); border-radius:12px; overflow:hidden; }
    th, td { text-align:left; padding:10px 12px; border-bottom:1px solid var(--line); font-size:14px; }
    a { color:#8cb4ff; }
    .badge { min-width:108px; text-align:center; padding:6px 10px; border-radius:999px; font-weight:700; }
    .badge.readable { background:#123226; color:var(--ok); }
    .badge.partial { background:#3a2e10; color:var(--warn); }
    .badge.unreadable { background:#3a1518; color:var(--bad); }
    .case { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:18px; margin: 18px 0 28px; }
    .case header { display:flex; gap:14px; align-items:center; }
    .case h3 { margin:0; }
    .meta, .ask { color:var(--muted); }
    .ask { color:var(--ink); }
    .grid { display:grid; grid-template-columns: 1.3fr .9fr; gap:16px; }
    pre { white-space: pre-wrap; word-break: break-word; background:#0c1015; padding:12px; border-radius:10px; font-size:13px; }
    pre.trace { max-height: 220px; overflow:auto; color:var(--muted); }
    mark.bad { background:#5a1d22; color:#ffd6d6; padding:0 2px; }
    mark.warn { background:#4a3b12; color:#ffe9b0; padding:0 2px; }
    .tag { display:inline-block; font-size:12px; padding:3px 8px; border-radius:999px; margin: 0 6px 6px 0; }
    .tag.ok { background:#123226; color:var(--ok); }
    .tag.bad { background:#3a1518; color:var(--bad); }
    .dim { display:grid; grid-template-columns: 88px 1fr 36px; gap:8px; align-items:center; font-size:12px; margin: 6px 0; color:var(--muted); }
    .dim i { height:8px; background:#0c1015; border-radius:99px; display:block; }
    .dim b { display:block; height:8px; background:#6ea8ff; border-radius:99px; }
    .empty { color:var(--bad); }
    @media (max-width: 860px) { .kpis, .grid { grid-template-columns: 1fr; } .case header { align-items:flex-start; flex-direction:column; } }
  </style>
</head>
<body>
  <header class="hero">
    <h1>${esc(title)}</h1>
    <p>${esc(summary.question)}<br/>生成时间 ${esc(generated_at)} · 样本 ${summary.total} · 平均分 ${summary.avg_score}</p>
    ${renderHtmlMeta(payload)}
    <div class="kpis">
      <div class="kpi readable"><span>人能看懂</span><b>${pct(summary.readable_rate)}</b><small>${summary.counts.readable} 条</small></div>
      <div class="kpi partial"><span>部分能看懂</span><b>${pct(summary.partial_rate)}</b><small>${summary.counts.partial} 条</small></div>
      <div class="kpi unreadable"><span>人看不懂</span><b>${pct(summary.unreadable_rate)}</b><small>${summary.counts.unreadable} 条</small></div>
      <div class="kpi"><span>平均分</span><b>${summary.avg_score}</b><small>门槛 ${pct(summary.gate.release_min_readable_rate)} 可读</small></div>
    </div>
    <div class="gate ${summary.pass_gate ? 'pass' : 'fail'}">发布门槛：${summary.pass_gate ? '通过' : '未通过'}（可读率 ≥ ${pct(summary.gate.release_min_readable_rate)} 且不可读率 ≤ ${pct(summary.gate.release_max_unreadable_rate)}）</div>
  </header>
  <main>
    ${payload.pending_cases?.length ? `<h2>应贴进问答入口的值班题</h2>
    <table>
      <thead><tr><th>ID</th><th>场景</th><th>问题</th></tr></thead>
      <tbody>${payload.pending_cases.map(item => `<tr><td>${esc(item.id)}</td><td>${esc(item.scenario)}</td><td>${esc(item.query)}</td></tr>`).join('')}</tbody>
    </table>` : ''}
    <h2>总览</h2>
    <table>
      <thead><tr><th>人能看懂吗</th><th>分数</th><th>Run</th><th>场景</th><th>失败</th></tr></thead>
      <tbody>
        ${results.map((item, index) => `<tr>
          <td><span class="badge ${item.verdict}">${esc(item.verdict_zh)}</span></td>
          <td>${item.score}</td>
          <td><a href="#case-${index}">${esc(item.run_id)}</a></td>
          <td>${esc(item.scenario)}</td>
          <td>${item.failures.map(f => f.code).join(', ') || '-'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <h2>逐条暴露原文</h2>
    ${rows}
  </main>
</body>
</html>`
}

function annotateHtml(text, highlights) {
  if (!text)
    return ''
  const marks = [...highlights]
    .filter(h => Number(h.end) > Number(h.start))
    .sort((a, b) => a.start - b.start)
  const merged = []
  for (const mark of marks) {
    const last = merged[merged.length - 1]
    if (last && mark.start <= last.end) {
      last.end = Math.max(last.end, mark.end)
      if (mark.kind === 'bad')
        last.kind = 'bad'
    }
    else {
      merged.push({ ...mark })
    }
  }
  let cursor = 0
  let out = ''
  for (const mark of merged) {
    const start = Math.max(0, Math.min(text.length, mark.start))
    const end = Math.max(start, Math.min(text.length, mark.end))
    out += esc(text.slice(cursor, start))
    out += `<mark class="${mark.kind === 'warn' ? 'warn' : 'bad'}">${esc(text.slice(start, end))}</mark>`
    cursor = end
  }
  out += esc(text.slice(cursor))
  return out
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function pct(value) {
  return `${Math.round(Number(value || 0) * 1000) / 10}%`
}

function renderMarkdownMeta(payload) {
  const lines = []
  if (payload.target) {
    lines.push(`- 对象：${payload.target.name_zh || payload.target.id}`)
    if (payload.target.entry_url)
      lines.push(`- 问答入口：${payload.target.entry_url}`)
    if (payload.target.agent_id)
      lines.push(`- agentId：\`${payload.target.agent_id}\``)
  }
  if (payload.mode === 'synthetic')
    lines.push('- 模式：**合成对照**（未采集到实网对话，不能当作线上成绩）')
  if (payload.mode === 'captured')
    lines.push('- 模式：实网采集')
  if (payload.access) {
    lines.push(payload.access.reachable
      ? `- 入口探测：可达 HTTP ${payload.access.http_status}`
      : `- 入口探测：**不可达** ${payload.access.error || ''}（${payload.access.hostname || ''}）`)
  }
  return lines
}

function renderHtmlMeta(payload) {
  const bits = []
  if (payload.target?.entry_url)
    bits.push(`对象 ${esc(payload.target.name_zh || '')} · <a href="${esc(payload.target.entry_url)}">${esc(payload.target.entry_url)}</a>`)
  if (payload.mode === 'synthetic')
    bits.push('当前是合成对照，不是实网成绩。把问答入口的回答放到 transcripts/ 后重跑。')
  if (payload.mode === 'captured')
    bits.push('当前按实网采集评分。')
  if (payload.access && !payload.access.reachable)
    bits.push(`入口探测失败：${esc(payload.access.error || 'unreachable')}（${esc(payload.access.hostname || '')}）`)
  if (!bits.length)
    return ''
  const cls = payload.access && !payload.access.reachable ? 'banner bad' : 'banner'
  return `<div class="${cls}">${bits.join('<br/>')}</div>`
}
