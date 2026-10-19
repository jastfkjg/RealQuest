import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runOwned} from './cocos-child.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
await fs.mkdir(path.join(root,'output/cocos-backup-tests'),{recursive:true});
const directory=await fs.mkdtemp(path.join(root,'output/cocos-backup-tests/unit-'));
const controller=new AbortController(),stop=()=>controller.abort();process.on('SIGINT',stop);process.on('SIGTERM',stop);
try{
 const result=await runOwned(path.join(root,'backend/.venv/bin/python'),['-B',path.join(root,'tools/test_cocos_sqlite_backup.py')],{cwd:root,log:path.join(directory,'test.log'),signal:controller.signal});
 await fs.writeFile(path.join(directory,'result.json'),JSON.stringify(result,null,2)+'\n');
 process.stdout.write(await fs.readFile(result.log,'utf8'));
 if(result.code!==0||result.cancelled||result.timedOut)process.exitCode=1;
}finally{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);}
