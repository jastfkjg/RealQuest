import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runOwned} from './cocos-child.mjs';
import {verifyBuild} from './cocos-build-info.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
if (Number(process.versions.node.split('.')[0]) !== 22) throw Error('Use Node22 (see .nvmrc).');
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i++) {
  if (!['--build'].includes(args[i]) || !args[i + 1]) {
    throw Error('Usage: test-cocos-preview.mjs [--build <candidate>/web-desktop]');
  }
  options[args[i].slice(2)] = args[++i];
}
const command = [path.join(root, 'clients/cocos/tools/test-preview.py')];
if (options.build) {
  const build = await verifyBuild(path.resolve(root, 'clients/cocos', options.build));
  command.push('--build', build.directory);
} else command.push('--unit');
const output = path.join(root, 'output/cocos-startup');
await fs.mkdir(output, {recursive: true});
const directory = await fs.mkdtemp(path.join(output, 'driver-'));
const controller = new AbortController();
const stop = () => controller.abort();
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
try {
  const result = await runOwned(path.join(root, 'backend/.venv/bin/python'), ['-B', ...command], {
    cwd: root, timeoutMs: 240000, signal: controller.signal, log: path.join(directory, 'test.log'),
  });
  await fs.writeFile(path.join(directory, 'result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(await fs.readFile(result.log, 'utf8'));
  if (result.code !== 0 || result.timedOut || result.cancelled) process.exitCode = 1;
} finally {
  process.removeListener('SIGINT', stop);
  process.removeListener('SIGTERM', stop);
}
