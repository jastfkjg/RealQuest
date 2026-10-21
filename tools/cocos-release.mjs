import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {verifyBuild, buildPayload} from './cocos-build-info.mjs';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const idFor = build => digest(JSON.stringify({delivery: 1, source: build.sourceFingerprint, payload: build.payloadFingerprint}));
const idPattern = /^[0-9a-f]{64}$/;
const artifactCore = manifest => ({schema_version: manifest.schema_version, kind: manifest.kind,
  active: manifest.active, releases: manifest.releases, baseImage: manifest.baseImage, records: manifest.records});

async function recordsAt(directory, prefix = '') {
  const records = [];
  for (const entry of (await fs.readdir(directory, {withFileTypes: true})).sort((a,b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    const relative = prefix + entry.name, file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw Error('Release files must not contain symlinks: ' + relative);
    if (entry.isDirectory()) records.push(...await recordsAt(file, relative + '/'));
    else if (entry.isFile() && relative !== 'release-manifest.json') {
      const bytes = await fs.readFile(file);
      records.push({path: relative, bytes: bytes.length, sha256: digest(bytes)});
    }
  }
  return records;
}

async function outputPath(directory) {
  const resolved = path.resolve(root, directory);
  if (!resolved.startsWith(path.join(root, 'output') + path.sep)) throw Error('Release artifacts must be inside repository output.');
  let parent = path.dirname(resolved);
  while (true) {
    try { if (await fs.realpath(parent) !== parent) throw Error('Release artifact ancestors must not be symlinks.'); break; }
    catch (error) { if (error.code !== 'ENOENT') throw error; parent = path.dirname(parent); }
  }
  return resolved;
}

export async function verifyRelease(directory) {
  const target = await outputPath(directory);
  if (await fs.realpath(target) !== target) throw Error('Release artifacts must not be symlinks.');
  const manifest = JSON.parse(await fs.readFile(path.join(target, 'release-manifest.json'), 'utf8'));
  if (manifest.schema_version !== 2 || manifest.kind !== 'cocos-static-release' || !idPattern.test(manifest.active)) throw Error('Invalid release manifest.');
  if (!Array.isArray(manifest.releases) || !manifest.releases.length || new Set(manifest.releases.map(r => r.id)).size !== manifest.releases.length) throw Error('Invalid release history.');
  const records = await recordsAt(target);
  if (digest(JSON.stringify(artifactCore(manifest))) !== manifest.artifactSHA256 || JSON.stringify(records) !== JSON.stringify(manifest.records)) throw Error('Release artifact changed or is incomplete.');
  if (!manifest.releases.some(r => r.id === manifest.active)) throw Error('Active release is absent.');
  const versions = await fs.readdir(path.join(target, 'html/releases'));
  if (JSON.stringify(versions.sort()) !== JSON.stringify(manifest.releases.map(r => r.id).sort())) throw Error('Retained release directory/history mismatch.');
  const template = await fs.readFile(path.join(target, 'nginx.conf.template'), 'utf8');
  if (await renderNginx({active: manifest.active, directory: '/usr/share/nginx/html', template}) !== await fs.readFile(path.join(target, 'nginx.conf'), 'utf8')) throw Error('Packaged Nginx configuration differs from its recorded template.');
  for (const release of manifest.releases) {
    if (!idPattern.test(release.id) || idFor(release.build) !== release.id || release.build.identity.debug !== false || release.build.identity.sourceMaps !== false || release.build.identity.md5Cache !== true) throw Error('Invalid production release identity.');
    const publicInfo = JSON.parse(await fs.readFile(path.join(target, 'html/releases', release.id, 'release.json'), 'utf8'));
    if (publicInfo.id !== release.id || publicInfo.source !== release.build.sourceFingerprint || publicInfo.payload !== release.build.payloadFingerprint) throw Error('Release path/metadata identity mismatch.');
  }
  return {directory: target, ...manifest};
}

export async function renderNginx({active, directory, port = 80, upstream = 'backend:8000', loopback = false, template}) {
  if (!idPattern.test(active)) throw Error('Invalid active release ID.');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Invalid Nginx port.');
  if (!/^[a-zA-Z0-9.-]+:[1-9][0-9]{0,4}$/.test(upstream) || Number(upstream.split(':')[1]) > 65535) throw Error('Invalid API upstream.');
  if (!path.isAbsolute(directory) || /[$"\r\n;{}\\]/.test(directory)) throw Error('Unsafe Nginx document root.');
  template ??= await fs.readFile(path.join(root, 'deploy/cocos/nginx.conf.template'), 'utf8');
  const values = {ACTIVE: active, ROOT: directory, LISTEN: (loopback ? '127.0.0.1:' : '') + port, UPSTREAM: upstream};
  return template.replace(/@([A-Z]+)@/g, (_, key) => {
    if (!(key in values)) throw Error('Unknown Nginx template value.');
    return values[key];
  });
}

export async function packageRelease({build: selected, output, previous}) {
  const build = await verifyBuild(path.resolve(root, 'clients/cocos', selected));
  if (build.identity.debug !== false || build.identity.sourceMaps !== false || build.identity.md5Cache !== true) throw Error('Packaging requires an actual release build (debug:false/sourceMaps:false/md5Cache:true).');
  const directory = await outputPath(output);
  try { await fs.access(directory); throw Error('Refusing to overwrite an existing release artifact.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const old = previous ? await verifyRelease(previous) : null;
  const payload = await buildPayload(build.directory);
  for (const record of payload.records) {
    if (/\.(?:map|ts|tsx|db|sqlite|pem|key|zip)$|(?:^|\/)\.env(?:\.|$)/i.test(record.path)) throw Error('Unexpected source/private/archive file in production package: ' + record.path);
    if (/\.js$/i.test(record.path) && /\/\/[#@]\s*sourceMappingURL\s*=/.test(await fs.readFile(path.join(build.directory, record.path), 'utf8'))) throw Error('Production JavaScript contains a source map reference.');
  }
  const id = idFor(build), version = {id, build: {sourceFingerprint: build.sourceFingerprint, payloadFingerprint: build.payloadFingerprint, identity: build.identity}};
  const releases = [...(old?.releases || []).filter(r => r.id !== id), version];
  await fs.mkdir(path.dirname(directory), {recursive: true});
  await fs.mkdir(directory);
  let completed = false;
  try {
    await fs.mkdir(path.join(directory, 'html/releases'), {recursive: true});
    if (old) for (const release of old.releases) {
      if (release.id !== id) await fs.cp(path.join(old.directory, 'html/releases', release.id), path.join(directory, 'html/releases', release.id), {recursive: true, errorOnExist: true, force: false});
    }
    const target = path.join(directory, 'html/releases', id);
    await fs.mkdir(target);
    for (const record of payload.records) {
      const file = path.join(target, record.path);
      await fs.mkdir(path.dirname(file), {recursive: true});
      await fs.copyFile(path.join(build.directory, record.path), file, fs.constants.COPYFILE_EXCL);
      if (digest(await fs.readFile(file)) !== record.sha256) throw Error('Build changed while packaging.');
    }
    await fs.writeFile(path.join(target, 'release.json'), JSON.stringify({schema_version: 1, id, source: build.sourceFingerprint, payload: build.payloadFingerprint, engine: build.identity.engine}) + '\n', {flag: 'wx'});
    await fs.writeFile(path.join(directory, 'nginx.conf'), await renderNginx({active: id, directory: '/usr/share/nginx/html'}), {flag: 'wx'});
    await fs.copyFile(path.join(root, 'deploy/cocos/nginx.conf.template'), path.join(directory, 'nginx.conf.template'), fs.constants.COPYFILE_EXCL);
    const base = JSON.parse(await fs.readFile(path.join(root, 'deploy/cocos/base-image.json'), 'utf8'));
    if (!/^nginx@sha256:[0-9a-f]{64}$/.test(base.image)) throw Error('Expected a pinned official Nginx base.');
    const docker = (await fs.readFile(path.join(root, 'deploy/cocos/Dockerfile.template'), 'utf8')).replace('@BASE_IMAGE@', base.image);
    await fs.writeFile(path.join(directory, 'Dockerfile'), docker, {flag: 'wx'});
    await fs.writeFile(path.join(directory, '.dockerignore'), '*\n!Dockerfile\n!nginx.conf\n!html/\n!html/**\n', {flag: 'wx'});
    const records = await recordsAt(directory);
    const manifest = {schema_version: 2, kind: 'cocos-static-release', active: id, releases, baseImage: base, records};
    manifest.artifactSHA256 = digest(JSON.stringify(artifactCore(manifest)));
    await fs.writeFile(path.join(directory, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', {flag: 'wx'});
    await verifyBuild(build.directory);
    await verifyRelease(directory);
    completed = true;
    return {directory, active: id, releases: releases.length, artifactSHA256: manifest.artifactSHA256};
  } finally {
    // Only a new directory allocated by this invocation can be removed.
    if (!completed) await fs.rm(directory, {recursive: true, force: true});
  }
}

async function main() {
  if (Number(process.versions.node.split('.')[0]) !== 22) throw Error('Use Node22 (see .nvmrc).');
  const options = {};
  for (let i = 2; i < process.argv.length; i++) {
    const key = process.argv[i];
    if (!['--build', '--output', '--previous', '--verify'].includes(key) || !process.argv[i + 1] || options[key.slice(2)]) throw Error('Usage: cocos:package -- --build <release>/web-desktop --output output/<new-artifact> [--previous output/<old-artifact>] | --verify output/<artifact>');
    options[key.slice(2)] = process.argv[++i];
  }
  if (options.verify) {
    if (Object.keys(options).length !== 1) throw Error('--verify cannot be combined with packaging.');
    const result = await verifyRelease(options.verify);
    console.log(JSON.stringify({directory: result.directory, active: result.active, releases: result.releases.length, artifactSHA256: result.artifactSHA256}));
  } else {
    if (!options.build || !options.output) throw Error('--build and --output are required.');
    console.log(JSON.stringify(await packageRelease(options)));
  }
}
if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) await main();
