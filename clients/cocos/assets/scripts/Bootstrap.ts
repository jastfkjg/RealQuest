import {
  _decorator, Component, Node, UITransform, Graphics, Color, Label, Sprite,
  SpriteFrame, Rect, Size, Vec3, resources, view, ResolutionPolicy, input,
  Input, KeyCode, EventKeyboard, EventTouch, EditBox, BlockInputEvents,
  game, Game, sys, UIOpacity, profiler, Canvas, Widget, director, screen,
} from 'cc';
import { Client, readRecovery, type RecoveryFile } from './core/client';
import { transport, platformName, viewportSize, subscribeViewport, subscribeFocus, subscribeTextEscape, reducedMotion, textOwnsInput, chooseRecovery, downloadRecovery } from './platform';
import { serverNow } from './core/clock';
import { pathfind, walkable, currentMap, mapById, accessibleTarget } from './core/navigation';
import { interactionFor } from './core/interaction';
import { residentPositions, villageClock, clockLabel } from './core/residents';
import type { WorldObject, NavigationTarget } from './core/protocol';
const { ccclass } = _decorator;
import {C} from './ui/theme';
import {FeaturePanels,type PanelHost} from './ui/panels';
import {CombatRenderer} from './combatView';
import {combatIntention,itemNames} from './core/features';
import {caveGround,caveRouteArt} from './core/caveArt';
import {caveStatus,nextTarget} from './core/caveView';
import {paintGraphics} from './cavePaint';
import {CombatDock} from './ui/combatDock';
import {LocalSceneRenderer} from './localSceneView';
import {StorageView} from './ui/storage';
import {sceneArtPaths,sceneLayouts} from './core/sceneLayout';
import {approachRoute,localCamera,sourceActorFrame} from './core/localScene';

type Control = { id: string; label: string; x: number; y: number; w: number; h: number; disabled: boolean };

@ccclass('RealQuestSpike')
export class RealQuestSpike extends Component {
  private client = new Client(transport, () => { this.dirty = true; });
  private world = new Node('World');
  private hud = new Node('HUD');
  private touchPad = new Node('TouchPad');
  private padSize='';private padControls:Control[]=[];
  private unsubscribeText=()=>{};
  private panel = new Node('Panel');
  private actor = new Node('Player');
  private objects = new Map<string, Node>();
  private plotVisuals = new Map<string, string>();
  private actorDirection=0;private actorFrame=0;
  private npcMotion=new Map<string,{x:number;y:number;direction:number;frame:number}>();
  private frames = new Map<string, SpriteFrame>();
  private actorFrames = new Map<string, SpriteFrame>();
  private keys = new Set<number>();
  private touches=new Map<number,number>();
  private controls: Control[] = [];
  private p = { x: 240, y: 320 };
  private route: { x: number; y: number }[] = [];
  private mode = 'welcome';
  private selected = 'seed';
  private inventoryGroup=0;private inventoryPage=0;private storageView=new StorageView();
  private quick = ['seed', 'wood', 'stone', 'crop'];
  private busy = false;
  private error = '';
  private notice = '';
  private lastWorldNotice='';private worldNoticeUntil=0;
  private npc: WorldObject | null = null;
  private nameEdit: EditBox | null = null;
  private dirty = true;
  private width = 1280;
  private height = 720;
  private zoom = 2;
  private elapsed = 0;
  private lastMove = 0;
  private lastHeartbeat = -5;
  private lastRefresh = 0;
  private movePromise: Promise<unknown> | null = null;
  private loaded = false;
  private shown = true;
  private owner = transport.uuid();
  private unsubscribeViewport = () => {};
  private unsubscribeFocus = () => {};
  private resized = false;
  private sceneId = '';
  private context: WorldObject | null = null;
  private page = 0;
  private recovery: RecoveryFile | null = null;
  private recoveryPreview: any = null;
  private backedUpSaveId='';
  private actions = new Map<string, () => unknown>();
  private focusId = '';
  private lastNearby = '';
  private depths = new Map<Node, number>();
  private features=new FeaturePanels();
  private combatRenderer=new CombatRenderer(this.world,this.depths);
  private combatDock:CombatDock|null=null;
  private localScene=new LocalSceneRenderer(this.world,this.frames,this.objects,this.depths);
  private approach:{id:string;map:string}|null=null;
  private inputEpoch=0;private responseObject="";private responseUntil=0;
  private combatPending:Promise<unknown>|null=null;
  private combatLastTick=0;
  private targetId:string|null=null;
  private attackPulse=false;private sparkPulse=false;private soupPulse=false;
  private marker:NavigationTarget|null=null;private markerLabel='';
  private panelHistory:{mode:string;focus:string}[]=[];
  private lastSecond=-1;private lastNpcKeep=0;
  private actorArt() { return 'actor-' + (this.client.state?.character?.appearance || 0); }
  private map() { return currentMap(this.client.world!, this.client.state!, serverNow()); }
  private canPlay() { return ['ready','saving'].includes(this.client.status); }


  onLoad() {
    profiler.hideStats();
    for (const n of [this.world, this.hud, this.touchPad, this.panel]) { n.layer = this.node.layer; this.node.addChild(n); }
    this.world.addComponent(UITransform);
    this.world.getComponent(UITransform)!.setAnchorPoint(0, 1);
    this.world.on(Node.EventType.TOUCH_END, this.worldTouch, this);
    input.on(Input.EventType.KEY_DOWN, this.keyDown, this);
    input.on(Input.EventType.KEY_UP, this.keyUp, this);
    input.on(Input.EventType.TOUCH_END, this.touchRelease, this);
    input.on(Input.EventType.TOUCH_CANCEL, this.touchRelease, this);
    game.on(Game.EVENT_HIDE, this.hide, this);
    game.on(Game.EVENT_SHOW, this.show, this);
    view.on('canvas-resize', this.resize, this);
    this.unsubscribeViewport=subscribeViewport(()=>this.resize());
    this.unsubscribeFocus=subscribeFocus(()=>this.hide(),()=>this.show());
    this.unsubscribeText=subscribeTextEscape(()=>{this.clearInput();this.dirty=true;});
    this.combatRenderer.attachFeedback(this.node);
    this.combatDock=new CombatDock(this.node,id=>{if(id==='next-target')this.targetId=nextTarget(this.client.state!,this.targetId);else if(id==='attack')this.attackPulse=true;else if(id==='spark')this.sparkPulse=true;else this.soupPulse=true;this.dirty=true;});
    this.panel.setSiblingIndex(this.node.children.length-1);
    this.resize();
    const host = globalThis as unknown as Record<string, any>;
    host.render_game_to_text = () => JSON.stringify(this.snapshot());
    // Network/world clocks remain real: frame stepping must never mint time.
    host.advanceTime = (ms: number) => new Promise(resolve => setTimeout(resolve, Math.min(ms, 5000)));
    void this.loadArt();
  }
  onDestroy() {
    this.unsubscribeViewport();
    this.unsubscribeFocus();
    this.unsubscribeText();
    for (const frame of this.actorFrames.values()) frame.destroy();
    input.off(Input.EventType.KEY_DOWN, this.keyDown, this);
    input.off(Input.EventType.KEY_UP, this.keyUp, this);
    input.off(Input.EventType.TOUCH_END, this.touchRelease, this);
    input.off(Input.EventType.TOUCH_CANCEL, this.touchRelease, this);
    game.off(Game.EVENT_HIDE, this.hide, this);
    game.off(Game.EVENT_SHOW, this.show, this);
    view.off('canvas-resize', this.resize, this);
    const host = globalThis as unknown as Record<string, any>;
    delete host.render_game_to_text; delete host.advanceTime;
  }
  private resize() {
    const size = viewportSize() || view.getFrameSize();
    if(this.resized&&this.width===size.width&&this.height===size.height){this.alignCanvas();return;}
    this.resized=true;
    this.width = size.width || 1280; this.height = size.height || 720;
    view.setDesignResolutionSize(this.width, this.height, ResolutionPolicy.SHOW_ALL);
    this.node.getComponent(UITransform)!.setContentSize(this.width, this.height);
    if(this.client.state)this.world.getComponent(UITransform)!.setContentSize(this.map().width,this.map().height);
    this.zoom = this.client.state&&this.client.world?localCamera(this.map(),this.width,this.height):2;
    this.alignCanvas();this.scheduleOnce(()=>this.alignCanvas(),0);
    this.dirty = true;
  }
  private alignCanvas(){
    const pixels=screen.windowSize,root=director.root;
    if(root?.mainWindow&&(root.mainWindow.width!==pixels.width||root.mainWindow.height!==pixels.height))root.resize(pixels.width,pixels.height);
    this.node.getComponent(Widget)?.updateAlignment();
    const camera=this.node.getComponent(Canvas)?.cameraComponent;
    if(camera){const p=this.node.worldPosition;camera.orthoHeight=this.height/2;camera.node.setWorldPosition(p.x,p.y,1000);}
    this.dirty=true;
  }
  private async loadArt() {
    const names = ['actor-1','actor-2','actor-3','actor-4','actor-5','shop','home','workshop','library','guild','oak','oak-alt','fir','birch','shrub','board','wood','stone','bridge','grass','grass-patch','bank-stones','fence','bench','lantern','actor-0','lia-actor','noah-actor','mira-actor'];
    try {
      await Promise.all(Array.from(new Set([...sceneArtPaths,...names.map(n => `village/${n}`), ...['wood','stone','seed','crop','plank','backpack'].map(n => `items/${n}`), ...['market-counter','notice','bookcase','workbench','desk-88','desk-96','bed','hearth','planter','barrel','anvil','rug','window','chest-open','book','lantern','wall','chest-closed'].map(n=>`interiors/${n}`)])).map(path => new Promise<void>((resolve, reject) => {
        resources.load(path + '/spriteFrame', SpriteFrame, (error, frame) => {
          if (error) { reject(error); return; }
          this.frames.set(path, frame); resolve();
        });
      })));
      this.loaded = true;
    } catch { this.error = '画面资源未能载入，请刷新后重试。'; }
    this.dirty = true;
  }
  private make(parent: Node, name: string, x: number, y: number, w: number, h: number) {
    const n = new Node(name); n.layer = this.node.layer; parent.addChild(n);
    n.addComponent(UITransform).setContentSize(w, h);
    n.setPosition(x, y); return n;
  }
  private clear(node: Node) {
    for (const child of [...node.children]) child.destroy();
    node.removeAllChildren();
  }
  private box(parent: Node, name: string, x: number, y: number, w: number, h: number, color: string, radius = 12) {
    const n = this.make(parent, name, x + w / 2, -y - h / 2, w, h);
    const g = n.addComponent(Graphics); g.fillColor = new Color(color);
    g.roundRect(-w/2, -h/2, w, h, radius); g.fill(); return n;
  }
  private text(parent: Node, name: string, text: string, x: number, y: number, w: number, h: number, size = 16, color = C.ink, center = false) {
    const n = this.make(parent, name, x + w/2, -y-h/2, w, h);
    const l = n.addComponent(Label); l.string = text; l.fontSize = size; l.lineHeight = size * 1.5;
    l.color = new Color(color); l.overflow = Label.Overflow.CLAMP;
    l.horizontalAlign = center ? Label.HorizontalAlign.CENTER : Label.HorizontalAlign.LEFT;
    l.verticalAlign = Label.VerticalAlign.CENTER; return l;
  }
  private button(parent: Node, id: string, label: string, x: number, y: number, w: number, h: number, action: () => unknown, disabled = false, primary = false) {
    const n = this.box(parent, id, x, y, w, h, disabled ? '#d0d7bf' : primary ? C.moss : C.raised, 10);
    const text = this.text(n, 'Label', label, -w/2+8, -h/2, w-16, h, 16, primary && !disabled ? C.raised : C.ink, true);
    if(!disabled)this.actions.set(id,action);
    if(this.focusId===id){const g=n.getComponent(Graphics)!;g.strokeColor=new Color(C.amber);g.lineWidth=3;g.roundRect(-w/2-2,-h/2-2,w+4,h+4,10);g.stroke();}
    const opacity = n.addComponent(UIOpacity);
    n.on(Node.EventType.MOUSE_ENTER,()=>{if(!disabled)opacity.opacity=225;});
    n.on(Node.EventType.MOUSE_LEAVE,()=>{opacity.opacity=255;});
    n.on(Node.EventType.TOUCH_START, () => { if (!disabled) opacity.opacity=195; });
    n.on(Node.EventType.TOUCH_CANCEL, () => { opacity.opacity=255; });
    n.on(Node.EventType.TOUCH_END, () => { opacity.opacity=255; });
    n.on(Node.EventType.TOUCH_END, (event: EventTouch) => { event.propagationStopped = true; if (!disabled) action(); });
    // All controls are recorded in design pixels, excluding credentials.
    const wp = n.worldPosition;
    this.controls.push({ id, label, x: wp.x, y: this.height-wp.y, w, h, disabled });
    return text;
  }
  private image(parent: Node, path: string, x: number, y: number, w: number, h: number) {
    const sf = this.frames.get(path); if (!sf) return null;
    const n = this.make(parent, path, x, -y, w, h);
    const sprite = n.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.spriteFrame = sf;
    n.getComponent(UITransform)!.setContentSize(w,h);
    return n;
  }
  private async startJourney() {
    if (this.busy || !this.loaded) return;
    const name = this.nameEdit?.string.trim() || '林间旅人';
    this.busy = true; this.error = ''; this.dirty = true;
    try {
      await this.client.boot();
      if (!this.client.state!.character) await this.client.command('create', { name, appearance: 0 });
      this.p = { ...this.client.state!.position };
      if(!mapById(this.client.world!,this.client.state!.location))throw new Error('服务器返回了未知地点，已保留原存档');
      try { this.quick = JSON.parse(sys.localStorage.getItem('realquest-cocos-quick-v1') || 'null') || this.quick; } catch { /* Optional UI preference. */ }
      this.mode = 'world'; this.buildWorld();
      await this.client.command('world_resume', { owner: this.owner });
    } catch (error) { this.error = (error as Error).message; }
    finally { this.busy = false; this.dirty = true; }
  }
  private buildWorld() {
    this.combatRenderer.reset();this.targetId=null;
    this.clearInput(); this.clear(this.world); this.objects.clear(); this.plotVisuals.clear(); this.npcMotion.clear();this.depths.clear();
    const map = this.map(); this.sceneId=map.id;
    this.world.getComponent(UITransform)!.setContentSize(map.width, map.height);
    this.zoom=localCamera(map,this.width,this.height);
    const fineScene=this.localScene.build(map);
    const camera=this.node.getComponent(Canvas)?.cameraComponent;if(camera)camera.clearColor=new Color(map.id==='overworld'?'#78955e':fineScene?'#27352d':'#000000');
    if(!fineScene){
    const ground = new Node('Ground'); ground.layer = this.node.layer; this.world.addChild(ground);
    const g = ground.addComponent(Graphics);
    const rect = (x: number, y: number, w: number, h: number, c: string) => { g.fillColor = new Color(c); g.rect(x,-y-h,w,h); g.fill(); };
    if(map.id==='overworld'){
    rect(0,0,map.width,map.height,'#8da878');
    for (let i=0;i<1000;i++) { const x=(i*173)%1920, y=(i*317)%1280; rect(x,y,4+(i%3)*3,2,i%2?'#9bb684':'#809d6f'); }
    rect(32,324,1784,52,'#c8bc8b'); rect(124,210,56,380,'#c8bc8b'); rect(310,210,48,170,'#c8bc8b');
    rect(678,208,52,160,'#c8bc8b'); rect(808,350,48,360,'#c8bc8b');
    rect(1184,864,224,176,'#689e9b');rect(1232,816,128,48,'#689e9b');rect(1232,1040,128,32,'#689e9b');
    rect(448,0,64,1280,'#689e9b'); rect(456,0,12,1280,'#7eb0a7');
    for (const y of [320,872]) this.image(this.world,'village/bridge',480,y+20,104,76);
    } else if(map.id.startsWith('cave_')){
      paintGraphics(g,caveGround(map));
    } else if(map.outdoor){
      rect(0,0,map.width,map.height,map.id==='city'?'#a5a47e':'#8da878');
      rect(48,map.height*0.6,map.width-96,44,'#c8bc8b');
      for(const [x,y,w,h] of map.obstacles)if(w>40&&h>40)rect(x,y,w,h,map.id==='crossing'&&h===map.height?'#689e9b':'#8b8267');
    } else {
      rect(0,0,map.width,map.height,'#4c4032');
      rect(40,20,map.width-80,map.height-36,'#af8453');
      for(let y=64;y<map.height-24;y+=16)rect(48,y,map.width-96,1,'#886746');
      for(let y=64;y<map.height-24;y+=16)for(let x=48+(y%32?32:0);x<map.width-48;x+=64)rect(x,y,1,16,'#96724a');
      for(let i=0;i<3;i++)this.image(this.world,'interiors/wall',112+i*128,32,128,72.5);
      for(const x of [112,368])this.image(this.world,'interiors/window',x,40,40,33);
      for(const f of map.furniture||[]){
        const [x,y,w,h]=f.rect;
        if(f.kind==='rug'){this.image(this.world,'interiors/rug',x+w/2,y+h/2,w,h);continue;}
        const id=map.id==='shop'&&f.kind==='workbench'?'market-counter':({books:'bookcase',shelf:'bookcase',fireplace:'hearth',plant:'planter',chest:'chest-closed',desk:'desk-'+w} as Record<string,string>)[f.kind]||f.kind;
        const sf=this.frames.get('interiors/'+id);
        if(sf){const n=this.image(this.world,'interiors/'+id,x+w/2,y+h-sf.height/4,sf.width/2,sf.height/2)!;this.depths.set(n,y+h);}
      }
      this.box(this.world,'DoorMat',216,328,48,16,'#716145',2);
    }
    for (let i=0;i<map.trees.length;i++) { const [x,y]=map.trees[i],name=i%3?'oak':'birch'; const frame=this.frames.get('village/'+name)!; const n=this.image(this.world,'village/'+name,x,y+12-frame.height/4,frame.width/2,frame.height/2)!;this.depths.set(n,y+12); }
    for (const obj of map.objects) {
      const art = obj.kind === 'building' ? obj.id : ['wood','stone','board'].includes(obj.kind) ? obj.kind : '';
      if (!art || !this.frames.has('village/'+art)) continue;
      const sf = this.frames.get('village/'+art)!;
      const w=sf.width/2,h=sf.height/2;
      const x=obj.rect?obj.rect[0]+obj.rect[2]/2:obj.x, y=obj.rect?obj.rect[1]+obj.rect[3]:obj.y+4;
      const node=this.image(this.world,'village/'+art,x,y-h/2,w,h)!; this.objects.set(obj.id,node);this.depths.set(node,y);
    }
    }
    for(const obj of map.objects.filter(o=>!this.objects.has(o.id)&&!['plot','npc','travel_npc'].includes(o.kind))){
      if(obj.kind==='cave'||obj.id==='village_departure'){
        const n=this.make(this.world,obj.id,0,0,128,128);paintGraphics(n.addComponent(Graphics),caveRouteArt(obj,this.client.state!));this.objects.set(obj.id,n);this.depths.set(n,obj.y);continue;
      }
      if(fineScene&&obj.kind==='exit')continue;
      const color=['building','exit','passage','cave'].includes(obj.kind)?C.wood:C.moss;
      const n=this.box(this.world,obj.id,obj.x-8,obj.y-10,16,18,color,2);this.objects.set(obj.id,n);this.depths.set(n,obj.y);
      if(!map.outdoor&&map.id!=='overworld'&&obj.kind!=='exit'&&obj.kind!=='cave')n.active=false;
    }
    for(const obj of map.objects.filter(o=>o.kind==='travel_npc')){
      const n=this.make(this.world,obj.id,obj.x,-obj.y,24,32),g=n.addComponent(Graphics);
      g.fillColor=new Color(C.wood);g.roundRect(-7,0,14,18,3);g.fill();g.fillColor=new Color(C.paper);g.circle(0,23,6);g.fill();g.strokeColor=new Color(C.ink);g.lineWidth=2;g.moveTo(-4,0);g.lineTo(-4,-6);g.moveTo(4,0);g.lineTo(4,-6);g.stroke();
      this.objects.set(obj.id,n);this.depths.set(n,obj.y);
    }
    for (const obj of map.objects.filter(o=>o.kind==='plot')) {
      const n=this.box(this.world,obj.id,obj.x-17,obj.y-15,34,28,'#866647',3); this.objects.set(obj.id,n);
    }
    this.actor = this.make(this.world,'Player',this.p.x,-this.p.y,32,128/3);
    this.actor.getComponent(UITransform)!.setAnchorPoint(.5,0);
    this.actor.addComponent(Sprite).sizeMode=Sprite.SizeMode.CUSTOM;
    this.setActor(this.actor,this.actorArt(),0);this.depths.set(this.actor,this.p.y);
  }
  private setActor(n: Node, name: string, frame: number) {
    const sf = this.frames.get('village/'+name); if(!sf) return;
    const key=name+':'+frame;
    let f=this.actorFrames.get(key);
    if(!f){f = new SpriteFrame(); f.texture=sf.texture; f.rect=new Rect((frame%4)*48,Math.floor(frame/4)*64,48,64); f.originalSize=new Size(48,64);this.actorFrames.set(key,f);}
    n.getComponent(Sprite)!.spriteFrame=f;if(n===this.actor)this.actorFrame=frame;
  }
  private supportedObjects() {
    if (!this.client.world || !this.client.state) return [];
    return this.map().objects;
  }
  private nearest() { return this.supportedObjects().filter(o=>Math.hypot(o.x-this.p.x,o.y-this.p.y)<65).sort((a,b)=>Math.hypot(a.x-this.p.x,a.y-this.p.y)-Math.hypot(b.x-this.p.x,b.y-this.p.y)||Number(b.kind==='npc')-Number(a.kind==='npc'))[0]; }
  private keyDown(e: EventKeyboard) {
    if(textOwnsInput() || (e as any).isComposing)return;
    if(e.keyCode===KeyCode.TAB){const ids=this.controls.filter(c=>!c.disabled&&this.actions.has(c.id)).map(c=>c.id);const i=ids.indexOf(this.focusId);this.focusId=ids[(i+1)%ids.length]||'';this.dirty=true;return;}
    if((e.keyCode===KeyCode.ENTER||e.keyCode===KeyCode.SPACE)&&this.focusId){this.actions.get(this.focusId)?.();return;}
    if (this.mode==='welcome') return;
    if(e.keyCode===KeyCode.ESCAPE){this.clearInput();this.dirty=true;if(this.mode==='world')return;if(!this.busy){this.recovery=null;this.recoveryPreview=null;this.closePanel();}return;}
    if(e.keyCode===KeyCode.KEY_I){ this.open(this.mode==='inventory'?'world':'inventory'); return; }
    if(e.keyCode===KeyCode.KEY_J){this.navigate('journal');return;}
    if(e.keyCode===KeyCode.KEY_M){this.navigate('map');return;}
    if(e.keyCode===KeyCode.KEY_L){ this.open(this.mode==='life'?'world':'life'); return; }
    if(this.mode!=='world') return;
    if(e.keyCode>=KeyCode.DIGIT_1&&e.keyCode<=KeyCode.DIGIT_4){this.selected=this.quick[e.keyCode-KeyCode.DIGIT_1];this.open('inventory');return;}
    if(e.keyCode===KeyCode.KEY_T&&this.client.state?.location.startsWith('cave_')){this.targetId=nextTarget(this.client.state,this.targetId);this.dirty=true;return;}
    if(e.keyCode===KeyCode.KEY_E) { if(this.keys.has(e.keyCode))return;void this.interact();this.keys.add(e.keyCode); return; }
    if([KeyCode.KEY_W,KeyCode.KEY_A,KeyCode.KEY_S,KeyCode.KEY_D,KeyCode.ARROW_UP,KeyCode.ARROW_DOWN,KeyCode.ARROW_LEFT,KeyCode.ARROW_RIGHT].includes(e.keyCode)){this.route=[];this.approach=null;this.dirty=true;} this.keys.add(e.keyCode);
  }
  private touchRelease(event:EventTouch){this.touches.delete((event.getID()??0));}
  private keyUp(e: EventKeyboard) { this.keys.delete(e.keyCode); }
  private clearInput() { this.inputEpoch++;this.approach=null;this.keys.clear();this.touches.clear(); this.route=[];this.attackPulse=this.sparkPulse=this.soupPulse=false;this.combatDock?.release(); }
  private hide() { this.shown=false; this.clearInput(); if(this.client.state&&this.canPlay()) void this.client.command('world_pause',{owner:this.owner}).catch(()=>{}); }
  private show() { this.shown=true; this.clearInput(); if(this.client.state) void this.client.refresh().then(()=>{this.p={...this.client.state!.position};this.dirty=true;}).catch(e=>{this.error=e.message;this.dirty=true;}); this.lastHeartbeat=-5; }
  private open(mode: string) {
    if(mode==='world'){this.panelHistory=[];const lease=this.client.state?.npc_encounter;if(lease&&this.canPlay())void this.client.command('npc_release',{token:lease.token}).catch(()=>{});}
    this.features.reset();this.mode=mode; this.page=0;this.focusId=''; this.clearInput(); this.error=''; this.dirty=true;
    if(this.client.state?.character&&this.canPlay()) void this.client.command(mode==='world'?'world_resume':'world_pause',{owner:this.owner}).catch(e=>{this.error=e.message;this.dirty=true;});
  }
  private worldTouch(e: EventTouch) {
    if(this.mode!=='world'||this.busy||!this.client.world||!this.canPlay())return;
    const u=e.getUILocation(), local=this.node.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(u.x,u.y));
    const x=(local.x-this.world.position.x)/this.zoom, y=-(local.y-this.world.position.y)/this.zoom;
    const enemy=this.client.state?.combat?.enemies.find(enemy=>enemy.hp>0&&Math.hypot(enemy.x-x,enemy.y-y)<(enemy.kind==='boss'?36:26));
    if(this.client.state?.location.startsWith('cave_')&&enemy){this.targetId=enemy.id;this.dirty=true;return;}
    const obj=this.supportedObjects().filter(o=>this.localScene.hit(o,x,y)).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)||Number(b.kind==='npc')-Number(a.kind==='npc'))[0];
    if(obj&&Math.hypot(obj.x-this.p.x,obj.y-this.p.y)<65) { void this.interact(obj); return; }
    this.clearInput();
    this.route=obj?approachRoute(this.map(),this.p,obj):pathfind(this.map(),this.p,{x,y});
    this.approach=obj&&this.route.length?{id:obj.id,map:this.sceneId}:null;
    if(!this.route.length)this.error='这里无法通行，试试门前或小路。';
    this.dirty=true;
  }

  private async syncMove() {
    if(this.movePromise) await this.movePromise;
    if(this.client.state?.location.startsWith('cave_')){if(this.combatPending)await this.combatPending;return;}
    if(!this.canPlay()||!this.client.state||Math.hypot(this.p.x-this.client.state.position.x,this.p.y-this.client.state.position.y)<0.5)return;
    this.movePromise=this.client.command('move',{x:this.p.x,y:this.p.y,location:this.client.state.location});
    try { await this.movePromise; }
    catch(e) { this.p={...this.client.state.position}; this.error=(e as Error).message; this.clearInput(); }
    finally { this.movePromise=null; this.dirty=true; }
  }
  private async interact(obj=this.nearest()) {
    if(!obj||this.busy||this.mode!=='world'||!this.canPlay())return;
    this.clearInput(); const epoch=this.inputEpoch;this.busy=true; this.error='';this.responseObject=obj.id;this.responseUntil=Infinity; this.dirty=true;
    try {
      await this.syncMove();
      if(epoch!==this.inputEpoch||!this.shown||this.mode!=='world'||textOwnsInput())return;
      if(Math.hypot(obj.x-this.client.state!.position.x,obj.y-this.client.state!.position.y)>65)throw new Error('尚未走到目标附近，请再靠近一些。');
      this.context=obj;
      if(obj.kind==='npc') {
        const reply=await this.client.command('talk',{target:obj.id}); this.npc=obj;this.features.npcTab='talk'; this.notice=reply.message||''; this.open('dialogue');
      } else if(['passage','travel','travel_npc','rest','storage','cave','station','study','market','board','armory','spellbook'].includes(obj.kind)){
        if(this.sceneId==='home'&&!reducedMotion()){await new Promise(resolve=>setTimeout(resolve,180));if(epoch!==this.inputEpoch||this.mode!=='world'||!this.shown)return;}
        this.open(({rest:'sleep',storage:'storage',station:'building',study:'life',market:'shop',board:'quests',armory:'armory',spellbook:'spellbook',cave:'cave'} as Record<string,string>)[obj.kind]||(['passage','travel','travel_npc'].includes(obj.kind)?(obj.id==='village_departure'&&!this.client.state!.combat?.gate_open?'gate':'travel'):'context'));
      } else {
        const action=interactionFor(obj,this.client.state!,serverNow());
        if(action.reason)throw new Error(action.reason);
        const reply=await this.client.command(action.command!,{target:obj.id}); this.notice=reply.message||'';
      }
    } catch(e) { this.error=(e as Error).message; }
    finally { this.busy=false;this.responseUntil=this.elapsed+.7; this.dirty=true; }
  }
  update(dt: number) {
    this.elapsed+=dt;
    if(this.notice!==this.lastWorldNotice){this.lastWorldNotice=this.notice;this.worldNoticeUntil=this.elapsed+3.2;this.dirty=true;}
    if(this.client.state?.character&&this.client.world&&this.sceneId!==this.client.state.location){this.p={...this.client.state.position};this.buildWorld();this.dirty=true;}
    if(this.client.state&&this.mode==='world'&&this.shown&&this.canPlay()) {
      // Creator's array-spread transform assumes arrays, not Map iterators.
      const touchKeys=Array.from(this.touches.values());
      let dx=Number(this.keys.has(KeyCode.KEY_D)||this.keys.has(KeyCode.ARROW_RIGHT)||touchKeys.includes(KeyCode.ARROW_RIGHT))-Number(this.keys.has(KeyCode.KEY_A)||this.keys.has(KeyCode.ARROW_LEFT)||touchKeys.includes(KeyCode.ARROW_LEFT));
      let dy=Number(this.keys.has(KeyCode.KEY_S)||this.keys.has(KeyCode.ARROW_DOWN)||touchKeys.includes(KeyCode.ARROW_DOWN))-Number(this.keys.has(KeyCode.KEY_W)||this.keys.has(KeyCode.ARROW_UP)||touchKeys.includes(KeyCode.ARROW_UP));
      if(this.route.length){const to=this.route[0],from=this.client.state.location.startsWith('cave_')?this.client.state.position:this.p,d=Math.hypot(to.x-from.x,to.y-from.y);if(d<8)this.route.shift();else{const scale=this.client.state.location.startsWith('cave_')?Math.min(1,d/40):1;dx=(to.x-from.x)/d*scale;dy=(to.y-from.y)/d*scale;}}
      if(!this.route.length&&this.approach){const intent=this.approach;this.approach=null;this.dirty=true;const obj=this.supportedObjects().find(o=>o.id===intent.id);if(obj&&intent.map===this.sceneId&&Math.hypot(obj.x-this.p.x,obj.y-this.p.y)<=65)void this.interact(obj);else this.error='目标已离开这里，请重新选择。';}
      const length=Math.max(1,Math.hypot(dx,dy)), step=Math.min(dt,0.05)*120;
      const cave=this.client.state.location.startsWith('cave_');
      const next={x:this.p.x+dx/length*step,y:this.p.y+dy/length*step};
      if(cave){this.updateCombat(dx,dy);const to=this.client.state.position,factor=Math.min(1,dt*18);this.p.x+=(to.x-this.p.x)*factor;this.p.y+=(to.y-this.p.y)*factor;}
      if(!cave&&!this.busy&&walkable(this.map(),next.x,this.p.y))this.p.x=next.x;
      if(!cave&&!this.busy&&walkable(this.map(),this.p.x,next.y))this.p.y=next.y;
      this.actor.setPosition(this.p.x,-this.p.y);
      if(dx||dy)this.actorDirection=Math.abs(dx)>Math.abs(dy)?(dx>0?3:2):(dy<0?1:0);
      this.setActor(this.actor,this.actorArt(),sourceActorFrame(this.actorDirection,!!(dx||dy),this.elapsed,reducedMotion()));
      if(!cave&&!this.movePromise&&this.elapsed-this.lastMove>0.18){this.lastMove=this.elapsed;void this.syncMove();}
      if(this.elapsed-this.lastHeartbeat>3){this.lastHeartbeat=this.elapsed;void this.client.command('world_resume',{owner:this.owner}).catch(()=>{});}
      if(this.elapsed-this.lastRefresh>5){this.lastRefresh=this.elapsed;void this.client.refresh().catch(()=>{});}
      const map=this.map(), halfW=this.width/this.zoom/2, halfH=this.height/this.zoom/2;
      this.world.setScale(this.zoom,this.zoom,1);
      this.world.setPosition(-(map.width<halfW*2?map.width/2:Math.max(halfW,Math.min(map.width-halfW,this.p.x)))*this.zoom,(map.height<halfH*2?map.height/2:Math.max(halfH,Math.min(map.height-halfH,this.p.y-(map.id==='overworld'&&this.height>=560?96:0))))*this.zoom);
      this.combatRenderer.draw(this.client.state,this.targetId,reducedMotion(),{x:this.world.position.x,y:this.world.position.y,zoom:this.zoom,width:this.width,height:this.height});
      for(const [id,node] of this.objects)if(['lia','noah','mira'].includes(id))node.active=false;
      for(const obj of this.supportedObjects()){
        let n=this.objects.get(obj.id);
        if(obj.kind==='npc'&&!n){n=this.make(this.world,obj.id,obj.x,-obj.y,32,128/3);n.getComponent(UITransform)!.setAnchorPoint(.5,0);n.addComponent(Sprite).sizeMode=Sprite.SizeMode.CUSTOM;this.setActor(n,obj.id+'-actor',0);this.objects.set(obj.id,n);}
        if(obj.kind==='npc'&&n){n.active=true;const before=this.npcMotion.get(obj.id),dx=before?obj.x-before.x:0,dy=before?obj.y-before.y:0,moving=!!obj.walking&&Math.hypot(dx,dy)>.005,direction=moving?(Math.abs(dx)>Math.abs(dy)?(dx>0?3:2):(dy<0?1:0)):(before?.direction||0),frame=sourceActorFrame(direction,moving,this.elapsed,reducedMotion());this.setActor(n,obj.id+'-actor',frame);this.npcMotion.set(obj.id,{x:obj.x,y:obj.y,direction,frame});n.setPosition(obj.x,-obj.y);this.depths.set(n,obj.y);}
        if(n&&['wood','stone'].includes(obj.kind))n.active=(this.client.state.gathered[obj.id]||0)<=serverNow();
        if(n&&obj.kind==='plot'){
          const crop=this.client.state.plots[obj.id], visual=crop?(crop.ready_at<=serverNow()?'ready':'growing'):'empty';
          if(this.plotVisuals.get(obj.id)!==visual){
            this.plotVisuals.set(obj.id,visual);this.clear(n);
            const g=n.getComponent(Graphics)!;g.clear();g.fillColor=new Color('#866647');g.roundRect(-17,-14,34,28,3);g.fill();
            if(visual==='ready')this.image(n,'items/crop',0,-3,24,24);
            else if(visual==='growing'){g.strokeColor=new Color(C.moss);g.lineWidth=2;for(const x of [-8,3]){g.moveTo(x,-6);g.lineTo(x,6);g.stroke();g.fillColor=new Color('#aac282');g.ellipse(x-3,4,4,2);g.fill();g.ellipse(x+3,7,4,2);g.fill();}}
          }
        }
      }
    }
    if(this.client.state?.character&&this.client.world&&this.sceneId!==this.client.state.location){this.p={...this.client.state.position};this.buildWorld();this.dirty=true;}
    if(this.client.state&&this.client.world)this.localScene.update(this.client.state,this.p,this.mode==='world'?this.nearest():undefined,this.route,this.mode!=='world'?this.context?.id:this.elapsed<this.responseUntil?this.responseObject:undefined,this.busy,reducedMotion(),this.elapsed);
    this.depths.set(this.actor,this.p.y);
    [...this.world.children].sort((a,b)=>(this.depths.get(a)||-1000)-(this.depths.get(b)||-1000)).forEach((n,i)=>n.setSiblingIndex(i));
    const nearby=this.nearest(), signature=(nearby?.id||'')+JSON.stringify(nearby&&this.client.state?interactionFor(nearby,this.client.state,serverNow()):null);
    if(signature!==this.lastNearby){this.lastNearby=signature;this.dirty=true;}
    if(this.client.state&&this.mode!=='welcome'&&Math.floor(this.elapsed)!==this.lastSecond){this.lastSecond=Math.floor(this.elapsed);this.dirty=true;}
    if(this.shown&&this.mode!=='world'&&this.context?.kind==='npc'&&this.client.state?.npc_encounter&&this.elapsed-this.lastNpcKeep>10&&this.canPlay()){
      this.lastNpcKeep=this.elapsed;void this.client.command('npc_keep',{token:this.client.state.npc_encounter.token}).catch(()=>{});
    }
    if(this.dirty&&(!textOwnsInput()||this.busy)){this.dirty=false;this.drawUI();}
  }
  private drawUI() {
    this.clear(this.hud); this.clear(this.panel); this.controls=[];this.actions.clear();
    this.hud.setPosition(-this.width/2,this.height/2); this.panel.setPosition(-this.width/2,this.height/2);
    this.touchPad.active=this.mode==='world'&&this.width<1000;
    if(this.mode!=='world')this.combatRenderer.hide();
    if(this.mode!=='world'||!this.client.state?.location.startsWith('cave_'))this.combatDock?.hide();
    if(this.mode==='welcome'){this.welcome();return;}
    if(this.mode==='session'){this.drawSession();return;}
    const s=this.client.state!;
    if(sceneLayouts[s.location]){
      const clock=villageClock(s,serverNow());
      this.box(this.hud,'LocalStatus',20,20,284,90,'#233d31',8);
      this.text(this.hud,'LocalTitle',this.map().name,32,25,260,28,19,C.raised);
      this.text(this.hud,'LocalVitals',`生命 ${s.vitality?.current??100}  体力 ${Math.floor(s.stamina?.current??100)}  金币 ${s.inventory.gold||0}`,32,54,260,24,14,C.paper);
      this.text(this.hud,'LocalClock',`第 ${clock.day} 天 · ${clockLabel(clock.minute)}  · ${this.busy?'正在回应…':this.connectionLabel()}`,32,80,260,22,13,'#d7ddc7');
    } else if(!s.location.startsWith('cave_')){
      this.box(this.hud,'Brand',20,20,270,74,C.paper);
      this.text(this.hud,'BrandTitle','RealQuest · 林间旅程',36,28,235,28,20);
      this.text(this.hud,'SaveStatus',this.busy?'正在保存…':this.map().name+' · '+this.connectionLabel(),36,58,235,24,14,C.muted);
    }
    this.button(this.hud,'menu','旅程',this.width-392,20,72,48,()=>this.navigate('menu'));
    this.button(this.hud,'session','存档',this.width-308,20,72,48,()=>this.open('session'));
    this.button(this.hud,'inventory','行囊  I',this.width-224,20,96,48,()=>this.open('inventory'));
    this.button(this.hud,'life','成长  L',this.width-116,20,96,48,()=>this.navigate('life'));
    const n=this.nearest(), action=n?interactionFor(n,s,serverNow()):null;
    const local=!!sceneLayouts[s.location],walking=!!this.route.length&&local;
    const caption=this.busy?'正在回应…':walking?`${this.approach?this.supportedObjects().find(o=>o.id===this.approach!.id)?.name||'目的地':'选定位置'}
停止行走 · Esc`:n?local?`${n.name===action!.label?'':n.name+'\n'}${action!.reason||action!.label}  E`:action!.reason||`${action!.label}  E`:s.location.startsWith('cave_')?'走近阶梯或休息平台':'点击门口或家具 · 可自动走近';
    this.button(this.hud,walking?'stop-walk':'interact',caption,this.width-(local?288:272),this.height-(local?80:76),local?268:252,local?60:56,()=>{if(walking){this.clearInput();this.dirty=true;}else void this.interact();},!walking&&(!n||this.busy||!this.canPlay()||!!action?.reason),true);
    if(!s.location.startsWith('cave_')&&this.width>=1000){this.box(this.hud,'MovementHintGround',20,this.height-42,378,30,'#233d31',4);this.text(this.hud,'MovementHint','WASD 移动 · 点击走近交互 · Esc 停步',28,this.height-40,362,26,14,C.paper);}
    this.drawTouchPad();
    if(!this.canPlay()&&!this.busy)this.button(this.hud,'reconnect','重连并确认待保存操作',20,106,270,44,()=>this.reconnect(),false,true);
    if((this.error||this.notice&&(!sceneLayouts[s.location]||this.elapsed<this.worldNoticeUntil))&&this.mode==='world'&&!s.location.startsWith('cave_')){
      const x=Math.max(200,(this.width-480)/2),w=Math.min(480,this.width-x-20),yy=this.height-(s.location.startsWith('cave_')&&this.width<1000?198:134);
      this.box(this.hud,'FeedbackPaper',x,yy,w,52,C.paper,8);
      this.text(this.hud,'Feedback',this.error||this.notice,x+12,yy+4,w-24,44,15,this.error?C.danger:C.ink,true);
    }
    this.drawStatus();
    if(this.mode!=='world')this.drawPanel();
  }
  private drawTouchPad(){
    this.touchPad.active=this.mode==='world'&&this.width<1000;if(!this.touchPad.active)return;
    this.touchPad.setPosition(-this.width/2,this.height/2);const size=this.width+':'+this.height;
    // Keep touch targets alive while network receipts rebuild the surrounding HUD.
    if(this.padSize===size){this.controls.push(...this.padControls);return;}
    this.clear(this.touchPad);this.touches.clear();this.padSize=size;const start=this.controls.length;
    for(const [id,label,x,y,key] of [['up','↑',76,this.height-174,KeyCode.ARROW_UP],['left','←',24,this.height-122,KeyCode.ARROW_LEFT],['down','↓',76,this.height-122,KeyCode.ARROW_DOWN],['right','→',128,this.height-122,KeyCode.ARROW_RIGHT]] as const){
      this.button(this.touchPad,id,label,x,y,48,48,()=>{});const b=this.touchPad.getChildByName(id)!;
      b.on(Node.EventType.TOUCH_START,(event:EventTouch)=>{this.route=[];this.approach=null;this.dirty=true;this.touches.set(event.getID()??0,key);});
      b.on(Node.EventType.TOUCH_END,this.touchRelease,this);b.on(Node.EventType.TOUCH_CANCEL,this.touchRelease,this);
    }
    this.padControls=this.controls.slice(start);
  }
  private welcome() {
    this.box(this.panel,'Backdrop',0,0,this.width,this.height,'#dee3cf',0);
    const w=Math.min(850,this.width-40),h=Math.min(500,this.height-40),x=(this.width-w)/2,y=(this.height-h)/2;
    this.box(this.panel,'WelcomePaper',x,y,w,h,C.paper,18);
    const home=this.frames.get('village/home');
    this.image(this.panel,'village/home',x+w-180,y+h/2,260,home?260*home.height/home.width:260);
    const compact=h<430;
    this.text(this.panel,'Title','RealQuest',x+36,y+(compact?20:30),w-72,compact?44:52,compact?32:38);
    this.text(this.panel,'Subtitle','从林间，继续你的旅程。',x+38,y+(compact?70:88),w-76,compact?32:40,compact?20:22);
    this.text(this.panel,'WelcomeNote',compact&&this.error?this.error:'走一走，拾起落枝，和村民聊聊天。\n这份旅程会保存到服务器。',x+38,y+(compact?110:138),Math.min(400,w-76),compact?48:64,compact?15:16,compact&&this.error?C.danger:C.muted);
    const n=this.make(this.panel,'NameInput',x+168,-y-(h<430?194:242),260,48);
    const edit=n.addComponent(EditBox); edit.maxLength=16;
    for (const child of [...n.children]) child.destroy();
    const bg=n.addComponent(Graphics);bg.fillColor=new Color(C.raised);bg.roundRect(-130,-24,260,48,8);bg.fill();
    const t=this.text(n,'Text','',-118,-24,236,48,16); const ph=this.text(n,'Placeholder','旅人名字（可留空）',-118,-24,236,48,16,C.muted);
    edit.textLabel=t;edit.placeholderLabel=ph;this.nameEdit=edit;
    this.button(this.panel,'start',this.busy?'正在连接…':(sys.localStorage.getItem('realquest-session-v2')||sys.localStorage.getItem('realquest-cocos-guest-v1'))?'继续旅程':'开始旅程',x+38,y+h-112,260,52,()=>this.startJourney(),this.busy||!this.loaded,true);
    this.button(this.panel,'import-save','接续已有旅程',x+314,y+h-112,180,52,()=>this.open('session'),this.busy);
    this.text(this.panel,'ScopeNote','本地迁移小样 · 可用旅程凭证接续原 Web 存档',x+38,y+h-46,w-76,28,14,C.muted);
    if(this.error&&!compact)this.text(this.panel,'ConnectionError',this.error,x+38,y+h-160,w-76,44,15,C.danger);
  }
  private drawPanel() {
    this.controls=[];this.actions.clear();
    const overlay=this.box(this.panel,'ModalScrim',0,0,this.width,this.height,'#263b32b8',0);overlay.addComponent(BlockInputEvents);
    if(this.mode==='storage'){this.storageView.draw(this.panelHost());return;}
    if(this.features.handles(this.mode)){this.features.draw(this.panelHost());return;}
    const w=Math.min(880,this.width-40),h=Math.min(this.mode==='inventory'?430:['travel','storage','sleep','context'].includes(this.mode)?440:320,this.height-32),x=(this.width-w)/2,y=(this.height-h)/2;
    this.box(this.panel,'ReadingLeaf',x,y,w,h,C.paper,16);
    const title=this.mode==='inventory'?'旅人的行囊':(this.context?.name||'旅途安排');
    this.text(this.panel,'PanelTitle',title,x+28,y+16,w-110,40,24);
    this.button(this.panel,'close','返回',x+w-96,y+14,72,44,()=>this.closePanel(),this.busy);
    const s=this.client.state!;
    if(this.mode==='inventory'){
      const names=itemNames,base=['seed','wood','stone','crop','plank'];
      this.button(this.panel,'inventory-group',this.inventoryGroup?'装备与战利品':'农田与材料',x+w-316,y+14,200,44,()=>{this.inventoryGroup=1-this.inventoryGroup;this.inventoryPage=0;this.dirty=true;});
      const all=this.inventoryGroup?Object.keys(names).filter(id=>id!=='gold'&&!base.includes(id)):base,ids=all.slice(this.inventoryPage*5,this.inventoryPage*5+5),slot=64,gap=12,columns=this.width<700?2:3;
      ids.forEach((id,i)=>{const sx=x+28+(i%columns)*(slot+gap),sy=y+80+Math.floor(i/columns)*(slot+gap);this.button(this.panel,'item-'+id,'',sx,sy,slot,slot,()=>{this.selected=id;this.dirty=true;},false,this.selected===id);if(this.frames.has('items/'+id))this.image(this.panel,'items/'+id,sx+32,sy+24,32,32);else this.text(this.panel,'ItemGlyph-'+id,names[id],sx+4,sy+4,slot-8,38,12,this.selected===id?C.raised:C.ink,true);this.text(this.panel,'Count-'+id,String(s.inventory[id]||0),sx+4,sy+42,slot-8,22,14,this.selected===id?C.raised:C.ink,true);});
      if(all.length>5)this.button(this.panel,'inventory-next',`${this.inventoryPage+1}/${Math.ceil(all.length/5)}\n下一页`,x+28+2*(slot+gap),y+80+slot+gap,slot,slot,()=>{this.inventoryPage=(this.inventoryPage+1)%Math.ceil(all.length/5);this.dirty=true;});
      const dx=x+Math.max(210,w*0.43),dw=w-(dx-x)-28;
      this.text(this.panel,'ItemName',names[this.selected],dx,y+80,dw,36,24);
      this.text(this.panel,'ItemAmount',`持有 ${s.inventory[this.selected]||0} 份`,dx,y+124,dw,28,16,C.muted);
      this.text(this.panel,'ItemDescription',h<430?'快捷位仅用于查看，不会消耗物品。':this.selected==='seed'?'走近家园农田，按 E 播种。\n分配快捷位不会消耗种子。':'旅途中收集的材料。\n本阶段保留真实持有数量。',dx,y+158,dw,h<430?26:70,16);
      this.text(this.panel,'QuickTitle','快捷查看',x+28,y+h-106,w-56,24,14,C.muted);
      this.quick.forEach((id,i)=>this.button(this.panel,'quick-'+i,`${i+1} · ${names[id]||id}`,x+28+i*(w-56)/4,y+h-70,(w-80)/4,44,()=>{this.selected=id;this.dirty=true;}));
      this.button(this.panel,'assign','放入快捷位 1',dx,y+h-134,dw,44,()=>{const old=this.quick.indexOf(this.selected);if(old>=0)this.quick[old]=this.quick[0];this.quick[0]=this.selected;sys.localStorage.setItem('realquest-cocos-quick-v1',JSON.stringify(this.quick));this.dirty=true;},!(s.inventory[this.selected]>0),true);
    }else this.drawContext(x,y,w,h);
  }

  private navigate(mode:string,replace=false){
    if(mode===this.mode)return;
    if(replace&&this.panelHistory.at(-1)?.mode===mode)this.panelHistory.pop();
    if(!replace&&mode!=='world'&&this.mode!=='world'&&this.mode!=='welcome')this.panelHistory.push({mode:this.mode,focus:this.focusId});
    this.open(mode);
  }
  private closePanel(){const previous=this.panelHistory.pop();this.open(previous?.mode||(this.client.state?.character?'world':'welcome'));if(previous)this.focusId=previous.focus;}
  private mark(target:NavigationTarget,label:string){this.marker=target;this.markerLabel=label;this.notice='已标记 '+label+' · 标记不会移动角色';this.open('world');}
  private panelHost():PanelHost{
    const self=this;
    return {
      get state(){return self.client.state!;},get world(){return self.client.world!;},get context(){return self.context;},
      get mode(){return self.mode;},get width(){return self.width;},get height(){return self.height;},get busy(){return self.busy||!self.canPlay();},get error(){return self.error;},get notice(){return self.notice;},get now(){return serverNow();},
      box:(...args)=>{self.box(self.panel,...args);},text:(...args)=>{self.text(self.panel,...args);},button:(...args)=>{self.button(self.panel,...args);},image:(...args)=>{self.image(self.panel,...args);},
      person:(name,x,y,w,h)=>{const n=self.make(self.panel,name,x,-y,w,h);n.addComponent(Sprite).sizeMode=Sprite.SizeMode.CUSTOM;self.setActor(n,name,0);n.getComponent(UITransform)!.setContentSize(w,h);},
      field:(...args)=>self.field(...args),send:(action,data={})=>self.sendFeature(action,data),go:(mode,replace)=>self.navigate(mode,replace),close:()=>self.closePanel(),redraw:()=>{self.dirty=true;},mark:(target,label)=>self.mark(target,label),uuid:()=>transport.uuid(),
    };
  }
  private field(id:string,label:string,value:string,x:number,y:number,w:number,change:(v:string)=>void,numeric=false,maxLength=80){
    this.text(this.panel,'Label-'+id,label,x,y,w,22,14,C.muted);
    const n=this.make(this.panel,id,x+w/2,-y-44,w,44),g=n.addComponent(Graphics);g.fillColor=new Color(C.raised);g.roundRect(-w/2,-22,w,44,8);g.fill();g.strokeColor=new Color('#687455');g.lineWidth=1;g.roundRect(-w/2,-22,w,44,8);g.stroke();
    const edit=n.addComponent(EditBox);for(const child of [...n.children])child.destroy();
    edit.maxLength=maxLength;edit.inputMode=numeric?EditBox.InputMode.NUMERIC:EditBox.InputMode.ANY;
    edit.textLabel=this.text(n,'Value',value,-w/2+12,-22,w-24,44,16);edit.placeholderLabel=this.text(n,'Placeholder','',-w/2+12,-22,w-24,44,16,C.muted);edit.string=value;
    n.on(EditBox.EventType.TEXT_CHANGED,()=>change(edit.string));n.on(EditBox.EventType.EDITING_DID_ENDED,()=>{change(edit.string);this.dirty=true;});
    const wp=n.worldPosition;this.controls.push({id,label,x:wp.x,y:this.height-wp.y,w,h:44,disabled:this.busy});
  }
  private async sendFeature(action:string,data:Record<string,unknown>={}){
    let success=false;
    await this.work(async()=>{const location=this.client.state!.location;const reply=await this.client.command(action,data);this.notice=reply.message||'';success=true;
      if(this.client.state!.location!==location){this.p={...this.client.state!.position};this.buildWorld();this.open('world');}
    });return success;
  }
  private updateCombat(dx:number,dy:number){
    if(this.busy||this.combatPending||this.elapsed-this.combatLastTick<0.11)return;
    const intention=combatIntention(this.client.state!,this.owner,{dx,dy},this.targetId,{attack:this.keys.has(KeyCode.SPACE)||!!this.combatDock?.held||this.attackPulse,spark:this.keys.has(KeyCode.KEY_Q)||this.sparkPulse,soup:this.keys.has(KeyCode.KEY_R)||this.soupPulse});
    if(!intention)return;
    this.targetId=intention.targetId;this.combatLastTick=this.elapsed;this.attackPulse=this.sparkPulse=this.soupPulse=false;
    this.combatPending=this.client.command('cave_tick',intention.data).then(reply=>{if(reply.state.combat?.message)this.notice=reply.state.combat.message;}).catch(e=>{this.error=e.message;this.clearInput();}).finally(()=>{this.combatPending=null;this.dirty=true;});
  }
  private drawStatus(){
    const s=this.client.state!;
    if(this.mode!=='world')return;
    if(this.canPlay()&&!s.location.startsWith('cave_')&&!sceneLayouts[s.location]){
      this.box(this.hud,'VitalsPaper',20,102,270,44,C.paper,8);
      this.text(this.hud,'Vitals',`生命 ${s.vitality?.current??100}  体力 ${s.stamina?.current??100}  金币 ${s.inventory.gold||0}`,32,108,246,32,14);
    }
    if(this.marker&&this.client.world){
      const target=accessibleTarget(this.marker,this.client.world,s,serverNow());
      if(target){const sx=this.width/2+this.world.position.x+target.x*this.zoom,sy=this.height/2-this.world.position.y+target.y*this.zoom;
        const x=Math.max(24,Math.min(this.width-24,sx)),y=Math.max(170,Math.min(this.height-154,sy));
        this.box(this.hud,'TargetMarker',x-8,y-8,16,16,C.amber,4);
        if(this.width>=1000)this.text(this.hud,'TargetLabel',`${this.markerLabel} · ${target.name}`,20,154,300,56,15,C.paper);
      }
    }
    if(s.location.startsWith('cave_')){
      const c=s.combat!,v=caveStatus(s,this.targetId,this.map()),compact=this.width<1000;
      this.box(this.hud,'CaveStatus',20,20,compact?284:310,compact?94:108,'#233d31',8);
      this.text(this.hud,'CaveTitle',`石根山洞 · 第 ${c.floor} 层${c.cleared?' · 已清理':''}`,32,26,270,26,18,C.raised);
      this.text(this.hud,'CaveVitals',`生命 ${s.vitality?.current}/${s.vitality?.max}    体力 ${Math.floor(s.stamina?.current||0)}/${s.stamina?.max}`,32,54,270,24,14,C.paper);
      this.text(this.hud,'CaveTarget',c.cast?`${v.castLabel} · ${Math.round(v.castProgress*100)}%`:v.target?`${v.target.name}  ${v.target.hp}/${v.target.max_hp} · 剩余 ${v.remaining}`:'可从路标继续或撤离',32,compact?80:82,270,24,14,'#e5d8ad');
      if(!compact)this.text(this.hud,'CaveWeapon',v.weapon?.name||'尚未持有已装备武器',32,106,270,20,12,'#d5d9bd');
      const hintX=compact?192:20,hintW=compact?this.width-192-284:610;
      this.box(this.hud,'CaveHintPaper',hintX,this.height-72,hintW,48,C.paper,6);
      this.text(this.hud,'CaveHint',this.error||v.hint,hintX+10,this.height-68,hintW-20,40,14,this.error?C.danger:C.ink);
      if(c.cast){const barX=compact?192:20,barY=this.height-94,barW=compact?hintW:240;this.box(this.hud,'CastTrack',barX,barY,barW,5,'#415a41',0);this.box(this.hud,'CastProgress',barX,barY,Math.max(1,barW*v.castProgress),5,'#dbc18a',0);}
      this.combatDock?.draw(this.width,this.height,s,!this.canPlay()||this.busy,this.controls,this.actions);

    }
  }

  private connectionLabel() {
    return ({ready:'已连接',saving:'保存中',uncertain:'操作待确认',unauthorized:'会话失效',offline:'网络未连接',connecting:'连接中',disconnected:'尚未连接'})[this.client.status];
  }
  private async work(action:()=>Promise<unknown>) {
    if(this.busy)return;
    this.busy=true;this.error='';this.clearInput();this.dirty=true;
    try{await action();}catch(e){this.error=(e as Error).message;}
    finally{this.busy=false;this.dirty=true;}
  }
  private async reconnect() {
    await this.work(async()=>{await this.client.reconnect();this.p={...this.client.state!.position};this.notice='已重新确认服务器存档';});
  }
  private exportCredential() {return this.work(async()=>{downloadRecovery(await this.client.recoveryFile());this.backedUpSaveId=this.client.saveId;});}
  private drawSession() {
    this.box(this.panel,'SessionBackdrop',0,0,this.width,this.height,'#dee3cf',0);
    const w=Math.min(820,this.width-32),h=Math.min(480,this.height-24),x=(this.width-w)/2,y=(this.height-h)/2;
    this.box(this.panel,'SessionPaper',x,y,w,h,C.paper,16);
    this.text(this.panel,'SessionTitle','旅程与存档',x+28,y+16,w-140,40,26);
    this.button(this.panel,'session-close','返回',x+w-100,y+14,72,44,()=>{this.recovery=null;this.recoveryPreview=null;this.open(this.client.state?.character?'world':'welcome');},this.busy);
    if(this.recoveryPreview){
      const p=this.recoveryPreview;
      const needsBackup=!!this.client.state?.character&&p.save_id!==this.client.saveId&&this.backedUpSaveId!==this.client.saveId;
      this.text(this.panel,'RestoreName',`接续：${p.character?.name||'未命名旅人'}`,x+28,y+78,w-56,44,24);
      this.text(this.panel,'RestoreDetails',`研习计划 ${p.plan_count} · 现实记录 ${p.record_count}\n${p.timer?.running?'有进行中的现实计时':'无进行中的现实计时'} · 数据由服务器读取`,x+28,y+128,w-56,68,17,C.muted);
      this.text(this.panel,'RestoreMeaning','确认后切换到这份旅程。当前旅程仍保留在服务器；请先导出它的凭证。',x+28,y+204,w-56,50,16);
      this.button(this.panel,'confirm-restore',this.busy?'正在连接…':'确认接续此旅程',x+28,y+h-70,220,48,()=>this.work(async()=>{
        await this.client.restore(this.recovery!);this.recovery=null;this.recoveryPreview=null;this.p={...this.client.state!.position};this.sceneId='';this.buildWorld();this.notice='已接续原旅程';this.open('world');
      }),this.busy||needsBackup,true);
      if(needsBackup)this.button(this.panel,'backup-before-restore','先导出当前凭证',x+w-248,y+h-70,220,48,()=>this.exportCredential(),this.busy);
      this.button(this.panel,'cancel-restore','取消切换',x+266,y+h-70,140,48,()=>{this.recovery=null;this.recoveryPreview=null;this.dirty=true;},this.busy);
    } else {
      this.text(this.panel,'SessionStatus',`${this.client.state?.character?.name||'尚未进入旅程'} · ${this.connectionLabel()}`,x+28,y+78,w-56,36,22);
      this.text(this.panel,'SessionMeaning','两版连接同一服务器时，可用原 Web 的旅程凭证接续。\n凭证可访问整份存档，请妥善保管；数值导出不能用于恢复。',x+28,y+122,w-56,72,16,C.muted);
      this.button(this.panel,'choose-recovery','选择旅程凭证',x+28,y+214,220,48,()=>this.work(async()=>{const text=await chooseRecovery();if(text){const file=readRecovery(text);const preview=await this.client.previewRecovery(file);if(this.client.pending&&preview.save_id!==this.client.saveId)throw new Error('当前有待确认操作，请先选择当前旅程的凭证');this.recoveryPreview=preview;this.recovery=file;}}),this.busy,true);
      this.button(this.panel,'export-recovery','导出当前凭证',x+268,y+214,220,48,()=>this.exportCredential(),this.busy||!this.client.state?.character||!!this.client.pending);
      if(this.client.state)this.button(this.panel,'session-reconnect','重连并确认',x+28,y+h-70,220,48,()=>this.reconnect(),this.busy);
    }
    if(this.error)this.text(this.panel,'SessionError',this.error,x+28,y+h-120,w-56,44,15,C.danger);
  }
  private drawContext(x:number,y:number,w:number,h:number) {
    const s=this.client.state!,obj=this.context;
    if(!obj)return;
    const mutate=(action:string,data:Record<string,unknown>={})=>this.work(async()=>{
      const reply=await this.client.command(action,{target:obj.id,...data});this.notice=reply.message||'';
      this.p={...this.client.state!.position};
      if(this.sceneId!==this.client.state!.location){this.buildWorld();this.open('world');}
    });
    if(this.mode==='sleep'){
      this.text(this.panel,'RestDetails',obj.id==='inn_bed'?'整夜住宿需要先向岚姨订房。':'睡到次日 06:00，按原有规则恢复体力和生命。\n小憩推进 30 游戏分钟；作物继续按现实时间生长。',x+28,y+80,w-56,90,18);
      this.button(this.panel,'sleep-night','睡到明早',x+28,y+h-80,220,48,()=>mutate('rest',{expected_day:villageClock(s,serverNow()).day}),this.busy,true);
      if(obj.id==='home_bed')this.button(this.panel,'short-rest','小憩一会儿',x+270,y+h-80,220,48,()=>mutate('short_rest',{expected_day:villageClock(s,serverNow()).day}),this.busy);
    } else if(this.mode==='travel'){
      const options=s.travel?.options.filter(q=>q.target===obj.id)||[],perPage=h<420?2:3,pages=Math.max(1,Math.ceil(options.length/perPage));
      options.slice(this.page*perPage,(this.page+1)*perPage).forEach((q,i)=>{const yy=y+76+i*88;
        const costs=Object.entries(q.costs).map(([id,n])=>`${({gold:'金币',plank:'木板',stone:'石料'} as Record<string,string>)[id]||id} ${n}`).join(' · ');
        this.text(this.panel,'Quote-'+q.id,q.label,x+28,yy,w-280,30,19);
        this.text(this.panel,'QuoteDetail-'+q.id,q.reasons.join('；')||[costs,q.stamina?`体力 ${q.stamina}`:'',`${q.minutes} 游戏分钟`].filter(Boolean).join(' · '),x+28,yy+32,w-280,44,14,q.reasons.length?C.danger:C.muted);
        this.button(this.panel,'travel-'+q.id,q.completed?'已完成':q.destination?'前往':'确认',x+w-200,yy+8,160,48,()=>mutate('travel',{option:q.id,expected_location:s.location,expected_day:s.travel!.day}),this.busy||q.reasons.length>0,true);
      });
      this.text(this.panel,'TravelPage',`${this.page+1} / ${pages}`,x+28,y+h-48,100,32,14,C.muted);
      if(pages>1)this.button(this.panel,'travel-next','下一页',x+w-180,y+h-54,140,40,()=>{this.page=(this.page+1)%pages;this.dirty=true;});
    } else {
      const cave=s.location.startsWith('cave_');
      this.text(this.panel,'ContextScope',cave?'可从洞内路标查看通路或安全撤离。':obj.kind==='study'?'现实成长可直接从右上角进入。':'此处没有额外操作。可从旅程页查看任务与地图。',x+28,y+88,w-56,120,19);
      if(cave)this.button(this.panel,'cave-retreat','安全撤离',x+28,y+h-80,220,48,()=>mutate('cave_retreat'),this.busy,true);
    }
    if(this.error||this.notice)this.text(this.panel,'ContextFeedback',this.error||this.notice,x+28,y+h-48,w-230,32,14,this.error?C.danger:C.muted);
  }

  private snapshot() {
    const s=this.client.state;
    return { engine:'Cocos Creator 3.8.8', platform:platformName, mode:this.mode, loaded:this.loaded, busy:this.busy, error:this.error, notice:this.notice,
      actorFrame:this.actorFrame,npcPresentation:Object.fromEntries(this.npcMotion),combatTarget:this.targetId,coordinateSystem:'world: origin top-left, +x right, +y down; controls: CSS pixels from top-left',
      player:this.p, savedPosition:s?.position, saveId:this.client.saveId, revision:s?.revision, vitality:s?.vitality, combat:s?.combat, questLog:s?.quest_log, lifeJournal:s?.life_journal, timer:s?.timer, studyTasks:s?.study_task_log, plans:s?.study_plan_log, growth:s?.character_growth_options, storage:s?.storage, features:this.features.snapshot(),marker:this.marker,connection:this.client.status, pendingAction:this.client.pending?.body.action||null, location:s?.location, appearance:s?.character?.appearance, sceneId:this.sceneId, map:this.client.state?{id:this.map().id,width:this.map().width,height:this.map().height,obstacles:this.map().obstacles}:null, inventory:s?.inventory, stamina:s?.stamina,
      plots:s?.plots, activities:s?.activities.slice(-10), camera:{x:this.world.position.x,y:this.world.position.y,zoom:this.zoom,width:this.width,height:this.height},
      plotPresentation:Object.fromEntries(this.plotVisuals),
      interactables:this.supportedObjects(),
      selected:this.selected, quick:this.quick, nearby:this.nearest()||null, controls:this.controls,
      serverTimeIsReal:true, navigationIntent:this.approach,route:this.route,localScene:{family:sceneLayouts[this.sceneId]?'fine-hearthwood':'temporary',response:this.responseObject,responseActive:this.elapsed<this.responseUntil},serverClock:s?.world_clock,scope:'village-polish-local', presentation:{family:'stone-root-v1',confirmedFeedback:this.combatRenderer.visibleFeedbackCount,reducedMotion:reducedMotion()} };
  }
}
