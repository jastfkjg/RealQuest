import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {currentBuildSource,writeBuildInfo,verifyBuild} from './cocos-build-info.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),parent=path.join(root,'clients/cocos');
const directory=await fs.mkdtemp(path.join(parent,'web-receipt-unit-')),payload=path.join(directory,'web-desktop');
const options={platform:'web-desktop',debug:true,sourceMaps:true};
try{
 await fs.mkdir(payload);await fs.writeFile(path.join(payload,'index.html'),'<p>Metadata fixture only; no game build</p>');await fs.writeFile(path.join(payload,'bundle.js'),'// metadata fixture\n');
 const before=await currentBuildSource(options);await writeBuildInfo(payload,options,before);
 assert.equal((await verifyBuild(payload)).sourceFingerprint,before.sha256);
 await fs.writeFile(path.join(payload,'bundle.js'),'// unexpected payload modification\n');await assert.rejects(verifyBuild(payload),/payload changed/);await fs.writeFile(path.join(payload,'bundle.js'),'// metadata fixture\n');
 const file=path.join(payload,'realquest-build.json'),receipt=await fs.readFile(file),stale=JSON.parse(receipt);stale.source.sha256='0'.repeat(64);await fs.writeFile(file,JSON.stringify(stale));await assert.rejects(verifyBuild(payload),/stale relative/);await fs.writeFile(file,receipt);
 await assert.rejects(writeBuildInfo(payload,options,{...before,sha256:'0'.repeat(64)}),/changed during the build/);assert((await fs.readFile(file)).equals(receipt));
 await fs.unlink(file);await assert.rejects(verifyBuild(payload),/no current-source receipt/);
 console.log('PASS build metadata rejects payload changes, stale runtime fingerprints, source races and missing receipts. This fixture is not engine-build evidence.');
}finally{await fs.rm(directory,{recursive:true,force:true});}
