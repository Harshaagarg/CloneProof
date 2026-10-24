import fs from 'node:fs';
import path from 'node:path';

const LOCKFILES = [
  { file: 'package-lock.json', manager: 'npm' },
  { file: 'npm-shrinkwrap.json', manager: 'npm' },
  { file: 'yarn.lock', manager: 'yarn' },
  { file: 'pnpm-lock.yaml', manager: 'pnpm' },
  { file: 'bun.lock', manager: 'bun' },
  { file: 'bun.lockb', manager: 'bun' }
];

function check(status, title, detail) {
  return { status, title, detail };
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function hasNodeVersionDeclaration(root, pkg) {
  return Boolean(
    (typeof pkg?.engines?.node === 'string' && pkg.engines.node.trim()) ||
    fs.existsSync(path.join(root, '.nvmrc')) ||
    fs.existsSync(path.join(root, '.node-version'))
  );
}

function findDocumentedNpmScripts(readmeText) {
  const found = new Set();
  const runScriptPattern = /\bnpm\s+run\s+([a-zA-Z0-9:_-]+)/g;
  const directScriptPattern = /\bnpm\s+(test|start|stop|restart)\b/g;
  let match;

  while ((match = runScriptPattern.exec(readmeText)) !== null) {
    found.add(match[1]);
  }
  while ((match = directScriptPattern.exec(readmeText)) !== null) {
    found.add(match[1]);
  }
  return [...found];
}

function findPotentialWindowsScriptIssues(scripts = {}) {
  const issues = [];
  const patterns = [
    { regex: /(^|&&\s*)rm\s+-rf\b/i, why: '`rm -rf` is a Unix-style delete command.' },
    { regex: /(^|&&\s*)(?:cp|mv)\s+/i, why: '`cp` or `mv` may not be available as written in Windows PowerShell.' },
    { regex: /(^|&&\s*)(?:grep|sed|awk|chmod|touch)\b/i, why: 'A Unix utility may not be available in Windows PowerShell.' },
    { regex: /(^|&&\s*)export\s+[A-Za-z_][A-Za-z0-9_]*=/i, why: '`export NAME=value` is Unix shell syntax.' },
    { regex: /(^|\s)(?:NODE_ENV|PORT|CI|DEBUG)=[^\s;&]+\s+(?:node|npm|npx|vite|next|webpack|jest|vitest)\b/i, why: 'Setting an environment variable before a command this way is Unix shell syntax.' }
  ];

  for (const [name, command] of Object.entries(scripts)) {
    if (typeof command !== 'string') continue;
    for (const { regex, why } of patterns) {
      if (regex.test(command)) {
        issues.push(`Script "${name}": ${why} Command: ${command}`);
        break;
      }
    }
  }
  return issues;
}

/**
 * Static checks only: this function reads project files and does not execute them.
 */
export function analyzeProject(projectPath) {
  const root = path.resolve(projectPath);
  const checks = [];

  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    return {
      root,
      projectName: path.basename(root),
      checks: [check('FAIL', 'Project folder exists', `Folder not found: ${root}`)],
      summary: { pass: 0, warn: 0, fail: 1 }
    };
  }

  const packagePath = path.join(root, 'package.json');
  const packageText = readText(packagePath);
  let pkg = null;

  if (packageText === null) {
    checks.push(check('FAIL', 'package.json exists', 'No package.json was found. This starter currently checks JavaScript/Node.js projects.'));
  } else {
    try {
      pkg = JSON.parse(packageText);
      if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) {
        checks.push(check('FAIL', 'package.json is valid JSON', 'The file must contain a JSON object.'));
        pkg = null;
      } else {
        checks.push(check('PASS', 'package.json exists and is valid', 'The file was found and parsed successfully.'));
      }
    } catch (error) {
      checks.push(check('FAIL', 'package.json is valid JSON', `Could not parse package.json: ${error.message}`));
    }
  }

  const readmePath = path.join(root, 'README.md');
  const readmeText = readText(readmePath);
  if (readmeText === null) {
    checks.push(check('WARN', 'README.md exists', 'No README.md was found. Add setup steps so another developer knows how to install and run the project.'));
  } else if (readmeText.trim().length === 0) {
    checks.push(check('WARN', 'README.md contains instructions', 'README.md is empty. Add prerequisites, installation steps, and run/test commands.'));
  } else {
    checks.push(check('PASS', 'README.md exists', 'A non-empty README.md was found. This first version does not judge whether every sentence is correct.'));
  }

  if (!pkg) {
    checks.push(check('WARN', 'Remaining checks skipped', 'Fix package.json first; script and dependency checks need a valid package file.'));
    return finish(root, path.basename(root), checks);
  }
  
  // Check whether common package.json fields have valid structures.
  const invalidMetadataFields = [];

  for (const field of ['scripts', 'dependencies', 'devDependencies', 'optionalDependencies']) {
    if (
      pkg[field] !== undefined &&
      (
        pkg[field] === null ||
        typeof pkg[field] !== 'object' ||
        Array.isArray(pkg[field])
      )
    ) {
      invalidMetadataFields.push(field);
    }
  }

  if (
    pkg.engines !== undefined &&
    (
      pkg.engines === null ||
      typeof pkg.engines !== 'object' ||
      Array.isArray(pkg.engines)
    )
  ) {
    invalidMetadataFields.push('engines');
  }

  
  if (invalidMetadataFields.length > 0) {
    checks.push(
      check(
        'WARN',
        'package.json metadata structures',
        `These fields should contain JSON objects: ${invalidMetadataFields.join(', ')}. Correct their structures to improve setup verification accuracy.`
      )
    );
  }
  
  // Check whether dependency version values are strings.
  const dependencyFields = [
    'dependencies',
    'devDependencies',
    'optionalDependencies'
  ];

  const invalidDependencyVersions = [];

  for (const field of dependencyFields) {
    const dependencies = pkg[field];

    if (
      dependencies &&
      typeof dependencies === 'object' &&
      !Array.isArray(dependencies)
    ) {
      for (const [name, version] of Object.entries(dependencies)) {
        if (typeof version !== 'string') {
          invalidDependencyVersions.push(`${name} (${field})`);
        }
      }
    }
  }

  if (invalidDependencyVersions.length > 0) {
    checks.push(
      check(
        'WARN',
        'Dependency version values are valid',
        `These dependencies must have string version values: ${invalidDependencyVersions.join(', ')}.`
      )
    );
  }


  // Check that every package script is a string command.
  if (
    pkg.scripts &&
    typeof pkg.scripts === 'object' &&
    !Array.isArray(pkg.scripts)
  ) {
    const invalidScripts = Object.entries(pkg.scripts)
      .filter(([, command]) => typeof command !== 'string')
      .map(([name]) => name);

    if (invalidScripts.length > 0) {
      checks.push(
        check(
          'WARN',
          'Package script values are valid',
          `These script entries must contain string commands: ${invalidScripts.join(', ')}.`
        )
      );
    }
  }

  const scripts = pkg.scripts && typeof pkg.scripts === 'object' ? pkg.scripts : {};
  if (Object.keys(scripts).length === 0) {
    checks.push(check('WARN', 'Package scripts are defined', 'No scripts were found in package.json. If this project has run/test steps, define them under "scripts".'));
  } else {
    checks.push(check('PASS', 'Package scripts are defined', `Found scripts: ${Object.keys(scripts).join(', ')}.`));
  }

  if (readmeText !== null && readmeText.trim().length > 0) {
    const documentedScripts = findDocumentedNpmScripts(readmeText);
    const missingScripts = documentedScripts.filter((name) => typeof scripts[name] !== 'string');
    if (missingScripts.length > 0) {
      checks.push(check('FAIL', 'README npm commands match package.json', `README.md mentions script(s) not defined in package.json: ${missingScripts.map((s) => `npm run ${s}`).join(', ')}. Update the instructions or add the missing script(s).`));
    } else if (documentedScripts.length > 0) {
      checks.push(check('PASS', 'README npm commands match package.json', `Checked documented script(s): ${documentedScripts.map((s) => `npm run ${s}`).join(', ')}.`));
    } else {
      checks.push(check('WARN', 'README contains runnable npm commands', 'No familiar npm run/test/start commands were detected. Add clear copy-pasteable setup and test commands.'));
    }
  } else {
    checks.push(check('WARN', 'README npm commands match package.json', 'Skipped because README.md is missing or empty.'));
  }

  const hasNodeVersion = hasNodeVersionDeclaration(root, pkg);
  checks.push(hasNodeVersion
    ? check('PASS', 'Node.js version is documented', `Found a version declaration${pkg.engines?.node ? `: ${pkg.engines.node}` : ' in .nvmrc or .node-version'}.`)
    : check('WARN', 'Node.js version is documented', 'No engines.node, .nvmrc, or .node-version was found. State which Node.js versions are supported.'));

  const presentLockfiles = LOCKFILES.filter(({ file }) => fs.existsSync(path.join(root, file)));
  const dependencyCount = Object.keys(pkg.dependencies ?? {}).length + Object.keys(pkg.devDependencies ?? {}).length;
  const declaredManager = typeof pkg.packageManager === 'string' ? pkg.packageManager.split('@')[0] : null;
  if (presentLockfiles.length > 1) {
    checks.push(check('WARN', 'Package manager and lockfile are consistent', `Found multiple lockfiles: ${presentLockfiles.map((f) => f.file).join(', ')}. Keep only the lockfile for the package manager your team uses.`));
  } else if (presentLockfiles.length === 1 && declaredManager && presentLockfiles[0].manager !== declaredManager) {
    checks.push(check('FAIL', 'Package manager and lockfile are consistent', `package.json declares "${declaredManager}", but the lockfile belongs to "${presentLockfiles[0].manager}". Align them.`));
  } else if (presentLockfiles.length === 1) {
    checks.push(check('PASS', 'Package manager and lockfile are consistent', `Found ${presentLockfiles[0].file}${declaredManager ? ` and packageManager=${declaredManager}` : ''}.`));
  } else if (dependencyCount > 0) {
    checks.push(check('WARN', 'Dependency lockfile exists', `Found ${dependencyCount} direct dependency declaration(s) but no common lockfile. A committed lockfile helps make clean installs repeatable.`));
  } else {
    checks.push(check('PASS', 'Dependency lockfile check', 'No dependencies are declared and no lockfile is required for this simple project.'));
  }
  

  // Check whether declared dependencies are installed.
  const declaredDependencies = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.optionalDependencies
  };

  const missingDependencies = Object.keys(declaredDependencies).filter(
    (name) => !fs.existsSync(path.join(root, 'node_modules', name))
  );

  if (Object.keys(declaredDependencies).length === 0) {
    checks.push(
      check(
        'PASS',
        'Declared dependencies are installed',
        'No direct dependencies are declared in package.json.'
      )
    );
  } else if (missingDependencies.length > 0) {
    checks.push(
      check(
        'WARN',
        'Declared dependencies are installed',
        `Could not find these declared packages in node_modules: ${missingDependencies.join(', ')}. Run npm install and check again.`
      )
    );
  } else {
    checks.push(
      check(
        'PASS',
        'Declared dependencies are installed',
        `Found all ${Object.keys(declaredDependencies).length} declared dependencies in node_modules.`
      )
    );
  }

  
  const windowsIssues = findPotentialWindowsScriptIssues(scripts);
  checks.push(windowsIssues.length > 0
    ? check('WARN', 'Scripts reviewed for common Windows shell issues', `${windowsIssues.join(' ')} These are heuristics; review the command before changing it.`)
    : check('PASS', 'Scripts reviewed for common Windows shell issues', 'No common Unix-only command patterns were detected. This does not prove every script will work on Windows.'));

  return finish(root, pkg.name || path.basename(root), checks);
}

function finish(root, projectName, checks) {
  const summary = {
    pass: checks.filter((item) => item.status === 'PASS').length,
    warn: checks.filter((item) => item.status === 'WARN').length,
    fail: checks.filter((item) => item.status === 'FAIL').length
  };
  return { root, projectName, checks, summary };
}

export function formatMarkdownReport(result) {
  const lines = [
    `# CloneProof Setup Verification Report`,
    '',
    `- **Project folder:** \`${result.root}\``,
    `- **Generated:** ${new Date().toISOString()}`,
    `- **Summary:** ${result.summary.pass} PASS · ${result.summary.warn} WARN · ${result.summary.fail} FAIL`,
    '',
    '> CloneProof v0.1 performs static checks only. It does not install packages or execute project code. A PASS is not proof that the entire project works on every Windows machine.',
    '',
    '| Status | Check | Finding |',
    '|---|---|---|'
  ];

  for (const item of result.checks) {
    const detail = item.detail.replaceAll('|', '\\|').replaceAll('\n', ' ');
    lines.push(`| **${item.status}** | ${item.title.replaceAll('|', '\\|')} | ${detail} |`);
  }
  
const executionCheck = result.checks.find(
  (item) => item.title === 'Test script executes successfully'
);
if (
  executionCheck &&
  executionCheck.status === 'FAIL' &&
  executionCheck.explanation
) {
  lines.push(
    '',
    '## Execution Explanation',
    '',
    executionCheck.explanation,
    ''
  );
}


  
  lines.push(
  '',
  '## Recommended Next Steps',
  '',
  '- Fix every **FAIL** item before relying on the project.',
  '- Review each **WARN** item and decide whether it applies.',
  '- If tests fail, inspect the error output and verify dependencies and configuration.',
  '- Test the project on a clean Windows environment before claiming Windows compatibility.',
  '- Even if all checks pass, verify the application manually; these checks cannot guarantee the entire project works.',
  ''
);

return lines.join('\n');
}



 
