import { createRequire } from 'node:module'
import { analyze } from './heuristics.mjs'
import { collectTraceText } from './normalize.mjs'

const require = createRequire(import.meta.url)
const rubric = require('../rubric.json')

const VERDICT_ZH = {
  readable: '人能看懂',
  partial: '部分能看懂',
  unreadable: '人看不懂',
}

export function scoreTranscript(transcript, judge = null) {
  const analysis = analyze(transcript)
  const heuristic = finalizeHeuristic(transcript, analysis)
  const combined = combineJudge(heuristic, judge)

  return {
    run_id: transcript.run_id,
    agent: transcript.agent,
    scenario: transcript.scenario,
    locale: transcript.locale,
    target: transcript.target,
    user_query: transcript.user_query,
    user_visible_text: transcript.final_answer || '',
    trace_excerpt: excerpt(collectTraceText(transcript), 600),
    ...combined,
    dimensions: analysis.dimensions,
    failures: analysis.failures,
    highlights: analysis.highlights,
    evidence: analysis.evidence,
    heuristic,
    judge,
    expected: transcript._expected ?? null,
  }
}

export function summarizeSuite(results) {
  const total = results.length
  const counts = { readable: 0, partial: 0, unreadable: 0 }
  const failureCounts = {}
  let scoreSum = 0
  let mismatch = 0

  for (const item of results) {
    counts[item.verdict] += 1
    scoreSum += item.score
    if (item.needs_human_review)
      mismatch += 1
    for (const fail of item.failures)
      failureCounts[fail.code] = (failureCounts[fail.code] || 0) + 1
  }

  const readable_rate = total ? counts.readable / total : 0
  const unreadable_rate = total ? counts.unreadable / total : 0
  const gate = rubric.gate
  const pass_gate = readable_rate >= gate.release_min_readable_rate
    && unreadable_rate <= gate.release_max_unreadable_rate

  return {
    total,
    counts,
    readable_rate,
    partial_rate: total ? counts.partial / total : 0,
    unreadable_rate,
    avg_score: total ? round1(scoreSum / total) : 0,
    failure_counts: failureCounts,
    needs_human_review: mismatch,
    pass_gate,
    gate,
    question: rubric.question,
  }
}

function finalizeHeuristic(transcript, analysis) {
  const weighted = weightedScore(analysis.dimensions)
  const hasAnswer = analysis.answer.hasNaturalSentence && !analysis.answer.planOnly
  const hardFail = analysis.failures.some(item => rubric.hard_fail_codes.includes(item.code)) && !hasAnswer

  let score = Math.round(weighted * 100)
  if (!transcript.final_answer?.trim())
    score = Math.min(score, 15)
  if (hardFail)
    score = Math.min(score, 42)

  // 纯 JSON / 纯 DOM dump / 乱码 / 空答：强制不可读
  if (
    analysis.dump.jsonWhole
    || analysis.failures.some(f => ['EMPTY', 'ENC', 'SCREEN', 'PLAN', 'PROMQL', 'ALERTJSON', 'SERIES'].includes(f.code))
    || (!hasAnswer && (analysis.dump.domRatio > 0.4 || analysis.dump.dumpRatio > 0.55 || analysis.dump.toolRatio > 0.4))
  )
    score = Math.min(score, 28)

  if (analysis.answer.planOnly)
    score = Math.min(score, 38)

  // 有结论但轨迹泄漏：不允许判成「人能看懂」
  if (hasAnswer && analysis.failures.some(f => f.code === 'MIX'))
    score = Math.max(45, Math.min(score, 72))

  const verdict = verdictFromScore(score)
  return {
    score,
    verdict,
    verdict_zh: VERDICT_ZH[verdict],
    human_can_understand: verdict === 'readable',
    summary: buildSummary(verdict, analysis),
  }
}

function combineJudge(heuristic, judge) {
  if (!judge) {
    return {
      score: heuristic.score,
      verdict: heuristic.verdict,
      verdict_zh: heuristic.verdict_zh,
      human_can_understand: heuristic.human_can_understand,
      summary: heuristic.summary,
      needs_human_review: false,
      source: 'heuristic',
    }
  }

  const agreed = judge.verdict === heuristic.verdict
  const worse = worseVerdict(heuristic.verdict, judge.verdict)
  const score = agreed
    ? Math.round((heuristic.score + Number(judge.score || heuristic.score)) / 2)
    : Math.min(heuristic.score, Number(judge.score ?? heuristic.score))

  const verdict = agreed ? heuristic.verdict : worse
  return {
    score,
    verdict,
    verdict_zh: VERDICT_ZH[verdict],
    human_can_understand: verdict === 'readable',
    summary: judge.reason ? `${heuristic.summary} Judge：${judge.reason}` : heuristic.summary,
    needs_human_review: !agreed,
    source: agreed ? 'heuristic+judge' : 'disagreement-conservative',
  }
}

function weightedScore(dimensions) {
  let sum = 0
  for (const dim of rubric.dimensions)
    sum += (Number(dimensions[dim.id]) || 0) * dim.weight
  return sum
}

function verdictFromScore(score) {
  if (score >= rubric.verdicts.readable.min_score)
    return 'readable'
  if (score >= rubric.verdicts.partial.min_score)
    return 'partial'
  return 'unreadable'
}

function worseVerdict(a, b) {
  const rank = { unreadable: 0, partial: 1, readable: 2 }
  return (rank[a] ?? 0) <= (rank[b] ?? 0) ? a : b
}

function buildSummary(verdict, analysis) {
  if (verdict === 'readable')
    return '终局回答是自然语言，普通人不用看轨迹也能理解结论。'
  if (analysis.failures.length)
    return analysis.failures.map(item => item.note).slice(0, 2).join(' ')
  if (verdict === 'partial')
    return '有一部分可读信息，但不够干净，普通人需要费力挑拣。'
  return '终局内容不像给人看的答案。'
}

function excerpt(text, max = 600) {
  const value = String(text || '').trim()
  if (value.length <= max)
    return value
  return `${value.slice(0, max)}…`
}

function round1(value) {
  return Math.round(value * 10) / 10
}

export { VERDICT_ZH }
