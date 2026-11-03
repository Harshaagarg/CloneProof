# CloneProof Demo Guide

Run all commands from the CloneProof repository root.

## Demo 1: Healthy Project

```powershell
node src/cli.js sample-project healthy-demo-report.md
```

Expected result: 12 PASS | 0 WARN | 0 FAIL

## Demo 2: Broken Project (Static Analysis)

```powershell
node src/cli.js broken-project broken-demo-report.md
```

Expected result: 7 PASS | 4 WARN | 0 FAIL

CloneProof detects missing documentation, missing script files, and undocumented Node.js requirements without executing project code.

## Demo 3: Broken Project (Optional Test Execution)

```powershell
node src/cli.js broken-project broken-execution-report.md --run-tests
```

Expected result: 7 PASS | 4 WARN | 1 FAIL

The test fails because missing-file.js does not exist. CloneProof identifies the failure and explains the missing-module error.

WARNING: --run-tests executes project code. Only use it on projects whose scripts you trust.

## Example Reports

The demo-reports folder contains three saved Markdown reports showing the results of these demonstrations.

The reports are historical snapshots. Local project paths were sanitized before publication. Results may vary depending on the Node.js version and environment.
