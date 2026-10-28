export type Cue='step'|'interact'|'item'|'reward'|'swing'|'spell'|'hit'|'hurt'|'defeat';
/** Original RealQuest Web chime frequencies/envelopes, with explicit lifecycle. */
export class SoundEffects {
 private context:any=null;private pending:Promise<void>|null=null;private hidden=false;
 private voices=new Set<{osc:any;gain:any}>();private last:Partial<Record<Cue,number>>={};
 private counts:Record<Cue,number>={step:0,interact:0,item:0,reward:0,swing:0,spell:0,hit:0,hurt:0,defeat:0};error='';
 constructor(private host:Record<string,any>,private enabled:()=>boolean,private changed:()=>void){}
 get supported(){return !!(this.host.AudioContext||this.host.webkitAudioContext);}
 get state(){return !this.enabled()?'off':!this.supported?'unavailable':this.pending?'enabling':this.context?.state==='running'&&!this.hidden?'running':this.error?'blocked':this.hidden?'paused':'waiting';}
 inspect(){return {state:this.state,supported:this.supported,voices:this.voices.size,cues:{...this.counts},error:this.error};}
 unlock():Promise<void>{
  if(!this.enabled()||this.hidden||!this.supported)return Promise.resolve();
  if(this.context?.state==='running'&&!this.error)return Promise.resolve();
  if(this.pending)return this.pending;
  this.error='';let context:any;
  try{this.context||=new (this.host.AudioContext||this.host.webkitAudioContext)();context=this.context;}
  catch{this.error='当前浏览器暂不能启用声音。';this.changed();return Promise.resolve();}
  const promise:Promise<void>=Promise.resolve().then(()=>context.resume()).then(()=>{
   if(context!==this.context)return;
   if(!this.enabled()||this.hidden){this.silence();void context.suspend?.().catch(()=>{});}
   else if(context.state!=='running')this.error='浏览器尚未启用声音，请再点试听。';
  }).catch(()=>{if(context===this.context)this.error='浏览器未允许声音，请再点试听。';}).finally(()=>{if(this.pending===promise)this.pending=null;this.changed();});
  this.pending=promise;this.changed();return promise;
 }
 play(kind:Cue='interact'){
  const c=this.context;if(!this.enabled()||this.hidden||!c||c.state!=='running')return;
  if(c.currentTime-(this.last[kind]??-Infinity)<(kind==='step'?.29:.08))return;
  this.last[kind]=c.currentTime;
  const combat=['swing','spell','hit','hurt','defeat'].includes(kind);
  const notes=kind==='reward'?[523,659,784]:kind==='item'?[659,880]:kind==='step'?[110]:kind==='swing'?[220]:kind==='spell'?[440,660]:kind==='hit'?[180]:kind==='hurt'?[130,95]:kind==='defeat'?[330,495]:[440,554];
  this.counts[kind]++;
  for(const [i,frequency] of notes.entries()){
   let voice:{osc:any;gain:any}|null=null;
   try{const osc=c.createOscillator(),gain=c.createGain(),at=c.currentTime+i*.07;voice={osc,gain};this.voices.add(voice);osc.type=kind==='step'||combat?'triangle':'sine';osc.frequency.setValueAtTime(frequency,at);if(combat)osc.frequency.exponentialRampToValueAtTime(Math.max(40,frequency*(kind==='spell'?1.7:.45)),at+.10);gain.gain.setValueAtTime(kind==='step'?.009:combat?.022:.035,at);gain.gain.exponentialRampToValueAtTime(.001,at+.13);osc.connect(gain);gain.connect(c.destination);const own=voice;osc.onended=()=>{if(this.voices.delete(own)){osc.disconnect();gain.disconnect();}};osc.start(at);osc.stop(at+.15);}
   catch{if(voice){this.voices.delete(voice);this.retire(voice);}this.error='声音暂不可播放，游戏仍可继续。';}
  }
 }
 private retire(v:{osc:any;gain:any}){try{v.gain.gain.setValueAtTime(0,this.context?.currentTime||0);}catch{}try{v.osc.stop();}catch{}try{v.osc.disconnect();v.gain.disconnect();v.osc.onended=null;}catch{}}
 silence(){for(const v of this.voices)this.retire(v);this.voices.clear();}
 muted(){this.silence();void this.context?.suspend?.().catch(()=>{});this.changed();}
 pause(){this.hidden=true;this.muted();}
 foreground(){this.hidden=false;this.changed();}
 dispose(){this.silence();const c=this.context;this.context=null;this.pending=null;this.last={};void c?.close?.().catch(()=>{});}
}
export class FullScreenControl {
 pending=false;error='';
 constructor(private host:Record<string,any>,private changed:()=>void){}
 get active(){return !!this.host.document?.fullscreenElement;}
 get supported(){const d=this.host.document;return !!d&&d.fullscreenEnabled!==false&&typeof d.documentElement?.requestFullscreen==='function'&&typeof d.exitFullscreen==='function';}
 inspect(){return {supported:this.supported,active:this.active,pending:this.pending,error:this.error};}
 async toggle(){
  if(this.pending)return;
  if(!this.supported){this.error='当前浏览器不提供全屏功能。';this.changed();return;}
  this.pending=true;this.error='';this.changed();
  try{const d=this.host.document;await(this.active?d.exitFullscreen():d.documentElement.requestFullscreen());}
  catch{this.error='浏览器未允许切换全屏，可稍后再试。';}
  finally{this.pending=false;this.changed();}
 }
}
