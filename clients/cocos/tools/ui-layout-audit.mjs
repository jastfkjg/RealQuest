/** Inspect rendered Cocos labels, not just the canvas/DOM bounding rectangle. */
export async function auditPanelText(page){
 return page.evaluate(async()=>{
  const cc=await System.import('cc'),state=JSON.parse(window.render_game_to_text()),labels=[];
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  const visit=(node,inPanel=false)=>{
   inPanel=inPanel||node.name==='Panel';if(!node.activeInHierarchy)return;
   const l=node.getComponent(cc.Label),t=node.getComponent(cc.UITransform);
   if(inPanel&&l&&t&&l.string){
    const r=t.getBoundingBoxToWorld(),size=l.fontSize,line=l.lineHeight;
    ctx.font=`${l.isBold?'bold ':''}${size}px ${l.fontFamily||'Arial'}`;
    let rows=0;for(const paragraph of l.string.split('\n')){let current='';rows++;for(const char of paragraph){if(current&&ctx.measureText(current+char).width>t.width+1){rows++;current=char;}else current+=char;}}
    const x=r.x,y=state.camera.height-r.y-r.height,w=r.width,h=r.height;
    const outside=x<-.5||y<-.5||x+w>state.camera.width+.5||y+h>state.camera.height+.5;
    const clipped=rows>1&&rows*line>t.height+2;
    if(outside||clipped)labels.push({id:node.parent?.name+'/'+node.name,text:l.string,outside,clipped,rows,size,line,x,y,w,h});
   }
   node.children.forEach(child=>visit(child,inPanel));
  };visit(cc.director.getScene());return labels;
 });
}
