import {formatMoney} from '../core/currency';
import {Label} from 'cc';
import type {PanelHost} from './panels';
import type {Quest} from '../core/protocol';
import {questStatuses,itemNames} from '../core/features';
import {currentMap,questTarget} from '../core/navigation';
import {textPages} from '../core/lifeRecords';
import {C} from './theme';
import {hasDepartureNotes} from '../core/nextDeparture';
import {canExploreStory} from '../core/story';

interface BoardSelection {questId:string;page:number;detailPage:number;rewardPage?:number}
const category=(q:Quest)=>q.kind==='main'?'主线':'支线';

function pin(h:PanelHost,id:string,x:number,y:number){
 h.box(id+'Shadow',x-5,y-4,12,12,C.ink,6);
 h.box(id,x-5,y-6,10,10,C.amber,5);
 h.box(id+'Light',x-3,y-5,4,3,C.raised,1);
}
function paper(h:PanelHost,x:number,y:number,w:number,height:number){
 h.box('PaperShadow',x+3,y+5,w,height,'#27392f55',3);
 h.image('ui/notice-paper',x+w/2,y+height/2,w,height,true);
}
function prepare(h:PanelHost){h.go(hasDepartureNotes(h.state)?'preparation':'expedition');}

/** One physical board, with a short notice index and one unfolded commission. */
export function drawQuestBoard(h:PanelHost,selection:BoardSelection,giver?:string){
 const w=Math.min(1120,h.width-32),height=Math.min(688,h.height-28);
 const x=(h.width-w)/2,y=(h.height-height)/2,compact=height<540;
 const entries=h.state.quest_log.filter(q=>q.status!=='locked'&&(!giver||q.giver===giver));
 const q=entries.find(q=>q.id===selection.questId)||entries.find(q=>q.kind==='main'&&['ready','active','available'].includes(q.status))||entries.find(q=>['ready','active','available'].includes(q.status))||entries[0];
 if(q)selection.questId=q.id;
 h.box('BoardShadow',x+5,y+64,w,height-61,'#15291d77',4);
 h.image('ui/notice-timber',x+w/2,y+(height+58)/2,w,height-58,true);
 h.box('BoardNameEdge',x+22,y+2,Math.min(320,w-310),58,C.wood,5);
 h.box('BoardName',x+25,y+4,Math.min(314,w-316),51,C.moss,4);
 h.text('FeatureTitle',h.mode==='journal'?'旅途委托':'村庄告示板',x+44,y+10,Math.min(270,w-352),38,26,C.paper);
 if(canExploreStory(h.state))h.button('expedition-entry',h.state.village_intro?.reviewed?'探索手记':'初探手记',x+w-252,y+6,148,44,()=>prepare(h),h.busy,false,'game');
 h.button('close','返回',x+w-92,y+6,76,44,()=>h.close(),h.busy,false,'back-light');
 const left=x+32,lw=Math.round(w*.31),top=y+100,footer=y+height-28;
 const px=left+lw+24,py=y+(compact?72:84),pw=x+w-30-px,ph=height-(compact?94:110);
 if(compact&&(h.error||h.notice)){h.box('IndexFeedbackPaper',left,y+64,lw,30,C.paper,3);h.text('FeatureFeedback',h.error||h.notice,left+6,y+64,lw-12,30,14,h.error?C.danger:C.muted);}
 else h.text('BoardIndexCaption',`${entries.length} 份告示 · 选择一份查看`,left,y+64,lw,30,14,C.paper);
 const per=Math.max(1,Math.min(4,Math.floor((height-148)/90)));
 const pages=Math.max(1,Math.ceil(entries.length/per));
 // Keep a selected notice visible when the viewport changes.
 selection.page=q?Math.floor(entries.indexOf(q)/per):0;
 const noteH=Math.min(112,Math.floor((footer-top-(pages>1?54:0)-12*(per-1))/per));
 entries.slice(selection.page*per,(selection.page+1)*per).forEach((entry,i)=>{
  const yy=top+i*(noteH+12),selected=entry.id===q?.id,done=entry.checks.filter(Boolean).length;
  paper(h,left,yy,lw,noteH);
  if(selected){h.box('SelectedNoticeEdge',left+5,yy+12,4,noteH-24,C.moss,1);h.box('SelectedNoticeCorner',left+lw-18,yy+12,7,7,C.moss,1);}
  pin(h,'NoticePin-'+entry.id,left+lw/2,yy+7);
  const status=h.state.tracked_quest===entry.id?'追踪中':questStatuses[entry.status];
  const label=h.button('select-'+entry.id,`${category(entry)} · ${status}\n${entry.title}${compact?'':`\n${done} / ${entry.objectives.length} 项完成`}`,left+14,yy+12,lw-28,noteH-22,()=>{selection.questId=entry.id;selection.detailPage=0;h.redraw(true);},h.busy,selected,'notice',{label:`${category(entry)} · ${status} · ${entry.title} · ${done}/${entry.objectives.length} 项完成`,pressed:selected});
  label.horizontalAlign=Label.HorizontalAlign.LEFT;label.lineHeight=compact?20:22;label.fontSize=compact?14:16;
 });
 if(pages>1){
  const by=footer-44,bw=(lw-12)/2;
  h.box('NoticePreviousPaper',left,by,bw,44,C.paper,3);h.box('NoticeNextPaper',left+bw+12,by,bw,44,C.paper,3);
  h.button('list-prev','上一组',left,by,bw,44,()=>{const next=(selection.page-1+pages)%pages;selection.questId=entries[next*per].id;h.redraw(true);},h.busy,false,'game');
  h.button('list-next',`${selection.page+1}/${pages} · 下一组`,left+bw+12,by,bw,44,()=>{const next=(selection.page+1)%pages;selection.questId=entries[next*per].id;h.redraw(true);},h.busy,false,'game');
 }
 paper(h,px,py,pw,ph);pin(h,'OpenPaperPinL',px+28,py+14);pin(h,'OpenPaperPinR',px+pw-28,py+14);
 const dx=px+30,dw=pw-60;
 if(!q){h.text('NoQuests','这里暂时没有剧情委托。',dx,py+48,dw,60,18);return;}
 const tracked=h.state.tracked_quest===q.id;
 h.text('QuestTracking',`${category(q)}委托  /  ${questStatuses[q.status]}${tracked?' · 当前追踪':''}`,dx,py+(compact?14:28),dw,compact?20:24,14,C.moss);
 const titleH=compact?30:68,titleY=py+(compact?38:54);
 h.text('QuestName',q.title,dx,titleY,dw,titleH,compact?21:28);
 h.line('QuestRule',[{x:dx,y:titleY+titleH+8},{x:dx+dw,y:titleY+titleH+8}],C.line,1);
 const objectiveY=compact?py+80:titleY+titleH+88;
 if(!compact){
  const pages=textPages(q.description,Math.max(12,Math.floor(dw/16)-2),2);
  h.text('QuestDescription',pages[0]+(pages.length>1?'…':''),dx,titleY+titleH+20,dw,58,16,C.muted);
 }
 const buttonY=py+ph-(compact?64:70),rewardY=buttonY-(compact?42:60),feedbackY=rewardY-(compact?36:40);
 const illustration=!compact&&pw>560;
 if(illustration){
  const art=q.id==='settle_in'?'home':q.id==='craft_home'?'workshop':q.id==='leave_valley'?'board':null;
  if(art){const iw=art==='home'?120:art==='workshop'?136:88,ih=art==='home'?145:art==='workshop'?120:89;h.image('village/'+art,px+pw-106,objectiveY+58,iw,ih);}
 }
 const objectiveW=dw-(illustration?154:0),perObjective=compact?1:Math.max(1,Math.floor((feedbackY-objectiveY-8)/30)),objectivePages=Math.max(1,Math.ceil(q.objectives.length/perObjective));
 selection.detailPage=Math.min(selection.detailPage,objectivePages-1);
 if(compact){const n=selection.detailPage;h.button('objectives-next',`${q.checks[n]?'✓':'○'} ${q.objectives[n]} · ${n+1}/${q.objectives.length}`,dx,objectiveY,dw,44,()=>{selection.detailPage=(selection.detailPage+1)%objectivePages;h.redraw();},h.busy||objectivePages===1,false,'game');}
 else q.objectives.slice(selection.detailPage*perObjective,(selection.detailPage+1)*perObjective).forEach((text,i)=>{
  const n=selection.detailPage*perObjective+i,yy=objectiveY+i*30,checked=q.checks[n];
  h.box('CheckEdge-'+n,dx,yy+5,18,18,checked?C.moss:C.muted,2);
  h.box('CheckFill-'+n,dx+2,yy+7,14,14,checked?C.moss:C.paper,1);
  if(checked)h.text('Check-'+n,'✓',dx-1,yy+1,20,26,16,C.paper,true);
  h.text('Objective-'+n,text,dx+28,yy,objectiveW-28,28,compact?14:16,checked?C.moss:C.ink);
 });
 if(objectivePages>1&&!compact)h.button('objectives-next',`目标 ${selection.detailPage+1}/${objectivePages} ›`,dx+dw-140,feedbackY-46,140,44,()=>{selection.detailPage=(selection.detailPage+1)%objectivePages;h.redraw();},h.busy,false,'game');
 if(!compact&&(h.error||h.notice))h.text('FeatureFeedback',h.error||h.notice,dx,feedbackY,dw,36,14,h.error?C.danger:C.muted);
 h.line('RewardRule',[{x:dx,y:rewardY-4},{x:dx+dw,y:rewardY-4}],C.line,1);
 h.text('QuestRewardLabel','回礼',dx,rewardY+4,38,32,15);
 const rewards=Object.entries(q.reward).filter(([,count])=>count>0),perReward=Math.max(1,Math.min(3,Math.floor((dw-138)/110))),rewardPages=Math.ceil(rewards.length/perReward);
 const rewardPage=(selection.rewardPage||0)%Math.max(1,rewardPages),visibleRewards=rewards.slice(rewardPage*perReward,(rewardPage+1)*perReward),rewardWidth=Math.min(142,(dw-138)/Math.max(1,visibleRewards.length));
 visibleRewards.forEach(([id,count],i)=>{
  const xx=dx+46+i*rewardWidth;
  h.image('items/'+id,xx+14,rewardY+20,28,28);
  h.text('Reward-'+id,id==='gold'?formatMoney(count):`${count} ${itemNames[id]||id}`,xx+34,rewardY+3,rewardWidth-34,34,14);
 });
 if(rewardPages>1)h.button('quest-rewards',`${rewardPage+1}/${rewardPages} ›`,dx+dw-86,rewardY-2,86,44,()=>{selection.rewardPage=rewardPage+1;h.redraw();},h.busy,false,'back-light',{label:`查看下一份回礼，当前第${rewardPage+1}页，共${rewardPages}页`});
 else h.text('QuestXP',`${q.xp} EXP`,dx+dw-78,rewardY+3,78,34,14,C.muted);
 const giverObject=currentMap(h.world,h.state,h.now).objects.find(o=>o.id===q.giver),near=!!giverObject&&Math.hypot(giverObject.x-h.state.position.x,giverObject.y-h.state.position.y)<=72;
 const action=q.status==='available'?'quest_accept':q.status==='ready'?'quest_claim':q.status==='active'?'track_quest':null;
 const bw=(dw-16)/3;
 h.button('quest-action',h.processing?'处理中…':q.status==='available'?`接取${category(q)}`:q.status==='ready'?(q.delivery?'交付4份萝卜':'交付领取'):q.status==='active'?(tracked?'正在追踪':'追踪委托'):questStatuses[q.status],dx,buttonY,bw,44,async()=>{if(action&&await h.send(action,{quest_id:q.id})&&action==='quest_claim'){selection.questId=h.state.quest_log.find(next=>next.kind==='main'&&['available','active','ready'].includes(next.status))?.id||q.id;selection.detailPage=0;selection.rewardPage=0;h.redraw(true);}},h.busy||!action||(action==='track_quest'?tracked:!near&&!(action==='quest_accept'&&q.accept_anywhere)),true,'game');
 const target=questTarget(q,h.state);
 h.button('quest-mark',near?'标记目标':'标记委托人',dx+bw+8,buttonY,bw,44,()=>target&&h.mark(target,q.title),!target||h.busy,false,'game');
 h.button('quest-read','阅读原文',dx+(bw+8)*2,buttonY,bw,44,()=>h.go('quest-story'),h.busy,false,'game');
 if(!compact&&!h.error&&!h.notice&&!near&&action&&action!=='track_quest'&&!(action==='quest_accept'&&q.accept_anywhere))h.text('QuestProximity','走近委托人后，可接取或交付。',dx,feedbackY,dw,36,14,C.muted);
}

export function drawQuestStory(h:PanelHost,selection:BoardSelection){
 const q=h.state.quest_log.find(q=>q.id===selection.questId);
 const w=Math.min(800,h.width-40),columns=Math.max(12,Math.floor((w-80)/18)-2);
 const original=q?q.description+'\n回礼：'+Object.entries(q.reward).map(([id,n])=>id==='gold'?formatMoney(n):`${n} ${itemNames[id]||id}`).join('、')+` · ${q.xp} EXP`:'';
 const lines=q?textPages(original,columns,1).length:1;
 const height=Math.min(Math.max(320,264+Math.min(12,lines)*27),h.height-28),x=(h.width-w)/2,y=(h.height-height)/2;
 paper(h,x,y,w,height);
 h.text('FeatureTitle','委托原文',x+34,y+20,w-160,38,22);
 h.button('close','返回',x+w-110,y+18,76,44,()=>h.close(),h.busy,false,'game');
 if(!q){h.text('QuestStoryMissing','这份委托暂不可用，请返回重新选择。',x+34,y+80,w-68,60);return;}
 h.text('QuestStoryName',q.title,x+34,y+76,w-68,42,24);
 h.line('StoryRule',[{x:x+34,y:y+128},{x:x+w-34,y:y+128}],C.line,1);
 const rows=Math.max(1,Math.floor((height-264)/27)),pages=textPages(original,columns,rows);
 selection.detailPage=Math.min(selection.detailPage,pages.length-1);
 const body=h.text('QuestStoryBody',pages[selection.detailPage],x+40,y+148,w-80,rows*27,18);body.verticalAlign=Label.VerticalAlign.TOP;body.lineHeight=27;
 h.text('QuestSignature',q.giver_name+' 留',x+40,y+height-112,w-80,28,14,C.muted);
 const bw=(w-84)/3,by=y+height-72;
 h.button('quest-story-prev','上一页',x+34,by,bw,44,()=>{selection.detailPage--;h.redraw();},h.busy||!selection.detailPage,false,'game');
 h.button('quest-story-back',`${selection.detailPage+1}/${pages.length} · 返回委托`,x+42+bw,by,bw,44,()=>h.close(),h.busy,false,'game');
 h.button('quest-story-next','下一页',x+50+bw*2,by,bw,44,()=>{selection.detailPage++;h.redraw();},h.busy||selection.detailPage>=pages.length-1,false,'game');
}
