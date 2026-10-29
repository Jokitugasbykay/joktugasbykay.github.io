const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

async function audit() {
  const root = path.resolve(__dirname, '..');
  const semver = require(path.join(root, '.toolchain/package/node_modules/semver'));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json')));
  assert.equal(lock.lockfileVersion, 3);
  assert.equal(lock.name, manifest.name);
  assert.equal(lock.packages[''].name, manifest.name);
  for (const kind of ['dependencies', 'devDependencies']) {
    assert.deepEqual(lock.packages[''][kind], manifest[kind]);
    for (const [name, version] of Object.entries(manifest[kind])) {
      assert(/^\d+\.\d+\.\d+$/.test(version), `Non-exact stable direct dependency: ${name}`);
      assert.equal(lock.packages['node_modules/' + name].version, version);
    }
  }
  const packages = {};
  const lifecycle = [];
  const peers = [];
  const nativePackages = [];
  let checked = 0;
  const entries = Object.entries(lock.packages).filter(([location]) => location);
  // Limit registry metadata concurrency; npm's lockfile remains the resolver of record.
  for (let at = 0; at < entries.length; at += 6) await Promise.all(entries.slice(at, at + 6).map(async ([location, entry]) => {
    const name = location.split('node_modules/').at(-1);
    assert(/^\d+\.\d+\.\d+$/.test(entry.version), `Prerelease dependency: ${name}`);
    assert(entry.resolved?.startsWith('https://registry.npmjs.org/'), `Unapproved registry: ${name}`);
    assert(entry.integrity?.startsWith('sha512-'), `Missing SHA512 integrity: ${name}`);
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/${entry.version}`);
    assert.equal(response.status, 200, `Metadata unavailable: ${name}`);
    const metadata = await response.json();
    assert.equal(entry.integrity, metadata.dist.integrity, `Registry integrity mismatch: ${name}`);
    assert.equal(entry.resolved, metadata.dist.tarball, `Registry URL mismatch: ${name}`);
    assert(!metadata.deprecated, `Deprecated package: ${name}: ${metadata.deprecated}`);
    const platformMatches = (!metadata.os || metadata.os.includes(process.platform)) &&
      (!metadata.cpu || metadata.cpu.includes(process.arch));
    if (metadata.engines?.node && platformMatches)
      assert(semver.satisfies(process.version, metadata.engines.node), `Node engine mismatch: ${name}`);
    if (metadata.os || metadata.cpu) nativePackages.push({ name, version: entry.version,
      os: metadata.os, cpu: metadata.cpu, engines: metadata.engines, selectedPlatform: platformMatches });
    (packages[name] ??= []).push(entry.version);
    const scripts = Object.fromEntries(Object.entries(metadata.scripts || {}).filter(([key]) =>
      ['preinstall', 'install', 'postinstall', 'prepare'].includes(key)));
    if (Object.keys(scripts).length) lifecycle.push({ name, version: entry.version, scripts });
    if (metadata.peerDependencies) {
      for (const [peer, range] of Object.entries(metadata.peerDependencies)) {
        const found = lock.packages['node_modules/' + peer];
        if (!found) assert(metadata.peerDependenciesMeta?.[peer]?.optional, `Missing peer: ${name} -> ${peer}`);
        else assert(semver.satisfies(found.version, range), `Peer mismatch: ${name} -> ${peer}`);
      }
      peers.push({ name, version: entry.version, requirements: metadata.peerDependencies,
        optional: metadata.peerDependenciesMeta || {} });
    }
    checked++;
  }));
  const response = await fetch('https://registry.npmjs.org/-/npm/v1/security/advisories/bulk', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(packages)
  });
  assert.equal(response.status, 200, 'Advisory service unavailable');
  const findings = await response.json();
  assert.deepEqual(findings, {}, 'Dependency advisories returned; stop for review');
  const report = { auditedAt: new Date().toISOString(), checked, manifestConsistent: true,
    registryAndIntegrityConsistent: true, advisories: findings, lifecycle, peers, nativePackages,
    limitation: 'Metadata review, not lifecycle execution or proof of absence of undisclosed/bundled-code issues.' };
  fs.mkdirSync(path.join(root, '.verification'), { recursive: true });
  fs.writeFileSync(path.join(root, '.verification/dependency-audit.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
audit().catch(error => { console.error(error.message); process.exitCode = 1; });
