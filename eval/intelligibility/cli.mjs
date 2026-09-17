#!/usr/bin/env node
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { loadTranscripts } from './lib/normalize.mjs'
import { scoreTranscript, summarizeSuite } from './lib/score.mjs'
import { renderHtmlReport, renderMarkdownReport } from './lib/report.mjs'
import { judgeTranscript } from './lib/judge.mjs'
import { probeTarget } from './lib/probe.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const suite = args.suite ? await loadSuite(args.suite) : null
  const input = await resolveInput(args, suite)
  const title = args.title
    || (suite?.target?.name_zh ? `${suite.target.name_zh}回答可理解度评测报告` : '浏览器 Agent 回答可理解度评测报告')
  const outDir = path.resolve(args.out || (suite ? path.join(suite.root, 'out') : path.join(here, 'out')))

  const transcripts = args.paste
    ? loadTranscripts(await readFile(path.resolve(args.paste), 'utf8'), path.basename(args.paste))
    : await readAllTranscripts(input)

  if (!transcripts.length)
    throw new Error(`没有读到轨迹：${args.paste || input}`)

  if (suite?.target) {
    for (const item of transcripts) {
      item.agent = item.agent || suite.target.name_zh
      item.target = {
        ...item.target,
        browser: item.target?.browser || suite.target.browser,
        url: item.target?.url || suite.target.entry_url,
      }
    }
  }

  const results = []
  for (const transcript of transcripts) {
    const judge = await judgeTranscript(transcript, args)
    results.push(scoreTranscript(transcript, judge))
  }

  const generated_at = new Date().toISOString()
  const summary = summarizeSuite(results)
  if (suite?.target?.eval_question)
    summary.question = suite.target.eval_question

  const captured = suite ? await listDataFiles(path.join(suite.root, 'transcripts')) : []
  const payload = {
    title,
    generated_at,
    input,
    summary,
    results,
    target: suite?.target || null,
    access: suite ? await probeTarget(suite.target) : null,
    mode: suite ? (captured.length ? 'captured' : 'synthetic') : 'fixtures',
    pending_cases: suite?.cases || null,
  }

  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, 'report.json'), JSON.stringify(payload, null, 2))
  await writeFile(path.join(outDir, 'report.md'), renderMarkdownReport(payload))
  await writeFile(path.join(outDir, 'report.html'), renderHtmlReport(payload))

  printSummary(payload, outDir)
  if (!summary.pass_gate && args.strict)
    process.exitCode = 2
}

function parseArgs(argv) {
  const args = { judge: false, strict: false }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--out')
      args.out = argv[++i]
    else if (token === '--title')
      args.title = argv[++i]
    else if (token === '--suite')
      args.suite = argv[++i]
    else if (token === '--paste')
      args.paste = argv[++i]
    else if (token === '--judge')
      args.judge = true
    else if (token === '--strict')
      args.strict = true
    else if (token === '--model')
      args.model = argv[++i]
    else if (token === '--base-url')
      args.baseUrl = argv[++i]
    else if (token === '--help' || token === '-h')
      args.help = true
    else if (!token.startsWith('-') && !args.input)
      args.input = token
    else
      throw new Error(`未知参数：${token}`)
  }
  if (args.help) {
    console.log(`用法:
  node eval/intelligibility/cli.mjs [轨迹文件或目录]
  node eval/intelligibility/cli.mjs --suite opsclaw-monitoring-expert
  node eval/intelligibility/cli.mjs --suite opsclaw-monitoring-expert --paste conversation.txt

核心列是「人能看懂吗」：人能看懂 / 部分能看懂 / 人看不懂。`)
    process.exit(0)
  }
  return args
}

async function loadSuite(name) {
  const root = path.join(here, 'suites', name)
  const target = JSON.parse(await readFile(path.join(root, 'target.json'), 'utf8'))
  const casesFile = JSON.parse(await readFile(path.join(root, 'cases.json'), 'utf8'))
  return { name, root, target, cases: casesFile.cases || [] }
}

async function resolveInput(args, suite) {
  if (args.input)
    return path.resolve(args.input)
  if (!suite)
    return path.join(here, 'fixtures')

  const capturedDir = path.join(suite.root, 'transcripts')
  const captured = await listDataFiles(capturedDir)
  return captured.length ? capturedDir : path.join(suite.root, 'fixtures')
}

async function readAllTranscripts(input) {
  const info = await stat(input)
  const files = []
  if (info.isDirectory()) {
    const names = await readdir(input)
    for (const name of names.sort()) {
      if (isDataFile(name))
        files.push(path.join(input, name))
    }
  }
  else {
    files.push(input)
  }

  const transcripts = []
  for (const file of files) {
    const text = await readFile(file, 'utf8')
    const raw = file.endsWith('.json') ? JSON.parse(text) : text
    transcripts.push(...loadTranscripts(raw, path.basename(file)))
  }
  return transcripts
}

async function listDataFiles(dir) {
  try {
    const names = await readdir(dir)
    return names.filter(isDataFile)
  }
  catch {
    return []
  }
}

function isDataFile(name) {
  return name.endsWith('.json') || name.endsWith('.txt')
}

function printSummary(payload, outDir) {
  const { summary, access, mode, target } = payload
  if (target)
    console.log(`对象：${target.name_zh || target.id}  ${target.entry_url || ''}`)
  if (access) {
    console.log(access.reachable
      ? `入口探测：可达 HTTP ${access.http_status}`
      : `入口探测：不可达  ${access.error || ''}  (${access.hostname || ''})`)
  }
  if (mode === 'synthetic')
    console.log('模式：合成对照（transcripts/ 为空，不是实网成绩）')
  if (mode === 'captured')
    console.log('模式：实网采集')
  console.log(`可理解度评测完成：${summary.total} 条`)
  console.log(`  人能看懂     ${summary.counts.readable}  (${pct(summary.readable_rate)})`)
  console.log(`  部分能看懂   ${summary.counts.partial}  (${pct(summary.partial_rate)})`)
  console.log(`  人看不懂     ${summary.counts.unreadable}  (${pct(summary.unreadable_rate)})`)
  console.log(`  平均分       ${summary.avg_score}`)
  console.log(`  发布门槛     ${summary.pass_gate ? '通过' : '未通过'}`)
  console.log(`报告：${path.join(outDir, 'report.html')}`)
}

function pct(value) {
  return `${Math.round(value * 1000) / 10}%`
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
