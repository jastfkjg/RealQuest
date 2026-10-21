import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateBrowserConfig,browserProfile,browserCommandHasProfile} from './cocos-browser-config.mjs';
import {parseBrowserArgs} from './cocos-browser.mjs';
import {selectSuites} from './cocos-browser-suites.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const runDirectory=path.join(root,'output/cocos-regression/run-fixture'),directory=path.join(runDirectory,'suites/data');
const owner={schema_version:1,runId:'00000000-0000-0000-0000-000000000001',nonce:'1'.repeat(32),controllerPID:123};
const config={...owner,repository:root,runDirectory,directory,database:path.join(directory,'test.db'),suite:'data',baseURL:'http://127.0.0.1:12345',apiURL:'http://127.0.0.1:12346'};
const file=path.join(directory,'config.json');
for(const args of [['--user-data-dir=/tmp/native [qa]'],['--profile','/tmp/native [qa]'],['-profile','/tmp/native [qa]']]){
 assert.equal(browserProfile(['browser','--headless',...args]),'/tmp/native [qa]');
 const command=['browser','--headless',...args,'--realquest-test-owner=fixture:data'].join(' ');
 assert(browserCommandHasProfile(command));assert(!browserCommandHasProfile(command,'/tmp/native [qa]'),'Spaced ps text cannot alone prove profile argv boundaries');
 assert(!browserCommandHasProfile(command,'/tmp/native'));assert(!browserCommandHasProfile(command,'/tmp/native [qa]-other'));
}
for(const flag of ['--user-data-dir=','--profile ','-profile '])assert(browserCommandHasProfile('browser '+flag+'/tmp/native-[qa] --headless','/tmp/native-[qa]'));
for(const args of [[],['--profile'],['--profile','--headless'],['--user-data-dir='],['--profile','/tmp/one','-profile','/tmp/two']])assert.equal(browserProfile(args),undefined);
for(const command of ['browser --headless','browser --profile --headless','browser --user-data-dir=','browser --other-profile /tmp/native'])assert(!browserCommandHasProfile(command));
assert(browserCommandHasProfile('browser --profile /tmp/end','/tmp/end'));assert(!browserCommandHasProfile('browser --profile /tmp/end-sibling','/tmp/end'));
console.log('PASS Chromium and native/patched Firefox profile argv, spaced/metacharacter paths, exact ownership matching and invalid/ambiguous arguments.');
assert.equal(validateBrowserConfig(config,owner,file).database,config.database);
for(const change of [
 {database:path.join(root,'backend/realquest.db')},
 {database:path.join(directory,'local-preview.db')},
 {directory:path.join(root,'output/cocos-data')},
 {runDirectory:path.join(root,'output/cocos-data')},
 {nonce:'2'.repeat(32)},
 {controllerPID:124},
 {runId:'bad'},
 {baseURL:'https://example.com'},
 {baseURL:config.apiURL},
 {apiURL:'http://127.0.0.1:12346/wrong'},
])assert.throws(()=>validateBrowserConfig({...config,...change},owner,file));
console.log('PASS fixture configuration rejects player/preview/outside DB paths, ownership mismatches and non-loopback/mismatched endpoints.');
assert.equal(selectSuites('current').length,31);assert.equal(selectSuites('all').length,31);
assert.equal(selectSuites('expedition-chain')[0].file,'clients/cocos/tools/smoke-expedition-chain.mjs');
assert.equal(selectSuites('quest-board')[0].file,'clients/cocos/tools/smoke-quest-board.mjs');
assert.equal(selectSuites('interface-refresh')[0].file,'clients/cocos/tools/smoke-interface-refresh.mjs');
assert.equal(selectSuites('chapter-friction')[0].file,'clients/cocos/tools/smoke-chapter-friction.mjs');
assert.throws(()=>selectSuites('compatibility'));
assert.equal(selectSuites('consistency')[0].file,'clients/cocos/tools/smoke-consistency.mjs');
assert.equal(selectSuites('pause')[0].file,'clients/cocos/tools/smoke-pause.mjs');
assert.equal(selectSuites('textures')[0].file,'clients/cocos/tools/smoke-textures.mjs');
assert.equal(selectSuites('combat-framing')[0].file,'clients/cocos/tools/smoke-combat-framing.mjs');
assert.equal(selectSuites('boot')[0].file,'clients/cocos/tools/smoke-boot.mjs');
assert.equal(selectSuites('semantics')[0].file,'clients/cocos/tools/smoke-semantics.mjs');
assert.deepEqual(selectSuites('preferences,inventory').map(s=>s.id),['preferences','inventory']);
assert.throws(()=>selectSuites('preferences,preferences'));assert.throws(()=>selectSuites('unknown'));
assert.throws(()=>parseBrowserArgs([]));assert.throws(()=>parseBrowserArgs(['--build','sample','--port','0']));
assert.equal(parseBrowserArgs(['--list']).list,true);
assert.equal(parseBrowserArgs(['--build','sample/web-desktop','--port','5450']).port,5450);
console.log('PASS suite selection includes30 current with the physical quest board, chapter friction, actual combat framing, lossless terrain/fallback, keepalive pause faults, native semantics and startup recovery without legacy client gates; CLI requires an explicit build and valid configurable ports.');
