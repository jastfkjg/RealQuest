import type { Reply, GameState, World } from './protocol';
import { acceptClock } from './clock';
export type Session = { token: string; saveId: string; deletion?: { requestId: string }; logout?: boolean };
export type Pending = { version: 1; saveId: string; body: { action: string; data: Record<string, unknown>; request_id: string; save_id: string } };
export type RecoveryFile = { format: 'realquest-recovery'; version: 1; recovery_key: string; character_name?: string };
export interface Transport {
  request(path: string, method: string, body?: unknown, token?: string): Promise<any>;
  getSession(): Session | null;
  setSession(session: Session): void;
  clearSession(saveId: string, token: string, preserveData?: boolean): void;
  getPending(saveId: string): Pending | null;
  setPending(saveId: string, pending: Pending | null, requestId?: string): void;
  uuid(): string;
}
export class TransportError extends Error {}
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export function readRecovery(text: string): RecoveryFile {
  let value: any;
  try { value = JSON.parse(text); } catch { throw new Error('请选择原版导出的旅程凭证 JSON 文件'); }
  if (value?.format !== 'realquest-recovery' || value.version !== 1 || !/^[A-Za-z0-9_-]{43}$/.test(value.recovery_key || ''))
    throw new Error('这不是兼容的旅程凭证；数值存档不能用于恢复');
  return value;
}
export class Client {
  account: { username: string } | null = null;
  logoutPending = false;
  disconnectionReason:'logout'|'delete'|null = null;
  state: GameState | null = null;
  world: World | null = null;
  saveId = '';
  token = '';
  status: 'disconnected' | 'connecting' | 'ready' | 'saving' | 'uncertain' | 'unauthorized' | 'offline' = 'disconnected';
  pending: Pending | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private queued = 0;
  private dataBusy = false;
  deletionPending = false;
  constructor(private transport: Transport, private changed: () => void) {}
  private validate(reply: Reply) {
    if (!reply?.save_id || !reply.state || !Number.isFinite(reply.state.revision) || !Number.isFinite(reply.server_time)) throw new TransportError('服务器响应不完整，请重连确认');
  }
  private accept(reply: Reply) {
    this.validate(reply);
    if (this.saveId && reply.save_id !== this.saveId) throw new Error('存档已切换，请重新连接。');
    this.saveId = reply.save_id!;
    if ('account' in reply) this.account = reply.account || null;
    if (!this.state || reply.state.revision >= this.state.revision) {
      this.state = reply.state;
      acceptClock(reply.server_time);
    }
    this.world = reply.world || this.world;
    this.changed(); return reply;
  }
  private failed(error: unknown) {
    this.status = this.deletionPending ? 'uncertain' : error instanceof ApiError && error.status === 401 ? 'unauthorized' : this.pending ? 'uncertain' : 'offline';
    this.changed();
  }
  async boot() {
    this.status = 'connecting'; this.changed();
    try {
      const session = this.transport.getSession();
      this.token = session?.token || ''; this.saveId = session?.saveId || '';
      if(session?.logout){this.logoutPending=true;await this.logout();return null;}
      if(session?.deletion){this.deletionPending=true;await this.deleteData();return null;}
      const reply = await this.transport.request('client-session', 'POST', undefined, this.token);
      this.validate(reply);
      if (this.saveId && reply.save_id !== this.saveId) throw new Error('会话与本机存档标识不一致，已停止连接');
      // Atomic credential record, including migration from the phase-1 token key.
      this.transport.setSession({ token: reply.session_token || this.token, saveId: reply.save_id });
      this.token = reply.session_token || this.token;
      this.accept(reply);
      this.loadPending();
      while(this.pending)await this.sendPending();
      this.status = this.pending?'uncertain':'ready'; this.changed(); return reply;
    } catch (e) { this.failed(e); throw e; }
  }
  private checkSession() {
    const session=this.transport.getSession();
    if(!session || session.token!==this.token || (session.saveId && session.saveId!==this.saveId))throw new ApiError(401,'此页旅程已在另一页面切换，请刷新后继续');
    if(session.deletion && !this.deletionPending)throw new ApiError(401,'此旅程正在另一页面删除，请刷新确认结果');
    if(session.logout && !this.logoutPending)throw new ApiError(401,'此账号正在另一页面退出，请刷新确认结果');
  }
  private loadPending() {
    this.pending=this.transport.getPending(this.saveId);
    const p=this.pending;
    if(p && (p.version!==1||p.saveId!==this.saveId||p.body?.save_id!==this.saveId||typeof p.body?.request_id!=='string'||!p.body.request_id))throw new Error('待确认操作格式异常，请保留本机数据并检查');
  }
  private async sendPending() {
    const pending = this.pending!;
    this.status = 'saving'; this.changed();
    try {
      let reply: Reply;
      try { reply = await this.transport.request('command', 'POST', pending.body, this.token); }
      catch (e) {
        if (!(e instanceof TransportError) && !(e instanceof ApiError && e.status >= 500)) throw e;
        reply = await this.transport.request('command', 'POST', pending.body, this.token);
      }
      this.accept(reply);
      this.transport.setPending(this.saveId, null, pending.body.request_id); this.loadPending();
      this.status = 'ready'; this.changed(); return reply;
    } catch (e) {
      if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 401) {
        this.transport.setPending(this.saveId, null, pending.body.request_id); this.loadPending();
        this.status = 'ready'; this.changed();
      } else this.failed(e);
      throw e;
    }
  }
  command(action: string, data: Record<string, unknown> = {}) {
    if (this.dataBusy || this.deletionPending || this.logoutPending) return Promise.reject(new Error('正在管理旅程数据，请稍候'));
    if (!this.state || !this.token || !['ready','saving'].includes(this.status)) return Promise.reject(new Error('尚未连接存档'));
    const saveId = this.saveId;
    this.queued++;
    const run = async () => {
      try{this.checkSession();}catch(e){this.failed(e);throw e;}
      this.loadPending();
      if (this.pending) {this.status='uncertain';this.changed();throw new Error('上一操作结果待确认，请先重连');}
      if (saveId !== this.saveId) throw new Error('存档已切换，已取消旧操作');
      const clock = this.state!.world_clock;
      const day = clock ? Math.floor(clock.elapsed / clock.day_seconds) + 1 : undefined;
      const pending: Pending = { version: 1, saveId, body: { action, data: ['move','gather','till','plant','water','harvest','reclaim'].includes(action) ? { world_day: day, ...data } : data, request_id: this.transport.uuid(), save_id: saveId } };
      // No mutation may leave this device before its retry identity is durable.
      this.transport.setPending(saveId, pending); this.pending = pending;
      return this.sendPending();
    };
    const result = this.queue.then(run).finally(() => { this.queued--; });
    this.queue = result.catch(() => undefined); return result;
  }
  async reconnect() {
    await this.queue;
    if(this.logoutPending)return this.logout();
    if(this.deletionPending)return this.deleteData();
    try {
      this.loadPending();
      while(this.pending)await this.sendPending();
      return await this.refresh();
    } catch (e) { this.failed(e); throw e; }
  }
  async refresh() {
    try {
      this.checkSession();
      if(this.deletionPending)throw new Error('请先确认删除结果');
      const reply = this.accept(await this.transport.request('state', 'GET', undefined, this.token));
      if (!this.pending && !this.queued) this.status = 'ready'; this.changed(); return reply;
    } catch (e) { this.failed(e); throw e; }
  }
  private async accountReady() {
    await this.queue;
    if(this.deletionPending||this.logoutPending)throw new Error('请先确认当前数据操作的结果');
    if(this.saveId){this.checkSession();this.loadPending();}
    if(this.pending)throw new Error('请先重连确认待保存操作，再注册或登录');
  }
  async authenticate(kind:'register'|'login',username:string,password:string):Promise<Reply> {
    if(this.dataBusy)throw new Error('请等待当前数据操作');
    this.dataBusy=true;
    try{
      await this.accountReady();
      const reply=await this.transport.request('account/'+kind,'POST',
        {username,password,...(kind==='register'&&this.saveId?{save_id:this.saveId}:{})},kind==='register'?this.token:undefined);
      this.validate(reply);
      if(!reply.session_token||!reply.account?.username)throw new TransportError('账号响应不完整，请使用用户名和密码重新登录');
      if(this.saveId)this.checkSession();
      if(kind==='register'){
        if(this.saveId&&reply.save_id!==this.saveId)throw new Error('绑定返回了不同旅程，已停止切换');
        this.useAccount(reply);
      }
      return reply;
    }catch(e){
      if(kind==='register'&&(e instanceof TransportError||e instanceof ApiError&&e.status>=500))throw new TransportError('注册结果待确认，请使用刚才的用户名和密码登录；旅程不会重复创建');
      throw e;
    }finally{this.dataBusy=false;}
  }
  private useAccount(reply:Reply) {
    this.transport.setSession({token:reply.session_token!,saveId:reply.save_id!});
    this.token=reply.session_token!;this.saveId=reply.save_id!;this.state=null;this.world=null;
    this.accept(reply);this.status='ready';this.changed();
  }
  async adoptAccount(reply:Reply) {
    if(this.dataBusy)throw new Error('请等待当前数据操作');
    this.dataBusy=true;
    try{await this.accountReady();this.validate(reply);if(!reply.account?.username||!reply.session_token)throw new Error('请重新登录');this.useAccount(reply);}
    finally{this.dataBusy=false;}
  }
  async logout() {
    if(this.dataBusy||this.deletionPending)throw new Error('请先完成当前数据操作');
    this.dataBusy=true;
    try{
      await this.queue;this.checkSession();this.loadPending();
      if(this.pending)throw new Error('请先重连确认待保存操作，再退出登录');
      this.transport.setSession({...this.transport.getSession()!,logout:true});this.logoutPending=true;
      const result=await this.transport.request('account/logout','POST',undefined,this.token);
      if(result?.logged_out!==true)throw new TransportError('退出结果待确认，请重试');
      this.transport.clearSession(this.saveId,this.token,true);
      this.state=null;this.world=null;this.saveId='';this.token='';this.account=null;
      this.logoutPending=false;this.disconnectionReason='logout';this.status='disconnected';this.changed();return null;
    }catch(e){this.status=this.logoutPending?'uncertain':this.status;this.changed();throw e;}
    finally{this.dataBusy=false;}
  }
  async previewRecovery(file: RecoveryFile) {
    if(this.deletionPending)throw new Error('请先确认删除结果');
    if(this.saveId)this.loadPending();
    if (this.queued) throw new Error('请等待当前保存完成');
    return this.transport.request('recovery-preview', 'POST', { recovery_key: file.recovery_key });
  }
  async restore(file: RecoveryFile) {
    if(this.deletionPending || this.dataBusy)throw new Error('请先完成当前数据操作');
    this.dataBusy=true;
    try{
    if(this.saveId)this.loadPending();
    if (this.queued) throw new Error('请等待当前保存完成');
    const reply = await this.transport.request('client-recover', 'POST', { recovery_key: file.recovery_key });
    this.validate(reply);
    if(this.pending && reply.save_id !== this.saveId)throw new Error('请先用当前旅程的凭证确认待保存操作，再切换旅程');
    if(this.saveId)this.checkSession();
    // If storage rejects, keep the current journey fully intact.
    this.transport.setSession({ token: reply.session_token, saveId: reply.save_id });
    this.token = reply.session_token; this.saveId = reply.save_id!;
    this.state = null; this.world = null; this.account = null;
    this.accept(reply);
    while(this.pending)await this.sendPending();
    this.status = 'ready'; this.changed(); return reply;
    }finally{this.dataBusy=false;}
  }
  async recoveryFile(): Promise<RecoveryFile> {
    if(this.deletionPending || this.dataBusy)throw new Error('请先完成当前数据操作');
    this.checkSession();this.loadPending();
    if (this.pending || this.queued) throw new Error('请先确认当前旅程的待保存操作');
    return this.transport.request('recovery-file', 'POST', undefined, this.token);
  }

  async inspectWebJourney() {
    if(this.deletionPending)throw new Error('请先确认删除结果');
    // No token and no POST /session: read the cookie save without creating one.
    const reply=await this.transport.request('state','GET');
    this.validate(reply);
    if(!reply.state.character)throw new Error('此浏览器没有已登记的原网页旅程，请导入旅程凭证');
    return {save_id:reply.save_id,character:reply.state.character,
      plan_count:reply.state.study_plan_log?.length||0,record_count:reply.state.activities.length,
      timer:reply.state.timer,revision:reply.state.revision};
  }

  async continueWebJourney(saveId:string) {
    if(this.dataBusy||this.deletionPending)throw new Error('请先完成当前数据操作');
    this.dataBusy=true;
    try{
      await this.queue;
      if(this.saveId){this.checkSession();this.loadPending();}
      if(this.pending&&saveId!==this.saveId)throw new Error('请先确认当前旅程的待保存操作，再切换旅程');
      const reply=await this.transport.request('client-from-web','POST',{save_id:saveId});
      this.validate(reply);
      if(reply.save_id!==saveId)throw new Error('原网页旅程已变化，请重新核对');
      if(this.saveId)this.checkSession();
      this.transport.setSession({token:reply.session_token,saveId:reply.save_id});
      this.token=reply.session_token;this.saveId=reply.save_id;this.state=null;this.world=null;this.account=null;
      this.accept(reply);
      while(this.pending)await this.sendPending();
      this.status='ready';this.changed();return reply;
    }finally{this.dataBusy=false;}
  }

  async exportData() {
    if(this.dataBusy||this.deletionPending)throw new Error('请先完成当前数据操作');
    this.dataBusy=true;
    try{
      await this.queue;this.checkSession();this.loadPending();
      if(this.pending)throw new Error('请先确认待保存操作，再导出完整数据');
      const result=await this.transport.request('export','GET',undefined,this.token);
      this.checkSession();
      if(!result?.state||!Array.isArray(result.ledger))throw new Error('服务器返回的完整数据不正确，请重试');
      return result;
    }finally{this.dataBusy=false;}
  }

  async deleteData() {
    if(this.dataBusy)throw new Error('请等待当前数据操作');
    this.dataBusy=true;
    try{
      await this.queue;this.checkSession();this.loadPending();
      if(this.pending)throw new Error('请先确认待保存操作，再删除旅程');
      const session=this.transport.getSession()!;
      const deletion=session.deletion||{requestId:this.transport.uuid()};
      // Persist intent before sending; reload must confirm it, never create a guest.
      this.transport.setSession({...session,deletion});this.deletionPending=true;
      const result=await this.transport.request('client-delete','POST',
        {save_id:this.saveId,request_id:deletion.requestId},this.token);
      if(result?.deleted!==true||result.save_id!==this.saveId)throw new TransportError('删除结果无法确认，请重试核实');
      this.transport.clearSession(this.saveId,this.token);
      this.state=null;this.world=null;this.saveId='';this.token='';this.pending=null;this.account=null;
      this.deletionPending=false;this.disconnectionReason='delete';this.status='disconnected';this.changed();return null;
    }catch(e){
      if(e instanceof ApiError&&e.status>=400&&e.status<500){
        const current=this.transport.getSession();
        if(current?.saveId===this.saveId&&current.token===this.token){
          this.transport.setSession({token:this.token,saveId:this.saveId});
          this.deletionPending=false;this.status=e.status===401?'unauthorized':'ready';
        }
      }
      this.status=this.deletionPending?'uncertain':this.status;this.changed();throw e;
    }finally{this.dataBusy=false;}
  }
}
