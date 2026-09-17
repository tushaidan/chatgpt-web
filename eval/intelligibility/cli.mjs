#!/usr/bin/env node
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { loadTranscripts } from './lib/normalize.mjs'
import { scoreTranscript, summarizeSuite } from './lib/score.mjs'
import { renderHtmlReport, renderMarkdownReport } from './lib/report.mjs'
import { judgeTranscript } from './lib/judge.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const input = path.resolve(args.input || path.join(here, 'fixtures'))
  const outDir = path.resolve(args.out || path.join(here, 'out'))
  const title = args.title || '浏览器 Agent 回答可理解度评测报告'

  const transcripts = await readAllTranscripts(input)
  if (!transcripts.length)
    throw new Error(`没有读到轨迹：${input}`)

  const results = []
  for (const transcript of transcripts) {
    const judge = await judgeTranscript(transcript, args)
    results.push(scoreTranscript(transcript, judge))
  }

  const generated_at = new Date().toISOString()
  const summary = summarizeSuite(results)
  const payload = { title, generated_at, input, summary, results }

  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, 'report.json'), JSON.stringify(payload, null, 2))
  await writeFile(path.join(outDir, 'report.md'), renderMarkdownReport(payload))
  await writeFile(path.join(outDir, 'report.html'), renderHtmlReport(payload))

  printSummary(summary, outDir)
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
    console.log(`用法: node eval/intelligibility/cli.mjs [轨迹文件或目录] [--out 目录] [--judge] [--strict]

默认读取 eval/intelligibility/fixtures，写出 report.html / report.md / report.json。
核心列是「人能看懂吗」：人能看懂 / 部分能看懂 / 人看不懂。`)
    process.exit(0)
  }
  return args
}

async function readAllTranscripts(input) {
  const info = await stat(input)
  const files = []
  if (info.isDirectory()) {
    const names = await readdir(input)
    for (const name of names.sort()) {
      if (name.endsWith('.json'))
        files.push(path.join(input, name))
    }
  }
  else {
    files.push(input)
  }

  const transcripts = []
  for (const file of files) {
    const raw = JSON.parse(await readFile(file, 'utf8'))
    transcripts.push(...loadTranscripts(raw, path.basename(file)))
  }
  return transcripts
}

function printSummary(summary, outDir) {
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
