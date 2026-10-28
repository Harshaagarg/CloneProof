# CloneProof Setup Verification Report

## Project: express

- **Project folder:** `C:\Users\Asus\Downloads\CloneProof-Starter\cloneproof-bench-express`
- **Generated:** 2026-10-28T20:36:50.141Z

## Verification Summary

- **PASS:** 6
- **WARN:** 2
- **FAIL:** 1

> CloneProof performs static checks only by default. It does not install packages or execute project code during static analysis. A PASS does not guarantee that the entire project works on every Windows machine.

## Detailed Findings

| Status | Check | Finding |
|---|---|---|
| **PASS** | package.json exists and is valid | The file was found and parsed successfully. |
| **PASS** | README.md exists | A non-empty README.md was found. This first version does not judge whether every sentence is correct. |
| **PASS** | Package scripts are defined | Found scripts: lint, lint:fix, test, test-ci, test-cov, test-tap. |
| **FAIL** | README npm commands match package.json | README.md mentions script(s) not defined in package.json: start. Update the instructions or add the missing script(s). |
| **PASS** | Local script files exist | No missing local files were detected in simple Node.js script commands. |
| **PASS** | Node.js version is documented | Found a version declaration: >= 18. |
| **WARN** | Dependency lockfile exists | Found 44 direct dependency declaration(s) but no common lockfile. A committed lockfile helps make clean installs repeatable. |
| **WARN** | Declared dependencies are installed | Could not find these declared packages in node_modules: accepts, body-parser, content-disposition, content-type, cookie, cookie-signature, debug, depd, encodeurl, escape-html, etag, finalhandler, fresh, http-errors, merge-descriptors, mime-types, on-finished, once, parseurl, proxy-addr, qs, range-parser, router, send, serve-static, statuses, type-is, vary, after, connect-redis, cookie-parser, cookie-session, ejs, eslint, express-session, hbs, marked, method-override, mocha, morgan, nyc, pbkdf2-password, supertest, vhost. Run npm install and check again. |
| **PASS** | Scripts reviewed for common Windows shell issues | No common Unix-only command patterns were detected. This does not prove every script will work on Windows. |

## Recommended Next Steps

1. Fix the FAIL findings before relying on the project.
2. Review each WARN finding and decide whether it applies.
3. Inspect test errors and verify dependencies and configuration where relevant.
4. Test in a clean Windows environment before claiming Windows compatibility.
