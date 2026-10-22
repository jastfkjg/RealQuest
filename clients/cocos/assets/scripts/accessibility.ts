/** Browser semantics for the controls that the Cocos view actually rendered. */
export type SemanticControl={id:string;label:string;x:number;y:number;w:number;h:number;disabled:boolean;pressed?:boolean};
export type SemanticField={label:string;value:string;secret?:boolean;autocomplete?:string};
export type SemanticText={id:string;text:string};
type Frame={mode:string;title:string;controls:SemanticControl[];fields:Map<string,SemanticField>;texts:SemanticText[];focusId:string;busy:boolean;message:string};
type Actions={activate:(id:string)=>void;focus:(id:string,clearInput?:boolean)=>void;escape:()=>void;key:(code:string,down:boolean,repeat:boolean)=>boolean};
const clipped='position:fixed;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);clip-path:inset(50%);white-space:pre-wrap;border:0;';

export class WebSemantics {
 private doc:any;private root:any;private heading:any;private readings:any;private status:any;
 private buttons=new Map<string,any>();private descriptions=new Map<string,any>();private paragraphs:any[]=[];
 private frame:Frame|null=null;private keyboard=false;private stack:{mode:string;focus:string}[]=[];
 private editor:{id:string;label:string}|null=null;private editorReturn='';private editorTask:any;
 private namedInputs=new Map<any,string|null>();private disposed=false;
 constructor(enabled:boolean,private actions:Actions){
  const host=globalThis as unknown as Record<string,any>;if(!enabled||!host.document?.body)return;
  this.doc=host.document;this.root=this.doc.createElement('div');this.root.id='realquest-accessibility';this.root.tabIndex=-1;this.root.style.cssText='position:fixed;inset:0;pointer-events:none;';
  this.heading=this.doc.createElement('h2');this.heading.id='realquest-accessibility-title';this.heading.style.cssText=clipped;this.root.appendChild(this.heading);this.root.setAttribute('aria-labelledby',this.heading.id);
  this.readings=this.doc.createElement('div');this.readings.style.cssText=clipped;this.root.appendChild(this.readings);
  this.status=this.doc.createElement('div');this.status.id='realquest-accessibility-status';this.status.setAttribute('role','status');this.status.setAttribute('aria-live','polite');this.status.setAttribute('aria-atomic','true');this.status.style.cssText=clipped;this.root.appendChild(this.status);
  if(host.REALQUEST_BOOT?.pending){this.root.inert=true;this.root.setAttribute('aria-hidden','true');}
  this.doc.body.appendChild(this.root);this.doc.addEventListener('keydown',this.keyDown,true);this.doc.addEventListener('keyup',this.keyUp,true);this.doc.addEventListener('pointerdown',this.pointer,true);this.doc.addEventListener('focusin',this.focusIn,true);this.doc.addEventListener('focusout',this.focusOut,true);
 }
 private canvas(){return this.doc?.querySelector('canvas');}
 private currentId(){const active=this.doc?.activeElement,id=active?.dataset?.realquestControl;return id&&this.buttons.get(id)===active?id:'';}
 private enabledIds(){return this.frame?.controls.filter(c=>!c.disabled&&this.buttons.has(c.id)).map(c=>c.id)||[];}
 private focusControl(id:string){const button=this.buttons.get(id);if(button&&!button.disabled){button.focus({preventScroll:true});return true;}return false;}
 private focusCanvas(){this.actions.focus('');this.canvas()?.focus({preventScroll:true});}
 private pointer=()=>{this.keyboard=false;this.editorReturn='';};
 private focusIn=(event:any)=>{if(event.target===this.canvas()){this.actions.focus('',this.keyboard);return;}if(this.editor&&['INPUT','TEXTAREA'].includes(event.target?.tagName)&&event.target.type!=='file')this.attachEditor();};
 private focusOut=(event:any)=>{if(['INPUT','TEXTAREA'].includes(event.target?.tagName))this.root?.removeAttribute('aria-owns');};
 private keyDown=(event:any)=>{
  if(!this.frame||event.defaultPrevented||event.isComposing)return;
  const id=this.currentId(),target=event.target,editing=this.editor&&['INPUT','TEXTAREA'].includes(target?.tagName)&&target.type!=='file',canvas=target===this.canvas()||target===this.doc.body;
  if(event.key==='Tab'&&(id||editing||canvas||target===this.root)){
   event.preventDefault();event.stopImmediatePropagation();this.keyboard=true;const ids=this.enabledIds(),current=editing?this.editor!.id:id,index=ids.indexOf(current),next=index<0?(event.shiftKey?ids.length-1:0):index+(event.shiftKey?-1:1);
   if(editing)target.blur();
   if(!ids.length)this.root.focus({preventScroll:true});else if(this.frame.mode==='world'&&(next<0||next>=ids.length))this.focusCanvas();else this.focusControl(ids[(next+ids.length)%ids.length]);return;
  }
  if(!id&&target!==this.root)return;
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();if(this.frame.mode==='world')this.focusCanvas();this.actions.escape();return;}
  if(event.key==='Enter'||event.key===' '){event.stopImmediatePropagation();if(event.repeat)event.preventDefault();return;}
  if(!event.ctrlKey&&!event.metaKey&&!event.altKey&&this.actions.key(event.code,true,!!event.repeat)){event.preventDefault();event.stopImmediatePropagation();}
 };
 private keyUp=(event:any)=>{if(!this.currentId())return;if(event.key==='Enter'||event.key===' '){event.stopImmediatePropagation();return;}if(this.actions.key(event.code,false,false)){event.preventDefault();event.stopImmediatePropagation();}};
 labelEditor(id:string,label:string){
  if(!this.doc)return;this.editor={id,label};if(this.keyboard&&this.currentId()===id)this.editorReturn=id;
  this.attachEditor();clearTimeout(this.editorTask);this.editorTask=setTimeout(()=>this.attachEditor(),0);
 }
 private attachEditor(){
  const element=this.doc?.activeElement;if(!this.editor||!['INPUT','TEXTAREA'].includes(element?.tagName)||element.type==='file')return;
  if(!this.namedInputs.has(element))this.namedInputs.set(element,element.getAttribute('aria-label'));
  element.setAttribute('aria-label',this.editor.label);if(element.id)this.root.setAttribute('aria-owns',element.id);
  const field=this.frame?.fields.get(this.editor.id);
  if(field?.autocomplete)element.setAttribute('autocomplete',field.autocomplete);else element.removeAttribute('autocomplete');
  if(field?.secret){element.setAttribute('autocapitalize','none');element.spellcheck=false;}
 }
 returnFromEditing(){if(this.keyboard&&this.editorReturn){const id=this.editorReturn;this.editorReturn='';return this.focusControl(id);}return false;}
 update(frame:Frame){
  if(!this.root||this.disposed)return;const previous=this.frame,focused=this.currentId(),wasOwned=!!focused||this.doc.activeElement===this.root;let restore='';
  for(const element of Array.from(this.namedInputs.keys()))if(!element.isConnected)this.namedInputs.delete(element);
  if(previous&&previous.mode!==frame.mode){
   const returning=this.stack.findIndex(p=>p.mode===frame.mode);
   if(returning>=0){restore=frame.focusId||this.stack[returning].focus;this.stack=this.stack.slice(0,returning);}
   else if(frame.mode==='world'){restore=frame.focusId||this.stack.find(p=>p.mode==='world')?.focus||'';this.stack=[];}
   else{this.stack.push({mode:previous.mode,focus:focused||previous.focusId});if(this.stack.length>24)this.stack.shift();}
  }
  this.frame=frame;const modal=!['world','welcome'].includes(frame.mode);this.root.setAttribute('role',modal?'dialog':'region');if(modal)this.root.setAttribute('aria-modal','true');else this.root.removeAttribute('aria-modal');this.root.setAttribute('aria-busy',String(frame.busy));if(this.heading.textContent!==frame.title)this.heading.textContent=frame.title;
  const texts=frame.texts.filter(t=>t.text&&t.text!==frame.title);
  while(this.paragraphs.length>texts.length)this.paragraphs.pop().remove();
  texts.forEach((t,i)=>{if(!this.paragraphs[i]){const p=this.doc.createElement('p');this.readings.appendChild(p);this.paragraphs.push(p);}if(this.paragraphs[i].textContent!==t.text)this.paragraphs[i].textContent=t.text;});
  if(this.status.textContent!==frame.message)this.status.textContent=frame.message;
  const ids=new Set(frame.controls.map(c=>c.id));
  for(const [id,button] of Array.from(this.buttons))if(!ids.has(id)){button.remove();this.buttons.delete(id);this.descriptions.get(id)?.remove();this.descriptions.delete(id);}
  for(const control of frame.controls){
   let button=this.buttons.get(control.id);if(!button){button=this.doc.createElement('button');button.type='button';button.dataset.realquestControl=control.id;button.style.cssText='position:fixed;opacity:0;pointer-events:none;padding:0;margin:0;border:0;';button.addEventListener('focus',()=>{this.keyboard=true;this.actions.focus(control.id);});button.addEventListener('click',()=>{const current=this.frame?.controls.find(c=>c.id===control.id);if(current&&!current.disabled)this.actions.activate(control.id);});this.root.appendChild(button);this.buttons.set(control.id,button);}
   const field=frame.fields.get(control.id),label=field?'编辑 '+field.label:control.label;button.setAttribute('aria-label',label);if(button.textContent!==label)button.textContent=label;button.disabled=control.disabled;button.style.left=(control.x-control.w/2)+'px';button.style.top=(control.y-control.h/2)+'px';button.style.width=control.w+'px';button.style.height=control.h+'px';
   if(control.pressed===undefined)button.removeAttribute('aria-pressed');else button.setAttribute('aria-pressed',String(control.pressed));
   if(field){let description=this.descriptions.get(control.id);if(!description){description=this.doc.createElement('span');description.id='realquest-field-value-'+encodeURIComponent(control.id);description.style.cssText=clipped;this.root.appendChild(description);this.descriptions.set(control.id,description);}const text='当前值：'+(field.value||'空白');if(description.textContent!==text)description.textContent=text;button.setAttribute('aria-describedby',description.id);}
   else button.removeAttribute('aria-describedby');
  }
  // Update keyed nodes in place: rebuilding the Cocos view must not blur a
  // native button or interrupt the actual EditBox composition session.
  if(this.keyboard&&wasOwned&&previous?.mode!==frame.mode){if(!this.focusControl(restore)){if(frame.mode==='world')this.focusCanvas();else if(!this.focusControl(this.enabledIds()[0]||''))this.root.focus({preventScroll:true});}}
  else if(this.keyboard&&wasOwned&&(!this.currentId()||this.buttons.get(this.currentId())?.disabled)){if(!this.focusControl(frame.focusId||''))if(!this.focusControl(this.enabledIds()[0]||''))this.root.focus({preventScroll:true});}
 }
 dispose(){
  if(!this.doc||this.disposed)return;this.disposed=true;clearTimeout(this.editorTask);this.doc.removeEventListener('keydown',this.keyDown,true);this.doc.removeEventListener('keyup',this.keyUp,true);this.doc.removeEventListener('pointerdown',this.pointer,true);this.doc.removeEventListener('focusin',this.focusIn,true);this.doc.removeEventListener('focusout',this.focusOut,true);
  for(const [element,label] of Array.from(this.namedInputs))if(element.isConnected){if(label===null)element.removeAttribute('aria-label');else element.setAttribute('aria-label',label);}this.namedInputs.clear();if(this.root.contains(this.doc.activeElement))this.canvas()?.focus({preventScroll:true});this.root.remove();this.buttons.clear();
 }
}
