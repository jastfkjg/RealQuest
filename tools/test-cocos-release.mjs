import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {currentBuildSource,writeBuildInfo,verifyBuild} from './cocos-build-info.mjs';
import {packageRelease,verifyRelease,renderNginx} from './cocos-release.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const project=await fs.mkdtemp(path.join(root,'clients/cocos/web-release-unit-'));
const parent=path.join(root,'output/cocos-release');await fs.mkdir(parent,{recursive:true});
const output=await fs.mkdtemp(path.join(parent,'unit-'));
async function fixture(name,options,body='const metadataFixture=true;'){
 const folder=path.join(project,name);await fs.mkdir(folder);
 await fs.writeFile(path.join(folder,'index.html'),'<html>Metadata fixture, not an engine build</html>');
 await fs.writeFile(path.join(folder,'index.js'),body);
 await writeBuildInfo(folder,options,await currentBuildSource(options));return folder;
}
const release={platform:'web-desktop',debug:false,sourceMaps:false,md5Cache:true};
try{
 const debug=await fixture('debug',{platform:'web-desktop',debug:true,sourceMaps:true});
 assert.equal((await verifyBuild(debug)).identity.debug,true);
 await assert.rejects(packageRelease({build:debug,output:path.join(output,'debug')}),/actual release build/);
 assert.equal((await verifyBuild(debug)).identity.md5Cache,undefined);
 const a=await fixture('a',release),b=await fixture('b',release,'const metadataFixture="different";');
 const packagedA=await packageRelease({build:a,output:path.join(output,'a')});
 const packagedB=await packageRelease({build:b,output:path.join(output,'b'),previous:packagedA.directory});
 assert.notEqual(packagedA.active,packagedB.active);assert.equal(packagedB.releases,2);
 const first=await verifyRelease(packagedA.directory),second=await verifyRelease(packagedB.directory);
 for(const record of first.records.filter(r=>r.path.startsWith('html/releases/'))){assert((await fs.readFile(path.join(first.directory,record.path))).equals(await fs.readFile(path.join(second.directory,record.path))));}
 assert(!(await fs.readdir(path.join(first.directory,'html/releases',first.active))).includes('realquest-build.json'));
 await assert.rejects(packageRelease({build:a,output:first.directory}),/overwrite/);
 await fs.writeFile(path.join(second.directory,'html/extra.txt'),'unexpected');
 await assert.rejects(verifyRelease(second.directory),/changed or is incomplete/);await fs.unlink(path.join(second.directory,'html/extra.txt'));
 const manifestFile=path.join(second.directory,'release-manifest.json'),originalManifest=await fs.readFile(manifestFile);
 for(const change of [v=>v.baseImage.upstreamTag='unexpected',v=>v.releases.shift()]){
  const changed=JSON.parse(originalManifest);change(changed);await fs.writeFile(manifestFile,JSON.stringify(changed));
  await assert.rejects(verifyRelease(second.directory),/changed or is incomplete/);
 }
 await fs.writeFile(manifestFile,originalManifest);await verifyRelease(second.directory);
 const bad=await fixture('bad',release,'//# sourceMappingURL=secret.map');
 await assert.rejects(packageRelease({build:bad,output:path.join(output,'bad')}),/source map reference/);
 const map=await fixture('map',release);await fs.writeFile(path.join(map,'leaked.map'),'{}');await writeBuildInfo(map,release,await currentBuildSource(release));
 await assert.rejects(packageRelease({build:map,output:path.join(output,'map')}),/source\/private\/archive/);
 await fs.symlink(path.join(first.directory,'html'),path.join(first.directory,'symlink'));
 await assert.rejects(verifyRelease(first.directory),/symlinks/);await fs.unlink(path.join(first.directory,'symlink'));
 await assert.rejects(packageRelease({build:a,output:path.join(root,'outside-output')}),/inside repository output/);
 for(const options of [{upstream:'backend:80; return 200;'}, {port:0},{directory:'/tmp/$unsafe'}])await assert.rejects(renderNginx({active:packagedA.active,directory:'/tmp/static',...options}));
 const config=await renderNginx({active:packagedB.active,directory:'/tmp/static root',port:5439,upstream:'127.0.0.1:8139',loopback:true});
 assert(config.includes('127.0.0.1:5439'));assert(config.includes('try_files $uri $uri/ =404;'));assert(!config.includes('@ACTIVE@'));
 console.log('PASS release metadata fixtures: debug rejection, production identity, immutable history/bytes, no overwrite, tampering, maps/symlinks/private files and Nginx interpolation boundaries. Not an engine-build or HTTP proof.');
}finally{await fs.rm(project,{recursive:true,force:true});await fs.rm(output,{recursive:true,force:true});}
