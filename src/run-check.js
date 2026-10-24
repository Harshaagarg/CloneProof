
import { spawn } from 'node:child_process';

/**
 * Runs a specifically selected npm script with a timeout.
 * Only use this on a project you trust: project scripts can run arbitrary code.
 */


export function explainFailure(stdout, stderr, message) {
  const output = `${stderr}\n${stdout}\n${message}`.toLowerCase();

     if (
    output.includes('cannot find module') ||
    output.includes('module_not_found') ||
    output.includes('err_module_not_found')
  ) {
    if (
      output.includes('cannot find package') ||
      output.includes("can't find package")
    ) {
      return 'An npm package could not be found. Run npm install in the project folder, then check that the package is listed in package.json.';
    }

    return 'A JavaScript module could not be found. Check whether the referenced file exists and whether the import path is correct. If the missing module is an npm package, run npm install.';
  }

  if (
    output.includes('enoent') ||
    output.includes('no such file or directory')
  ) {
    return 'A required file or directory may be missing. Check the project path and the file paths referenced by the script.';
  }
  if (
    output.includes('eacces') ||
    output.includes('eperm') ||
    output.includes('permission denied')
  ) {
    return 'A file or directory may be inaccessible because of permissions. Check access rights and whether another process is locking the file.';
  }

  if (
    output.includes('eaddrinuse') ||
    output.includes('address already in use')
  ) {
    return 'The required port may already be occupied. Check whether another process is using that port.';
  }

  if (
    output.includes('missing script') ||
    output.includes('not found: test')
  ) {
    return 'The requested npm script may be missing. Check the scripts section of package.json.';
  }
    if (
    output.includes('cannot use import statement outside a module') ||
    output.includes('require() of es module') ||
    output.includes('err_require_esm')
  ) {
    return 'A JavaScript module format mismatch may have occurred. Check whether the project uses ES modules or CommonJS, and use a compatible import or require statement. For ES modules, check the package.json "type" field or use the .mjs extension.';
  }

  

  if (
    output.includes('assertionerror') ||
    output.includes('assertion error') ||
    output.includes('expected values to be strictly equal') ||
    output.includes('test failed')
  ) {
    return 'A test may have failed because its actual result did not match the expected result. Review the assertion and test output.';
  }

  if (message.toLowerCase().includes('timed out')) {
    return 'The test command exceeded its time limit. Check for a hanging process or a test that takes too long.';
  }

  return 'The command failed, but CloneProof could not identify a specific cause. Review the error output and project configuration.';
}


export function runNpmScript(projectPath, scriptName = 'test', timeoutMs = 15000) {
  return new Promise((resolve) => {
    if (!['test'].includes(scriptName)) {
      resolve({
        success: false,
        message: `Script "${scriptName}" is not allowed by this first version.`
      });
      return;
    }

    const child = spawn(
  process.env.ComSpec || 'cmd.exe',
  ['/d', '/s', '/c', `npm.cmd run ${scriptName}`],
  {
    cwd: projectPath,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  }
);

    let stdout = '';
    let stderr = '';
    let finished = false;

    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill();
      resolve({
        success: false,
        message: `The script timed out after ${timeoutMs} ms.`,
        stdout,
        stderr
      });
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });

    child.on('error', (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({
        success: false,
        message: `Could not start the script: ${error.message}`,
        stdout,
        stderr
      });
    });

    
child.on('close', (code) => {
  if (finished) return;
  finished = true;
  clearTimeout(timer);

  const success = code === 0;
  const message = success
    ? `npm run ${scriptName} completed successfully.`
    : `npm run ${scriptName} exited with code ${code}.`;

  resolve({
    success,
    message,
    explanation: success
      ? 'The test command completed successfully. This does not guarantee the entire project works.'
      : explainFailure(stdout, stderr, message),
            stdout,
    stderr
  });
});
  });
}
