const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const directory = path.join(root, '.toolchain');
async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(180000) });
  assert.equal(response.status, 200, `Download failed: ${url}`);
  return response;
}
async function main() {
  assert.equal(process.platform, 'win32', 'This isolated bootstrap targets Windows x64');
  assert.equal(process.arch, 'x64');
  assert(!fs.existsSync(directory), 'Toolchain exists; inspect it instead of overwriting');
  const version = '26.13.0';
  const nodeUrl = `https://nodejs.org/dist/v${version}/win-x64/node.exe`;
  const sums = await (await get(`https://nodejs.org/dist/v${version}/SHASUMS256.txt`)).text();
  const expected = sums.split(/\r?\n/).find(line => line.endsWith('  win-x64/node.exe'))?.split(/\s+/)[0];
  assert(expected, 'Node SHA256 missing from official HTTPS checksum manifest');
  const node = Buffer.from(await (await get(nodeUrl)).arrayBuffer());
  assert.equal(crypto.createHash('sha256').update(node).digest('hex'), expected);
  const metadata = await (await get('https://registry.npmjs.org/npm/12.2.1')).json();
  assert.equal(metadata.version, '12.2.1');
  const archive = Buffer.from(await (await get(metadata.dist.tarball)).arrayBuffer());
  const integrity = 'sha512-' + crypto.createHash('sha512').update(archive).digest('base64');
  assert.equal(integrity, metadata.dist.integrity);
  const keys = (await (await get('https://registry.npmjs.org/-/npm/v1/keys')).json()).keys;
  const verified = metadata.dist.signatures.some(signature => {
    const key = keys.find(key => key.keyid === signature.keyid);
    return key && crypto.verify('sha256', Buffer.from(`npm@12.2.1:${integrity}`),
      { key: Buffer.from(key.key, 'base64'), format: 'der', type: 'spki' }, Buffer.from(signature.sig, 'base64'));
  });
  assert(verified, 'npm registry signature verification failed');
  fs.mkdirSync(directory);
  fs.writeFileSync(path.join(directory, 'node.exe'), node, { flag: 'wx' });
  const tgz = path.join(directory, 'npm.tgz');
  fs.writeFileSync(tgz, archive, { flag: 'wx' });
  const entries = cp.execFileSync('tar.exe', ['-tzf', tgz], { encoding: 'utf8' }).trim().split(/\r?\n/);
  assert(entries.every(name => name.startsWith('package/') && !name.split('/').includes('..')));
  cp.execFileSync('tar.exe', ['-xzf', tgz, '-C', directory], { stdio: 'inherit' });
  const nodePath = path.join(directory, 'node.exe');
  const npmPath = path.join(directory, 'package/bin/npm-cli.js');
  assert.equal(cp.execFileSync(nodePath, ['--version'], { encoding: 'utf8' }).trim(), 'v26.13.0');
  assert.equal(cp.execFileSync(nodePath, [npmPath, '--version'], { encoding: 'utf8' }).trim(), '12.2.1');
  const receipt = { node: version, npm: '12.2.1', nodeUrl, nodeSha256: expected,
    nodeChecksumVerification: 'official HTTPS SHASUMS256.txt; PGP signature not independently verified',
    npmUrl: metadata.dist.tarball, npmIntegrity: integrity, npmRegistrySignatureVerified: true };
  fs.writeFileSync(path.join(directory, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(receipt, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
