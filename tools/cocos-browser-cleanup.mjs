import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {browserCommandHasProfile} from './cocos-browser-config.mjs';
const exec=promisify(execFile),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const groupExists=pid=>{try{process.kill(-pid,0);return true;}catch(error){if(error.code==='ESRCH')return false;if(error.code==='EPERM')return true;throw error;}};
export async function finishBrowserProcesses(config,testPID){
 const marker='--realquest-test-owner='+config.nonce+':'+config.suite;
 const text=(await exec('ps',['-eo','pid=,pgid=,command='],{maxBuffer:4*1024*1024})).stdout;
 const rows=text.split('\n').map(line=>line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/)).filter(Boolean).map(m=>({pid:Number(m[1]),pgid:Number(m[2]),command:m[3]}));
 const file=path.join(config.directory,'browser-lifecycle.json');let proof=[];
 try{proof=JSON.parse(await fs.readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 const groups=new Map();
 for(const row of rows.filter(r=>r.command.split(/\s+/).includes(marker))){
  if(row.pid!==row.pgid||!browserCommandHasProfile(row.command))throw Error('Ambiguous marked browser process; preserved PID '+row.pid);
  groups.set(row.pgid,{pid:row.pid,discoveredBy:'explicit-run-marker'});
 }
 for(const entry of proof){
  if(entry.owner!==config.nonce+':'+config.suite||testPID&&entry.parentPID!==testPID)throw Error('Browser lifecycle ownership mismatch.');
  if(groupExists(entry.pid)){
   const members=rows.filter(r=>r.pgid===entry.pid);
   if(!members.some(r=>r.command.split(/\s+/).includes(marker)||entry.profile&&browserCommandHasProfile(r.command,entry.profile)))throw Error('Browser group identity is no longer provable; preserved '+entry.pid);
   groups.set(entry.pid,{pid:entry.pid,discoveredBy:'owned-profile-and-process-group'});
  }
 }
 const cleaned=[];
 for(const group of groups.values()){
  if(groupExists(group.pid))process.kill(-group.pid,'SIGTERM');
  for(let i=0;i<30&&groupExists(group.pid);i++)await pause(50);
  if(groupExists(group.pid))process.kill(-group.pid,'SIGKILL');
  for(let i=0;i<30&&groupExists(group.pid);i++)await pause(50);
  if(groupExists(group.pid))throw Error('Owned browser group remains: '+group.pid);
  cleaned.push({...group,exited:true});
 }
 const report={proof,controllerCleaned:cleaned,allKnownGroupsExited:proof.every(p=>!groupExists(p.pid))};
 await fs.writeFile(path.join(config.directory,'browser-cleanup.json'),JSON.stringify(report,null,2)+'\n');return report;
}
