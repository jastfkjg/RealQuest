import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function filesAt(directory,prefix=''){
 const records=[];
 for(const entry of (await fs.readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name<b.name?-1:1)){
  const relative=prefix+entry.name,file=path.join(directory,entry.name);
  if(entry.isSymbolicLink())throw Error('Build inputs/payload must not contain symlinks: '+file);
  if(entry.isDirectory())records.push(...await filesAt(file,relative+'/'));
  else if(entry.isFile()&&relative!=='realquest-build.json'){const bytes=await fs.readFile(file);records.push({path:relative,bytes:bytes.length,sha256:hash(bytes)});}
 }
 return records;
}
export async function currentBuildSource(options){
 const project=path.join(root,'clients/cocos'),pkg=JSON.parse(await fs.readFile(path.join(project,'package.json'),'utf8'));
 const records=(await filesAt(path.join(project,'assets'))).map(r=>({...r,path:'assets/'+r.path}));
 for(const file of ['settings/v2/packages/project.json','build-templates/web-desktop/index.ejs','build-templates/web-desktop/style.css']){const bytes=await fs.readFile(path.join(project,file));records.push({path:file,bytes:bytes.length,sha256:hash(bytes)});}
 const identity={engine:pkg.creator.version,scene:'b4a89a48-8464-46a4-bb61-d59590eebc27',platform:options.platform,debug:options.debug,sourceMaps:options.sourceMaps};
 if(options.md5Cache!==undefined)identity.md5Cache=options.md5Cache;
 return {identity,sha256:hash(JSON.stringify({identity,records})),records};
}
export async function writeBuildInfo(directory,options,before){
 const source=await currentBuildSource(options);
 if(source.sha256!==before.sha256)throw Error('Cocos runtime sources changed during the build; no current-build receipt written.');
 await fs.access(path.join(directory,'index.html'));
 const payload=await filesAt(directory),info={schema_version:1,builtAt:new Date().toISOString(),source,payloadSha256:hash(JSON.stringify(payload)),payload};
 await fs.writeFile(path.join(directory,'realquest-build.json'),JSON.stringify(info,null,2)+'\n');
 return info;
}
export async function verifyBuild(directory){
 const actual=await fs.realpath(directory),project=await fs.realpath(path.join(root,'clients/cocos'));
 if(!actual.startsWith(project+path.sep))throw Error('Test build must be inside this repository clients/cocos project.');
 let info;try{info=JSON.parse(await fs.readFile(path.join(actual,'realquest-build.json'),'utf8'));}catch{throw Error('Build has no current-source receipt. Build a separate candidate with cocos:build first.');}
 if(info.schema_version!==1||info.source?.identity?.platform!=='web-desktop')throw Error('Expected a recorded Cocos web-desktop build.');
 const source=await currentBuildSource(info.source.identity);
 if(source.sha256!==info.source.sha256)throw Error('Build is stale relative to current Cocos runtime sources. Rebuild a separate candidate.');
 if(hash(JSON.stringify(await filesAt(actual)))!==info.payloadSha256)throw Error('Recorded build payload changed or is incomplete.');
 return {directory:actual,sourceFingerprint:source.sha256,payloadFingerprint:info.payloadSha256,identity:source.identity};
}

export async function buildPayload(directory){const records=await filesAt(directory);return {sha256:hash(JSON.stringify(records)),records};}
