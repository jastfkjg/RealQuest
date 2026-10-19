import {spawn} from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

/** Each POSIX child gets an owned process group; cleanup never searches by name. */
export async function runOwned(command,args,{cwd,env=process.env,log,timeoutMs=45000,signal}={}){
 if(process.platform==='win32')throw Error('Owned process-group checks currently require macOS or Linux.');
 const depth=Number(process.env.REALQUEST_TOOLS_DEPTH||0);if(!Number.isInteger(depth)||depth<0||depth>8)throw Error('Invalid or excessive owned child nesting.');
 if(signal?.aborted)throw new Error('Run cancelled before starting a child.');
 await fsp.mkdir(path.dirname(log),{recursive:true});
 const output=fs.createWriteStream(log),started=new Date().toISOString(),posix=process.platform!=='win32';
 const child=spawn(command,args,{cwd,env:{...env,REALQUEST_TOOLS_DEPTH:String(depth+1)},stdio:['ignore','pipe','pipe'],detached:posix});
 child.stdout.pipe(output,{end:false});child.stderr.pipe(output,{end:false});
 let timedOut=false,cancelled=false,force,stopping=false,forceAt=Infinity;
 const alive=()=>{if(!child.pid)return false;try{process.kill(posix?-child.pid:child.pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;throw e;}};
 const send=kind=>{if(!alive())return;try{process.kill(posix?-child.pid:child.pid,kind);}catch(e){if(e.code!=='ESRCH')throw e;}};
 const stop=(grace=3000)=>{if(!stopping){stopping=true;send('SIGTERM');}const at=Date.now()+grace;if(at<forceAt){forceAt=at;clearTimeout(force);force=setTimeout(()=>send('SIGKILL'),grace);}};
 const abort=()=>{cancelled=true;stop();};signal?.addEventListener('abort',abort,{once:true});
 const parentSignal=()=>{cancelled=true;stop(3000-depth*300);};process.on('SIGINT',parentSignal);process.on('SIGTERM',parentSignal);
 if(signal?.aborted)abort();
 const timer=setTimeout(()=>{timedOut=true;stop();},timeoutMs);
 let result;
 try{
  result=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,exitSignal)=>resolve({code,signal:exitSignal}));output.once('error',reject);});
 }finally{
  clearTimeout(timer);clearTimeout(force);signal?.removeEventListener('abort',abort);
  if(alive()){send('SIGTERM');for(let i=0;i<30&&alive();i++)await new Promise(r=>setTimeout(r,50));if(alive())send('SIGKILL');for(let i=0;i<30&&alive();i++)await new Promise(r=>setTimeout(r,50));}
  await new Promise(resolve=>output.end(resolve));
  process.removeListener('SIGINT',parentSignal);process.removeListener('SIGTERM',parentSignal);
 }
 if(alive())throw Error('Owned process group still exists; inspect PID '+child.pid);
 return {...result,pid:child.pid,started,finished:new Date().toISOString(),timedOut,cancelled,log};
}
