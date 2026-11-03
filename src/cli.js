
import fs from 'node:fs';
import path from 'node:path';
import { analyzeProject, formatMarkdownReport } from './analyze.js';
import { runNpmScript } from './run-check.js';

const args = process.argv.slice(2);
const runTests = args.includes('--run-tests');
const positionalArgs = args.filter((arg) => arg !== '--run-tests');

const projectPath = positionalArgs[0] ?? './sample-project';
const reportPath = positionalArgs[1] ?? './cloneproof-report.md';


async function main() {
  try {
    if (args.includes('--help')) {
      console.log(`
CloneProof — Windows Project Setup Verifier

Usage:
  node src/cli.js [project-path] [report-path] [--run-tests]
  node src/cli.js --help

Arguments:
  project-path   Folder to analyze (default: ./sample-project)
  report-path    Markdown report destination (default: ./cloneproof-report.md)

Options:
  --run-tests    Explicitly execute the project's npm test script
  --help         Display this help message

By default, CloneProof performs static analysis only.
No project scripts are executed unless --run-tests is provided.
`);
      return;
    }

    const unknownOption = args.find(
      (arg) => arg.startsWith('--') &&
        arg !== '--help' &&
        arg !== '--run-tests'
    );

    if (unknownOption) {
      throw new Error(
        `Unknown option: ${unknownOption}. Use --help for usage.`
      );
    }



    const absoluteProjectPath = path.resolve(projectPath);
    if (positionalArgs.length > 2) {
      throw new Error(
        'Too many arguments. Expected at most a project path and a report path. Use --help for usage.'
      );
    }

    if (
      !fs.existsSync(absoluteProjectPath) ||
      !fs.statSync(absoluteProjectPath).isDirectory()
    ) {
      throw new Error(
        `Project path does not exist or is not a directory: ${absoluteProjectPath}`
      );
    }

    const result = analyzeProject(absoluteProjectPath);

    if (runTests) {
      const execution = await runNpmScript(result.root, 'test');

      console.log('\n--- Execution Check ---');
      console.log(
        execution.success ? '[PASS]' : '[FAIL]',
        execution.message
      );

      if (execution.explanation) {
        console.log('Explanation:', execution.explanation);
      }

      if (execution.stdout) console.log(execution.stdout);
      if (execution.stderr) console.error(execution.stderr);

      result.checks.push({
        status: execution.success ? 'PASS' : 'FAIL',
        title: 'Test script executes successfully',
        detail: execution.message,
        explanation: execution.explanation
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
    } else {
      console.log(
        '\nStatic analysis only. No project scripts were executed.'
      );
      console.log(
        'To explicitly run the test script, add --run-tests.'
      );
    }

    const report = formatMarkdownReport(result);
    const absoluteReportPath = path.resolve(reportPath);

    fs.writeFileSync(absoluteReportPath, report, 'utf8');

    console.log(`\nCloneProof report for: ${result.projectName}`);
    console.log(`Project: ${result.root}`);
    console.log(
      `Result:  ${result.summary.pass} PASS | ${result.summary.warn} WARN | ${result.summary.fail} FAIL`
    );

    for (const item of result.checks) {
      console.log(`[${item.status}] ${item.title}`);
      console.log(`        ${item.detail}`);
    }

    console.log(
      `\nFull Markdown report saved to: ${absoluteReportPath}\n`
    );

    if (result.summary.fail > 0) process.exitCode = 1;
  } catch (error) {
    console.error(
      `CloneProof could not complete the check: ${error.message}`
    );
    process.exitCode = 1;
  }
}

main();
