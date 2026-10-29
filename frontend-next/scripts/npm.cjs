const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const binary = path.join(root, '.toolchain/node.exe');
const cli = path.join(root, '.toolchain/package/bin/npm-cli.js');
if (!fs.existsSync(binary) || !fs.existsSync(cli)) throw new Error('Run provision-toolchain.cjs first');
const env = { ...process.env, PATH: path.dirname(binary) + path.delimiter + process.env.PATH,
  npm_config_cache: path.join(root, '.toolchain/cache'), NEXT_TELEMETRY_DISABLED: '1' };
if (cp.execFileSync(binary, ['--version'], { encoding: 'utf8' }).trim() !== 'v26.13.0') throw new Error('Wrong isolated Node');
const result = cp.spawnSync(binary, [cli, ...process.argv.slice(2)], { cwd: root, env, stdio: 'inherit', windowsHide: true });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
