import fs from 'node:fs';
import path from 'node:path';
import { analyzeProject, formatMarkdownReport } from './analyze.js';
import { runNpmScript } from './run-check.js';

const projectPath = process.argv[2] ?? './sample-project';
const reportPath = process.argv[3] ?? './cloneproof-report.md';

async function main() {
  try {
  const result = analyzeProject(projectPath);
  const execution = await runNpmScript(result.root, 'test');

console.log('\n--- Execution Check ---');
console.log(execution.success ? '[PASS]' : '[FAIL]', execution.message);

if (execution.explanation) {
  console.log('Explanation:', execution.explanation);
}

if (execution.stdout) console.log(execution.stdout);
if (execution.stderr) console.error(execution.stderr);
result.checks.push({
  status: execution.success ? 'PASS' : 'FAIL',
  title: 'Test script executes successfully',
  detail: execution.message,
  explanation: execution.explanation,
});


result.summary.pass = result.checks.filter(
  (item) => item.status === 'PASS'
).length;

result.summary.warn = result.checks.filter(
  (item) => item.status === 'WARN'
).length;

result.summary.fail = result.checks.filter(
  (item) => item.status === 'FAIL'
).length;
  const report = formatMarkdownReport(result);
  const absoluteReportPath = path.resolve(reportPath);
  fs.writeFileSync(absoluteReportPath, report, 'utf8');

  console.log(`\nCloneProof report for: ${result.projectName}`);
  console.log(`Project: ${result.root}`);
  console.log(`Result:  ${result.summary.pass} PASS | ${result.summary.warn} WARN | ${result.summary.fail} FAIL`);
  for (const item of result.checks) {
    console.log(`[${item.status}] ${item.title}`);
    console.log(`        ${item.detail}`);
  }
  console.log(`\nFull Markdown report saved to: ${absoluteReportPath}\n`);

  if (result.summary.fail > 0) process.exitCode = 1;
  } catch (error) {
    console.error(`CloneProof could not complete the check: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
