import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadTranscripts } from './lib/normalize.mjs'
import { scoreTranscript } from './lib/score.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixtureDir = path.join(here, 'fixtures')

const expectedByRun = {
  'fx-weather-readable': 'readable',
  'fx-a11y-dump-unreadable': 'unreadable',
  'fx-mixed-partial': 'partial',
  'fx-screenshot-only-unreadable': 'unreadable',
  'fx-plan-only-unreadable': 'unreadable',
  'fx-mojibake-unreadable': 'unreadable',
  'fx-json-payload-unreadable': 'unreadable',
  'fx-product-compare-readable': 'readable',
  '09-chatgpt-web-export.json-1002': 'readable',
  '09-chatgpt-web-export.json-1003': 'unreadable',
}

async function main() {
  const files = (await readdir(fixtureDir)).filter(name => name.endsWith('.json')).sort()
  const transcripts = []
  for (const name of files) {
    const raw = JSON.parse(await readFile(path.join(fixtureDir, name), 'utf8'))
    transcripts.push(...loadTranscripts(raw, name))
  }

  assert.ok(transcripts.length >= 9, `应至少加载 9 条轨迹，实际 ${transcripts.length}`)

  const results = transcripts.map(item => scoreTranscript(item))
  const mismatches = []

  for (const item of results) {
    const expected = item.expected?.verdict || expectedByRun[item.run_id]
    assert.ok(expected, `缺少期望判定：${item.run_id}`)
    if (item.verdict !== expected) {
      mismatches.push({
        run_id: item.run_id,
        expected,
        actual: item.verdict,
        score: item.score,
        failures: item.failures.map(f => f.code),
        summary: item.summary,
      })
    }
  }

  assert.deepEqual(mismatches, [], `判定与夹具不一致：\n${JSON.stringify(mismatches, null, 2)}`)

  const readable = results.find(item => item.run_id === 'fx-weather-readable')
  assert.equal(readable.human_can_understand, true)
  assert.match(readable.user_visible_text, /不用带伞/)

  const dump = results.find(item => item.run_id === 'fx-a11y-dump-unreadable')
  assert.ok(dump.failures.some(item => item.code === 'DOM' || item.code === 'TRACE'))

  console.log(`intelligibility tests passed (${results.length} transcripts)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
