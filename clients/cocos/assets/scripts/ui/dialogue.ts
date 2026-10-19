/** Keep a confirmed numeric outcome outside the speaker's words. */
export function dialogueCopy(raw:string,name:string){
  const outcome=raw.match(/ (?:体力 −\d+，)?熟悉度 \+\d+。$/u)?.[0]||'';
  const words=outcome?raw.slice(0,-outcome.length):raw;
  return {words:words.startsWith(name+'：')?words.slice(name.length+1):words,outcome:outcome.trim()};
}
/** Presentation only. Commands and encounter validity stay with the server. */
export class DialogueReader {
  private key=''; private pages:string[]=[]; private page=0; private visible=0; private replies=false;
  open(key:string,pages:string[],reduced:boolean){
    if(key!==this.key){this.key=key;this.page=0;this.visible=0;this.replies=false;}
    else if(pages.join('\f')!==this.pages.join('\f')){
      const offset=Array.from(this.pages.slice(0,this.page).join('').replace(/\n/g,'')+this.text.replace(/\n/g,'')).length;
      let count=0,index=0;for(;index<pages.length-1;index++){const n=Array.from(pages[index].replace(/\n/g,'')).length;if(count+n>=offset)break;count+=n;}
      this.page=index;this.visible=this.replies?Array.from(pages[index]||'').length:Math.max(0,offset-count);
    }
    this.pages=pages;this.page=Math.min(this.page,Math.max(0,pages.length-1));
    if(reduced)this.visible=this.length;
  }
  get length(){return Array.from(this.pages[this.page]||'').length;}
  get text(){return Array.from(this.pages[this.page]||'').slice(0,Math.floor(this.visible)).join('');}
  get typing(){return this.visible<this.length;}
  get choices(){return this.replies;}
  get more(){return this.page<this.pages.length-1;}
  tick(dt:number,reduced:boolean){if(!this.replies)this.visible=reduced?this.length:Math.min(this.length,this.visible+Math.max(0,Math.min(dt,.1))*34);}
  advance(reduced:boolean){
    if(this.replies)return;
    if(this.typing){this.visible=this.length;return;}
    if(this.more){this.page++;this.visible=reduced?this.length:0;}else this.replies=true;
  }
  snapshot(){return {page:this.page+1,pages:this.pages.length,text:this.text,typing:this.typing,choices:this.choices};}
}
