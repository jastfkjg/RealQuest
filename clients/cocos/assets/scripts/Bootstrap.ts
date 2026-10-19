import {
  _decorator, Component, Node, UITransform, Graphics, Color, Label, Sprite,
  SpriteFrame, Rect, Size, Vec3, resources, view, ResolutionPolicy, input,
  Input, KeyCode, EventKeyboard, EventTouch, EditBox, BlockInputEvents,
  game, Game, sys, UIOpacity, profiler, Canvas, Widget, director, screen,
} from 'cc';
import { Client, readRecovery, type RecoveryFile } from './core/client';
import { transport, platformName, viewportSize, subscribeViewport, subscribeFocus, subscribeTextEscape, foregroundVisible, reducedMotion, textOwnsInput, chooseRecovery, downloadRecovery, downloadData, soundEffects, fullScreen, subscribeExperience, experienceSnapshot } from './platform';
import { serverNow } from './core/clock';
import { pathfind, walkable, currentMap, mapById, accessibleTarget } from './core/navigation';
import { interactionFor } from './core/interaction';
import { residentPositions, residentPlace, villageClock, clockLabel } from './core/residents';
import type { WorldObject, NavigationTarget, GameState } from './core/protocol';
const { ccclass } = _decorator;
import {C} from './ui/theme';
import {travelNotices,confirmedCue} from './core/preferences';
import {FeaturePanels,type PanelHost} from './ui/panels';
import {CombatRenderer} from './combatView';
import {combatIntention,itemNames} from './core/features';
import {caveGround,caveRouteArt} from './core/caveArt';
import {caveStatus,nextTarget,liveTarget} from './core/caveView';
import {paintGraphics} from './cavePaint';
import {CombatDock} from './ui/combatDock';
import {LocalSceneRenderer} from './localSceneView';
import {StorageView} from './ui/storage';
import {InventoryView} from './ui/inventory';
import {appearances,getAppearance} from './core/appearances';
import {registration} from './core/dossier';
import {currentGuidance,guidanceMode,type GuidanceAction} from './core/guidance';
import {JourneyContinuation} from './core/continuation';
import {shortText} from './core/lifeRecords';
import {sceneArtPaths,sceneLayouts} from './core/sceneLayout';
import {approachRoute,localCamera,sourceActorFrame,pendingSafeMove,unobscuredCamera} from './core/localScene';
import {WebSemantics,type SemanticText,type SemanticField} from './accessibility';

type Control = { id: string; label: string; x: number; y: number; w: number; h: number; disabled: boolean; accessibleName?:string;pressed?:boolean };

@ccclass('RealQuestSpike')
export class RealQuestSpike extends Component {
  private client = new Client(transport, () => this.clientChanged());
  private audibleSave='';private audibleState:GameState|null=null;
  private unsubscribeExperience=()=>{};private lastFootstep=-1;
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
  private pressedButtons = new Set<Node>();
  private p = { x: 240, y: 320 };
  private route: { x: number; y: number }[] = [];
  private mode = 'welcome';
  private storageView=new StorageView();
  private inventoryView=new InventoryView(sys.localStorage);
  private slicedFrames=new Map<string,SpriteFrame>();
  private itemPreviewCamera=false;
  private caveCameraCache:{key:string;frame:{x:number;y:number;zoom:number}}|null=null;
  private busy = false;
  private error = '';
  private notice = '';
  private lastWorldNotice='';private worldNoticeUntil=0;
  private npc: WorldObject | null = null;
  private registrationName='';private registrationAppearance=0;
  private dirty = true;
  private width = 1280;
  private height = 720;
  private zoom = 2;
  private conversationZoom=0;
  private elapsed = 0;
  private lastMove = 0;
  private lastHeartbeat = -5;
  private lastRefresh = 0;
  private movePromise: Promise<unknown> | null = null;
  private moveTarget:{x:number;y:number}|null=null;
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
  private backupDownloadedSaveId='';
  private sessionPage:'recovery'|'data'='recovery';
  private recoverySource:'file'|'web'='file';
  private confirmDelete=false;
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
  private continuation=new JourneyContinuation(sys.localStorage);
  private journeyRefresh:Promise<void>|null=null;
  private guideMarker:{owner:string;target:{mapId:string;targetId:string}}|null=null;
  private semanticTexts:SemanticText[]=[];
  private semanticFields=new Map<string,SemanticField>();
  private semantics=new WebSemantics(platformName==='web',{
    activate:id=>{const control=this.controls.find(c=>c.id===id);if(control&&!control.disabled&&!this.busy)this.actions.get(id)?.();},
    focus:(id,clear=true)=>{if(clear)this.clearInput();this.focusId=id;this.dirty=true;},escape:()=>this.dismissContext(),key:(code,down,repeat)=>this.semanticKey(code,down,repeat),
  });
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
    this.unsubscribeExperience=subscribeExperience(()=>{this.dirty=true;});
    this.unsubscribeFocus=subscribeFocus(()=>this.hide(),()=>this.show());
    this.unsubscribeText=subscribeTextEscape(()=>{this.clearInput();this.dirty=true;this.semantics.returnFromEditing();});
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
    this.unsubscribeExperience();
    this.semantics.dispose();
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
    this.pressedButtons.clear();
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
      await Promise.all(Array.from(new Set([...sceneArtPaths,'ui/satchel',...['terrain','lia','noah','mira','adu','lanya'].map(n=>`atlas/${n}`),...names.map(n => `village/${n}`), ...['wood','stone','seed','crop','plank','backpack','stone_sword','reinforced_sword','spring_spear','glow_staff','gel','shell','crystal','gate_stone','soup','gold'].map(n => `items/${n}`), ...['market-counter','notice','bookcase','workbench','desk-88','desk-96','bed','hearth','planter','barrel','anvil','rug','window','chest-open','book','lantern','wall','chest-closed'].map(n=>`interiors/${n}`)])).map(path => new Promise<void>((resolve, reject) => {
        // Keep one presentation key and the original PNG for unsupported platforms.
        const asset=path==='scenes/terrain'&&platformName==='web'&&sys.hasFeature(sys.Feature.WEBP)?'scenes/terrain-web':path;
        resources.load(asset + '/spriteFrame', SpriteFrame, (error, frame) => {
          if (error) { reject(error); return; }
          this.frames.set(path, frame); resolve();
        });
      })));
      this.loaded = true;
    } catch { this.error = '画面资源未能载入，请刷新后重试。'; (globalThis as unknown as Record<string,any>).REALQUEST_BOOT?.fail('files'); }
    this.dirty = true;
  }
  private make(parent: Node, name: string, x: number, y: number, w: number, h: number) {
    const n = new Node(name); n.layer = this.node.layer; parent.addChild(n);
    n.addComponent(UITransform).setContentSize(w, h);
    n.setPosition(x, y); return n;
  }
  private clear(node: Node) {
    // Keep retired renderers attached until Cocos finishes deferred destruction.
    // Immediate detachment can render cached geometry at an invalid origin.
    for (const child of [...node.children]) {child.active=false;child.name='Retired';child.destroy();}
  }
  private box(parent: Node, name: string, x: number, y: number, w: number, h: number, color: string, radius = 12) {
    const n = this.make(parent, name, x + w / 2, -y - h / 2, w, h);
    const g = n.addComponent(Graphics); g.fillColor = new Color(color);
    g.roundRect(-w/2, -h/2, w, h, radius); g.fill(); return n;
  }
  private text(parent: Node, name: string, text: string, x: number, y: number, w: number, h: number, size = 16, color = C.ink, center = false) {
    if(parent===this.panel||parent===this.hud)this.semanticTexts.push({id:name,text});
    const n = this.make(parent, name, x + w/2, -y-h/2, w, h);
    const l = n.addComponent(Label); l.string = text; l.fontSize = size; l.lineHeight = size * 1.5;
    l.color = new Color(color); l.overflow = Label.Overflow.CLAMP;
    l.horizontalAlign = center ? Label.HorizontalAlign.CENTER : Label.HorizontalAlign.LEFT;
    l.verticalAlign = Label.VerticalAlign.CENTER; return l;
  }
  private button(parent: Node, id: string, label: string, x: number, y: number, w: number, h: number, action: () => unknown, disabled = false, primary = false, skin?:'game'|'reply'|'portrait'|'answer'|'pocket',semantic?:{label:string;pressed?:boolean}) {
    // A local view can be dismissed while an uncertain request waits for recovery.
    if(id==='close'&&!this.busy&&!this.canPlay())disabled=false;
    const n = this.box(parent, id, x, y, w, h, disabled ? '#d0d7bf' : primary ? C.moss : C.raised, 10);
    const text = this.text(n, 'Label', label, -w/2+8, -h/2, w-16, h, 16, primary && !disabled ? C.raised : C.ink, true);
    if(skin==='game'||skin==='pocket'){
      const g=n.getComponent(Graphics)!;g.clear();g.fillColor=new Color(disabled?'#b4b89c':'#70563e');g.roundRect(-w/2,-h/2,w,h,9);g.fill();
      g.fillColor=new Color(disabled?'#d0d7bf':primary?C.moss:'#f4efde');g.roundRect(-w/2+1,-h/2+3,w-2,h-4,8);g.fill();
      g.strokeColor=new Color(disabled?'#b4b89c':primary?'#6e8b60':'#fffbed');g.lineWidth=1;g.moveTo(-w/2+10,h/2-3);g.lineTo(w/2-10,h/2-3);g.stroke();
    }
    if(skin==='reply'){
      const g=n.getComponent(Graphics)!;g.clear();text.color=new Color(disabled?'#b8bba1':C.raised);text.horizontalAlign=Label.HorizontalAlign.LEFT;
      if(primary||this.focusId===id){g.fillColor=new Color('#47684e');g.roundRect(-w/2,-h/2,w,h,4);g.fill();}
      n.on(Node.EventType.MOUSE_ENTER,()=>{if(!disabled){g.clear();g.fillColor=new Color('#47684e');g.roundRect(-w/2,-h/2,w,h,4);g.fill();}});
      n.on(Node.EventType.MOUSE_LEAVE,()=>{if(!primary&&this.focusId!==id)g.clear();});
    }
    if(skin==='answer'){
      const g=n.getComponent(Graphics)!;text.horizontalAlign=Label.HorizontalAlign.LEFT;
      const paint=(hover=false)=>{g.clear();g.fillColor=new Color(disabled?'#dedcc8':hover?C.moss:'#e9e2ca');g.roundRect(-w/2,-h/2,w,h,7);g.fill();g.strokeColor=new Color(disabled?'#b8b8a0':hover?'#73906b':'#b29b73');g.lineWidth=1;g.roundRect(-w/2+.5,-h/2+.5,w-1,h-1,7);g.stroke();text.color=new Color(disabled?C.muted:hover?C.paper:C.ink);};
      paint(this.focusId===id);n.on(Node.EventType.MOUSE_ENTER,()=>{if(!disabled)paint(true);});n.on(Node.EventType.MOUSE_LEAVE,()=>paint(this.focusId===id));n.on(Node.EventType.TOUCH_START,()=>{if(!disabled)paint(true);});n.on(Node.EventType.TOUCH_END,()=>paint(this.focusId===id));n.on(Node.EventType.TOUCH_CANCEL,()=>paint(this.focusId===id));
    }
    if(skin==='pocket'){text.string='';const g=n.getComponent(Graphics)!;n.on(Node.EventType.MOUSE_ENTER,()=>{if(!disabled){g.strokeColor=new Color(C.amber);g.lineWidth=2;g.roundRect(-w/2+1,-h/2+1,w-2,h-2,8);g.stroke();}});n.on(Node.EventType.MOUSE_LEAVE,()=>{this.dirty=true;});}
    if(skin==='portrait'){text.string='';const g=n.getComponent(Graphics)!;g.clear();if(primary){g.fillColor=new Color(C.moss);g.roundRect(-w/2,-h/2,w,h,7);g.fill();}}
    const activate=()=>{if(parent!==this.touchPad&&!['sound-toggle','sound-test'].includes(id))void soundEffects.unlock().then(()=>soundEffects.play());action();};
    if(!disabled)this.actions.set(id,activate);
    if(this.focusId===id){const g=n.getComponent(Graphics)!;g.strokeColor=new Color(C.amber);g.lineWidth=3;g.roundRect(-w/2-2,-h/2-2,w+4,h+4,10);g.stroke();}
    const opacity = n.addComponent(UIOpacity);
    n.on(Node.EventType.MOUSE_ENTER,()=>{if(!disabled)opacity.opacity=(skin==='answer'||skin==='pocket')?255:225;});
    const release=()=>{if(this.pressedButtons.delete(n))this.dirty=true;opacity.opacity=255;if(skin)n.setPosition(x+w/2,-y-h/2);};
    n.on(Node.EventType.MOUSE_LEAVE,release);
    n.on(Node.EventType.TOUCH_START, () => { if (!disabled){if(parent!==this.touchPad)this.pressedButtons.add(n);opacity.opacity=(skin==='answer'||skin==='pocket')?255:195;if(skin&&!reducedMotion())n.setPosition(x+w/2,-y-h/2-2);} });
    n.on(Node.EventType.TOUCH_CANCEL, release);
    n.on(Node.EventType.TOUCH_END, release);
    n.on(Node.EventType.TOUCH_END, (event: EventTouch) => { event.propagationStopped = true; if (!disabled) activate(); });
    // All controls are recorded in design pixels, excluding credentials.
    const wp = n.worldPosition;
    this.controls.push({ id, label, x: wp.x, y: this.height-wp.y, w, h, disabled,...(semantic?{accessibleName:semantic.label,pressed:semantic.pressed}:{}) });
    return text;
  }
  private itemSlot(parent:Node,id:string,item:string|null,x:number,y:number,w:number,h:number,count:number,selected:boolean,action:()=>unknown,reference=false,number?:number){
    const worldQuick=id.startsWith('world-quick-'),label=(number?number+' · ':'')+(item?(itemNames[item]||item)+' · '+(count>0?'持有'+count+'份':'未持有'):'空格')+(worldQuick&&item?(item==='seed'&&count>0?' · 农田旁预览播种':' · 查看物品'):'');
    const text=this.button(parent,id,label,x,y,w,h,action,this.busy||!this.canPlay()||worldQuick&&!item,selected,'pocket'),n=text.node.parent!;
    if(item&&(!reference||count>0)){const art=this.image(n,'items/'+item,0,-4,32,32);if(art&&count<=0)art.addComponent(UIOpacity).opacity=100;}
    else this.text(n,'Reference',item?shortText(itemNames[item]||item,2):'空格',-w/2+3,-h/2+8,w-6,h-28,12,selected?C.paper:C.muted,true);
    if(number)this.text(n,'QuickNumber',String(number),-w/2+3,-h/2+1,16,18,12,selected?C.paper:C.ink);
    this.text(n,'Count',item?(count>0||reference?String(count):'未持有'):'',count>0||reference?w/2-25:-w/2+3,h/2-20,count>0||reference?22:w-6,18,count>0||reference?12:11,selected?C.paper:C.muted,true);
  }
  private image(parent: Node, path: string, x: number, y: number, w: number, h: number,sliced=false) {
    const sf = this.frames.get(path); if (!sf) return null;
    const n = this.make(parent, path, x, -y, w, h);
    const sprite = n.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.spriteFrame = sf;
    if(sliced){const scale=.18;let f=this.slicedFrames.get(path);if(!f){f=sf.clone();f.insetTop=220;f.insetRight=180;f.insetBottom=200;f.insetLeft=180;this.slicedFrames.set(path,f);}sprite.spriteFrame=f;sprite.type=Sprite.Type.SLICED;n.setScale(scale,scale,1);n.getComponent(UITransform)!.setContentSize(w/scale,h/scale);}else n.getComponent(UITransform)!.setContentSize(w,h);
    return n;
  }
  private async startJourney() {
    if (this.busy || !this.loaded) return;
    let draft;try{draft=registration(this.registrationName,this.registrationAppearance);}catch(e){this.error=(e as Error).message;this.dirty=true;return;}
    this.busy = true; this.error = ''; this.dirty = true;
    try {
      await this.client.boot();
      if(!this.client.state){this.deletedJourney();return;}
      if (!this.client.state!.character) await this.client.command('create', draft);
      this.p = { ...this.client.state!.position };
      if(!mapById(this.client.world!,this.client.state!.location))throw new Error('服务器返回了未知地点，已保留原存档');
      this.inventoryView.init(this.panelHost());
      this.mode = 'world'; this.buildWorld();
      await this.client.command('world_resume', { owner: this.owner });
      this.confirmJourneySnapshot(serverNow(),true);
    } catch (error) { this.error = (error as Error).message; }
    finally { this.busy = false; this.dirty = true; }
  }
  private buildWorld() {
    this.world.active=true;
    this.combatRenderer.reset();this.targetId=null;
    this.caveCameraCache=null;
    this.clearInput(); this.clear(this.world); this.objects.clear(); this.plotVisuals.clear(); this.npcMotion.clear();this.depths.clear();
    const map = this.map(); this.sceneId=map.id;
    this.world.getComponent(UITransform)!.setContentSize(map.width, map.height);
    this.zoom=localCamera(map,this.width,this.height);
    const fineScene=this.localScene.build(map);
    const camera=this.node.getComponent(Canvas)?.cameraComponent;if(camera)camera.clearColor=new Color(map.id==='overworld'?'#78955e':fineScene||map.id.startsWith('cave_')?'#27352d':'#000000');
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
  // Creator's Web keyboard source listens on the canvas only. Native semantic
  // buttons use the same handler explicitly, keeping its mode and input guards.
  private semanticKey(code:string,down:boolean,repeat:boolean){
    const name=/^Key[A-Z]$/.test(code)?'KEY_'+code.slice(3):/^Digit[1-4]$/.test(code)?'DIGIT_'+code.slice(5):({ArrowUp:'ARROW_UP',ArrowDown:'ARROW_DOWN',ArrowLeft:'ARROW_LEFT',ArrowRight:'ARROW_RIGHT',ShiftLeft:'SHIFT_LEFT',ShiftRight:'SHIFT_RIGHT'} as Record<string,string>)[code];
    const key=(KeyCode as unknown as Record<string,KeyCode>)[name||''];if(key===undefined)return false;
    if(down){if(!repeat)this.keyDown(new EventKeyboard(key,Input.EventType.KEY_DOWN));}else this.keyUp(new EventKeyboard(key,Input.EventType.KEY_UP));return true;
  }
  private keyDown(e: EventKeyboard) {
    if(textOwnsInput() || (e as any).isComposing)return;
    if(e.keyCode===KeyCode.SHIFT_LEFT||e.keyCode===KeyCode.SHIFT_RIGHT){this.keys.add(e.keyCode);return;}
    if(e.keyCode===KeyCode.TAB){const ids=this.controls.filter(c=>!c.disabled&&this.actions.has(c.id)).map(c=>c.id);const i=ids.indexOf(this.focusId);const reverse=this.keys.has(KeyCode.SHIFT_LEFT)||this.keys.has(KeyCode.SHIFT_RIGHT);this.focusId=ids[i<0?(reverse?ids.length-1:0):(i+(reverse?-1:1)+ids.length)%ids.length]||'';this.dirty=true;return;}
    if((e.keyCode===KeyCode.KEY_E||e.keyCode===KeyCode.SPACE)&&this.mode==='dialogue'&&(!this.focusId||['dialogue-read','dialogue-next'].includes(this.focusId))){if(this.keys.has(e.keyCode))return;this.features.advanceDialogue(this.panelHost());this.keys.add(e.keyCode);return;}
    if((e.keyCode===KeyCode.ENTER||e.keyCode===KeyCode.SPACE)&&this.focusId){this.actions.get(this.focusId)?.();return;}
    if (this.mode==='welcome') return;
    if(e.keyCode===KeyCode.ESCAPE){this.dismissContext();return;}
    if(e.keyCode===KeyCode.KEY_F){if(this.keys.has(KeyCode.KEY_F))return;this.keys.add(KeyCode.KEY_F);void this.toggleFullScreen();return;}
    if(e.keyCode===KeyCode.KEY_I){if(this.mode==='inventory')this.open('world');else void this.openInventory();return;}
    if(e.keyCode===KeyCode.KEY_C){this.navigate('character');return;}
    if(e.keyCode===KeyCode.KEY_J){this.navigate('journal');return;}
    if(e.keyCode===KeyCode.KEY_M){this.navigate('map');return;}
    if(e.keyCode===KeyCode.KEY_N){if(this.client.state?.character&&this.client.world)this.features.findNeighbor(this.panelHost(),'lia');return;}
    if(e.keyCode===KeyCode.KEY_L){ this.open(this.mode==='life'?'world':'life'); return; }
    if(this.mode!=='world') return;
    if(e.keyCode>=KeyCode.DIGIT_1&&e.keyCode<=KeyCode.DIGIT_4){void this.useQuick(e.keyCode-KeyCode.DIGIT_1);return;}
    if(e.keyCode===KeyCode.KEY_T&&this.client.state?.location.startsWith('cave_')){this.targetId=nextTarget(this.client.state,this.targetId);this.dirty=true;return;}
    if(e.keyCode===KeyCode.KEY_E) { if(this.keys.has(e.keyCode))return;void this.interact();this.keys.add(e.keyCode); return; }
    if([KeyCode.KEY_W,KeyCode.KEY_A,KeyCode.KEY_S,KeyCode.KEY_D,KeyCode.ARROW_UP,KeyCode.ARROW_DOWN,KeyCode.ARROW_LEFT,KeyCode.ARROW_RIGHT].includes(e.keyCode)){this.route=[];this.approach=null;this.dirty=true;} this.keys.add(e.keyCode);
  }
  private touchRelease(event:EventTouch){this.touches.delete((event.getID()??0));}
  private keyUp(e: EventKeyboard) { this.keys.delete(e.keyCode); }
  private clearInput() { this.inputEpoch++;this.approach=null;this.keys.clear();this.touches.clear();this.pressedButtons.clear(); this.route=[];this.attackPulse=this.sparkPulse=this.soupPulse=false;this.combatDock?.release(); }
  private dismissContext(){this.clearInput();this.dirty=true;if(this.mode==='welcome')return;if(this.mode==='world'){this.continuation.dismiss();return;}if(!this.busy){if(this.inventoryView.dismiss(this.panelHost()))return;this.recovery=null;this.recoveryPreview=null;this.closePanel();}}
  private syncSemantics(){
    const controls=this.controls.filter(c=>!['left','right','up','down'].includes(c.id)&&(this.actions.has(c.id)||c.disabled)).map(c=>({...c,label:c.accessibleName||c.label}));
    const texts=this.semanticTexts,title=texts.find(t=>t.id.endsWith('Title')||t.id==='Title')?.text||this.context?.name||'RealQuest';
    this.semantics.update({mode:this.mode,title,controls,fields:new Map(this.semanticFields),texts,focusId:this.focusId,busy:this.busy,message:this.error||this.notice});
    if(this.loaded)(globalThis as unknown as Record<string,any>).REALQUEST_BOOT?.ready();
  }
  private hide() {
    if(this.client.state?.character)this.continuation.leave(this.client.saveId,this.client.state,serverNow());
    const playing=this.shown&&this.mode==='world';
    this.shown=false;soundEffects.pause();this.clearInput();if(playing&&this.client.state&&this.canPlay())void this.client.command('world_pause',{owner:this.owner}).catch(()=>{});
  }
  private show() {this.shown=true;soundEffects.foreground();this.clearInput();if(this.client.state&&!this.busy)void this.refreshJourney(true);this.lastHeartbeat=-5;}
  private confirmJourneySnapshot(now:number,returning:boolean){
    if(!this.client.state?.character||this.client.status!=='ready'||this.client.pending)return;
    this.continuation.snapshot(this.client.saveId,this.client.state,now,this.shown&&foregroundVisible(),returning);
  }
  private refreshJourney(resume=false):Promise<void>{
    if(this.journeyRefresh)return this.journeyRefresh;
    const id=this.client.saveId,previousError=this.error,recovering=this.client.status==='offline';
    this.journeyRefresh=this.client.refresh().then(reply=>{
      if(id!==this.client.saveId||reply.state.revision<this.client.state!.revision)return;
      if(recovering&&this.error===previousError)this.error='';
      if(resume)this.p={...this.client.state!.position};
      this.confirmJourneySnapshot(reply.server_time,resume||this.continuation.awaiting);this.dirty=true;
    }).catch(e=>{if(id===this.client.saveId){this.error=e.message;this.dirty=true;}}).finally(()=>{this.journeyRefresh=null;});
    return this.journeyRefresh;
  }
  private open(mode: string) {
    this.confirmDelete=false;
    if(mode==='inventory'&&this.mode!=='item-confirm')this.inventoryView.opened();
    if(this.mode==='item-confirm'&&mode!=='item-confirm'){this.inventoryView.clearPreview();this.panelHistory=this.panelHistory.filter(p=>p.mode!=='item-confirm');}
    if(mode==='world'){this.panelHistory=[];const lease=this.client.state?.npc_encounter;if(lease&&this.canPlay())void this.client.command('npc_release',{token:lease.token}).catch(()=>{});}
    if(this.features.lifeMode(mode)||this.features.guideMode(mode)||['character','growth'].includes(mode))this.notice='';
    this.features.reset();this.mode=mode; this.page=0;this.focusId=''; this.clearInput(); this.error=''; this.dirty=true;
    if(mode==='session'&&!this.client.state&&!this.busy)void this.work(async()=>{
      if(!transport.getSession())return;
      await this.client.boot();
      if(!this.client.state){this.deletedJourney();return;}
      this.p={...this.client.state.position};this.buildWorld();
      await this.client.command('world_pause',{owner:this.owner});
    });
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
    while(this.movePromise) await this.movePromise;
    if(this.client.state?.location.startsWith('cave_')){if(this.combatPending)await this.combatPending;return;}
    if(!this.canPlay()||!this.client.state||Math.hypot(this.p.x-this.client.state.position.x,this.p.y-this.client.state.position.y)<0.5)return;
    this.moveTarget={x:Math.round(this.p.x*100)/100,y:Math.round(this.p.y*100)/100};
    this.movePromise=this.client.command('move',{x:this.p.x,y:this.p.y,location:this.client.state.location});
    try { await this.movePromise; }
    catch(e) { this.p={...this.client.state.position}; this.error=(e as Error).message; this.clearInput(); }
    finally { this.movePromise=null;this.moveTarget=null; this.dirty=true; }
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
    if(this.worldNoticeUntil&&this.elapsed>=this.worldNoticeUntil){this.worldNoticeUntil=0;this.dirty=true;}
    if(this.client.state?.character&&this.client.world&&this.sceneId!==this.client.state.location){this.p={...this.client.state.position};this.buildWorld();this.dirty=true;}
    if(this.client.state&&this.mode==='world'&&this.shown&&this.canPlay()) {
      // Creator's array-spread transform assumes arrays, not Map iterators.
      const touchKeys=Array.from(this.touches.values());
      let dx=Number(this.keys.has(KeyCode.KEY_D)||this.keys.has(KeyCode.ARROW_RIGHT)||touchKeys.includes(KeyCode.ARROW_RIGHT))-Number(this.keys.has(KeyCode.KEY_A)||this.keys.has(KeyCode.ARROW_LEFT)||touchKeys.includes(KeyCode.ARROW_LEFT));
      let dy=Number(this.keys.has(KeyCode.KEY_S)||this.keys.has(KeyCode.ARROW_DOWN)||touchKeys.includes(KeyCode.ARROW_DOWN))-Number(this.keys.has(KeyCode.KEY_W)||this.keys.has(KeyCode.ARROW_UP)||touchKeys.includes(KeyCode.ARROW_UP));
      if(this.route.length){const to=this.route[0],from=this.client.state.location.startsWith('cave_')?this.client.state.position:this.p,d=Math.hypot(to.x-from.x,to.y-from.y);if(d<(this.route.length===1&&this.approach?3:8))this.route.shift();else{const scale=this.client.state.location.startsWith('cave_')?Math.min(1,d/40):1;dx=(to.x-from.x)/d*scale;dy=(to.y-from.y)/d*scale;}}
      if(!this.route.length&&this.approach){const intent=this.approach;this.approach=null;this.dirty=true;const obj=this.supportedObjects().find(o=>o.id===intent.id);if(obj&&intent.map===this.sceneId&&Math.hypot(obj.x-(this.sceneId.startsWith('cave_')?this.client.state.position:this.p).x,obj.y-(this.sceneId.startsWith('cave_')?this.client.state.position:this.p).y)<=65)void this.interact(obj);else this.error='目标已离开这里，请重新选择。';}
      const length=Math.max(1,Math.hypot(dx,dy)), step=Math.min(dt,0.05)*120;
      const cave=this.client.state.location.startsWith('cave_');
      const previous={...this.p},next={x:this.p.x+dx/length*step,y:this.p.y+dy/length*step};
      if(cave){this.updateCombat(dx,dy);const to=this.client.state.position,factor=Math.min(1,dt*18);this.p.x+=(to.x-this.p.x)*factor;this.p.y+=(to.y-this.p.y)*factor;}
      if(!cave&&!this.busy){
        const map=this.map(),x=walkable(map,next.x,this.p.y)?next.x:this.p.x,proposed={x,y:walkable(map,x,next.y)?next.y:this.p.y};
        const accepted=pendingSafeMove(map,this.p,proposed,this.client.state.position,this.moveTarget);
        const blocked=Math.hypot(accepted.x-this.p.x,accepted.y-this.p.y)<.000001&&Math.hypot(proposed.x-this.p.x,proposed.y-this.p.y)>.000001;
        this.p.x=accepted.x;this.p.y=accepted.y;
        if(blocked&&!this.movePromise&&Math.hypot(this.p.x-this.client.state.position.x,this.p.y-this.client.state.position.y)>.5)void this.syncMove();
      }
      if(Math.hypot(this.p.x-previous.x,this.p.y-previous.y)>.05&&this.elapsed-this.lastFootstep>.29){soundEffects.play('step');this.lastFootstep=this.elapsed;}
      this.actor.setPosition(this.p.x,-this.p.y);
      if(dx||dy)this.actorDirection=Math.abs(dx)>Math.abs(dy)?(dx>0?3:2):(dy<0?1:0);
      this.setActor(this.actor,this.actorArt(),sourceActorFrame(this.actorDirection,!!(dx||dy),this.elapsed,reducedMotion()));
      if(!this.busy&&!cave&&!this.movePromise&&this.elapsed-this.lastMove>0.18){this.lastMove=this.elapsed;void this.syncMove();}
      if(this.elapsed-this.lastHeartbeat>3){this.lastHeartbeat=this.elapsed;void this.client.command('world_resume',{owner:this.owner}).catch(()=>{});}
      if(this.elapsed-this.lastRefresh>5){this.lastRefresh=this.elapsed;void this.refreshJourney();}
      this.restoreLocalCamera();
      this.combatRenderer.draw(this.client.state,this.targetId,reducedMotion(),{x:this.world.position.x,y:this.world.position.y,zoom:this.zoom,width:this.width,height:this.height});
      for(const [id,node] of this.objects)if(['lia','noah','mira'].includes(id))node.active=false;
      for(const obj of this.supportedObjects()){
        let n=this.objects.get(obj.id);
        if(obj.kind==='npc'&&!n){n=this.make(this.world,obj.id,obj.x,-obj.y,32,128/3);n.getComponent(UITransform)!.setAnchorPoint(.5,0);n.addComponent(Sprite).sizeMode=Sprite.SizeMode.CUSTOM;this.setActor(n,obj.id+'-actor',0);this.objects.set(obj.id,n);const tag=this.make(n,'NeighborName',0,44,76,26);this.box(tag,'NameGround',-38,-13,76,26,'#233d31eb',5);this.text(tag,'Name',obj.name,-36,-13,72,26,14,C.paper,true);}
        if(obj.kind==='npc'&&n){n.active=true;const tag=n.getChildByName('NeighborName');if(tag)tag.active=true;tag?.setScale(1/this.zoom,1/this.zoom);tag?.setPosition(0,44+14/this.zoom);const before=this.npcMotion.get(obj.id),dx=before?obj.x-before.x:0,dy=before?obj.y-before.y:0,moving=!!obj.walking&&Math.hypot(dx,dy)>.005,direction=moving?(Math.abs(dx)>Math.abs(dy)?(dx>0?3:2):(dy<0?1:0)):(before?.direction||0),frame=sourceActorFrame(direction,moving,this.elapsed,reducedMotion());this.setActor(n,obj.id+'-actor',frame);this.npcMotion.set(obj.id,{x:obj.x,y:obj.y,direction,frame});n.setPosition(obj.x,-obj.y);this.depths.set(n,obj.y);}
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
    if(this.client.state&&this.features.lifeMode(this.mode)&&this.shown&&this.canPlay()&&!this.busy&&!textOwnsInput()&&this.elapsed-this.lastRefresh>15){
      this.lastRefresh=this.elapsed;void this.refreshJourney();
    }
    if(this.client.state&&this.client.world)this.localScene.update(this.client.state,this.p,this.mode==='world'?this.nearest():undefined,this.route,this.mode!=='world'?this.context?.id:this.elapsed<this.responseUntil?this.responseObject:undefined,this.busy,reducedMotion(),this.elapsed);
    this.updateConversationCamera(dt);
    this.updateItemPreviewCamera();
    this.depths.set(this.actor,this.p.y);
    [...this.world.children].sort((a,b)=>(this.depths.get(a)||-1000)-(this.depths.get(b)||-1000)).forEach((n,i)=>n.setSiblingIndex(i));
    const nearby=this.nearest(), signature=(nearby?.id||'')+JSON.stringify(nearby&&this.client.state?interactionFor(nearby,this.client.state,serverNow()):null);
    if(signature!==this.lastNearby){this.lastNearby=signature;this.dirty=true;}
    if(this.client.state&&this.mode!=='welcome'&&Math.floor(this.elapsed)!==this.lastSecond){this.lastSecond=Math.floor(this.elapsed);this.dirty=true;}
    if(this.shown&&this.mode!=='world'&&this.context?.kind==='npc'&&this.client.state?.npc_encounter&&this.elapsed-this.lastNpcKeep>10&&this.canPlay()){
      this.lastNpcKeep=this.elapsed;void this.client.command('npc_keep',{token:this.client.state.npc_encounter.token}).catch(()=>{});
    }
    // Keep the pressed target alive until pointer release. A clock tick must not
    // destroy the control that owns the current gesture.
    if(this.dirty&&!this.pressedButtons.size&&(!textOwnsInput()||this.busy)){this.dirty=false;this.drawUI();this.syncSemantics();}
    this.features.tick(dt);
  }
  private async useQuick(slot:number){
    if(this.mode!=='world'||this.busy||!this.canPlay())return;this.inventoryView.init(this.panelHost());if(!this.inventoryView.quick[slot])return;
    this.clearInput();const epoch=this.inputEpoch,id=this.client.saveId,p={...this.p};await this.syncMove();
    if(epoch!==this.inputEpoch||id!==this.client.saveId||this.mode!=='world'||this.keys.size||this.touches.size||this.route.length||Math.hypot(this.p.x-p.x,this.p.y-p.y)>.5)return;
    this.inventoryView.activate(this.panelHost(),slot);
  }
  private async openInventory(){
    if(this.busy||!this.client.state)return;
    if(this.mode!=='world'){this.navigate('inventory');return;}
    this.clearInput();const epoch=this.inputEpoch,id=this.client.saveId,p={...this.p};await this.syncMove();
    if(epoch!==this.inputEpoch||id!==this.client.saveId||this.mode!=='world'||this.keys.size||this.touches.size||this.route.length||Math.hypot(this.p.x-p.x,this.p.y-p.y)>.5)return;
    this.open('inventory');
  }
  private restoreLocalCamera(){
    const map=this.map(),zoom=localCamera(map,this.width,this.height),halfW=this.width/zoom/2,halfH=this.height/zoom/2;
    let frame={zoom,x:-(map.width<halfW*2?map.width/2:Math.max(halfW,Math.min(map.width-halfW,this.p.x)))*zoom,y:(map.height<halfH*2?map.height/2:Math.max(halfH,Math.min(map.height-halfH,this.p.y-(map.id==='overworld'&&this.height>=560?96:0))))*zoom};
    if(this.mode==='world'&&map.id.startsWith('cave_')&&this.width<1000&&this.height<560){
      const target=liveTarget(this.client.state!,this.targetId);
      if(target?.kind==='boss'&&Math.hypot(target.x-this.p.x,target.y-this.p.y)<192){
        const actors=[{x:this.p.x-16,y:this.p.y-128/3,w:32,h:128/3},this.combatRenderer.bounds(target)];
        const blockers=this.controls.map(c=>({x:c.x-c.w/2,y:c.y-c.h/2,w:c.w,h:c.h}));
        for(const id of ['CaveStatus','CaveHintPaper','CastTrack']){const n=this.hud.getChildByName(id),size=n?.getComponent(UITransform)?.contentSize;if(n?.active&&size)blockers.push({x:n.position.x-size.width/2,y:-n.position.y-size.height/2,w:size.width,h:size.height});}
        const key=JSON.stringify([this.width,this.height,map.width,actors,blockers]);
        if(this.caveCameraCache?.key===key)frame=this.caveCameraCache.frame;
        else{frame=unobscuredCamera(actors,blockers,this.width,this.height,frame,map.width);this.caveCameraCache={key,frame};}
      }
    }
    this.zoom=frame.zoom;this.world.setScale(frame.zoom,frame.zoom,1);this.world.setPosition(frame.x,frame.y);
  }
  private updateItemPreviewCamera(){
    if(!this.client.state||!this.client.world)return;
    const target=this.mode==='item-confirm'?this.inventoryView.target(this.panelHost()):null;
    if(!target){if(this.itemPreviewCamera){this.itemPreviewCamera=false;if(!this.conversationScene())this.restoreLocalCamera();}return;}
    this.itemPreviewCamera=true;const stageW=this.width-336,z=this.zoom;
    const x=(this.p.x+target.x)/2,y=(this.p.y+target.y)/2;
    this.world.setScale(z,z,1);this.world.setPosition(stageW/2-this.width/2-x*z,this.height/2+y*z-this.height*.55);
  }
  private drawItemPreviewMarker(){
    const target=this.inventoryView.target(this.panelHost());if(!target)return;
    const x=this.width/2+this.world.position.x+target.x*this.zoom,y=this.height/2-this.world.position.y+target.y*this.zoom;
    const n=this.make(this.hud,'ItemTarget',x,-y,50,44),g=n.addComponent(Graphics);g.strokeColor=new Color(C.amber);g.lineWidth=3;g.roundRect(-25,-22,50,44,5);g.stroke();
    this.box(this.hud,'ItemTargetLabel',x-62,y-64,124,30,C.moss,4);this.text(this.hud,'ItemTargetName',target.name,x-58,y-62,116,26,14,C.paper,true);
  }
  private drawQuickBar(){
    this.inventoryView.init(this.panelHost());const short=this.width<1000,cell=short?52:60,gap=8,w=cell*4+gap*3,x=short?192+(this.width-488-w)/2:(this.width-w)/2,y=this.height-(short?140:82);
    this.box(this.hud,'QuickCloth',x-8,y-8,w+16,cell+16,C.moss,7);
    this.inventoryView.quick.forEach((id,i)=>this.itemSlot(this.hud,'world-quick-'+i,id,x+i*(cell+gap),y,cell,cell,id?this.client.state!.inventory[id]||0:0,false,()=>void this.useQuick(i),true,i+1));
    const hintY=short?y-26:y+cell,hintW=short?116:w,hintX=short?x+w-hintW:x;
    this.box(this.hud,'QuickHintPaper',hintX-4,hintY,hintW+8,22,C.moss,3);this.text(this.hud,'QuickHint',short?'1–4 查看':'1–4 查看 · 种子可预览播种',hintX,hintY,hintW,22,12,C.paper,true);
  }
  private conversationScene(){return this.context?.kind==='npc'&&((this.mode==='dialogue'&&this.features.npcTab==='talk')||['neighbor-topics','neighbor-gift'].includes(this.mode));}
  private updateConversationCamera(dt:number){
    if(!this.client.state||!this.client.world)return;
    const active=this.conversationScene(),npc=active?this.supportedObjects().find(o=>o.id===this.context!.id):null;
    if(!npc){
      if(this.conversationZoom){this.conversationZoom=0;this.restoreLocalCamera();this.actor.setPosition(this.p.x,-this.p.y);}
      return;
    }
    const short=this.height<500,topics=this.mode==='neighbor-topics',choices=topics||this.mode==='dialogue'&&this.features.dialogueChoices;
    const panelHeight=topics?(short?228:244):choices?(short?168:200):(short?144:176),stageBottom=this.height-panelHeight-28,stageTop=short?8:72;
    const span=Math.max(this.p.y,npc.y)-Math.min(this.p.y,npc.y)+128/3;
    const targetZoom=Math.min(short?2:3,Math.max(.8,(stageBottom-stageTop-12)/span)),ratio=reducedMotion()?1:Math.min(1,dt*9),z=(this.conversationZoom||this.zoom)+(targetZoom-(this.conversationZoom||this.zoom))*ratio;
    this.conversationZoom=z;
    const midX=(this.p.x+npc.x)/2,focusY=(Math.min(this.p.y,npc.y)-128/3+Math.max(this.p.y,npc.y))/2,targetY=(stageTop+stageBottom)/2;
    const map=this.map(),rawX=-midX*z,rawY=this.height/2+focusY*z-targetY;
    const x=map.width*z<this.width?-map.width*z/2:Math.max(this.width/2-map.width*z,Math.min(-this.width/2,rawX)),y=map.height*z<stageBottom?map.height*z/2:Math.max(this.height/2,Math.min(this.height/2+map.height*z-stageBottom,rawY));
    const safeY=Math.max(y,this.height/2+Math.max(this.p.y,npc.y)*z-(stageBottom-4));
    this.world.setScale(z,z,1);this.world.setPosition(this.world.position.x+(x-this.world.position.x)*ratio,this.world.position.y+(safeY-this.world.position.y)*ratio);
    const direction=(a:{x:number;y:number},b:{x:number;y:number})=>Math.abs(b.x-a.x)>Math.abs(b.y-a.y)?(b.x>a.x?3:2):(b.y<a.y?1:0);
    this.setActor(this.actor,this.actorArt(),sourceActorFrame(direction(this.p,npc),false,this.elapsed,true));
    const n=this.objects.get(npc.id);if(n){this.setActor(n,npc.id+'-actor',sourceActorFrame(direction(npc,this.p),false,this.elapsed,true));n.setPosition(npc.x,-npc.y);}
    for(const node of this.objects.values()){const tag=node.getChildByName('NeighborName');if(tag)tag.active=!active;}
  }
  private drawUI() {
    this.clear(this.hud); this.clear(this.panel); this.controls=[];this.actions.clear();this.semanticTexts=[];this.semanticFields.clear();
    this.hud.setPosition(-this.width/2,this.height/2); this.panel.setPosition(-this.width/2,this.height/2);
    this.touchPad.active=this.mode==='world'&&this.width<1000;
    if(this.mode!=='world')this.combatRenderer.hide();
    if(this.mode!=='world'||!this.client.state?.location.startsWith('cave_'))this.combatDock?.hide();
    if(this.mode==='welcome'){this.welcome();return;}
    if(this.mode==='session'){this.drawSession();return;}
    const s=this.client.state!;
    if(this.mode==='item-confirm'){this.drawItemPreviewMarker();this.drawPanel();return;}
    if(this.conversationScene()){
      const short=this.height<500;if(!short){this.box(this.hud,'ConversationPlace',20,short?8:20,short?190:260,short?32:40,C.moss,5);this.text(this.hud,'ConversationPlaceName',this.map().name+(short?'':' · Esc 离开'),32,short?9:24,short?166:236,30,16,C.paper);}
      this.drawPanel();return;
    }
    if(sceneLayouts[s.location]||this.width<1000&&!s.location.startsWith('cave_')){
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
    this.button(this.hud,'inventory','行囊  I',this.width-224,20,96,48,()=>void this.openInventory());
    this.button(this.hud,'life','成长  L',this.width-116,20,96,48,()=>this.navigate('life'));
    if(!s.location.startsWith('cave_')){
      this.box(this.hud,'NeighborCloth',this.width-248,78,232,100,'#233d31eb',8);
      this.box(this.hud,'NeighborRail',this.width-248,78,232,3,C.wood,0);
      ['lia','noah','mira'].forEach((id,i)=>{const x=this.width-236+i*72,name=this.client.world!.residents?.find(r=>r.id===id)?.name||id;this.button(this.hud,'find-'+id,'找'+name,x,82,64,64,()=>this.features.findNeighbor(this.panelHost(),id),this.busy||!this.canPlay(),false,'portrait');this.image(this.hud,'atlas/'+id,x+32,106,44,44);this.text(this.hud,'FindName',name,x+2,128,60,24,14,C.paper,true);});
      this.text(this.hud,'FindHint','找村民 · N',this.width-236,154,208,24,14,C.paper,true);
    }
    const n=this.nearest(), action=n?interactionFor(n,s,serverNow()):null;
    const local=!!sceneLayouts[s.location],walking=!!this.route.length&&local;
    const caption=this.busy?'正在回应…':walking?`${this.approach?this.supportedObjects().find(o=>o.id===this.approach!.id)?.name||'目的地':'选定位置'}
停止行走 · Esc`:n?local?`${n.name===action!.label?'':n.name+'\n'}${action!.reason||action!.label}  E`:action!.reason||`${action!.label}  E`:s.location.startsWith('cave_')?'走近阶梯或休息平台':'点击门口或家具 · 可自动走近';
    this.button(this.hud,walking?'stop-walk':'interact',caption,this.width-(local?288:272),this.height-(local?80:76),local?268:252,local?60:56,()=>{if(walking){this.clearInput();this.dirty=true;}else void this.interact();},!walking&&(!n||this.busy||!this.canPlay()||!!action?.reason),true);
    if(!s.location.startsWith('cave_')&&this.width>=1000){this.box(this.hud,'MovementHintGround',20,this.height-42,378,30,'#233d31',4);this.text(this.hud,'MovementHint','WASD 移动 · 点击走近交互 · Esc 停步',28,this.height-40,362,26,14,C.paper);}
    this.drawTouchPad();
    if(!this.canPlay()&&!this.busy){
      const compact=this.width<1000&&!s.location.startsWith('cave_');
      this.button(this.hud,'reconnect','重连并确认待保存操作',compact?192:20,compact?this.height-80:s.location.startsWith('cave_')?140:120,compact?this.width-488:270,compact?60:44,()=>this.reconnect(),false,true);
    }
    this.reconcileGuidanceMarker();
    this.drawStatus();
    this.drawTravelNotice();
    this.drawGuidanceHud();
    if(this.mode==='world'&&!s.location.startsWith('cave_'))this.drawQuickBar();
    if((this.error||this.notice&&(!sceneLayouts[s.location]||this.elapsed<this.worldNoticeUntil))&&this.mode==='world'&&!s.location.startsWith('cave_')){
      // Keep transient feedback above world bearings. Its layout leaves the
      // accepted pockets, touch controls and current interaction unobscured.
      const compact=this.width<1000,w=compact?284:Math.min(480,this.width-40),x=compact?20:(this.width-w)/2,yy=compact?164:this.height-154,h=compact?44:52;
      this.box(this.hud,'FeedbackPaper',x,yy,w,h,C.paper,8);
      const label=this.text(this.hud,'Feedback',this.error||this.notice,x+12,yy+(compact?2:4),w-24,compact?40:44,compact?14:15,this.error?C.danger:C.ink,true);label.lineHeight=compact?20:22;
    }
    if(this.mode!=='world')this.drawPanel();
  }
  private drawTouchPad(){
    this.touchPad.active=this.mode==='world'&&this.width<1000;if(!this.touchPad.active)return;
    const offset=this.client.state?.location.startsWith('cave_')?0:44;
    this.touchPad.setPosition(-this.width/2,this.height/2);const size=this.width+':'+this.height+':'+offset;
    // Keep touch targets alive while network receipts rebuild the surrounding HUD.
    if(this.padSize===size){this.controls.push(...this.padControls);return;}
    this.clear(this.touchPad);this.touches.clear();this.padSize=size;const start=this.controls.length;
    for(const [id,label,x,y,key] of [['up','↑',76,this.height-174+offset,KeyCode.ARROW_UP],['left','←',24,this.height-122+offset,KeyCode.ARROW_LEFT],['down','↓',76,this.height-122+offset,KeyCode.ARROW_DOWN],['right','→',128,this.height-122+offset,KeyCode.ARROW_RIGHT]] as const){
      this.button(this.touchPad,id,label,x,y,48,48,()=>{});const b=this.touchPad.getChildByName(id)!;
      b.on(Node.EventType.TOUCH_START,(event:EventTouch)=>{this.route=[];this.approach=null;this.dirty=true;this.touches.set(event.getID()??0,key);});
      b.on(Node.EventType.TOUCH_END,this.touchRelease,this);b.on(Node.EventType.TOUCH_CANCEL,this.touchRelease,this);
    }
    this.padControls=this.controls.slice(start);
  }
  private welcome() {
    let pendingDeletion=false,hasSession=false;
    try{const session=transport.getSession();pendingDeletion=!!session?.deletion;hasSession=!!session||!!sys.localStorage.getItem('realquest-cocos-guest-v1');}catch{/* Preserve malformed records for recovery. */}
    this.box(this.panel,'Backdrop',0,0,this.width,this.height,C.canvas,0);
    const w=Math.min(1040,this.width-32),h=Math.min(500,this.height-24),x=(this.width-w)/2,y=(this.height-h)/2,compact=h<430;
    this.box(this.panel,'WelcomePaper',x,y,w,h,C.paper,16);
    this.text(this.panel,'Title','RealQuest',x+24,y+(compact?12:24),220,42,compact?30:34);
    this.text(this.panel,'Subtitle',pendingDeletion?'旅程删除结果待确认':'旅人登记 · 已有旅程可直接接续',x+(compact?260:24),y+(compact?20:78),compact?w-284:w-48,28,16,C.muted);
    const nameY=compact?66:122,nameWidth=Math.min(400,Math.floor((w-72)*.54));
    this.field('traveler-name','旅人姓名（空白使用「林间旅人」）',this.registrationName,x+24,y+nameY,nameWidth,v=>this.registrationName=v,false,16);
    // Do not acquire text focus before the final asset-ready redraw. Redrawing
    // is intentionally deferred during editing to preserve native IME input.
    const nameInput=this.panel.getChildByName('traveler-name');if(nameInput){nameInput.getComponent(EditBox)!.enabled=this.loaded&&!this.busy&&!pendingDeletion;this.controls.find(c=>c.id==='traveler-name')!.disabled=!this.loaded||this.busy||pendingDeletion;}
    if(compact){
      const portrait=this.make(this.panel,'SelectedAppearance',x+nameWidth+76,-y-nameY-34,48,64);portrait.addComponent(Sprite).sizeMode=Sprite.SizeMode.CUSTOM;this.setActor(portrait,'actor-'+this.registrationAppearance,0);
      this.text(this.panel,'OutfitName',getAppearance(this.registrationAppearance).name,x+nameWidth+116,y+nameY+8,w-nameWidth-140,32,18);
      this.text(this.panel,'AppearanceHint','外观只用于新旅程',x+nameWidth+116,y+nameY+40,w-nameWidth-140,24,14,C.muted);
    }else{
      this.text(this.panel,'OutfitName','当前选择 · '+getAppearance(this.registrationAppearance).name,x+nameWidth+56,y+nameY+12,w-nameWidth-268,32,20);
      this.text(this.panel,'AppearanceHint','接续保留原角色，外观选择只用于新登记。',x+nameWidth+56,y+nameY+48,w-nameWidth-268,42,14,C.muted);
      const home=this.frames.get('village/home');if(home){const scale=Math.min(160/home.width,160/home.height);this.image(this.panel,'village/home',x+w-124,y+100,home.width*scale,home.height*scale);}
    }
    const gap=8,ww=(w-48-5*gap)/6,top=compact?164:198,cardH=compact?44:116;
    appearances.forEach((a,i)=>{
      const bx=x+24+i*(ww+gap),selected=a.id===this.registrationAppearance;
      this.button(this.panel,'appearance-'+a.id,(selected?'✓ ':'')+a.label,bx,y+top,ww,cardH,()=>{this.registrationAppearance=a.id;this.dirty=true;},this.busy||pendingDeletion,selected);
      if(!compact){const n=this.panel.getChildByName('appearance-'+a.id)!;n.getChildByName('Label')?.setPosition(0,-36);const sprite=this.make(n,'Outfit',0,20,48,64);sprite.addComponent(Sprite).sizeMode=Sprite.SizeMode.CUSTOM;this.setActor(sprite,'actor-'+a.id,0);}
    });
    const message=this.error||this.notice||(pendingDeletion?'上次删除结果尚待确认。下方只确认原请求，不会新建旅程。':hasSession?'继续会读取服务器上已有的角色与记录；接续也可使用旅程凭证。':'选择外观并写下名字；世界探索和现实成长都将保存到服务器。');
    this.text(this.panel,'WelcomeNote',message,x+24,y+(compact?216:338),w-48,42,14,this.error?C.danger:C.muted);
    const half=(w-56)/2;
    this.button(this.panel,'start',this.busy?'正在连接…':pendingDeletion?'确认删除结果':hasSession?'继续旅程':'开始旅程',x+24,y+h-62,half,44,()=>this.startJourney(),this.busy||!this.loaded,true);
    this.button(this.panel,'import-save','接续已有旅程',x+32+half,y+h-62,half,44,()=>this.open('session'),this.busy||pendingDeletion);
  }
  private drawPanel() {
    this.controls=[];this.actions.clear();this.semanticTexts=[];this.semanticFields.clear();
    const sceneLed=['dialogue','neighbor-find','neighbor-topics','neighbor-gift','item-confirm'].includes(this.mode);
    const overlay=this.box(this.panel,'ModalScrim',0,0,this.width,this.height,sceneLed?'#15291d38':'#263b32b8',0);overlay.addComponent(BlockInputEvents);
    if(['inventory','item-confirm'].includes(this.mode)){this.inventoryView.draw(this.panelHost());return;}
    if(this.mode==='storage'){this.storageView.draw(this.panelHost());return;}
    if(this.features.handles(this.mode)){this.features.draw(this.panelHost());return;}
    const w=Math.min(880,this.width-40),h=Math.min(this.mode==='inventory'?430:['travel','storage','sleep','context'].includes(this.mode)?440:320,this.height-32),x=(this.width-w)/2,y=(this.height-h)/2;
    this.box(this.panel,'ReadingLeaf',x,y,w,h,C.paper,16);
    const title=this.mode==='inventory'?'旅人的行囊':(this.context?.name||'旅途安排');
    this.text(this.panel,'PanelTitle',title,x+28,y+16,w-110,40,24);
    this.button(this.panel,'close','返回',x+w-96,y+14,72,44,()=>this.closePanel(),this.busy);
    const s=this.client.state!;
    this.drawContext(x,y,w,h);
  }

  private navigate(mode:string,replace=false){
    if(mode==='life-notices')mode=this.features.contractNotices();
    if(mode===this.mode)return;
    if(replace&&this.panelHistory.at(-1)?.mode===mode)this.panelHistory.pop();
    if(!replace&&mode!=='world'&&this.mode!=='world'&&this.mode!=='welcome')this.panelHistory.push({mode:this.mode,focus:this.focusId});
    this.open(mode);
  }
  private closePanel(){const previous=this.panelHistory.pop();this.open(previous?.mode||(this.client.state?.character?'world':'welcome'));if(previous)this.focusId=previous.focus;}
  private mark(target:NavigationTarget,label:string){this.guideMarker=null;this.marker=target;this.markerLabel=label;const person=this.client.world&&this.client.state?residentPositions(this.client.world,this.client.state,serverNow()).find(p=>p.id===target.targetId):null;this.notice=person?label+'现在在'+residentPlace(this.client.world!,person.location!)+'，跟着路标走吧。':'已标记 '+label+' · 标记不会移动角色';this.open('world');}
  private panelHost(parent:Node=this.panel):PanelHost{
    const self=this;
    return {
      get state(){return self.client.state!;},get saveId(){return self.client.saveId;},get world(){return self.client.world!;},get context(){return self.context;},
      get reducedMotion(){return reducedMotion();},get mode(){return self.mode;},get width(){return self.width;},get height(){return self.height;},get processing(){return self.busy;},get connection(){return self.client.status;},get busy(){return self.busy||!self.canPlay();},get error(){return self.error;},get notice(){return self.notice;},get now(){return serverNow();},
      itemSlot:(...args)=>self.itemSlot(parent,...args),box:(...args)=>{self.box(parent,...args);},text:(...args)=>self.text(parent,...args),button:(...args)=>self.button(parent,...args),image:(...args)=>{self.image(parent,...args);},
      line:(id,points,color,width=2)=>{for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.y-a.y);if(length<.01)continue;const n=self.box(parent,id+'-'+i,(a.x+b.x-length)/2,(a.y+b.y-width)/2,length,width,color,0);n.angle=-Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;}},
      person:(name,x,y,w,h)=>{const n=self.make(parent,name,x,-y,w,h);n.addComponent(Sprite).sizeMode=Sprite.SizeMode.CUSTOM;self.setActor(n,name,0);n.getComponent(UITransform)!.setContentSize(w,h);},
      field:(...args)=>self.field(...args),send:(action,data={})=>self.sendFeature(action,data),follow:action=>self.followGuidance(action),go:(mode,replace)=>self.navigate(mode,replace),close:()=>self.closePanel(),redraw:(clearFeedback=false)=>{if(clearFeedback){self.notice='';self.error='';}self.dirty=true;},mark:(target,label)=>self.mark(target,label),uuid:()=>transport.uuid(),
      focus:id=>{self.focusId=id;self.dirty=true;},reconnect:()=>{void self.reconnect();},
      meet:id=>{const person=residentPositions(self.client.world!,self.client.state!,serverNow()).find(p=>p.id===id);if(!person)return;self.mark({mapId:person.location!,targetId:id},person.name);if(person.location===self.client.state!.location){if(Math.hypot(person.x-self.p.x,person.y-self.p.y)<=65)void self.interact(person);else{self.route=approachRoute(self.map(),self.p,person);self.approach=self.route.length?{id,map:self.sceneId}:null;if(!self.route.length)self.error='暂时找不到可通行的小路，请从门口靠近。';}}},
    };
  }
  private field(id:string,label:string,value:string,x:number,y:number,w:number,change:(v:string)=>void,numeric=false,maxLength=80){
    this.text(this.panel,'Label-'+id,label,x,y,w,22,14,C.muted);
    const n=this.make(this.panel,id,x+w/2,-y-44,w,44),g=n.addComponent(Graphics);g.fillColor=new Color(C.raised);g.roundRect(-w/2,-22,w,44,8);g.fill();g.strokeColor=new Color('#687455');g.lineWidth=1;g.roundRect(-w/2,-22,w,44,8);g.stroke();
    const edit=n.addComponent(EditBox);for(const child of [...n.children])child.destroy();
    edit.maxLength=maxLength;edit.inputMode=numeric?EditBox.InputMode.NUMERIC:EditBox.InputMode.ANY;
    edit.textLabel=this.text(n,'Value',value,-w/2+12,-22,w-24,44,16);edit.placeholderLabel=this.text(n,'Placeholder','',-w/2+12,-22,w-24,44,16,C.muted);edit.string=value;
    this.semanticFields.set(id,{label,value});this.actions.set(id,()=>{this.clearInput();this.focusId=id;this.semantics.labelEditor(id,label);edit.focus();});
    n.on(EditBox.EventType.EDITING_DID_BEGAN,()=>{this.focusId=id;this.semantics.labelEditor(id,label);});
    if(this.focusId===id){g.strokeColor=new Color(C.amber);g.lineWidth=3;g.roundRect(-w/2-2,-24,w+4,48,10);g.stroke();}
    n.on(EditBox.EventType.TEXT_CHANGED,()=>change(edit.string));n.on(EditBox.EventType.EDITING_DID_ENDED,()=>{change(edit.string);this.dirty=true;});
    const wp=n.worldPosition;this.controls.push({id,label,x:wp.x,y:this.height-wp.y,w,h:44,disabled:this.busy});
  }
  private async sendFeature(action:string,data:Record<string,unknown>={}){
    let success=false;
    await this.work(async()=>{const location=this.client.state!.location;const reply=await this.client.command(action,data);this.notice=reply.message||'';success=true;
      if(this.client.state!.location!==location){this.p={...this.client.state!.position};this.buildWorld();this.open('world');}
    });
    if(!success&&['knowledge_spend','skill_spend','health_spend','plant','craft','sell','market_trade'].includes(action)&&this.client.status==='ready'){
      const message=this.error;this.busy=true;this.dirty=true;
      try{await this.client.refresh();this.error=message+'。已同步最新报价，请核对后再操作。';}
      catch{this.error=message+'。暂时无法同步，请先重连。';}
      finally{this.busy=false;this.dirty=true;}
    }
    return success;
  }
  private updateCombat(dx:number,dy:number){
    if(this.busy||this.combatPending||this.elapsed-this.combatLastTick<0.11)return;
    const intention=combatIntention(this.client.state!,this.owner,{dx,dy},this.targetId,{attack:this.keys.has(KeyCode.SPACE)||!!this.combatDock?.held||this.attackPulse,spark:this.keys.has(KeyCode.KEY_Q)||this.sparkPulse,soup:this.keys.has(KeyCode.KEY_R)||this.soupPulse});
    if(!intention)return;
    this.targetId=intention.targetId;this.combatLastTick=this.elapsed;this.attackPulse=this.sparkPulse=this.soupPulse=false;
    this.combatPending=this.client.command('cave_tick',intention.data).then(reply=>{if(reply.state.combat?.message)this.notice=reply.state.combat.message;}).catch(e=>{this.error=e.message;this.clearInput();}).finally(()=>{this.combatPending=null;this.dirty=true;});
  }
  private followGuidance(action:GuidanceAction){
    this.continuation.dismiss();
    if(action.magic)this.features.growth='magic';
    if(action.target){this.mark(action.target,action.label);if(action.owner)this.guideMarker={owner:action.owner,target:action.target};return;}
    let mode=guidanceMode(action.panel,action.magic);
    if(action.panel==='activity')mode=this.features.focusLife(action.lifeView||'study',this.client.state!);
    this.navigate(mode);
  }
  private reconcileGuidanceMarker(){
    if(!this.guideMarker||!this.client.state)return;
    const entry=currentGuidance(this.client.state,serverNow());
    if(this.guideMarker&&(this.guideMarker.owner!==entry.key||this.guideMarker.target.mapId!==entry.action?.target?.mapId||this.guideMarker.target.targetId!==entry.action?.target?.targetId)){
      if(this.marker?.mapId===this.guideMarker.target.mapId&&this.marker.targetId===this.guideMarker.target.targetId)this.marker=null;
      this.guideMarker=null;
    }
  }
  private drawGuidanceHud(){
    if(this.mode!=='world'||!this.client.state?.character||!this.canPlay())return;
    const s=this.client.state,h=this.panelHost(this.hud),entry=currentGuidance(s,serverNow());
    this.continuation.attach(this.client.saveId);this.continuation.reconcile(s,serverNow());
    const cave=s.location.startsWith('cave_');
    if(cave){h.button('tracker-open','当前目标 · '+entry.progress,20,this.width<1000?130:140,196,44,()=>this.navigate('guide-goal'),this.busy);return;}
    const compact=this.width<1000,x=compact?192:20,y=compact?this.height-80:sceneLayouts[s.location]?128:158,w=compact?this.width-488:284;
    if(this.continuation.cue){
      h.button('return-open','欢迎回来\n'+shortText(entry.title,Math.max(8,Math.floor((w-84)/16))),x,y,w-68,compact?60:68,()=>{this.continuation.dismiss();this.features.prepare();this.navigate('preparation');},this.busy,true);
      h.button('return-dismiss','收起',x+w-60,y,60,compact?60:44,()=>{this.continuation.dismiss();this.dirty=true;},this.busy);return;
    }
    if(this.continuation.collapsed){h.button('tracker-toggle','展开目标',x,y,116,compact?60:44,()=>{this.continuation.fold(false);this.dirty=true;},this.busy);return;}
    const title=shortText(entry.title,compact?Math.max(6,Math.floor((w-84)/16)):12),count=entry.note.match(/（(\d+\/\d+)）/);
    const detail=entry.kind==='quest'?(count?count[1]+' '+shortText(entry.note,compact?5:8):entry.progress+' · '+shortText(entry.note,compact?5:8)):entry.progress;
    h.button('tracker-open',title+'\n'+detail,x,y,w-68,compact?60:68,()=>this.navigate('guide-goal'),this.busy);
    h.button('tracker-toggle','收起',x+w-60,y,60,compact?60:44,()=>{this.continuation.fold(true);this.dirty=true;},this.busy);
    if(!compact)h.button('tracker-follow',entry.action?.label||'旅途委托',x,y+76,w,44,()=>entry.action?this.followGuidance(entry.action):this.navigate('journal'),this.busy,true);
  }
  private drawStatus(){
    const s=this.client.state!;
    if(this.mode!=='world')return;
    if(this.canPlay()&&this.width>=1000&&!s.location.startsWith('cave_')&&!sceneLayouts[s.location]){
      this.box(this.hud,'VitalsPaper',20,102,270,44,C.paper,8);
      this.text(this.hud,'Vitals',`生命 ${s.vitality?.current??100}  体力 ${s.stamina?.current??100}  金币 ${s.inventory.gold||0}`,32,108,246,32,14);
    }
    if(this.marker&&this.client.world){
      const target=accessibleTarget(this.marker,this.client.world,s,serverNow());
      if(target){const sx=this.width/2+this.world.position.x+target.x*this.zoom,sy=this.height/2-this.world.position.y+target.y*this.zoom;
        const x=Math.max(24,Math.min(this.width-24,sx)),y=Math.max(170,Math.min(this.height-154,sy));
        this.box(this.hud,'TargetMarker',x-8,y-8,16,16,C.amber,4);
        const person=residentPositions(this.client.world,s,serverNow()).find(p=>p.id===this.marker!.targetId);
        if(person){const xx=this.width-276,yy=184;this.box(this.hud,'NeighborBearing',xx,yy,256,64,'#233d31eb',6);this.image(this.hud,'atlas/'+person.id,xx+28,yy+30,44,44);this.text(this.hud,'NeighborBearingText',person.name+' · '+residentPlace(this.client.world,person.location!)+'\n'+(person.location===s.location?'就在这里，走近交谈':target.kind==='building'?'门口按 E 进入':target.kind==='exit'?'从'+target.name+'出去':'先到：'+target.name),xx+56,yy+4,192,56,14,C.paper);}
        else if(this.width>=1000){const labelY=s.location.startsWith('cave_')?196:sceneLayouts[s.location]?260:290;
          this.box(this.hud,'TargetLabelBacking',20,labelY,320,52,'#244134',8);
          this.text(this.hud,'TargetLabel',`${this.markerLabel} · ${target.name}`,32,labelY+4,296,44,15,C.paper);}
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
    await this.work(async()=>{await this.client.reconnect();if(!this.client.state){this.deletedJourney();return;}this.p={...this.client.state.position};this.confirmJourneySnapshot(serverNow(),true);this.notice='已重新确认服务器存档';this.worldNoticeUntil=this.elapsed+3.2;});
  }
  private exportCredential() {return this.work(async()=>{downloadRecovery(await this.client.recoveryFile());this.backupDownloadedSaveId=this.client.saveId;this.notice='凭证已下载，请妥善保存。';});}
  private deletedJourney(){
    this.inventoryView.deleted();this.continuation.reset();this.guideMarker=null;this.clearInput();this.world.active=false;this.context=null;this.sceneId='';this.marker=null;
    this.recovery=null;this.recoveryPreview=null;this.backedUpSaveId='';this.backupDownloadedSaveId='';
    this.confirmDelete=false;this.panelHistory=[];this.mode='welcome';this.notice='旅程数据已删除，旧凭证已失效。\n点击开始才会新建旅程。';this.error='';this.dirty=true;
  }
  private async adoptJourney(){
    if(this.recoverySource==='web')await this.client.continueWebJourney(this.recoveryPreview.save_id);
    else await this.client.restore(this.recovery!);
    this.recovery=null;this.recoveryPreview=null;this.backedUpSaveId='';this.backupDownloadedSaveId='';
    this.p={...this.client.state!.position};this.inventoryView.init(this.panelHost());this.sceneId='';this.buildWorld();this.notice='已接续原旅程';this.open('world');this.confirmJourneySnapshot(serverNow(),true);
  }
  private drawSession() {
    this.box(this.panel,'SessionBackdrop',0,0,this.width,this.height,'#dee3cf',0);
    const w=Math.min(880,this.width-32),h=Math.min(520,this.height-24),x=(this.width-w)/2,y=(this.height-h)/2;
    const body=y+120,row=y+(h<400?184:296),bottom=y+h-62,half=(w-64)/2;
    this.box(this.panel,'SessionPaper',x,y,w,h,C.paper,16);
    this.text(this.panel,'SessionTitle','旅程与存档',x+28,y+16,w-140,40,26);
    this.button(this.panel,'session-close','返回',x+w-100,y+14,72,44,()=>{this.recovery=null;this.recoveryPreview=null;this.open(this.client.state?.character&&!this.client.deletionPending?'world':'welcome');},this.busy);
    for(const [i,page] of (['recovery','data'] as const).entries())this.button(this.panel,'session-tab-'+page,page==='recovery'?'接续与凭证':'数据管理',x+24+i*(half+16),y+64,half,44,()=>{this.sessionPage=page;this.confirmDelete=false;this.recovery=null;this.recoveryPreview=null;this.error='';this.notice='';this.dirty=true;},this.busy||this.client.deletionPending,this.sessionPage===page);
    if(this.client.deletionPending){
      this.text(this.panel,'DeletionPending','删除结果待确认',x+24,body,w-48,32,24,C.danger);
      this.text(this.panel,'DeletionPendingHelp','请重试核实服务器结果。确认前保留本机记录，不会新建旅程。',x+24,body+38,w-48,52,17);
      this.button(this.panel,'delete-retry','重试并确认删除结果',x+24,bottom,w-48,44,()=>this.reconnect(),this.busy,true);
    }else if(this.sessionPage==='data'){
      const active=!!this.client.state?.character;
      this.text(this.panel,'DataJourney',active?`当前旅程：${this.client.state!.character!.name} · ${this.client.saveId.slice(0,8)}`:'请先连接要管理的旅程',x+24,body,w-48,32,22);
      if(this.confirmDelete){
        this.text(this.panel,'DeleteScope','永久删除此旅程的角色、活动、计时、世界和结算记录。\n所有会话和旅程凭证一并失效，无法撤销。',x+24,body+38,w-48,h<400?60:80,17,C.danger);
        this.button(this.panel,'delete-cancel','取消，保留旅程',x+24,bottom,half,44,()=>{this.confirmDelete=false;this.dirty=true;},this.busy,true);
        this.button(this.panel,'delete-confirm','确认永久删除此旅程',x+40+half,bottom,half,44,()=>this.work(async()=>{await this.client.deleteData();this.deletedJourney();}),this.busy||!active).color=new Color(C.danger);
      }else{
        this.text(this.panel,'ExportMeaning',h<400?'完整数据供查看；恢复请保存凭证。删除会撤销全部会话。':'完整数据供查看；找回请保存旅程凭证。删除会撤销此旅程所有会话。',x+24,body+34,w-48,h<400?28:76,h<400?15:17,C.muted);
        this.button(this.panel,'export-data','导出完整数据与结算记录',x+24,row,half,44,()=>this.work(async()=>{downloadData(await this.client.exportData());this.notice='完整数据已下载；恢复旅程请另存旅程凭证。';}),this.busy||!active);
        this.button(this.panel,'data-export-recovery','导出旅程凭证',x+40+half,row,half,44,()=>this.exportCredential(),this.busy||!active);
        this.button(this.panel,'delete-begin','删除此旅程的数据…',x+24,bottom,w-48,44,()=>{this.confirmDelete=true;this.notice='';this.error='';this.dirty=true;},this.busy||!active).color=new Color(C.danger);
      }
    }else if(this.recoveryPreview){
      const p=this.recoveryPreview;
      const needsBackup=!!this.client.state?.character&&p.save_id!==this.client.saveId&&this.backedUpSaveId!==this.client.saveId;
      this.text(this.panel,'RestoreName',`接续：${p.character?.name||'未命名旅人'} · ${p.save_id.slice(0,8)}`,x+24,body,w-48,32,24);
      this.text(this.panel,'RestoreDetails','计划 '+p.plan_count+' · 记录 '+p.record_count+' · '+(needsBackup?'先保存当前凭证再切换':'原旅程保留，接续最新存档'),x+24,body+34,w-48,h<400?28:58,h<400?15:17,C.muted);
      if(needsBackup){
        this.button(this.panel,'backup-before-restore','先导出当前凭证',x+24,row,half,44,()=>this.exportCredential(),this.busy);
        this.button(this.panel,'backup-saved','已保存当前凭证',x+40+half,row,half,44,()=>{this.backedUpSaveId=this.client.saveId;this.dirty=true;},this.busy||this.backupDownloadedSaveId!==this.client.saveId);
      }
      this.button(this.panel,'confirm-restore',this.busy?'正在连接…':'确认接续此旅程',x+24,bottom,half,44,()=>this.work(()=>this.adoptJourney()),this.busy||needsBackup,true);
      this.button(this.panel,'cancel-restore','取消切换',x+40+half,bottom,half,44,()=>{this.recovery=null;this.recoveryPreview=null;this.notice='';this.dirty=true;},this.busy);
    } else {
      this.text(this.panel,'SessionStatus',`${this.client.state?.character?.name||'尚未连接旅程'} · ${this.connectionLabel()}`,x+24,body,w-48,32,22);
      this.text(this.panel,'SessionMeaning',h<400?'需连接同一服务器；独立预览库和数值导出不能恢复原库旅程。':'两版需连接同一服务器；独立预览库无法读取原库。凭证可找回旅程，完整数值导出不能用于恢复。',x+24,body+34,w-48,h<400?28:58,h<400?15:17,C.muted);
      this.button(this.panel,'choose-recovery','导入旅程凭证',x+24,row,half,44,()=>this.work(async()=>{const text=await chooseRecovery();if(text){const file=readRecovery(text);const preview=await this.client.previewRecovery(file);if(this.client.pending&&preview.save_id!==this.client.saveId)throw new Error('当前有待确认操作，请先选择当前旅程的凭证');this.recoverySource='file';this.recoveryPreview=preview;this.recovery=file;}}),this.busy,true);
      this.button(this.panel,'find-web-journey','查找此浏览器原网页旅程',x+40+half,row,half,44,()=>this.work(async()=>{
        try{this.recoveryPreview=await this.client.inspectWebJourney();this.recoverySource='web';}
        catch(e){if((e as any).status===401)throw new Error('未找到原网页旅程。请在原Web导出凭证，并连接同一服务器后导入。');throw e;}
      }),this.busy);
      this.button(this.panel,'export-recovery','导出当前凭证',x+24,bottom,half,44,()=>this.exportCredential(),this.busy||!this.client.state?.character||!!this.client.pending);
      this.button(this.panel,'session-reconnect','重连并确认',x+40+half,bottom,half,44,()=>this.reconnect(),this.busy||!this.client.saveId);
    }
    if(this.error||this.notice)this.text(this.panel,'SessionError',this.error||this.notice,x+24,y+h-108,w-48,42,15,this.error?C.danger:C.muted);
  }
  private drawContext(x:number,y:number,w:number,h:number) {
    const s=this.client.state!,obj=this.context;
    if(!obj)return;
    const mutate=(action:string,data:Record<string,unknown>={})=>this.work(async()=>{
      const reply=await this.client.command(action,{target:obj.id,...data});this.notice=reply.message||'';
      this.p={...this.client.state!.position};
      if(this.sceneId!==this.client.state!.location){this.buildWorld();this.open('world');}
      else if(action==='rest'||action==='short_rest'){this.open('world');this.worldNoticeUntil=this.elapsed+4;}
    });
    if(this.mode==='sleep'){
      this.text(this.panel,'RestDetails',obj.id==='inn_bed'?'整夜住宿需要先向岚姨订房。':'睡到次日 06:00，按原有规则恢复体力和生命。\n小憩推进 30 游戏分钟；作物继续按现实时间生长。',x+28,y+80,w-56,90,18);
      const needsBooking=obj.id==='inn_bed'&&s.departure?.booking_day!==villageClock(s,serverNow()).day;
      this.button(this.panel,'sleep-night',needsBooking?'需先向岚姨订房':'睡到明早',x+28,y+h-80,220,48,()=>mutate('rest',{expected_day:villageClock(s,serverNow()).day}),this.busy||needsBooking,true);
      if(obj.id==='home_bed')this.button(this.panel,'short-rest','小憩一会儿',x+270,y+h-80,220,48,()=>mutate('short_rest',{expected_day:villageClock(s,serverNow()).day}),this.busy);
    } else if(this.mode==='travel'){
      const options=s.travel?.options.filter(q=>q.target===obj.id)||[],perPage=h<420?1:3,pages=Math.max(1,Math.ceil(options.length/perPage));
      options.slice(this.page*perPage,(this.page+1)*perPage).forEach((q,i)=>{const yy=y+76+i*88;
        const costs=Object.entries(q.costs).map(([id,n])=>`${({gold:'金币',plank:'木板',stone:'石料'} as Record<string,string>)[id]||id} ${n}`).join(' · ');
        this.text(this.panel,'Quote-'+q.id,q.label,x+28,yy,w-280,30,19);
        this.text(this.panel,'QuoteDetail-'+q.id,q.reasons.join('；')||[costs,q.stamina?`体力 ${q.stamina}`:'',`${q.minutes} 游戏分钟`].filter(Boolean).join(' · '),x+28,yy+32,w-280,44,14,q.reasons.length?C.danger:C.muted);
        this.button(this.panel,'travel-'+q.id,q.completed?'已完成':q.destination?'前往':'确认',x+w-200,yy+8,160,48,()=>mutate('travel',{option:q.id,expected_location:s.location,expected_day:s.travel!.day}),this.busy||q.reasons.length>0,true);
      });
      this.button(this.panel,'travel-details','地点与完整报价',x+28,y+h-54,190,44,()=>this.features.inspectPlace(this.panelHost(),obj.id),this.busy);
      this.text(this.panel,'TravelPage',`${this.page+1} / ${pages}`,x+232,y+h-48,100,32,14,C.muted);
      if(pages>1)this.button(this.panel,'travel-next','下一页',x+w-180,y+h-54,140,44,()=>{this.page=(this.page+1)%pages;this.dirty=true;});
    } else {
      const cave=s.location.startsWith('cave_');
      this.text(this.panel,'ContextScope',cave?'可从洞内路标查看通路或安全撤离。':obj.kind==='study'?'现实成长可直接从右上角进入。':'此处没有额外操作。可从旅程页查看任务与地图。',x+28,y+88,w-56,120,19);
      if(cave)this.button(this.panel,'cave-retreat','安全撤离',x+28,y+h-80,220,48,()=>mutate('cave_retreat'),this.busy,true);
    }
    if(this.error||this.notice)this.text(this.panel,'ContextFeedback',this.error||this.notice,x+28,y+h-(this.mode==='travel'?108:132),w-56,42,14,this.error?C.danger:C.muted);
  }

  private clientChanged(){
    this.dirty=true;const s=this.client?.state,save=this.client?.saveId,action=this.client?.pending?.body.action;
    if(s&&this.audibleState&&s!==this.audibleState&&save===this.audibleSave&&action&&!['move','world_resume','world_pause'].includes(action)){const cue=confirmedCue(this.audibleState,s);if(cue)soundEffects.play(cue);}
    this.audibleState=s||null;this.audibleSave=save||'';
  }
  private async toggleFullScreen(){if(fullScreen.pending)return;await fullScreen.toggle();this.notice=fullScreen.error||(fullScreen.active?'已进入全屏，Esc 可退出。':'已退出全屏。');this.dirty=true;}
  private drawTravelNotice(){
    const s=this.client.state;if(this.mode!=='world'||!s||!this.canPlay())return;const notes=travelNotices(s,serverNow());if(!notes.length)return;
    const desktop=this.width>=1000,cave=s.location.startsWith('cave_'),left=cave?330:sceneLayouts[s.location]?304:290,right=this.width-392,w=desktop?Math.min(284,right-left-16):284,x=desktop?left+(right-left-w)/2:cave?this.width-304:20,y=desktop?20:cave?78:118;
    const label=this.button(this.hud,'travel-notice',notes[0].title+'\n查看'+notes.length+'条提醒',x,y,w,desktop?48:44,()=>{this.features.openNotices();this.navigate('preferences');},this.busy,false,'game');label.fontSize=14;label.lineHeight=20;
  }

  private snapshot() {
    const s=this.client.state;
    const feedbackNode=this.hud.getChildByName('FeedbackPaper'),feedbackSize=feedbackNode?.getComponent(UITransform)?.contentSize;
    const feedback=feedbackNode?.active&&feedbackSize?{text:this.hud.getChildByName('Feedback')?.getComponent(Label)?.string||'',x:feedbackNode.position.x,y:-feedbackNode.position.y,w:feedbackSize.width,h:feedbackSize.height}:null;
    const hudRegions:{id:string;x:number;y:number;w:number;h:number}[]=[];
    for(const id of ['QuickHintPaper','QuickCloth','LocalStatus','NeighborCloth','NeighborBearing','Brand','VitalsPaper','CaveStatus','CaveHintPaper','MovementHintGround']){
      const node=this.hud.getChildByName(id),size=node?.getComponent(UITransform)?.contentSize;
      if(node?.active&&size)hudRegions.push({id,x:node.position.x,y:-node.position.y,w:size.width,h:size.height});
    }
    return { engine:'Cocos Creator 3.8.8', platform:platformName, mode:this.mode, focusId:this.focusId, registrationAppearance:this.registrationAppearance, loaded:this.loaded&&!(globalThis as unknown as Record<string,any>).REALQUEST_BOOT?.pending, busy:this.busy, error:this.error, notice:this.notice,
      feedback,hudRegions,
      actorFrame:this.actorFrame,npcPresentation:Object.fromEntries(this.npcMotion),combatTarget:this.targetId,sessionPage:this.sessionPage,deletionPending:this.client.deletionPending,recoverySource:this.recoveryPreview?this.recoverySource:null,coordinateSystem:'world: origin top-left, +x right, +y down; controls: CSS pixels from top-left',
      player:this.p, savedPosition:s?.position, saveId:this.client.saveId, revision:s?.revision, vitality:s?.vitality, combat:s?.combat, questLog:s?.quest_log, lifeJournal:s?.life_journal,villageIntro:s?.village_intro,trackedQuest:s?.tracked_quest, timer:s?.timer, studyTasks:s?.study_task_log, plans:s?.study_plan_log, growth:s?.character_growth_options, storage:s?.storage, features:this.features.snapshot(),guidance:this.client.state?{...this.continuation.inspect(),entry:currentGuidance(this.client.state,serverNow()),ownedMarker:this.guideMarker}:null,marker:this.marker,connection:this.client.status, pendingAction:this.client.pending?.body.action||null, location:s?.location, appearance:s?.character?.appearance, character:s?.character,xp:s?.xp,attributes:s?.attributes,points:s?{knowledge:s.knowledge_points,health:s.health_points,skill:s.skill_points}:null, sceneId:this.sceneId, map:this.client.state?{id:this.map().id,width:this.map().width,height:this.map().height,obstacles:this.map().obstacles}:null, inventory:s?.inventory, stamina:s?.stamina,
      plots:s?.plots, activities:s?.activities.slice(-10), camera:{x:this.world.position.x,y:this.world.position.y,zoom:this.conversationZoom||this.zoom,width:this.width,height:this.height},
      plotPresentation:Object.fromEntries(this.plotVisuals),
      interactables:this.supportedObjects(),
      selected:this.inventoryView.selected, quick:this.inventoryView.quick, inventoryUi:{...this.inventoryView.snapshot(),target:this.mode==='item-confirm'?this.inventoryView.target(this.panelHost()):null}, nearby:this.nearest()||null, navigationBearing:this.marker&&s&&this.client.world?accessibleTarget(this.marker,this.client.world,s,serverNow()):null, controls:this.controls,
      serverTimeIsReal:true, navigationIntent:this.approach,route:this.route,localScene:{family:sceneLayouts[this.sceneId]?'fine-hearthwood':'temporary',response:this.responseObject,responseActive:this.elapsed<this.responseUntil},serverClock:s?.world_clock,experience:experienceSnapshot(),travelNotices:s?travelNotices(s,serverNow()):[],scope:'village-polish-local', presentation:{family:'stone-root-v1',confirmedFeedback:this.combatRenderer.visibleFeedbackCount,reducedMotion:reducedMotion()} };
  }
}
