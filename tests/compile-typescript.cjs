const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');

module.exports = function compileTypeScript(source) {
  let compiler;
  try {
    compiler = path.join(path.dirname(require.resolve('typescript/package.json', { paths: [__dirname, path.join(__dirname, '../frontend-next')] })), 'bin', 'tsc');
  } catch (cause) {
    throw new Error('Test harness requires the local TypeScript compiler; install root dependencies with npm ci.', {cause});
  }
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'jokiin-ts-test-'));
  try {
    const input = path.join(directory, 'input.ts');
    const output = path.join(directory, 'output');
    fs.writeFileSync(input, source);
    const result = childProcess.spawnSync(process.execPath, [compiler, '--ignoreConfig', '--noCheck', '--noEmitOnError',
      '--target', 'ES2022', '--module', 'ES2022', '--moduleDetection', 'legacy', '--outDir', output, input],
    {cwd:directory, encoding:'utf8', windowsHide:true, timeout:30000});
    if (result.error || result.status !== 0) {
      throw new Error(`TypeScript test compilation failed (exit ${result.status}, signal ${result.signal || 'none'}): ${result.error?.message || result.stderr || result.stdout || 'no diagnostics'}`);
    }
    const emitted = path.join(output, 'input.js');
    if (!fs.existsSync(emitted)) throw new Error('TypeScript test compiler produced no JavaScript output.');
    const javascript = fs.readFileSync(emitted, 'utf8');
    if (!javascript.trim()) throw new Error('TypeScript test compiler produced blank JavaScript output.');
    return javascript;
  } finally {
    fs.rmSync(directory, {recursive:true, force:true});
  }
};
