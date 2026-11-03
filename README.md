# CloneProof - Windows Setup Verifier

**Find setup inconsistencies in Node.js projects before they waste your time.**

CloneProof is a beginner-friendly command-line tool that checks whether a JavaScript/Node.js project's setup instructions, package configuration, and selected test command are consistent.

It combines static configuration checks with an optional execution check for the project's `npm test` script. It generates a Markdown report with **PASS**, **WARN**, and **FAIL** results to help developers understand what needs attention.

> **Important:** CloneProof is a diagnostic aid, not a guarantee that a project will work on every Windows machine.

## Features

- **Package configuration checks:** Checks whether `package.json` exists and contains valid JSON.
- **README consistency:** Checks whether documented npm commands correspond to scripts defined in `package.json`.
- **Node.js version guidance:** Looks for a declared Node.js version in supported configuration files.
- **Lockfile checks:** Looks for common inconsistencies between the package manager and lockfiles.
- **Windows shell heuristics:** Flags a limited set of Unix-style commands that may not work as expected on Windows.
- **Dependency checks:** Warns when declared dependencies cannot be found in `node_modules`.
- **Test execution:** Can run the selected `npm test` script and report whether it succeeds or fails.
- **Failure explanations:** Recognizes some common errors, including missing JavaScript modules and occupied ports.
- **Markdown reports:** Saves a readable report containing check results and details.

## Requirements

- Windows 10 or Windows 11
- Node.js 22 or newer
- npm, included with Node.js
- PowerShell or another terminal

Downloads:

- [Node.js](https://nodejs.org/en/download)
- [Visual Studio Code](https://code.visualstudio.com/)

## Getting Started

### 1. Open the project

Extract the project ZIP file and open the `CloneProof-Starter` folder in Visual Studio Code.

Open Terminal, then select New Terminal.

### 2. Verify Node.js and install dependencies

Open a terminal in the CloneProof project root and check your Node.js version:

```powershell
node --version
npm.cmd --version
```

Make sure Node.js 22 or newer is installed.

Install the project's dependencies:

```powershell
npm.cmd install
```

PowerShell users can use `npm.cmd` if the `npm` command is blocked by execution-policy restrictions.

Installing dependencies prepares CloneProof for running its checks and automated tests.

### 3. Run CloneProof on the included sample

From the project root, run:

```powershell
node src/cli.js sample-project
```

Review the PASS, WARN, and FAIL results in the terminal. CloneProof also saves a Markdown report in the current folder.
To also run the sample project's test script, explicitly enable the execution check:

```powershell
node src/cli.js sample-project --run-tests
```

Only use this option on projects you trust, because running an npm script can execute code.

#### CLI options and usage
#### CLI options and usage

CloneProof accepts an optional project path, an optional Markdown report destination, and the `--run-tests` flag.

To display the built-in help message:

```powershell
node src/cli.js --help
```

To analyze the included sample project:

```powershell
node src/cli.js sample-project
```

To save the report to a custom location:

```powershell
node src/cli.js sample-project my-report.md
```

To analyze a project and explicitly execute its npm test script:

```powershell
node src/cli.js sample-project my-report.md --run-tests
```

**Available options:**

| Option | Description |
|---|---|
| `--help` | Displays usage instructions and exits without analyzing a project. |
| `--run-tests` | Runs the target project's npm test script. Only use with trusted projects. |

If no project path is supplied, CloneProof analyzes `./sample-project`. If no report path is supplied, it writes `./cloneproof-report.md`.

CloneProof also reports errors for unknown `--` options and for more than two positional arguments.

**Safety:** By default, CloneProof performs static analysis only. Project scripts are not executed unless `--run-tests` is explicitly provided.

### 4. Run CloneProof's automated tests

Run:

```powershell
node --test
```

The test suite checks the analyzer and diagnostic behavior. Confirm that the tests pass before making changes.

### 5. Check another Node.js project

Use a project you own or have permission to test. For example:

```powershell
node src/cli.js "C:\Users\YOUR-NAME\Desktop\my-project"
```

Replace the example path with the actual project path.

> **Safety note:** Running a project's npm script can execute arbitrary code. Only run execution checks on projects you trust. Review unfamiliar scripts before running them.

## Understanding the Report

| Result | Meaning |
| --- | --- |
| PASS | The specific check did not identify a problem. |
| WARN | Review the finding; it may or may not require a change. |
| FAIL | The check identified a problem that needs investigation. |

For example, if the README documents `npm run dev` and `package.json` defines a `dev` script, CloneProof can check whether the names match. That does not prove the application will start successfully.

Likewise, a failed test command is evidence of an execution problem, but its root cause may require further investigation.

## Project Structure

```text
CloneProof-Starter/
├── .github/
│   └── workflows/
├── src/
│   ├── analyze.js
│   ├── cli.js
│   └── run-check.js
├── tests/
│   └── analyze.test.js
├── sample-project/
├── broken-project/
├── examples/
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

The `broken-project` folder is a deliberately faulty example used to observe how CloneProof reports a failed test command.

## Real-World Benchmark Results

CloneProof was evaluated against two public Node.js repositories using static analysis only. Dependencies were not installed, and repository scripts were not executed.

| Repository | Commit | Results |
|---|---|---|
| [sindresorhus/is](https://github.com/sindresorhus/is) | `e9c026c611c1160eaad50da00be4e676b626018f` | 6 PASS, 3 WARN, 0 FAIL |
| [Express](https://github.com/expressjs/express) | `1c6f1b0fe4000977b9a7b4f34097e4d527dd9824` | 6 PASS, 2 WARN, 1 FAIL |

### Observations

- **sindresorhus/is:** The README-command warning needs further interpretation because the current rule did not recognize a common npm test/run command.
- **Express:** CloneProof identified that the README documents `npm start`, while the project's `package.json` does not define a `start` script.
- **Lockfiles and dependencies:** Both reports include warnings that must be interpreted in context. Dependencies were not installed, and the benchmark notes record no common lockfile at the repository root.

### Benchmark limitations

These results demonstrate checks on two specific repository snapshots, not overall detection accuracy. The findings may include false positives or missed issues. More repositories, manually verified findings, and broader test cases are needed before making accuracy claims.

Detailed reports and benchmark notes are available in [`benchmark-results/`](benchmark-results/).

## Current Limitations

- Supports JavaScript/Node.js projects rather than every programming ecosystem.
- Static checks use heuristics and can produce false positives or miss problems.
- README parsing does not cover every possible formatting style.
- Failure explanations recognize only a limited set of error patterns.
- A successful test command does not prove that the entire application works.
- Windows shell checks do not guarantee compatibility with all Windows environments.
- The tool does not currently provide a hosted dashboard or automatically create GitHub issues.

## Roadmap

### Implemented

- [x] Analyze Node.js project configuration and setup instructions.
- [x] Detect common Windows-incompatible shell commands.
- [x] Check Node.js version declarations and identify conflicts.
- [x] Identify missing dependencies and referenced local files.
- [x] Explain common project setup and execution failures.
- [x] Generate Markdown diagnostic reports.
- [x] Provide optional npm test execution with `--run-tests`.
- [x] Provide CLI help and argument validation.
- [x] Add automated regression tests and Windows CI coverage.

### Planned improvements

- [ ] Expand validation against additional real-world Node.js repositories.
- [ ] Improve diagnostic accuracy for uncommon configurations and command syntax.
- [ ] Extend support for package managers and project layouts.
- [ ] Improve report presentation and developer experience.
- [ ] Investigate additional diagnostic features based on user feedback.

These are future development goals, not promis
es of functionality already available.

## Contributing

Suggestions, bug reports, and contributions are welcome. When reporting a problem, include the relevant check result, a minimal example where possible, and steps to reproduce it.

Do not include passwords, API keys, or other secrets in reports.

## Disclaimer

CloneProof is an independent developer tool. Its reports are intended to support troubleshooting and do not certify security, correctness, or Windows compatibility.
