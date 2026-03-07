import { execSync } from 'child_process'

const out = execSync('vitest run --reporter=json 2>/dev/null', { encoding: 'utf8' })
const results = JSON.parse(out)
const failed = results.testResults.filter(t => t.status === 'failed')

if (failed.length === 0) {
  console.log(`✓ All ${results.numPassedTests} tests passed`)
} else {
  console.log(`✗ ${results.numFailedTests} failed\n`)
  for (const f of failed) {
    console.log(f.testFilePath.replace(process.cwd(), ''))
    for (const a of f.assertionResults.filter(a => a.status === 'failed')) {
      console.log(`  - ${a.fullName}`)
      console.log(`    ${a.failureMessages[0]?.split('\n')[0]}`)
    }
  }
}