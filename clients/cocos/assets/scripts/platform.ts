import { sys } from 'cc';
import {LocalPreferences,preferenceKey} from './core/preferences';
import {SoundEffects,FullScreenControl} from './experience';
import { ApiError, TransportError, type Transport } from './core/client';
import type { Reply } from './core/protocol';
const key = 'realquest-cocos-guest-v1';
const host = globalThis as unknown as Record<string, any>;
const api = host.bl || host.tt || host.wx;
export const platformName = host.bl ? 'bilibili' : host.tt ? 'douyin' : host.wx ? 'wechat' : sys.isNative ? 'native' : 'web';
export function viewportSize(): {width:number;height:number} | null {
  if(platformName==='web'&&host.innerWidth&&host.innerHeight)return {width:host.innerWidth,height:host.innerHeight};
  if(api?.getSystemInfoSync){const s=api.getSystemInfoSync();return{width:s.windowWidth,height:s.windowHeight};}
  return null;
}
export function subscribeViewport(callback:()=>void):()=>void {
  if(platformName==='web'&&host.addEventListener){host.addEventListener('resize',callback);return()=>host.removeEventListener('resize',callback);}
  if(api?.onWindowResize){api.onWindowResize(callback);return()=>api.offWindowResize?.(callback);}
  return()=>{};
}
export function foregroundVisible():boolean {return !host.document||(!host.document.hidden&&host.document.hasFocus());}
export function subscribeFocus(hide:()=>void,show:()=>void):()=>void {
  if(platformName!=='web'||!host.addEventListener)return()=>{};
  const visible=()=>{if(host.document.hidden)hide();else if(foregroundVisible())show();},online=()=>{if(foregroundVisible())show();};
  host.addEventListener('blur',hide);host.addEventListener('focus',show);host.addEventListener('pagehide',hide);host.addEventListener('pageshow',online);host.addEventListener('offline',hide);host.addEventListener('online',online);host.document?.addEventListener('visibilitychange',visible);
  return()=>{host.removeEventListener('blur',hide);host.removeEventListener('focus',show);host.removeEventListener('pagehide',hide);host.removeEventListener('pageshow',online);host.removeEventListener('offline',hide);host.removeEventListener('online',online);host.document?.removeEventListener('visibilitychange',visible);};
}
// Replace through build configuration for devices. Never include provider keys.
const base = host.REALQUEST_API_BASE || '/api/';
const sessionRecordError='本机会话记录异常，请保留数据并用旅程凭证恢复';
const pendingRecordError='待确认操作记录异常，已停止发送。请保留本机数据以便核对。';
function localRecord(value:string,message:string):any {
  try{return JSON.parse(value);}
  catch{throw new Error(message);}
}
function pendingRecord(value:string|null):any {
  if(value===null)return null;
  const record=localRecord(value,pendingRecordError);
  if(!record||typeof record!=='object'||Array.isArray(record))throw new Error(pendingRecordError);
  return record;
}
export const transport: Transport = {
  getSession: () => {
    const value = sys.localStorage.getItem('realquest-session-v2');
    if (value) {
      const session = localRecord(value,sessionRecordError);
      if (!session || !/^[A-Za-z0-9_-]{43}$/.test(session.token || '') || typeof session.saveId !== 'string' || !session.saveId) throw new Error(sessionRecordError);
      if(session.deletion&&(!/^[a-zA-Z0-9_-]{8,80}$/.test(session.deletion.requestId||'')))throw new Error('删除确认记录异常，请保留本机数据');
      return session;
    }
    const token = sys.localStorage.getItem(key);
    return token ? { token, saveId: '' } : null;
  },
  setSession: session => {
    sys.localStorage.setItem('realquest-session-v2', JSON.stringify(session));
    if(sys.localStorage.getItem(key)===session.token)sys.localStorage.removeItem(key);
  },
  clearSession: (saveId,token,preserveData=false) => {
    const raw=sys.localStorage.getItem('realquest-session-v2'),session=raw?localRecord(raw,sessionRecordError):null;
    // Another tab may already have selected a different journey.
    if(session?.saveId!==saveId||session?.token!==token)return;
    if(preserveData){sys.localStorage.removeItem('realquest-session-v2');return;}
    const keys:string[]=[];
    for(let i=0;i<sys.localStorage.length;i++){const k=sys.localStorage.key(i);if(k?.startsWith('realquest-outbox-v2:'+saveId+':')||k==='realquest-pending-v1:'+saveId)keys.push(k);}
    for(const k of keys)sys.localStorage.removeItem(k);
    if(sys.localStorage.getItem(key)===token)sys.localStorage.removeItem(key);
    try{sys.localStorage.removeItem('realquest-cocos-guidance-v1:'+saveId);sys.localStorage.removeItem('realquest-cocos-inventory-v2:'+saveId);}catch{/* Optional UI metadata cannot block confirmed deletion. */}
    // Session is removed last, so a partial cleanup can be retried after reload.
    sys.localStorage.removeItem('realquest-session-v2');
  },
  getPending: saveId => {
    const legacy=sys.localStorage.getItem('realquest-pending-v1:'+saveId);
    if(legacy!==null)return pendingRecord(legacy);
    const prefix='realquest-outbox-v2:'+saveId+':';
    const keys:string[]=[];
    for(let i=0;i<sys.localStorage.length;i++){const key=sys.localStorage.key(i);if(key?.startsWith(prefix))keys.push(key);}
    const key=keys.sort()[0];return key?pendingRecord(sys.localStorage.getItem(key)):null;
  },
  setPending: (saveId, pending, requestId) => {
    const prefix='realquest-outbox-v2:'+saveId+':';
    if(pending)sys.localStorage.setItem(prefix+pending.body.request_id,JSON.stringify(pending));
    else {
      if(!requestId)throw new Error('缺少待确认操作标识');
      sys.localStorage.removeItem(prefix+requestId);
      const legacy=sys.localStorage.getItem('realquest-pending-v1:'+saveId);
      if(legacy!==null&&pendingRecord(legacy).body?.request_id===requestId)sys.localStorage.removeItem('realquest-pending-v1:'+saveId);
    }
  },
  uuid: () => {
    const values = new Uint8Array(16);
    if (host.crypto?.getRandomValues) host.crypto.getRandomValues(values);
    else for (let i = 0; i < values.length; i++) values[i] = Math.floor(Math.random() * 256);
    // Request uniqueness only. Authentication tokens are server-generated.
    return Array.from(values, n => n.toString(16).padStart(2, '0')).join('');
  },
  request: (path, method, body, token) => new Promise((resolve, reject) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const receive = (status: number, data: Reply & { detail?: string }) => {
      if (status >= 200 && status < 300) resolve(data);
      else reject(new ApiError(status, typeof data?.detail === 'string' ? data.detail : `服务暂不可用（${status}）`));
    };
    const receiveText = (status:number,text:string) => {
      try { receive(status,JSON.parse(text)); }
      catch { reject(status>=400 ? new ApiError(status, `服务暂不可用（${status}）`) : new TransportError('服务器返回了无法读取的响应，请重连确认')); }
    };
    if (api?.request) {
      api.request({ url: base + path, method, data: body, header: headers, timeout: 12000,
        success: (r: any) => receive(r.statusCode, r.data), fail: () => reject(new TransportError('网络中断，请重试')) });
      return;
    }
    // The client persisted this command before transport. On page exit the
    // reply may never be observed; the next boot replays the same identity.
    if(platformName==='web'&&path==='command'&&typeof body==='object'&&body!==null&&
      (body as {action?:string}).action==='world_pause'&&host.fetch){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
      try{
        Promise.resolve(host.fetch(base+path,{method,headers,body:JSON.stringify(body),credentials:'same-origin',keepalive:true,signal:controller.signal}))
          .then(async response=>receiveText(response.status,await response.text()))
          .catch(()=>reject(new TransportError('网络中断，请重试'))).finally(()=>clearTimeout(timer));
      }catch{clearTimeout(timer);reject(new TransportError('网络中断，请重试'));}
      return;
    }
    const request = new XMLHttpRequest();
    request.open(method, base + path);
    request.timeout = 12000;
    for (const [name, value] of Object.entries(headers)) request.setRequestHeader(name, value);
    request.onload = () => receiveText(request.status,request.responseText);
    request.onerror = request.ontimeout = () => reject(new TransportError('网络中断，请重试'));
    request.send(body === undefined ? null : JSON.stringify(body));
  }),
};

export function textOwnsInput(): boolean {
  const element = host.document?.activeElement;
  return !!element && (['INPUT','TEXTAREA'].includes(element.tagName) || element.isContentEditable);
}
// Native Web EditBox inputs consume keyboard events before Cocos receives them.
// Escape dismisses editing first; the next Escape returns from the panel.
export function subscribeTextEscape(dismiss:()=>void):()=>void {
  const key=(event:any)=>{if(event.key==='Escape'&&!event.isComposing&&textOwnsInput()){
    event.preventDefault();event.stopPropagation();host.document.activeElement.blur();
    host.document.querySelector('canvas')?.focus({preventScroll:true});dismiss();
  }};
  host.document?.addEventListener('keydown',key,true);
  return ()=>host.document?.removeEventListener('keydown',key,true);
}
export async function chooseRecovery(): Promise<string | null> {
  if (platformName !== 'web' || !host.document) throw new Error('此平台的凭证文件选择尚未接入，请先使用 Web 版');
  return new Promise((resolve, reject) => {
    const element = host.document.createElement('input'); element.type='file'; element.accept='.json,application/json';
    const clean=()=>element.remove();
    element.oncancel=()=>{clean();resolve(null);};
    element.onchange=async()=>{try { const file=element.files?.[0]; if(file?.size>65536)throw new Error('凭证文件过大，请选择原版导出的凭证');resolve(file?await file.text():null); }catch(e){reject(e);}finally{clean();}};
    element.style.display='none';host.document.body.appendChild(element);element.click();
  });
}
export function downloadData(value: unknown,filename='realquest-save.json'): void {
  if(platformName !== 'web' || !host.document) throw new Error('此平台的文件导出尚未接入，请先使用 Web 版');
  const url=host.URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const link=host.document.createElement('a');link.href=url;link.download=filename;host.document.body.appendChild(link);
  try{link.click();}finally{link.remove();setTimeout(()=>host.URL.revokeObjectURL(url),1000);}
}
export function downloadRecovery(value:unknown):void {downloadData(value,'realquest-recovery.json');}

const motionPreference=host.matchMedia?.('(prefers-reduced-motion: reduce)');
const preferenceListeners=new Set<()=>void>();
const preferenceChanged=()=>preferenceListeners.forEach(f=>f());
export const preferences=new LocalPreferences(sys.localStorage);
export const soundEffects=new SoundEffects(host,()=>preferences.value.sound,preferenceChanged);
export const fullScreen=new FullScreenControl(host,preferenceChanged);
export const reducedMotion=()=>preferences.reduced(!!motionPreference?.matches);
export function changePreferences(value:Parameters<LocalPreferences['set']>[0]){preferences.set(value);if(!preferences.value.sound)soundEffects.muted();preferenceChanged();}
export function experienceSnapshot(){return {preferences:{...preferences.value},source:preferences.source,warning:preferences.warning,systemReduced:!!motionPreference?.matches,reducedMotion:reducedMotion(),audio:soundEffects.inspect(),fullscreen:fullScreen.inspect()};}
export function subscribeExperience(callback:()=>void):()=>void {
 preferenceListeners.add(callback);
 const storage=(e:any)=>{if(e.key===preferenceKey||e.key==='realquest-preferences'){preferences.reload();if(!preferences.value.sound)soundEffects.muted();preferenceChanged();}};
 const gesture=(e:any)=>{if(e.isTrusted&&!textOwnsInput()&&!e.ctrlKey&&!e.metaKey&&!e.altKey)void soundEffects.unlock();};
 const escape=(e:any)=>{if(e.key==='Escape'&&!e.isComposing&&fullScreen.active){e.preventDefault();e.stopImmediatePropagation();void fullScreen.toggle();}};
 const fsChange=()=>{fullScreen.error='';preferenceChanged();};
 const fsError=()=>{fullScreen.error='浏览器未允许切换全屏，可稍后再试。';preferenceChanged();};
 host.addEventListener?.('storage',storage);host.addEventListener?.('pointerdown',gesture,true);host.addEventListener?.('keydown',escape,true);host.addEventListener?.('keydown',gesture,true);
 host.document?.addEventListener('fullscreenchange',fsChange);host.document?.addEventListener('fullscreenerror',fsError);
 if(motionPreference?.addEventListener)motionPreference.addEventListener('change',preferenceChanged);else motionPreference?.addListener?.(preferenceChanged);
 return()=>{preferenceListeners.delete(callback);host.removeEventListener?.('storage',storage);host.removeEventListener?.('pointerdown',gesture,true);host.removeEventListener?.('keydown',escape,true);host.removeEventListener?.('keydown',gesture,true);host.document?.removeEventListener('fullscreenchange',fsChange);host.document?.removeEventListener('fullscreenerror',fsError);if(motionPreference?.removeEventListener)motionPreference.removeEventListener('change',preferenceChanged);else motionPreference?.removeListener?.(preferenceChanged);soundEffects.dispose();};
}
