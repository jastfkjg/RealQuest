import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),parent=path.join(root,'output/cocos-toolchain');
await fs.mkdir(parent,{recursive:true});const destination=await fs.mkdtemp(path.join(parent,'clean-source-'));
const allowed=['assets/','backend/app/','backend/migrations/','backend/tests/','clients/cocos/','docs/art/','docs/design/','docs/migration/','shared/','tools/','deploy/','tests/'];
const exact=['.github/workflows/ci.yml','.nvmrc','.npmrc','package.json','package-lock.json','README.md','AGENTS.md','DESIGN.md','start.command','docker-compose.yml','.dockerignore','backend/requirements.txt','backend/requirements.lock.txt','backend/alembic.ini','backend/pytest.ini'];
const all=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean),records=[];
for(const relative of [...new Set(all)].sort()){
 if(!exact.includes(relative)&&!allowed.some(p=>relative.startsWith(p)))continue;
 if(relative.split('/').some(p=>['node_modules','output','.venv','__pycache__','.pytest_cache','.aws','.codex','.agents'].includes(p)))continue;
 if(/^clients\/cocos\/(?:library|temp|local|profiles|build|native|web-[^/]+)(?:\/|$)/.test(relative))continue;
 if(/(?:^|\/)\.env(?:\.|$)|\.(?:db|sqlite|dump|pem|key|pyc|tsbuildinfo)$/.test(relative))continue;
 const source=path.join(root,relative),stat=await fs.lstat(source).catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(!stat)continue;if(!stat.isFile())continue;
 const bytes=await fs.readFile(source),target=path.join(destination,relative);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes,{flag:'wx',mode:stat.mode});records.push({path:relative,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
for(const file of ['frontend/package.json','frontend/node_modules','frontend/dist','clients/cocos/library','clients/cocos/temp','backend/.venv']){try{await fs.access(path.join(destination,file));throw Error('Unexpected generated state: '+file);}catch(e){if(e.code!=='ENOENT')throw e;}}
// These are source templates, despite the target folder being named web-desktop.
for(const relative of all.filter(p=>p.startsWith('clients/cocos/build-templates/'))){
 const source=await fs.readFile(path.join(root,relative)),copy=await fs.readFile(path.join(destination,relative));
 if(!source.equals(copy))throw Error('Build template missing or changed: '+relative);
}
const manifest={source:root,destination,createdAt:new Date().toISOString(),records,note:'Current candidate source snapshot, including authorized working-tree changes. No frontend installation/build, player DB, secret env, editor cache or tool dependency directory copied. No legacy client or Git-history gate is required.'};
await fs.writeFile(path.join(destination,'source-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({destination,files:records.length,bytes:records.reduce((n,r)=>n+r.bytes,0)}));
