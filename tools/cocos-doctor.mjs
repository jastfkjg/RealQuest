import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(new URL('../package.json',import.meta.url));
const manifest=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')),lock=JSON.parse(await fs.readFile(path.join(root,'package-lock.json'),'utf8'));
if(Number(process.versions.node.split('.')[0])!==22)throw Error('Cocos tools use Node22. Run nvm use at the repository root (see .nvmrc).');
const result={node:process.version,nodeExecutable:process.execPath,dependencies:{},python:null,creator:null,browser:null};
for(const [name,expected] of Object.entries(manifest.devDependencies)){
 let file;try{file=require.resolve(name+'/package.json');}catch{throw Error('Missing '+name+'. Run npm ci at the repository root.');}
 const real=await fs.realpath(file),relative=path.relative(path.join(root,'node_modules'),real);
 if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Tool dependency resolved outside root node_modules: '+name);
 const installed=JSON.parse(await fs.readFile(real,'utf8')).version;
 if(installed!==expected||lock.packages['node_modules/'+name]?.version!==expected)throw Error('Tool version/lock drift: '+name);
 result.dependencies[name]={version:installed,path:real};
}
await fs.access(path.join(root,'backend/.venv/bin/python'));result.python=path.join(root,'backend/.venv/bin/python');
if(process.env.COCOS_CREATOR){await fs.access(process.env.COCOS_CREATOR);result.creator=process.env.COCOS_CREATOR;}
if(process.argv.includes('--browser')){result.browser=require('playwright').chromium.executablePath();try{await fs.access(result.browser);}catch{throw Error('Chromium is missing. Run npm exec -- playwright install chromium using the locked root tools.');}}
if(require('esbuild').transformSync('const n: number = 1',{loader:'ts',format:'esm'}).code.length===0)throw Error('esbuild executable is unavailable.');
if(process.argv.includes('--art')){
 const executable=process.env.REALQUEST_ART_PYTHON;
 if(!executable)throw Error('Set REALQUEST_ART_PYTHON to a Python with tools/requirements-art.lock.txt installed; the backend environment stays separate.');
 const probe=spawnSync(executable,['-c','import json,sys,PIL;print(json.dumps({"python":sys.version.split()[0],"executable":sys.executable,"pillow":PIL.__version__}))'],{encoding:'utf8'});
 if(probe.status!==0)throw Error('Art Python/Pillow is unavailable: '+(probe.stderr||probe.error?.message||'unknown error'));
 result.art=JSON.parse(probe.stdout);
 const expected=(await fs.readFile(path.join(root,'tools/requirements-art.lock.txt'),'utf8')).match(/^Pillow==([^\s]+)$/m)?.[1];
 if(!expected||result.art.pillow!==expected)throw Error('Art Pillow version differs from tools/requirements-art.lock.txt.');
}
console.log(JSON.stringify(result,null,2));
