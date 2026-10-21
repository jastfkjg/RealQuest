import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runOwned} from './cocos-child.mjs';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
if(Number(process.versions.node.split('.')[0])!==22)throw Error('SQLite tools require Node22.');
const args=process.argv.slice(2),operation=args[0];
const fields={backup:['--database','--output','--timeout-seconds'],verify:['--backup'],restore:['--backup','--destination'],inspect:['--database']};
if(!fields[operation])throw Error('Usage: cocos:backup -- backup --database file --output new-directory | verify --backup directory | restore --backup directory --destination new-file | inspect --database file');
const values=new Map();
for(let i=1;i<args.length;i+=2){if(!fields[operation].includes(args[i])||!args[i+1]||values.has(args[i]))throw Error('Invalid or duplicate SQLite tool argument');values.set(args[i],args[i+1]);}
for(const field of fields[operation].filter(x=>x!=='--timeout-seconds'))if(!values.has(field))throw Error('Missing '+field);
const seconds=Number(values.get('--timeout-seconds')||60);if(!Number.isInteger(seconds)||seconds<1||seconds>300)throw Error('SQLite timeout must be 1–300 seconds');
const parent=path.join(root,'output/cocos-backup');await fs.mkdir(parent,{recursive:true});
const directory=await fs.mkdtemp(path.join(parent,'operation-')),log=path.join(directory,'operation.log');
const controller=new AbortController(),stop=()=>controller.abort();process.on('SIGINT',stop);process.on('SIGTERM',stop);
try{
 const result=await runOwned(path.join(root,'backend/.venv/bin/python'),['-B',path.join(root,'tools/cocos_sqlite_backup.py'),...args],{cwd:process.cwd(),log,timeoutMs:seconds*1000+5000,signal:controller.signal});
 await fs.writeFile(path.join(directory,'result.json'),JSON.stringify({kind:'sqlite-backup-operation',operation,...result},null,2)+'\n',{mode:0o600});
 const output=await fs.readFile(log,'utf8');
 try{process.stdout.write(JSON.stringify({...JSON.parse(output),receipt:path.join(directory,'result.json')})+'\n');}
 catch{process.stdout.write(output);process.exitCode=1;}
 if(result.code!==0||result.cancelled||result.timedOut)process.exitCode=1;
}finally{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);}
