import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {sourceOwner,webReferences,referenceRole} from './cocos-sources.mjs';
import {imageDimensions} from './cocos-image-info.mjs';

const policy=JSON.parse(await fs.readFile(new URL('../docs/migration/cocos-source-policy.json',import.meta.url),'utf8'));
const native='clients/cocos/assets/scripts/Unexpected.ts';
for(const code of [
 'import App from "../../../frontend/src/App.tsx";',
 'fetch("/assets/hearthwood/village/home.png");',
 'fetch(`/${base}/frontend/src/App.tsx`);',
 'fetch("\\u002fassets/hearthwood/village/home.png");',
]){
 const references=webReferences(native,code);assert(references.length>0);
 for(const reference of references)assert.throws(()=>referenceRole(reference,policy),/Unregistered Web reference/);
}
assert.deepEqual(webReferences(native,'// import "frontend/ignored"\n/* "/assets/hearthwood/ignored" */\nconst label="行囊";'),[]);
console.log('PASS native direct imports/fetch/template tails/escaped URL paths are rejected; comments and ordinary labels are ignored.');

for(const file of ['shared/game/appearances.ts','clients/cocos/assets/scripts/core/appearances.ts']){
 assert.equal(referenceRole({file,literal:'/assets/hearthwood/village/actor-0.png'},policy),'descriptive-id-url-native-binding-used');
 assert.throws(()=>referenceRole({file,literal:'/assets/hearthwood/unregistered.png'},policy),/Unregistered Web reference/);
}
assert.equal(referenceRole({file:'shared/game/items.ts',literal:'/assets/hearthwood/detail/items/'},policy),'descriptive-id-url-native-binding-used');
console.log('PASS only the existing descriptive appearance/item URL shapes are accepted; new URL families require review.');

assert.equal(sourceOwner('shared/game/items.ts',policy),'shared-game');
assert.equal(sourceOwner('tools/scene-art/village.ts',policy),'offline-scene-art');
assert.throws(()=>sourceOwner('frontend/src/App.tsx',policy),/Unowned Cocos source/);
assert.throws(()=>referenceRole({file:'clients/cocos/tools/run-preview.py',literal:'frontend/dist'},policy),/Unregistered Web reference/);
console.log('PASS Cocos owns its independent art sources; legacy client imports are rejected.');

const png=await fs.readFile(new URL('../assets/derived/local-scenes/terrain.png',import.meta.url));
const webp=await fs.readFile(new URL('../assets/derived/cocos-textures/terrain-lossless.webp',import.meta.url));
assert.deepEqual(imageDimensions(png,'.png'),[3840,2560]);assert.deepEqual(imageDimensions(webp,'.webp'),[3840,2560]);
for(const data of [webp.subarray(0,20),webp.subarray(0,webp.length-1)])assert.throws(()=>imageDimensions(data,'.webp'));
const lossy=Buffer.from(webp);lossy.write('VP8 ',12);assert.throws(()=>imageDimensions(lossy,'.webp'),/lossless/);
const wrongSize=Buffer.from(webp);wrongSize.writeUInt32LE(webp.length,4);assert.throws(()=>imageDimensions(wrongSize,'.webp'),/Invalid WebP/);
const version=Buffer.from(webp);version[24]|=0x20;assert.throws(()=>imageDimensions(version,'.webp'),/version/);
assert.throws(()=>imageDimensions(Buffer.from('not a PNG'),'.png'));assert.throws(()=>imageDimensions(webp,'.jpg'));
console.log('PASS actual PNG/lossless WebP retain the same world dimensions; truncated, lossy, mismatched-size and unsupported-version bindings are rejected.');
