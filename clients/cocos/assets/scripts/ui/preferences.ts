import type {PanelHost} from './panels';
import {C} from './theme';
import {textPages} from '../core/lifeRecords';
import {travelNotices} from '../core/preferences';
import {preferences,changePreferences,soundEffects,fullScreen,experienceSnapshot} from '../platform';

export class PreferencePanels {
 private page='sound';private note=0;
 openNotices(){this.page='notices';this.note=0;}
 snapshot(){return {preferencePage:this.page,noticeIndex:this.note};}
 draw(h:PanelHost){
  const w=Math.min(640,h.width-32),height=Math.min(344,h.height-24),x=(h.width-w)/2,y=(h.height-height)/2;
  h.box('PreferenceWood',x-3,y+3,w+6,height,C.wood,8);h.box('PreferencePaper',x,y,w,height,C.paper,6);
  h.box('PreferenceSpine',x,y,7,height,C.moss,0);
  h.image('interiors/book',x+48,y+34,48,48);h.text('PreferenceTitle','旅途偏好',x+84,y+12,w-208,42,24);
  h.button('close','返回',x+w-100,y+12,76,44,()=>h.close(),false,false,'game');
  const tabs=[['sound','声音'],['motion','动态'],['screen','画面'],['notices','提醒']],tw=(w-72)/4;
  tabs.forEach(([id,label],i)=>h.button('preference-'+id,label,x+24+i*(tw+8),y+64,tw,44,()=>{this.page=id;h.redraw();},false,this.page===id,'game'));
  const state=experienceSnapshot(),yy=y+height-60,ww=(w-56)/2;
  let title='',body='',note=preferences.warning||(preferences.source==='web'?'沿用了原网页的声音和动态偏好。':'偏好仅保存在此设备，切换旅程也会沿用。');
  if(this.page==='sound'){
   title='旅途中的轻声响';
   const labels:Record<string,string>={off:'音效已关闭。',running:'声音已启用。',waiting:'声音已开启，点击试听便可听见。',paused:'声音已暂停，回来后点击试听继续。',enabling:'正在启用声音…',blocked:'浏览器暂未允许声音，可再次试听。',unavailable:'当前浏览器无法播放合成音效。'};
   body=(labels[state.audio.state]||'')+'\n脚步、交互和已确认的收获使用短提示音。';
   if(state.audio.error)note=state.audio.error;
   h.button('sound-toggle',preferences.value.sound?'关闭音效':'开启音效',x+24,yy,ww,44,()=>{const enabled=!preferences.value.sound;changePreferences({sound:enabled});if(enabled)void soundEffects.unlock().then(()=>soundEffects.play());},!state.audio.supported,preferences.value.sound,'game');
   h.button('sound-test','试听',x+32+ww,yy,ww,44,()=>{void soundEffects.unlock().then(()=>{soundEffects.play('item');h.redraw();});},!preferences.value.sound||!state.audio.supported||state.audio.state==='enabling',false,'game');
  }else if(this.page==='motion'){
   title='让画面安静一些';body='当前：'+(state.reducedMotion?'减少动态':'通常动态')+'。系统偏好：'+(state.systemReduced?'减少动态':'通常动态')+'。\n减少动态会省去镜头缓动与按压位移，操作反馈仍保留。';
   h.button('motion-system','跟随系统',x+24,yy,ww,44,()=>changePreferences({motion:'system'}),false,preferences.value.motion==='system','game');
   h.button('motion-reduce','总是减少动态',x+32+ww,yy,ww,44,()=>changePreferences({motion:'reduce'}),false,preferences.value.motion==='reduce','game');
  }else if(this.page==='screen'){
   title='把旅途铺满屏幕';body=state.fullscreen.supported?(state.fullscreen.active?'当前已是全屏。':'当前在窗口中。')+'\n按 F 切换，Esc 先退出全屏。重开页面后需手动进入。':'当前浏览器不提供全屏功能。\n仍可在窗口中继续旅程。';if(state.fullscreen.error)note=state.fullscreen.error;
   h.button('screen-toggle',state.fullscreen.pending?'正在切换…':state.fullscreen.active?'退出全屏':'进入全屏',x+24,yy,w-48,44,()=>{void fullScreen.toggle();},!state.fullscreen.supported||state.fullscreen.pending,true,'game');
  }else{
   const notices=travelNotices(h.state,h.now);this.note=Math.min(this.note,Math.max(0,notices.length-1));const n=notices[this.note];title=n?.title||'眼下没有需要提醒的事';body=n?.body||'夜深、体力不足或现实约定时段已到时，可从世界中的提醒入口查看。';note=n?(this.note+1)+' / '+notices.length+' · 提醒不会自动执行操作。':'继续按自己的步调探索与记录。';
   h.button('notice-prev','上一条',x+24,yy,88,44,()=>{this.note--;h.redraw();},this.note===0,false,'game');
   h.button('notice-action',n?.label||'暂时无事',x+120,yy,w-240,44,()=>{if(n?.target)h.mark(n.target,n.title);else if(n?.contracts)h.go('life-notices');},!n||h.busy,true,'game');
   h.button('notice-next','下一条',x+w-112,yy,88,44,()=>{this.note++;h.redraw();},this.note>=notices.length-1,false,'game');
  }
  h.text('PreferenceLeafTitle',title,x+24,y+120,w-48,32,20);
  h.text('PreferenceLeafBody',textPages(body,Math.floor((w-48)/16),3)[0],x+24,y+158,w-48,72,16);
  h.text('PreferenceNote',textPages(note,Math.floor((w-48)/13),2)[0],x+24,y+height-104,w-48,40,13,[preferences.warning,state.fullscreen.error,state.audio.error].some(error=>!!error&&note===error)?C.danger:C.muted);
 }
}
