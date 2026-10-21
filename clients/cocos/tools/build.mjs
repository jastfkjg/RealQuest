import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {currentBuildSource,writeBuildInfo} from '../../../tools/cocos-build-info.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const editor = process.env.COCOS_CREATOR;
if (!editor || !fs.existsSync(editor)) throw new Error('Set COCOS_CREATOR to the official 3.8.8 executable. No mock engine build is provided.');
const platform = process.argv[2] || 'web-desktop';
const release = process.argv[3] === '--release';
if (process.argv.length > 4 || (process.argv[3] && !release)) throw Error('Usage: build.mjs <platform> [--release]');
if (!['web-desktop','web-mobile','wechatgame','bytedance-mini-game'].includes(platform)) throw new Error('Unsupported build target');
if (release && platform !== 'web-desktop') throw Error('Release validation currently targets web-desktop.');
const scene = 'b4a89a48-8464-46a4-bb61-d59590eebc27';
const buildName=process.env.REALQUEST_COCOS_BUILD || 'web-current';
if(!/^[a-z0-9-]+$/.test(buildName))throw new Error('Invalid build name');
const options = { platform, debug: !release, buildPath: 'project://'+buildName, name: platform.startsWith('web-') ? buildName : platform, startScene: scene, scenes: [{ url: 'db://assets/scenes/Bootstrap.scene', uuid: scene }], sourceMaps: !release };
if (release) options.md5Cache = true;
if (['wechatgame','bytedance-mini-game'].includes(platform)) {
  if (!process.env.REALQUEST_GAME_APPID) throw new Error('Set REALQUEST_GAME_APPID for your own developer project. Local prototype uses build:web; no platform AppID is invented.');
  options.packages = { [platform]: { appid: process.env.REALQUEST_GAME_APPID, orientation: 'landscape' } };
}
const argumentsString = Object.entries(options).map(([key,value]) => `${key}=${typeof value === 'object' ? JSON.stringify(value) : value}`).join(';');
const before=platform==='web-desktop'?await currentBuildSource(options):null;
const child = spawn(editor, ['--project', root, '--build', argumentsString, '--force', '--user-data-dir', process.env.COCOS_USER_DATA || '/private/tmp/realquest-cocos-userdata'], { stdio: 'inherit' });
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => child.kill(signal));
// Creator documents 36 as successful build completion, rather than Unix zero.
child.on('exit', async code => {
 if(code!==36){process.exitCode=code||1;return;}
 try{if(before)await writeBuildInfo(path.join(root,buildName,platform),options,before);process.exitCode=0;}
 catch(error){console.error(error);process.exitCode=1;}
});
