import { sys } from 'cc';
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
export function subscribeFocus(hide:()=>void,show:()=>void):()=>void {
  if(platformName!=='web'||!host.addEventListener)return()=>{};
  host.addEventListener('blur',hide);host.addEventListener('focus',show);
  return()=>{host.removeEventListener('blur',hide);host.removeEventListener('focus',show);};
}
// Replace through build configuration for devices. Never include provider keys.
const base = host.REALQUEST_API_BASE || '/api/';
export const transport: Transport = {
  getSession: () => {
    const value = sys.localStorage.getItem('realquest-session-v2');
    if (value) {
      const session = JSON.parse(value);
      if (!/^[A-Za-z0-9_-]{43}$/.test(session.token || '') || typeof session.saveId !== 'string' || !session.saveId) throw new Error('本机会话记录异常，请保留数据并用旅程凭证恢复');
      return session;
    }
    const token = sys.localStorage.getItem(key);
    return token ? { token, saveId: '' } : null;
  },
  setSession: session => sys.localStorage.setItem('realquest-session-v2', JSON.stringify(session)),
  getPending: saveId => {
    const legacy=sys.localStorage.getItem('realquest-pending-v1:'+saveId);
    if(legacy)return JSON.parse(legacy);
    const prefix='realquest-outbox-v2:'+saveId+':';
    const keys:string[]=[];
    for(let i=0;i<sys.localStorage.length;i++){const key=sys.localStorage.key(i);if(key?.startsWith(prefix))keys.push(key);}
    const key=keys.sort()[0];return key?JSON.parse(sys.localStorage.getItem(key)!):null;
  },
  setPending: (saveId, pending, requestId) => {
    const prefix='realquest-outbox-v2:'+saveId+':';
    if(pending)sys.localStorage.setItem(prefix+pending.body.request_id,JSON.stringify(pending));
    else {
      if(!requestId)throw new Error('缺少待确认操作标识');
      sys.localStorage.removeItem(prefix+requestId);
      const legacy=sys.localStorage.getItem('realquest-pending-v1:'+saveId);
      if(legacy&&JSON.parse(legacy).body.request_id===requestId)sys.localStorage.removeItem('realquest-pending-v1:'+saveId);
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
    if (api?.request) {
      api.request({ url: base + path, method, data: body, header: headers, timeout: 12000,
        success: (r: any) => receive(r.statusCode, r.data), fail: () => reject(new TransportError('网络中断，请重试')) });
      return;
    }
    const request = new XMLHttpRequest();
    request.open(method, base + path);
    request.timeout = 12000;
    for (const [name, value] of Object.entries(headers)) request.setRequestHeader(name, value);
    request.onload = () => {
      try { receive(request.status, JSON.parse(request.responseText)); }
      catch { reject(request.status>=400 ? new ApiError(request.status, `服务暂不可用（${request.status}）`) : new TransportError('服务器返回了无法读取的响应，请重连确认')); }
    };
    request.onerror = request.ontimeout = () => reject(new TransportError('网络中断，请重试'));
    request.send(body === undefined ? null : JSON.stringify(body));
  }),
};

export function textOwnsInput(): boolean {
  const element = host.document?.activeElement;
  return !!element && (['INPUT','TEXTAREA'].includes(element.tagName) || element.isContentEditable);
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
export function downloadRecovery(value: unknown): void {
  if(platformName !== 'web' || !host.document) throw new Error('此平台的文件导出尚未接入，请先使用 Web 版');
  const url=host.URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const link=host.document.createElement('a');link.href=url;link.download='realquest-recovery.json';host.document.body.appendChild(link);
  try{link.click();}finally{link.remove();setTimeout(()=>host.URL.revokeObjectURL(url),1000);}
}
