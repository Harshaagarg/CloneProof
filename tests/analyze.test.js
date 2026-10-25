import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import { explainFailure, runNpmScript } from '../src/run-check.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { analyzeProject, formatMarkdownReport } from '../src/analyze.js';

function makeProject({ packageJson, readme = '# Demo\n\nRun `npm test`.' , extraFiles = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cloneproof-test-'));
  if (packageJson !== undefined) fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(packageJson, null, 2));
  if (readme !== null) fs.writeFileSync(path.join(root, 'README.md'), readme);
  for (const [name, content] of Object.entries(extraFiles)) fs.writeFileSync(path.join(root, name), content);
  return root;
}

test('passes basic checks for a well-documented project', () => {
  const root = makeProject({
    packageJson: { name: 'demo', engines: { node: '>=22' }, scripts: { test: 'node --test', dev: 'node app.js' } },
    extraFiles: { 'package-lock.json': '{"name":"demo","lockfileVersion":3,"packages":{}}' }
  });
  const result = analyzeProject(root);
  assert.equal(result.summary.fail, 0);
  assert.ok(result.checks.some((item) => item.title === 'README npm commands match package.json' && item.status === 'PASS'));
  fs.rmSync(root, { recursive: true, force: true });
});

test('flags a README command whose script does not exist', () => {
  const root = makeProject({ packageJson: { name: 'demo', scripts: { test: 'node --test' } }, readme: '# Demo\n\nRun `npm run launch`.' });
  const result = analyzeProject(root);
  assert.ok(result.checks.some((item) => item.status === 'FAIL' && item.title === 'README npm commands match package.json'));
  fs.rmSync(root, { recursive: true, force: true });
});

test('warns about common Unix-only script syntax', () => {
  const root = makeProject({ packageJson: { name: 'demo', scripts: { clean: 'rm -rf dist' } }, readme: '# Demo' });
  const result = analyzeProject(root);
  assert.ok(result.checks.some((item) => item.status === 'WARN' && item.title.includes('Windows shell')));
  fs.rmSync(root, { recursive: true, force: true });
});

test('does not warn for a basic cross-platform Node.js command', () => {
  const root = makeProject({
    packageJson: {
      name: 'demo',
      scripts: {
        start: 'node app.js'
      }
    },
    readme: '# Demo'
  });

  const result = analyzeProject(root);

  const windowsCheck = result.checks.find(
    (item) => item.title.includes('Windows shell')
  );

  assert.ok(windowsCheck);
  assert.equal(windowsCheck.status, 'PASS');

  fs.rmSync(root, { recursive: true, force: true });
});

test('detects Unix delete command after || in a longer script', () => {
  const root = makeProject({
    packageJson: {
      name: 'demo',
      scripts: {
        clean: 'echo Preparing && echo Cleaning || rm -rf dist'
      }
    },
    readme: '# Demo'
  });
  const result = analyzeProject(root);

  const windowsCheck = result.checks.find(
    (item) => item.title.includes('Windows shell')
  );

  assert.ok(windowsCheck);
  assert.equal(windowsCheck.status, 'WARN');
  assert.match(windowsCheck.detail, /rm -rf/);

  fs.rmSync(root, { recursive: true, force: true });
});

test('detects Unix-only commands after ||', () => {

  const root = makeProject({
    packageJson: {
      name: 'demo',
      scripts: {
        clean: 'echo Cleaning || rm -rf dist'
      }
    },
    readme: '# Demo'
  });

  const result = analyzeProject(root);

  const windowsCheck = result.checks.find(
    (item) => item.title.includes('Windows shell')
  );

  assert.ok(windowsCheck);
  assert.equal(windowsCheck.status, 'WARN');
  assert.match(windowsCheck.detail, /rm -rf/);

  fs.rmSync(root, { recursive: true, force: true });
});

test('detects Unix delete command after a semicolon', () => {
  const root = makeProject({
    packageJson: {
      name: 'demo',
      scripts: {
        clean: 'echo Cleaning; rm -rf dist'
      }
    },
    readme: '# Demo'
  });

  const result = analyzeProject(root);

  const windowsCheck = result.checks.find(
    (item) => item.title.includes('Windows shell')
  );

  assert.ok(windowsCheck);
  assert.equal(windowsCheck.status, 'WARN');
  assert.match(windowsCheck.detail, /rm -rf/);

  fs.rmSync(root, { recursive: true, force: true });
});

test('warns about Unix-style environment variable assignments', () => {
  const root = makeProject({
    packageJson: {
      name: 'demo',
      scripts: {
        start: 'NODE_ENV=production node app.js'
      }
    },
    readme: '# Demo'
  });


  const result = analyzeProject(root);
  const windowsCheck = result.checks.find(
    (item) => item.title.includes('Windows shell')
  );

  assert.ok(windowsCheck);
  assert.equal(windowsCheck.status, 'WARN');
  assert.match(windowsCheck.detail, /environment variable/i);

  fs.rmSync(root, { recursive: true, force: true });
});

test('writes a useful Markdown report', () => {
  const root = makeProject({
    packageJson: {
      name: 'demo',
      scripts: { test: 'node --test' }
    }
  });

  const report = formatMarkdownReport(analyzeProject(root));

  assert.match(report, /CloneProof Setup Verification Report/);
  assert.match(report, /static checks only/i);
  assert.match(report, /Recommended Next Steps/);
  assert.match(report, /PASS/);
  assert.match(report, /WARN/);
  assert.match(report, /FAIL/);

  fs.rmSync(root, { recursive: true, force: true });
});



test('warns when a declared dependency is missing', () => {
  const root = makeProject({
    packageJson: {
      name: 'demo',
      dependencies: {
        'cloneproof-test-package': '1.0.0'
      }
    }
  });

  const result = analyzeProject(root);

  assert.ok(
    result.checks.some(
      (item) =>
        item.status === 'WARN' &&
        item.title === 'Declared dependencies are installed' &&
        item.detail?.includes('cloneproof-test-package')
    )
  );

  fs.rmSync(root, { recursive: true, force: true });
});
test('flags malformed package.json', () => {
  const root = makeProject({
    extraFiles: { 'package.json': '{ invalid json' }
  });

  const result = analyzeProject(root);

  assert.ok(
    result.checks.some(
      (item) =>
        item.status === 'FAIL' &&
        item.title === 'package.json is valid JSON'
    )
  );

  fs.rmSync(root, { recursive: true, force: true });
});
test('explains missing JavaScript modules', async () => {
  const { explainFailure } = await import('../src/run-check.js');

  const explanation = explainFailure(
    '',
    "Error: Cannot find module './missing-file.js'",
    'npm run test exited with code 1.'
  );

  assert.match(explanation, /module could not be found/i);
  assert.match(explanation, /import path is correct/i);
});
test('explains missing npm packages', async () => {
  const { explainFailure } = await import('../src/run-check.js');

  const explanation = explainFailure(
    '',
    "Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'express' imported from app.js",
    'npm run test exited with code 1.'
  );

  assert.match(explanation, /npm package could not be found/i);
  assert.match(explanation, /npm install/i);
});
test('explains JavaScript module format errors', () => {
  const explanation = explainFailure(
    '',
    'SyntaxError: Cannot use import statement outside a module',
    ''
  );

  assert.match(explanation, /module format mismatch/i);
  assert.match(explanation, /package\.json/i);
});
test('reports a clear error for a missing project path', () => {
  const missingPath = path.join(
    os.tmpdir(),
    'cloneproof-definitely-missing-project'
  );

  const result = spawnSync(
    process.execPath,
    ['src/cli.js', missingPath],
    {
      encoding: 'utf8',
      cwd: process.cwd()
    }
  );

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Project path does not exist or is not a directory/i
  );
});

test('handles an invalid scripts structure without crashing', () => {
  const root = makeProject({
    packageJson: {
      name: 'demo',
      scripts: 'hello',
      dependencies: {}
    }
  });

  const result = analyzeProject(root);

  assert.ok(result);
  assert.ok(Array.isArray(result.checks));
  assert.ok(result.checks.length > 0);

  fs.rmSync(root, { recursive: true, force: true });
});

test('warns when package metadata fields have invalid structures', () => {
  const root = makeProject({
    packageJson: {
      name: 'demo',
      scripts: 'hello',
      dependencies: 'not-an-object',
      devDependencies: [],
      engines: 'invalid'
    }
  });

  const result = analyzeProject(root);

  assert.ok(result);

assert.ok(
  result.checks.some(
    (item) =>
      item.status === 'WARN' &&
      item.title.includes('package.json metadata')
  ),
  'Expected a warning about invalid package.json metadata'
);

  fs.rmSync(root, { recursive: true, force: true });
});



test('warns when package script values are not strings', () => {
  const root = makeProject({
    packageJson: {
      name: 'demo',
      scripts: {
        test: 123,
        start: null
      }
    }
  });

  const result = analyzeProject(root);

  assert.ok(
    result.checks.some(
      (item) =>
        item.status === 'WARN' &&
        item.title === 'Package script values are valid' &&
        item.detail.includes('test, start')
    )
  );

  fs.rmSync(root, { recursive: true, force: true });
});


test('warns when dependency version values are not strings', () => {
  const projectPath = makeProject({
    packageJson: {
      name: 'test-project',
      version: '1.0.0',
      scripts: {
        test: 'node --test'
      },
      dependencies: {
        express: 123
      }
    }
  });

  const result = analyzeProject(projectPath);

  assert.ok(
    result.checks.some(
      (item) =>
        item.status === 'WARN' &&
        item.title === 'Dependency version values are valid' &&
        item.detail.includes('express')
    ),
    'Expected a warning for a non-string dependency version'
  );
});

test('warns when dependency version strings are empty', () => {
  const projectPath = makeProject({
    packageJson: {
      name: 'test-project',
      version: '1.0.0',
      scripts: {
        test: 'node --test'
      },
      dependencies: {
        express: ''
      }
    }
  });

  const result = analyzeProject(projectPath);

  assert.ok(
    result.checks.some(
      (item) =>
        item.status === 'WARN' &&
        item.title === 'Dependency version values are valid' &&
        item.detail.includes('express')
    ),
    'Expected a warning for an empty dependency version'
  );
});


test('does not execute project test scripts by default', () => {
  const projectPath = makeProject({
    packageJson: {
      name: 'safety-test-project',
      version: '1.0.0',
      scripts: {
        test: 'node -e "require(\'node:fs\').writeFileSync(\'execution-marker.txt\', \'ran\')"'
      }
    }
  });

  const reportPath = path.join(projectPath, 'cloneproof-report.md');
  const cliPath = path.resolve('src/cli.js');

  const result = spawnSync(
    process.execPath,
    [cliPath, projectPath, reportPath],
    {
      encoding: 'utf8',
      timeout: 10000
    }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /Static analysis only\. No project scripts were executed\./
  );
  assert.doesNotMatch(result.stdout, /--- Execution Check ---/);
  assert.equal(
    fs.existsSync(path.join(projectPath, 'execution-marker.txt')),
    false,
    'The project test script should not have run'
  );
});
test('reports when a test script exceeds its timeout', async () => {
  const projectPath = makeProject({
    packageJson: {
      name: 'timeout-test-project',
      version: '1.0.0',
      scripts: {
        test: 'node -e "setTimeout(() => {}, 5000)"'
      }
    }
  });
  const result = await runNpmScript(projectPath, 'test', 500);
  assert.equal(result.success, false);
  assert.match(result.message, /timed out/i);
});

test('Windows compatibility benchmark: known command patterns', async (t) => {
  const cases = [
    {
      name: 'detects rm -rf',
      command: 'rm -rf dist',
      expected: 'WARN'
    },
    {
      name: 'detects rm -rf after &&',
      command: 'echo Cleaning && rm -rf dist',
      expected: 'WARN'
    },
    {
      name: 'detects rm -rf after ||',
      command: 'echo Cleaning || rm -rf dist',
      expected: 'WARN'
    },
    {
      name: 'detects rm -rf after semicolon',
      command: 'echo Cleaning; rm -rf dist',
      expected: 'WARN'
    },
    {
      name: 'detects cp',
      command: 'cp source.txt destination.txt',
      expected: 'WARN'
    },
    {
      name: 'detects mv',
      command: 'mv source.txt destination.txt',
      expected: 'WARN'
    },
    {
      name: 'detects grep',
      command: 'grep error log.txt',
      expected: 'WARN'
    },
    {
      name: 'detects export syntax',
      command: 'export NODE_ENV=production',
      expected: 'WARN'
    },
    {
      name: 'detects inline NODE_ENV assignment',
      command: 'NODE_ENV=production node app.js',
      expected: 'WARN'
    },
    {
      name: 'detects cp after semicolon',
      command: 'echo Starting; cp source.txt destination.txt',
      expected: 'WARN'
    },
    {
      name: 'detects grep after ||',
      command: 'echo Starting || grep error log.txt',
      expected: 'WARN'
    },
    {
      name: 'detects export after semicolon',
      command: 'echo Starting; export NODE_ENV=production',
      expected: 'WARN'
    },

    {
      name: 'allows a basic Node.js command',
      command: 'node app.js',
      expected: 'PASS'
    },
    {
      name: 'allows npm test',
      command: 'npm test',
      expected: 'PASS'
    },
    {
      name: 'allows a Node command after &&',
      command: 'echo Starting && node app.js',
      expected: 'PASS'
    },

    {
      name: 'allows a Windows environment variable command',
      command: 'set NODE_ENV=production && node app.js',
      expected: 'PASS'
    },
    {
      name: 'detects chmod after &&',
      command: 'echo Preparing && chmod +x setup.sh',
      expected: 'WARN'
    },
    {
      name: 'detects touch after a semicolon',
      command: 'echo Preparing; touch output.txt',
      expected: 'WARN'
    },
    {
      name: 'allows a PowerShell-style environment variable',
      command: '$env:NODE_ENV="production"; node app.js',
      expected: 'PASS'
    },

    {
      name: 'allows a Windows copy command',
      command: 'copy source.txt destination.txt',
      expected: 'PASS'
    },
    {
      name: 'detects sed after &&',
      command: 'echo Preparing && sed -n "1p" file.txt',
      expected: 'WARN'
    },
    {
      name: 'detects awk after a semicolon',
      command: 'echo Preparing; awk "{print $1}" file.txt',
      expected: 'WARN'
    },
    {
      name: 'allows a Windows directory listing',
      command: 'dir',
      expected: 'PASS'
    },
    {
      name: 'allows a Windows directory creation command',
      command: 'mkdir output',
      expected: 'PASS'
    }

      ];
        for (const item of cases) {
    await t.test(item.name, () => {
      const root = makeProject({
        packageJson: {
          name: 'benchmark-demo',
          scripts: { check: item.command }
        },
        readme: '# Benchmark Demo'
      });

      try {
        const result = analyzeProject(root);
        const check = result.checks.find(
          (entry) => entry.title === 'Scripts reviewed for common Windows shell issues'
        );

        assert.ok(check, 'Windows shell check should exist');
        assert.equal(check.status, item.expected);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  }
});
