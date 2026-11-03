# CloneProof Setup Verification Report

## Project: cloneproof-sample-project

- **Project folder:** `sample-project`
- **Generated:** 2026-11-03T21:04:54.494Z

## Verification Summary

- **PASS:** 12
- **WARN:** 0
- **FAIL:** 0

> CloneProof performs static checks only by default. It does not install packages or execute project code during static analysis. A PASS does not guarantee that the entire project works on every Windows machine.

## Detailed Findings

| Status | Check | Finding |
|---|---|---|
| **PASS** | package.json exists and is valid | The file was found and parsed successfully. |
| **PASS** | README.md exists | A non-empty README.md was found. This first version does not judge whether every sentence is correct. |
| **PASS** | Package scripts are defined | Found scripts: dev, test. |
| **PASS** | README npm commands match package.json | Checked documented script(s): npm run dev, npm run test. |
| **PASS** | Local script files exist | No missing local files were detected in simple Node.js script commands. |
| **PASS** | Node.js version is documented | Found a version declaration: >=22. |
| **PASS** | Exact Node.js version declarations are consistent | No conflicting exact Node.js versions were found in the available declarations. |
| **PASS** | Node.js version declarations are compatible | No conflicts were found between exact Node.js versions and version ranges. |
| **PASS** | Node.js version compatibility | Installed Node.js 24.22.0 satisfies the required range >=22 from package.json engines.node. |
| **PASS** | Package manager and lockfile are consistent | Found package-lock.json. |
| **PASS** | Declared dependencies are installed | No direct dependencies are declared in package.json. |
| **PASS** | Scripts reviewed for common Windows shell issues | No common Unix-only command patterns were detected. This does not prove every script will work on Windows. |

## Recommended Next Steps

1. No issues were detected by the current checks.
2. This does not guarantee full Windows compatibility. Manually test the application.
