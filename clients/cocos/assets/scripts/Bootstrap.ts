import {isTool,toolIds,toolName,toolSpec,toolLevel,toolCost,toolTarget,toolReason,toolCells,toolArtPaths,type ToolId} from './core/tools';
import {toolCatalog} from './core/toolCatalog';
import {ToolRenderer,type WorkMotion} from './toolView';
import {toolActorArtPaths,toolActorPresentation,type ToolActorPresentation} from './toolActor';
import {chestObjects} from './core/construction';
import {formatMoney} from './core/currency';
import {RanchRenderer} from './ranchView';
import {ranchArtPaths} from './core/ranching';
import {gearCatalog,gearMaterials} from './core/gearCatalog';
import {seedCrop,plotCrop,plotStage,cropArtPaths,farmCell,hoeReason} from './core/farming';
import {staminaNow} from './core/stamina';
import {
  _decorator, Component, Node, UITransform, Graphics, Color, Label, Sprite,
  SpriteFrame, Rect, Size, Vec3, resources, view, ResolutionPolicy, input,
  Input, KeyCode, EventKeyboard, EventTouch, EventMouse, EditBox, BlockInputEvents,
  game, Game, sys, UIOpacity, profiler, Canvas, Widget, director, screen,
} from 'cc';
import { Client, readRecovery, type RecoveryFile } from './core/client';
import { transport, platformName, viewportSize, subscribeViewport, subscribeFocus, subscribeTextEscape, foregroundVisible, reducedMotion, textOwnsInput, chooseRecovery, downloadRecovery, downloadData, soundEffects, fullScreen, subscribeExperience, experienceSnapshot } from './platform';
import { serverNow } from './core/clock';
import { pathfind, walkable, currentMap, mapById, accessibleTarget } from './core/navigation';
import { interactionFor } from './core/interaction';
import { residentPositions, residentPlace, villageClock, clockLabel } from './core/residents';
import type { WorldObject, NavigationTarget, GameState, Reply } from './core/protocol';
const { ccclass } = _decorator;
import {C} from './ui/theme';
import {controlSkin,gameControls,paperSurface,timberSurface,webMaterialPaths,lazyMaterialPaths} from './ui/materials';
import {travelNotices,confirmedCue} from './core/preferences';
import {FeaturePanels,type PanelHost,type ControlSkin} from './ui/panels';
import {CombatRenderer} from './combatView';
import {CombatMotion,CombatInputBuffer} from './core/combatMotion';
import {swordArtPaths,swordPresentation,resolveCombatAim,facingDirection,facingAngles,type SwordPresentation} from './core/swordMotion';
import type {CombatAction} from './core/protocol';
import {combatIntention,itemNames} from './core/features';
import {caveGround,caveRouteArt} from './core/caveArt';
import {caveStatus,nextTarget,liveTarget} from './core/caveView';
import {paintGraphics} from './cavePaint';
import {paintFarmPlot} from './farmPaint';
import {CombatDock} from './ui/combatDock';
import {LocalSceneRenderer} from './localSceneView';
import {ArrivalScene} from './arrivalScene';
import {StorageView} from './ui/storage';
import {InventoryView} from './ui/inventory';
import {InventoryDrag,type DragSpec} from './ui/drag';
import {itemIntent} from './core/inventory';
import {registrationAppearances} from './core/appearances';
import {registration} from './core/dossier';
import {currentGuidance,guidanceMode,type GuidanceAction} from './core/guidance';
import {JourneyContinuation} from './core/continuation';
import {shortText} from './core/lifeRecords';
import {sceneArtPaths,sceneLayouts} from './core/sceneLayout';
import {approachRoute,localCamera,sourceActorFrame,pendingSafeMove,unobscuredCamera} from './core/localScene';
import {WebSemantics,type SemanticText,type SemanticField} from './accessibility';

type Control = { id: string; label: string; x: number; y: number; w: number; h: number; disabled: boolean; skin?:ControlSkin;accessibleName?:string;pressed?:boolean };

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
  private get farmingTool(){return this.mode==='world'&&this.client.state?.tools?.held==='hoe';}
  private workMotion:WorkMotion|null=null;
  private toolPose:ToolActorPresentation|null=null;
  private toolRange=1;private toolDirection:number|null=null;
  private handTool():ToolId|null{const id=this.client.state?.tools?.held;return isTool(id)?id:null;}
  private async holdItem(item:string|null){if(this.busy||!this.canPlay())return;this.clearInput();this.focusId='';this.toolRange=1;await this.sendFeature('tool_hold',{item});}
  private toggleHoe(){void this.holdItem(this.farmingTool?null:'hoe');}
  private hoeQueue:WorldObject[]=[];
  private hoeAim:WorldObject|null=null;
  private hoePointer:number|null=null;
  private toolGestureUntil=0;
  private toolGestureHits=0;
  private hoeLastPoint:{x:number;y:number}|null=null;
  private hoeNext=0;
  private hoeHoldNext=0;
  private hoeSwing:{x:number;y:number;until:number}|null=null;
  private hoeOverlay:Node|null=null;
  private plotVisuals = new Map<string, string>();
  private actorDirection=0;private actorFrame=0;
  private npcMotion=new Map<string,{x:number;y:number;direction:number;frame:number}>();
  private frames = new Map<string, SpriteFrame>();
  private loadingUIArt=new Set<string>();private failedUIArt=new Set<string>();
  private actorFrames = new Map<string, SpriteFrame>();
  private keys = new Set<number>();
  private touches=new Map<number,number>();
  private controls: Control[] = [];
  private uiRegions:{id:string;x:number;y:number;w:number;h:number}[]=[];
  private movementLearned=false;private movementDistance=0;
  private pressedButtons = new Set<Node>();
  private dragLayer=new Node('InventoryDrag');
  private inventoryDrag=new InventoryDrag(()=>this.height,(spec,x,y,dx,dy)=>this.paintInventoryDrag(spec,x,y,dx,dy),()=>{
    this.clear(this.dragLayer);this.panel.setPosition(-this.width/2,this.height/2);this.pressedButtons.clear();this.dirty=true;
  });
  private dragMove=(event:EventTouch)=>this.inventoryDrag.move(event);
  private dragEnd=(event:EventTouch)=>{this.inventoryDrag.finish(event);};
  private dragCancel=()=>this.inventoryDrag.cancel();
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
  private sessionPage:'recovery'|'account'|'data'='recovery';
  private accountForm:'login'|'register'='login';
  private accountUsername='';private accountPassword='';private accountConfirm='';private passwordVisible=false;
  private accountPreview:Reply|null=null;
  private recoverySource:'file'|'web'='file';
  private confirmDelete=false;
  private actions = new Map<string, () => unknown>();
  private focusId = '';
  private lastNearby = '';
  private depths = new Map<Node, number>();
  private features=new FeaturePanels(this.inventoryView.preferences);
  private combatRenderer=new CombatRenderer(this.world,this.depths,this.frames);
  private combatDock:CombatDock|null=null;
  private ranchRenderer=new RanchRenderer(this.world,this.frames,this.depths);
  private toolRenderer=new ToolRenderer(this.world,this.frames,this.objects,this.depths);
  private localScene=new LocalSceneRenderer(this.world,this.frames,this.objects,this.depths);
  private arrivalScene=new ArrivalScene(this.world,this.frames,this.objects,this.depths);
  private approach:{id:string;map:string}|null=null;
  private inputEpoch=0;private responseObject="";private responseUntil=0;
  private combatPending:Promise<unknown>|null=null;
  private combatLastTick=0;
  private combatMotion=new CombatMotion();
  private localAction:CombatAction|null=null;
  private localActionStart=0;private localActionReady=0;
  private dodgePulse=false;private localDodgeUntil=0;private localDodgeReady=0;
  private localDodge={dx:0,dy:0};
  private dodgeIntent={dx:0,dy:0};
  private dodgePending=false;
  private combatReceiptAt=0;
  private combatQueued=new CombatInputBuffer();
  private targetId:string|null=null;
  private combatPointer:{x:number;y:number}|null=null;
  private combatPointerScreen:{x:number;y:number}|null=null;
  private mouseAttack=false;private mouseCombatUntil=0;
  private swordPose:SwordPresentation={active:false,direction:0,frame:0,phase:'ready',sheet:'attack',moving:false};
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
    this.dragLayer.layer=this.node.layer;this.node.addChild(this.dragLayer);
    input.on(Input.EventType.TOUCH_MOVE,this.dragMove);input.on(Input.EventType.TOUCH_END,this.dragEnd);input.on(Input.EventType.TOUCH_CANCEL,this.dragCancel);
    this.world.addComponent(UITransform);
    this.world.getComponent(UITransform)!.setAnchorPoint(0, 1);
    this.world.on(Node.EventType.TOUCH_END, this.worldTouch, this);
    this.world.on(Node.EventType.TOUCH_START,this.hoeStart,this);
    this.world.on(Node.EventType.TOUCH_MOVE,this.hoeDrag,this);
    this.world.on(Node.EventType.TOUCH_END,this.hoeEnd,this);
    this.world.on(Node.EventType.TOUCH_CANCEL,this.hoeEnd,this);
    input.on(Input.EventType.TOUCH_MOVE,this.hoeDrag,this);
    input.on(Input.EventType.MOUSE_MOVE,this.hoeHover,this);
    input.on(Input.EventType.MOUSE_MOVE,this.combatMouseMove,this);
    input.on(Input.EventType.MOUSE_DOWN,this.combatMouseDown,this);
    input.on(Input.EventType.MOUSE_UP,this.combatMouseUp,this);
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
    this.combatDock=new CombatDock(this.node,id=>{if(id==='next-target')this.targetId=nextTarget(this.client.state!,this.targetId);else this.queueCombat(id);this.dirty=true;});
    this.panel.setSiblingIndex(this.node.children.length-1);
    this.resize();
    const host = globalThis as unknown as Record<string, any>;
    host.render_game_to_text = () => JSON.stringify(this.snapshot());
    // Network/world clocks remain real: frame stepping must never mint time.
    host.advanceTime = (ms: number) => new Promise(resolve => setTimeout(resolve, Math.min(ms, 5000)));
    void this.loadArt();
  }
  onDestroy() {
    input.off(Input.EventType.MOUSE_MOVE,this.combatMouseMove,this);
    input.off(Input.EventType.MOUSE_DOWN,this.combatMouseDown,this);
    input.off(Input.EventType.MOUSE_UP,this.combatMouseUp,this);
    input.off(Input.EventType.TOUCH_MOVE,this.hoeDrag,this);input.off(Input.EventType.MOUSE_MOVE,this.hoeHover,this);
    this.inventoryDrag.cancel();input.off(Input.EventType.TOUCH_MOVE,this.dragMove);input.off(Input.EventType.TOUCH_END,this.dragEnd);input.off(Input.EventType.TOUCH_CANCEL,this.dragCancel);
    this.unsubscribeViewport();
    this.unsubscribeFocus();
    this.unsubscribeText();
    this.unsubscribeExperience();
    this.semantics.dispose();
    for (const frame of this.actorFrames.values()) frame.destroy();
    for (const frame of this.slicedFrames.values()) frame.destroy();
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
    this.clearInput();
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
      await Promise.all(Array.from(new Set([...toolArtPaths,...toolActorArtPaths,...sceneArtPaths,...cropArtPaths,...ranchArtPaths,...swordArtPaths,'ui/arrival','ui/register','ui/satchel','ui/notice-timber','ui/notice-paper','ui/shop-interior','ui/blacksmith-interior','ui/weapon-stand','atlas/blacksmith','village/blacksmith-figure',...['adu','lanya'].map(n=>`village/${n}-actor`),...['terrain','lia','noah','mira','adu','lanya'].map(n=>`atlas/${n}`),...names.map(n => `village/${n}`), ...Object.keys(gearCatalog).map(n=>`items/${n}`),...['wood','stone','seed','crop','plank','backpack','stone_sword','reinforced_sword','spring_spear','glow_staff','gel','shell','crystal','gate_stone','soup','gold','journal'].map(n => `items/${n}`), ...['market-counter','notice','bookcase','workbench','desk-88','desk-96','bed','hearth','planter','barrel','anvil','rug','window','chest-open','book','lantern','wall','chest-closed'].map(n=>`interiors/${n}`)])).map(path => new Promise<void>((resolve, reject) => {
        // Keep one presentation key and the original PNG for unsupported platforms.
        const asset=platformName==='web'&&sys.hasFeature(sys.Feature.WEBP)?path==='scenes/terrain'?'scenes/terrain-web':webMaterialPaths.has(path)?path+'-web':path:path;
        resources.load(asset + '/spriteFrame', SpriteFrame, (error, frame) => {
          if (error) { reject(error); return; }
          this.frames.set(path, frame); resolve();
        });
      })));
      for(const [id,m] of Object.entries(gearMaterials)){const frame=this.frames.get('items/'+m.icon);if(frame)this.frames.set('items/'+id,frame);}
      for(const [id,art] of Object.entries({wooden_chest:'interiors/chest-closed',reinforced_chest:'interiors/chest-open',mayo_machine:'ranching/mayo',loom_machine:'ranching/loom',cheese_press:'ranching/cheese',oil_press:'ranching/oil'})){const frame=this.frames.get(art);if(frame)this.frames.set('items/'+id,frame);}
      for(const id of toolIds)this.frames.set('items/'+id,this.frames.get('tools/'+id+'-0')!);
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
  private hudCloth(id:string,x:number,y:number,w:number,h:number){
    this.box(this.hud,id+'Edge',x,y+2,w,h,'#70563e',5);
    const n=this.box(this.hud,id,x+1,y,w-2,h-1,'#233d31f5',4),g=n.getComponent(Graphics)!;
    g.strokeColor=new Color('#8f9a6c');g.lineWidth=1;g.moveTo(-w/2+10,h/2-3);g.lineTo(w/2-10,h/2-3);g.stroke();
    g.strokeColor=new Color('#6d7e58');for(let xx=-w/2+10;xx<w/2-8;xx+=8){g.moveTo(xx,-h/2+4);g.lineTo(xx+3,-h/2+4);}g.stroke();
  }
  private paintInventoryDrag(spec:DragSpec,x:number,y:number,dx:number,dy:number){
    if(spec.panel){
      const bounds=this.uiRegions.find(r=>r.id==='inventory-layout');if(!bounds)return;
      dx=Math.max(12-bounds.x,Math.min(this.width-12-(bounds.x+bounds.w),dx));dy=Math.max(12-bounds.y,Math.min(this.height-12-(bounds.y+bounds.h),dy));
      this.panel.setPosition(-this.width/2+dx,this.height/2-dy);return;
    }
    this.clear(this.dragLayer);this.dragLayer.setPosition(-this.width/2,this.height/2);this.dragLayer.setSiblingIndex(this.node.children.length-1);
    const target=spec.targets?.find(t=>x>=t.x&&x<=t.x+t.w&&y>=t.y&&y<=t.y+t.h);
    if(target){const n=this.make(this.dragLayer,'DropTarget',target.x+target.w/2,-target.y-target.h/2,target.w,target.h),g=n.addComponent(Graphics);g.fillColor=new Color('#d3a45038');g.roundRect(-target.w/2,-target.h/2,target.w,target.h,5);g.fill();g.strokeColor=new Color(C.amber);g.lineWidth=2;g.roundRect(-target.w/2,-target.h/2,target.w,target.h,5);g.stroke();}
    this.box(this.dragLayer,'DraggedItem',x-24,y-24,48,48,C.paper,5);if(spec.item)this.image(this.dragLayer,'items/'+spec.item,x,y,36,36);
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
  private button(parent: Node, id: string, label: string, x: number, y: number, w: number, h: number, action: () => unknown, disabled = false, primary = false, skin?:ControlSkin,semantic?:{label:string;pressed?:boolean}) {
    skin=controlSkin(id,skin);
    // A local view can be dismissed while an uncertain request waits for recovery.
    if(id==='close'&&!this.busy&&!this.canPlay())disabled=false;
    const n = this.box(parent, id, x, y, w, h, disabled ? '#d0d7bf' : primary ? C.moss : C.raised, 10);
    const text = this.text(n, 'Label', label, -w/2+8, -h/2, w-16, h, 16, primary && !disabled ? C.raised : C.ink, true);
    text.lineHeight=h<=48?20:22;
    if(skin==='pocket'){
      const g=n.getComponent(Graphics)!;g.clear();g.fillColor=new Color(disabled?'#b4b89c':'#70563e');g.roundRect(-w/2,-h/2,w,h,9);g.fill();
      g.fillColor=new Color(disabled?'#d0d7bf':primary?C.moss:'#f4efde');g.roundRect(-w/2+1,-h/2+3,w-2,h-4,8);g.fill();
      g.strokeColor=new Color(disabled?'#b4b89c':primary?'#6e8b60':'#fffbed');g.lineWidth=1;g.moveTo(-w/2+10,h/2-3);g.lineTo(w/2-10,h/2-3);g.stroke();
    }
    if(skin==='satchel-slot'||skin==='satchel-pocket'||skin==='satchel-close'){
      const g=n.getComponent(Graphics)!;text.string='';
      const paint=(hover=false)=>{
        const hot=!disabled&&(hover||this.focusId===id),pocket=skin==='satchel-pocket';g.clear();
        if(skin==='satchel-close'){
          g.fillColor=new Color('#26372b');g.roundRect(-w/2,-h/2,w,h,6);g.fill();
          g.fillColor=new Color(disabled?'#6a6651':hot?'#8f6e4d':'#70563e');g.roundRect(-w/2+2,-h/2+3,w-4,h-5,5);g.fill();
          g.strokeColor=new Color(hot?C.amber:'#b49a6c');g.lineWidth=1;g.roundRect(-w/2+4,-h/2+5,w-8,h-9,3);g.stroke();
          g.strokeColor=new Color(disabled?'#b4b89c':C.paper);g.lineWidth=2.5;g.moveTo(-8,-8);g.lineTo(8,8);g.stroke();g.moveTo(-8,8);g.lineTo(8,-8);g.stroke();
        }else{
          g.fillColor=new Color(primary?'#233d31d0':hot?'#47684eaa':pocket?'#233d3166':'#dce1c914');g.roundRect(-w/2,-h/2,w,h,6);g.fill();
          g.strokeColor=new Color(primary||hot?C.amber:pocket?'#697d57':'#b4c49a44');g.lineWidth=primary||hot?2:1;g.roundRect(-w/2+1,-h/2+1,w-2,h-2,5);g.stroke();
          if(pocket){g.fillColor=new Color(primary||hot?C.amber:'#b2a66a');for(let xx=-w/2+8;xx<w/2-8;xx+=8){g.rect(xx,h/2-5,Math.min(4,w/2-8-xx),1);g.fill();g.rect(xx,-h/2+4,Math.min(4,w/2-8-xx),1);g.fill();}for(let yy=-h/2+10;yy<h/2-8;yy+=8){g.rect(-w/2+4,yy,1,Math.min(4,h/2-8-yy));g.fill();g.rect(w/2-5,yy,1,Math.min(4,h/2-8-yy));g.fill();}}
        }
      };
      paint();n.on(Node.EventType.MOUSE_ENTER,()=>paint(true));n.on(Node.EventType.MOUSE_LEAVE,()=>paint());n.on(Node.EventType.TOUCH_START,()=>paint(true));n.on(Node.EventType.TOUCH_END,()=>paint());n.on(Node.EventType.TOUCH_CANCEL,()=>paint());
    }
    if(['game','entry','tab','back','back-light','page'].includes(skin)){
      const g=n.getComponent(Graphics)!;
      const cut=(xx:number,yy:number,ww:number,hh:number)=>{const c=3;g.moveTo(xx+c,yy);g.lineTo(xx+ww-c,yy);g.lineTo(xx+ww,yy+c);g.lineTo(xx+ww,yy+hh-c);g.lineTo(xx+ww-c,yy+hh);g.lineTo(xx+c,yy+hh);g.lineTo(xx,yy+hh-c);g.lineTo(xx,yy+c);g.close();};
      const paint=(hover=false)=>{
        g.clear();const focus=this.focusId===id,hot=!disabled&&(hover||focus),quiet=skin!=='game';
        text.color=new Color(disabled?C.muted:skin==='back-light'||!quiet&&primary?C.paper:C.ink);
        if(skin==='game'){
          g.fillColor=new Color(disabled?'#b7baa3':'#70563e');cut(-w/2,-h/2,w,h);g.fill();
          g.fillColor=new Color(disabled?'#dedfce':primary?(hot?'#34533d':C.moss):(hot?'#e8e1c7':C.paper));cut(-w/2+1,-h/2+3,w-2,h-4);g.fill();
          g.strokeColor=new Color(disabled?'#c7c9b4':primary?'#8ba075':'#fffbf0');g.lineWidth=1;g.moveTo(-w/2+6,h/2-4);g.lineTo(w/2-6,h/2-4);g.stroke();
          if(primary&&!disabled){g.fillColor=new Color(C.amber);for(const xx of [-w/2+7,w/2-9]){g.rect(xx,-1,2,2);g.fill();}}
        }else if(skin==='entry'){
          text.horizontalAlign=Label.HorizontalAlign.LEFT;text.node.getComponent(UITransform)!.setContentSize(w-48,h);text.node.setPosition(-10,0);
          if(hot||primary){g.fillColor=new Color(primary?'#dce1c7':'#e5e2cc');cut(-w/2,-h/2+2,w,h-4);g.fill();}
          if(primary){g.fillColor=new Color(C.moss);g.rect(-w/2,-h/2+4,3,h-8);g.fill();}
          g.strokeColor=new Color(disabled?'#c4c6b0':hot?C.moss:C.line);g.lineWidth=1;g.moveTo(-w/2+10,-h/2+1);g.lineTo(w/2-10,-h/2+1);g.stroke();
          if(!disabled){g.strokeColor=new Color(hot?C.moss:C.wood);g.lineWidth=1.5;g.moveTo(w/2-16,-4);g.lineTo(w/2-12,0);g.lineTo(w/2-16,4);g.stroke();}
        }else if(skin==='tab'){
          if(primary||hot){g.fillColor=new Color(disabled?C.canvas:primary?C.moss:'#e5e2cc');cut(-w/2+2,-h/2+3,w-4,h-6);g.fill();text.color=new Color(primary&&!disabled?C.paper:C.ink);}
          g.strokeColor=new Color(primary?C.amber:C.line);g.lineWidth=primary?2:1;g.moveTo(-w/2+8,-h/2+2);g.lineTo(w/2-8,-h/2+2);g.stroke();
        }else{
          if(skin==='back-light'){g.fillColor=new Color('#233d31e8');cut(-w/2,-h/2+2,w,h-4);g.fill();}
          if(hot){g.fillColor=new Color(skin==='back-light'?C.moss:'#e5e2cc');cut(-w/2,-h/2+2,w,h-4);g.fill();}
          if(skin==='back'||skin==='back-light'){text.node.getComponent(UITransform)!.setContentSize(w-28,h);text.node.setPosition(10,0);g.strokeColor=new Color(disabled?C.muted:skin==='back-light'?C.paper:C.wood);g.lineWidth=1.5;g.moveTo(-w/2+17,-5);g.lineTo(-w/2+12,0);g.lineTo(-w/2+17,5);g.stroke();}
        }
        if(focus){g.strokeColor=new Color(C.amber);g.lineWidth=2;cut(-w/2-2,-h/2-2,w+4,h+4);g.stroke();}
      };
      paint();n.on(Node.EventType.MOUSE_ENTER,()=>paint(true));n.on(Node.EventType.MOUSE_LEAVE,()=>paint());n.on(Node.EventType.TOUCH_START,()=>paint(true));n.on(Node.EventType.TOUCH_END,()=>paint());n.on(Node.EventType.TOUCH_CANCEL,()=>paint());
    }
    if(skin==='hud'){
      const g=n.getComponent(Graphics)!;text.color=new Color(disabled?'#b4b89c':C.paper);text.fontSize=16;
      const paint=(hover=false)=>{g.clear();if(hover||this.focusId===id){g.fillColor=new Color(C.moss);g.roundRect(-w/2,-h/2,w,h,4);g.fill();g.strokeColor=new Color(C.amber);g.lineWidth=1;g.moveTo(-w/2+10,-h/2+1);g.lineTo(w/2-10,-h/2+1);g.stroke();}};
      paint();n.on(Node.EventType.MOUSE_ENTER,()=>{if(!disabled)paint(true);});n.on(Node.EventType.MOUSE_LEAVE,()=>paint());
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
    if(skin==='notice'){
      const g=n.getComponent(Graphics)!;text.color=new Color(C.ink);
      const paint=(hover=false)=>{g.clear();if(primary||hover||this.focusId===id){g.strokeColor=new Color(primary?C.moss:C.amber);g.lineWidth=2;g.roundRect(-w/2,-h/2,w,h,3);g.stroke();}};
      paint();n.on(Node.EventType.MOUSE_ENTER,()=>{if(!disabled)paint(true);});n.on(Node.EventType.MOUSE_LEAVE,()=>paint());
    }
    if(skin==='shop-item'||skin==='shop-tab'||skin==='smith-tab'){
      const g=n.getComponent(Graphics)!,tab=skin!=='shop-item';if(!tab)text.string='';
      if(skin==='smith-tab'){const paper=this.image(n,'ui/notice-paper',0,0,w-5,h-5,true);if(paper){paper.setSiblingIndex(0);paper.getComponent(Sprite)!.color=new Color(primary?C.moss:disabled?'#b9bca3':'#ffffff');}}
      const paint=(hover=false)=>{g.clear();const hot=!disabled&&(hover||this.focusId===id);g.fillColor=new Color(tab?(primary?C.moss:disabled?'#c6c7ad':C.paper):primary?'#3f63486b':hot?'#233d3150':'#00000000');g.roundRect(-w/2,-h/2,w,h,3);g.fill();if(primary||hot||tab){g.strokeColor=new Color(primary||hot?C.amber:'#8f6e4d');g.lineWidth=primary||hot?2:1;g.roundRect(-w/2+1,-h/2+1,w-2,h-2,3);g.stroke();}if(tab)text.color=new Color(primary?C.paper:disabled?C.muted:C.ink);};
      paint();n.on(Node.EventType.MOUSE_ENTER,()=>paint(true));n.on(Node.EventType.MOUSE_LEAVE,()=>paint());n.on(Node.EventType.TOUCH_START,()=>paint(true));n.on(Node.EventType.TOUCH_END,()=>paint());n.on(Node.EventType.TOUCH_CANCEL,()=>paint());
    }
    if(skin==='shop-action'){
      const g=n.getComponent(Graphics)!;const paint=(hover=false)=>{g.clear();g.fillColor=new Color('#27392f');g.roundRect(-w/2,-h/2,w,h,5);g.fill();g.fillColor=new Color(disabled?'#b7baa3':hover?'#34533d':C.moss);g.roundRect(-w/2+3,-h/2+3,w-6,h-6,4);g.fill();g.strokeColor=new Color(disabled?'#b4b89c':C.amber);g.lineWidth=2;g.roundRect(-w/2+2,-h/2+2,w-4,h-4,4);g.stroke();if(!disabled){g.fillColor=new Color(C.amber);for(let xx=-w/2+10;xx<w/2-10;xx+=12){g.rect(xx,-h/2+7,6,1);g.fill();g.rect(xx,h/2-8,6,1);g.fill();}}text.color=new Color(disabled?C.muted:C.paper);};paint(this.focusId===id);n.on(Node.EventType.MOUSE_ENTER,()=>paint(true));n.on(Node.EventType.MOUSE_LEAVE,()=>paint(this.focusId===id));
    }
    if(skin==='portrait'){text.string='';const g=n.getComponent(Graphics)!;g.clear();if(primary){g.fillColor=new Color(C.moss);g.roundRect(-w/2,-h/2,w,h,7);g.fill();}}
    const activate=()=>{if(parent!==this.touchPad&&!['sound-toggle','sound-test'].includes(id))void soundEffects.unlock().then(()=>soundEffects.play());action();};
    if(!disabled)this.actions.set(id,activate);
    if(this.focusId===id){const g=n.getComponent(Graphics)!;g.strokeColor=new Color(C.amber);g.lineWidth=3;g.roundRect(-w/2-2,-h/2-2,w+4,h+4,10);g.stroke();}
    const opacity = n.addComponent(UIOpacity);
    n.on(Node.EventType.MOUSE_ENTER,()=>{if(!disabled)opacity.opacity=(skin==='answer'||skin==='pocket')?255:225;});
    const release=()=>{if(this.pressedButtons.delete(n))this.dirty=true;opacity.opacity=255;if(skin)n.setPosition(x+w/2,-y-h/2);};
    n.on(Node.EventType.MOUSE_LEAVE,release);
    n.on(Node.EventType.TOUCH_START, () => { this.inventoryDrag.resetClick();if (!disabled){if(parent!==this.touchPad)this.pressedButtons.add(n);opacity.opacity=(skin==='answer'||skin==='pocket')?255:195;if(skin&&!reducedMotion())n.setPosition(x+w/2,-y-h/2-2);} });
    n.on(Node.EventType.TOUCH_CANCEL, release);
    n.on(Node.EventType.TOUCH_END, release);
    n.on(Node.EventType.TOUCH_END, (event: EventTouch) => { event.propagationStopped = true; if(this.inventoryDrag.finish(event))return;if (!disabled) activate(); });
    // All controls are recorded in design pixels, excluding credentials.
    const wp = n.worldPosition;
    this.controls.push({ id, label, x: wp.x, y: this.height-wp.y, w, h, disabled,skin,...(semantic?{accessibleName:semantic.label,pressed:semantic.pressed}:{}) });
    return text;
  }
  private itemSlot(parent:Node,id:string,item:string|null,x:number,y:number,w:number,h:number,count:number,selected:boolean,action:()=>unknown,reference=false,number?:number,hint?:string,muted=false){
    const shop=id.startsWith('select-sell:'),worldQuick=id.startsWith('world-quick-'),canUse=worldQuick&&!!seedCrop(item||'')&&count>0&&this.client.state&&this.client.world&&!itemIntent(this.client.world,this.client.state,serverNow(),item||'').reason&&!!itemIntent(this.client.world,this.client.state,serverNow(),item||'').command;
    const tool=isTool(item),isGear=!!item&&Object.prototype.hasOwnProperty.call(gearCatalog,item),worn=!!item&&(this.client.state?.tools?.held===item||((gearCatalog as Record<string,{slot:string}>)[item]?.slot!=='weapon'&&Object.values(this.client.state?.combat?.equipment||{}).includes(item)));
    const purpose=!item?'整理':count<=0?'已耗尽':tool?worn?'手持':'拿起':isGear?worn?'手持':'装备':seedCrop(item||'')?'播种':'查看';
    const label=(number?number+' · ':'')+(item?(itemNames[item]||item)+' · '+(count>0?'持有'+count+'份':'已耗尽'):'空口袋')+(worldQuick?' · '+(tool?(worn?'正在手持，点击保持':'点击拿起，不触发使用'):isGear?(worn?'已装备，点击保持装备':'点击装备，不触发攻击'):seedCrop(item||'')?'拿起种子后点空田播种':!item?'整理快捷栏':'查看物品，选择下一步'):'');
    const satchel=!worldQuick,skin=satchel?(reference?'satchel-pocket':'satchel-slot'):'pocket';
    const text=this.button(parent,id,label+(hint?' · '+hint:''),x,y,w,h,action,this.busy||!this.canPlay(),selected,skin),n=text.node.parent!;
    const empty=reference&&!item;
    if(empty&&!satchel){const g=n.getComponent(Graphics)!;g.clear();g.fillColor=new Color('#233d3140');g.roundRect(-w/2,-h/2,w,h,7);g.fill();g.strokeColor=new Color('#8ba075');g.lineWidth=1;g.roundRect(-w/2+1,-h/2+1,w-2,h-2,7);g.stroke();}
    if(item&&(!reference||count>0)){const size=shop?Math.min(64,w-12):satchel&&h>=64?40:worldQuick&&h<52?24:32,art=this.image(n,'items/'+((gearMaterials as any)[item]?.icon||item),0,satchel?-2:-4,size,size);if(art&&(count<=0||muted))art.addComponent(UIOpacity).opacity=100;}
    else this.text(n,'Reference',item?shortText(itemNames[item]||item,2):'+',-w/2+3,-h/2+8,w-6,h-28,empty?20:12,satchel||empty||selected?C.paper:C.muted,true);
    if(number)this.text(n,'QuickNumber',String(number),-w/2+(satchel?7:3),-h/2+(satchel?3:1),16,18,12,satchel||empty||selected?C.paper:C.ink);
    const countLabel=this.text(n,'Count',item?(count>0||reference?String(count):'未持有'):'',shop?-w/2+4:count>0||reference?w/2-(satchel?30:25):-w/2+3,shop?h/2-26:worldQuick?-h/2+1:h/2-22,shop?w-8:count>0||reference?(satchel?24:22):w-6,shop?24:18,count>0||reference?(shop?14:12):11,satchel||selected?C.paper:C.muted,true);
    if(shop)countLabel.horizontalAlign=Label.HorizontalAlign.RIGHT;
    if(worldQuick)this.text(n,'QuickPurpose',purpose,-w/2+2,h/2-18,w-4,18,11,empty?C.paper:count<=0&&item?C.muted:C.ink,true);
  }
  private image(parent: Node, path: string, x: number, y: number, w: number, h: number,sliced=false) {
    const item=path.startsWith('items/')?path.slice(6):'';if(isTool(item)&&this.client.state)path='tools/'+item+'-'+toolLevel(this.client.state,item);
    const sf = this.frames.get(path); if (!sf) {if(lazyMaterialPaths.has(path)&&!this.loadingUIArt.has(path)&&!this.failedUIArt.has(path)){this.loadingUIArt.add(path);const asset=platformName==='web'&&sys.hasFeature(sys.Feature.WEBP)?path+'-web':path;resources.load(asset+'/spriteFrame',SpriteFrame,(error,frame)=>{this.loadingUIArt.delete(path);if(error){this.failedUIArt.add(path);this.notice='书页材质暂未载入，记录与操作仍可继续。';}else this.frames.set(path,frame);this.dirty=true;});}return null;}
    const n = this.make(parent, path, x, -y, w, h);
    const sprite = n.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.spriteFrame = sf;
    if(sliced){const material=path==='ui/notice-paper'?{scale:18/80,top:80,right:80,bottom:80,left:80}:path==='ui/notice-timber'?{scale:24/105,top:105,right:105,bottom:105,left:105}:{scale:.18,top:220,right:180,bottom:200,left:180};const scale=material.scale;let f=this.slicedFrames.get(path);if(!f){f=sf.clone();f.insetTop=material.top;f.insetRight=material.right;f.insetBottom=material.bottom;f.insetLeft=material.left;this.slicedFrames.set(path,f);}sprite.spriteFrame=f;sprite.type=Sprite.Type.SLICED;n.setScale(scale,scale,1);n.getComponent(UITransform)!.setContentSize(w/scale,h/scale);}else n.getComponent(UITransform)!.setContentSize(w,h);
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
      try{this.movementLearned=sys.localStorage.getItem('realquest-movement-learned:'+this.client.saveId)==='1';}catch{this.movementLearned=false;}this.movementDistance=0;
      this.mode = 'world'; this.buildWorld();
      await this.client.command('world_resume', { owner: this.owner });
      this.confirmJourneySnapshot(serverNow(),true);
    } catch (error) { this.error = (error as Error).message; }
    finally { this.busy = false; this.dirty = true; }
  }
  private buildWorld() {
    this.world.active=true;
    this.combatRenderer.reset();this.targetId=null;if(this.client.state)this.combatMotion.reset(this.client.state.position,this.elapsed);this.localAction=null;this.localDodgeUntil=0;this.localActionReady=this.localDodgeReady=0;
    this.caveCameraCache=null;
    this.clearInput(); this.clear(this.world); this.objects.clear(); this.plotVisuals.clear(); this.npcMotion.clear();this.depths.clear();
    this.hoeOverlay=null;this.ranchRenderer.reset();this.toolRenderer.reset();
    const map = this.map(); this.sceneId=map.id;
    this.world.getComponent(UITransform)!.setContentSize(map.width, map.height);
    this.zoom=localCamera(map,this.width,this.height);
    const arrivalScene=this.arrivalScene.build(map);
    const fineScene=this.localScene.build(map)||this.ranchRenderer.build(map);
    const camera=this.node.getComponent(Canvas)?.cameraComponent;if(camera)camera.clearColor=new Color(map.id==='overworld'?'#78955e':fineScene||map.id.startsWith('cave_')?'#27352d':'#000000');
    if(!fineScene){
    const ground = new Node('Ground'); ground.layer = this.node.layer; this.world.addChild(ground);
    const g = ground.addComponent(Graphics);
    const rect = (x: number, y: number, w: number, h: number, c: string) => { g.fillColor = new Color(c); g.rect(x,-y-h,w,h); g.fill(); };
    if(arrivalScene){
      // The city renderer owns its existing landmarks and terrain.
    } else if(map.id==='overworld'){
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
    for(const obj of map.objects.filter(o=>!this.objects.has(o.id)&&!['plot','soil','npc','travel_npc'].includes(o.kind))){
      if(['animal','shelter','ranch_ledger','ranch_exit','resource'].includes(obj.kind))continue;
      if(obj.kind==='production')continue;
      if(obj.id.startsWith('player_chest_')){const n=this.image(this.world,'interiors/chest-closed',obj.x,obj.y-9,40,30);if(n){this.objects.set(obj.id,n);this.depths.set(n,obj.y);}continue;}
      if(obj.kind==='blacksmith'){const n=this.image(this.world,'village/blacksmith-figure',obj.x,obj.y-64/3,32,128/3);if(n){this.objects.set(obj.id,n);this.depths.set(n,obj.y);}continue;}
      if(obj.kind==='carpenter'){const n=this.make(this.world,obj.id,obj.x,-obj.y,32,128/3);n.getComponent(UITransform)!.setAnchorPoint(.5,0);n.addComponent(Sprite).sizeMode=Sprite.SizeMode.CUSTOM;this.setActor(n,'noah-actor',0);const tag=this.make(n,'CarpenterName',0,48,100,26);this.box(tag,'NameGround',-50,-13,100,26,'#233d31eb',4);this.text(tag,'Name','阿榆 · 木匠',-48,-13,96,26,13,C.paper,true);this.objects.set(obj.id,n);this.depths.set(n,obj.y);continue;}
      if(obj.kind==='ranch_gate'){const n=this.image(this.world,'ranching/ledger',obj.x,obj.y-18,32,36);if(n){this.objects.set(obj.id,n);this.depths.set(n,obj.y);}continue;}
      if(obj.kind==='cave'||obj.id==='village_departure'){
        const n=this.make(this.world,obj.id,0,0,128,128);paintGraphics(n.addComponent(Graphics),caveRouteArt(obj,this.client.state!));this.objects.set(obj.id,n);this.depths.set(n,obj.y);continue;
      }
      if(fineScene&&obj.kind==='exit')continue;
      const color=['building','exit','passage','cave'].includes(obj.kind)?C.wood:C.moss;
      const n=this.box(this.world,obj.id,obj.x-8,obj.y-10,16,18,color,2);this.objects.set(obj.id,n);this.depths.set(n,obj.y);
      if(!map.outdoor&&map.id!=='overworld'&&obj.kind!=='exit'&&obj.kind!=='cave')n.active=false;
    }
    const job=this.client.state?.construction?.job;
    if(job&&(job.building==='home'?map.id==='overworld':map.id==='pasture')){const site=job.building==='home'?{x:160,y:248}:map.objects.find(o=>o.id==='shelter_'+job.building);if(site){const marker=this.image(this.world,'items/plank',site.x,site.y-18,32,32);if(marker)this.depths.set(marker,site.y+1);const tag=this.make(this.world,'Worksite',site.x,-site.y-2,112,26);this.box(tag,'WorksiteGround',-56,-13,112,26,C.moss,3);this.text(tag,'WorksiteText','阿榆施工中',-54,-13,108,26,13,C.paper,true);this.depths.set(tag,site.y+2);}}
    for(const obj of map.objects.filter(o=>o.kind==='travel_npc')){
      const n=this.image(this.world,'village/'+obj.id+'-actor',obj.x,obj.y-64/3,32,128/3);
      if(!n)throw Error('Unbound travel resident '+obj.id);
      this.objects.set(obj.id,n);this.depths.set(n,obj.y);
    }
    for (const obj of map.objects.filter(o=>['plot','soil'].includes(o.kind))) {
      const n=this.make(this.world,obj.id,obj.x,-obj.y+1,42,36);n.addComponent(Graphics);this.objects.set(obj.id,n);this.depths.set(n,obj.y-20);
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
    n.getComponent(Sprite)!.spriteFrame=f;if(n===this.actor){this.actorFrame=frame;n.getComponent(UITransform)!.setContentSize(32,128/3);n.getComponent(UITransform)!.setAnchorPoint(.5,0);}
  }
  private setToolActor(pose:ToolActorPresentation){
    if(!pose.active)return false;
    const sf=this.frames.get(pose.sheet);if(!sf)return false;
    const key=pose.sheet+':'+pose.sourceDirection+':'+pose.frame;let f=this.actorFrames.get(key);
    if(!f){f=new SpriteFrame();f.texture=sf.texture;f.rect=new Rect(pose.frame*112,pose.sourceDirection*112,112,112);f.originalSize=new Size(112,112);this.actorFrames.set(key,f);}
    this.actor.getComponent(Sprite)!.spriteFrame=f;this.actor.setScale(pose.flipX?-1:1,1);
    this.actor.getComponent(UITransform)!.setContentSize(224/3,224/3);this.actor.getComponent(UITransform)!.setAnchorPoint(.5,1/7);
    this.actorFrame=pose.direction*6+pose.frame;return true;
  }
  private setSwordActor(pose:SwordPresentation){
    if(!pose.active)return false;
    const name=pose.sheet==='attack'?'combat/sword-actor-0':'combat/sword-motion-0',sf=this.frames.get(name);if(!sf)return false;
    const key=name+':'+pose.direction+':'+pose.frame;let f=this.actorFrames.get(key);
    if(!f){f=new SpriteFrame();f.texture=sf.texture;f.rect=new Rect(pose.frame*96,pose.direction*96,96,96);f.originalSize=new Size(96,96);this.actorFrames.set(key,f);}
    this.actor.getComponent(Sprite)!.spriteFrame=f;
    this.actor.getComponent(UITransform)!.setContentSize(64,64);this.actor.getComponent(UITransform)!.setAnchorPoint(.5,1/6);
    this.actorFrame=pose.direction*6+pose.frame;return true;
  }
  private aim(){
    const locked=this.client.state?.combat?.enemies.find(e=>e.id===this.targetId&&e.hp>0);
    const cursor=this.combatPointerScreen;
    const pointer=cursor?{x:(cursor.x-this.world.position.x)/this.zoom,y:-(cursor.y-this.world.position.y)/this.zoom}:this.combatPointer;
    return resolveCombatAim(this.p,this.actorDirection,pointer,locked);
  }
  private pointCombat(p:{x:number;y:number}){
    this.combatPointer=p;this.combatPointerScreen={x:p.x*this.zoom+this.world.position.x,y:-p.y*this.zoom+this.world.position.y};
  }
  private combatMouseMove(e:EventMouse){
    if(this.mode!=='world'||!this.shown||textOwnsInput()||!this.client.state?.location.startsWith('cave_'))return;
    const p=this.hoePoint(e);if(p){this.pointCombat(p);this.dirty=true;}
  }
  private combatMouseDown(e:EventMouse){
    if(this.mode!=='world'||!this.shown||this.busy||textOwnsInput()||!this.canPlay()||!this.client.state?.location.startsWith('cave_'))return;
    const p=this.hoePoint(e);if(!p)return;
    if(e.getButton()===EventMouse.BUTTON_RIGHT){
      const enemy=this.client.state.combat?.enemies.find(enemy=>enemy.hp>0&&Math.hypot(enemy.x-p.x,enemy.y-p.y)<(enemy.kind==='boss'?36:26));
      this.targetId=enemy?.id||null;this.pointCombat(p);this.mouseCombatUntil=this.elapsed+.2;this.dirty=true;return;
    }
    if(e.getButton()!==EventMouse.BUTTON_LEFT||this.p.x<166)return;
    // Stairways and services keep their existing walk/interact semantics.
    if(this.supportedObjects().some(o=>this.arrivalScene.hit(this.map(),o,p.x,p.y)||this.localScene.hit(o,p.x,p.y)))return;
    this.focusId='';this.route=[];this.approach=null;this.pointCombat(p);this.mouseAttack=true;this.mouseCombatUntil=this.elapsed+.2;this.queueCombat('attack');
  }
  private combatMouseUp(e:EventMouse){if(e.getButton()===EventMouse.BUTTON_LEFT){if(this.mouseAttack)this.mouseCombatUntil=this.elapsed+.2;this.mouseAttack=false;}}
  private supportedObjects() {
    if (!this.client.world || !this.client.state) return [];
    return this.map().objects.filter(o=>o.kind!=='soil'||this.farmingTool);
  }
  private nearest() { return this.supportedObjects().filter(o=>Math.hypot(o.x-this.p.x,o.y-this.p.y)<65).sort((a,b)=>Math.hypot(a.x-this.p.x,a.y-this.p.y)-Math.hypot(b.x-this.p.x,b.y-this.p.y)||Number(b.kind==='npc')-Number(a.kind==='npc'))[0]; }
  // Creator's Web keyboard source listens on the canvas only. Native semantic
  // buttons use the same handler explicitly, keeping its mode and input guards.
  private semanticKey(code:string,down:boolean,repeat:boolean){
    const name=/^Key[A-Z]$/.test(code)?'KEY_'+code.slice(3):/^Digit[1-8]$/.test(code)?'DIGIT_'+code.slice(5):({ArrowUp:'ARROW_UP',ArrowDown:'ARROW_DOWN',ArrowLeft:'ARROW_LEFT',ArrowRight:'ARROW_RIGHT',ShiftLeft:'SHIFT_LEFT',ShiftRight:'SHIFT_RIGHT'} as Record<string,string>)[code];
    const key=(KeyCode as unknown as Record<string,KeyCode>)[name||''];if(key===undefined)return false;
    if(down){if(!repeat)this.keyDown(new EventKeyboard(key,Input.EventType.KEY_DOWN));}else this.keyUp(new EventKeyboard(key,Input.EventType.KEY_UP));return true;
  }
  private keyDown(e: EventKeyboard) {
    if(textOwnsInput() || (e as any).isComposing)return;
    if(e.keyCode===KeyCode.SHIFT_LEFT||e.keyCode===KeyCode.SHIFT_RIGHT){if(!this.focusId&&!this.keys.has(e.keyCode)&&this.mode==='world'&&this.client.state?.location.startsWith('cave_')&&[KeyCode.KEY_W,KeyCode.KEY_A,KeyCode.KEY_S,KeyCode.KEY_D,KeyCode.ARROW_UP,KeyCode.ARROW_DOWN,KeyCode.ARROW_LEFT,KeyCode.ARROW_RIGHT].some(key=>this.keys.has(key)))this.queueCombat('dodge');this.keys.add(e.keyCode);return;}
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
    if(e.keyCode===KeyCode.KEY_H&&this.client.state?.location==='overworld'){if(!this.keys.has(e.keyCode))this.toggleHoe();this.keys.add(e.keyCode);return;}
    if(e.keyCode===KeyCode.KEY_G&&this.hoeActive()){if(this.keys.has(e.keyCode))return;const key=this.handTool()!;this.clearInput();this.keys.add(e.keyCode);if(['hoe','watering_can'].includes(key)){const max=toolCatalog.tiers[toolLevel(this.client.state!,key)].area;this.toolRange=this.toolRange===1?max:1;this.dirty=true;}return;}
    if(this.hoeActive()&&e.keyCode===KeyCode.KEY_E){if(!this.keys.has(e.keyCode)){if(this.handTool()==='watering_can'&&this.canRefill())void this.sendFeature('tool_refill');else{const cell=this.hoeTarget();if(cell)this.queueHoe(cell.x,cell.y);}}this.keys.add(e.keyCode);return;}
    if(this.hoeActive()&&e.keyCode===KeyCode.SPACE){this.keys.add(e.keyCode);return;}
    if(!this.keys.has(e.keyCode)&&e.keyCode===KeyCode.KEY_V)this.queueCombat('dodge');
    if(!this.keys.has(e.keyCode)){if(e.keyCode===KeyCode.SPACE)this.queueCombat('attack');if(e.keyCode===KeyCode.KEY_Q)this.queueCombat('spark');if(e.keyCode===KeyCode.KEY_R)this.queueCombat('soup');}
    if(e.keyCode>=KeyCode.DIGIT_1&&e.keyCode<=KeyCode.DIGIT_8){void this.useQuick(e.keyCode-KeyCode.DIGIT_1);return;}
    if(e.keyCode===KeyCode.KEY_T&&this.client.state?.location.startsWith('cave_')){this.targetId=nextTarget(this.client.state,this.targetId);this.dirty=true;return;}
    if(e.keyCode===KeyCode.KEY_E) { if(this.keys.has(e.keyCode))return;void this.interact();this.keys.add(e.keyCode); return; }
    if([KeyCode.KEY_W,KeyCode.KEY_A,KeyCode.KEY_S,KeyCode.KEY_D,KeyCode.ARROW_UP,KeyCode.ARROW_DOWN,KeyCode.ARROW_LEFT,KeyCode.ARROW_RIGHT].includes(e.keyCode)){this.route=[];this.approach=null;this.hoeAim=null;this.hoeQueue=[];this.hoePointer=null;this.toolDirection=null;this.toolGestureUntil=this.elapsed+.12;this.inputEpoch++;this.dirty=true;} this.keys.add(e.keyCode);
  }
  private touchRelease(event:EventTouch){this.touches.delete((event.getID()??0));this.hoeEnd(event);}
  private keyUp(e: EventKeyboard) { this.keys.delete(e.keyCode);if(e.keyCode===KeyCode.SPACE&&this.handTool()!=='hoe')this.hoeQueue=[]; }
  private clearInput() { this.toolDirection=null;this.toolGestureUntil=this.elapsed+.12;this.hoeQueue=[];this.hoePointer=null;this.hoeLastPoint=null;this.hoeAim=null;this.inventoryDrag.cancel();this.inputEpoch++;this.approach=null;this.keys.clear();this.touches.clear();this.pressedButtons.clear(); this.route=[];this.attackPulse=this.sparkPulse=this.soupPulse=this.dodgePulse=false;this.mouseAttack=false;this.combatPointer=null;this.combatPointerScreen=null;this.localAction=null;this.combatQueued.clear();this.localDodgeUntil=0;if(this.client.state)this.combatMotion.reset(this.client.state.position,this.elapsed);this.combatDock?.release(); }
  private dismissContext(){this.clearInput();this.dirty=true;if(this.mode==='welcome')return;if(this.mode==='world'){this.targetId=null;if(this.client.state?.tools?.held&&!this.client.state.location.startsWith('cave_'))void this.holdItem(null);this.continuation.dismiss();return;}if(!this.busy){if(this.inventoryView.dismiss(this.panelHost()))return;this.recovery=null;this.recoveryPreview=null;this.closePanel();}}
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
    if(mode!=='session')this.clearAccountDraft();
    this.confirmDelete=false;
    if(mode==='inventory'&&this.mode!=='item-confirm')this.inventoryView.opened();
    if(this.mode==='item-confirm'&&mode!=='item-confirm'){this.inventoryView.clearPreview();this.panelHistory=this.panelHistory.filter(p=>p.mode!=='item-confirm');}

    if(mode==='world'){this.panelHistory=[];const lease=this.client.state?.npc_encounter;if(lease&&this.canPlay())void this.client.command('npc_release',{token:lease.token}).catch(()=>{});}
    if(this.features.lifeMode(mode)||this.features.guideMode(mode)||['character','growth','armory','forge','equipment','gear-recipe','cave','shop','building','spellbook','storage','sleep','travel','map','neighbors'].includes(mode))this.notice='';
    if(mode==='world'&&this.client.state?.character&&this.client.world)this.buildWorld();
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
    if(this.hoeActive()&&(this.hoePointer!==null||this.elapsed<this.toolGestureUntil))return;
    if(this.mode!=='world'||this.busy||!this.client.world||!this.canPlay())return;
    // Creator 3.8.8 dispatches mouse-generated touches before mouse-up and
    // leaves EventTouch.simulate false; the active mouse gesture owns them.
    if(this.client.state?.location.startsWith('cave_')&&(this.mouseAttack||this.elapsed<this.mouseCombatUntil))return;
    const u=e.getUILocation(), local=this.node.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(u.x,u.y));
    const x=(local.x-this.world.position.x)/this.zoom, y=-(local.y-this.world.position.y)/this.zoom;
    const enemy=this.client.state?.combat?.enemies.find(enemy=>enemy.hp>0&&Math.hypot(enemy.x-x,enemy.y-y)<(enemy.kind==='boss'?36:26));
    if(this.client.state?.location.startsWith('cave_')&&enemy){this.targetId=enemy.id;this.combatPointer=null;this.combatPointerScreen=null;this.dirty=true;return;}
    const obj=this.supportedObjects().filter(o=>this.ranchRenderer.hit(o,x,y)||this.arrivalScene.hit(this.map(),o,x,y)||this.localScene.hit(o,x,y)||(['plot','soil'].includes(o.kind)&&Math.abs(o.x-x)<=22&&Math.abs(o.y-y)<=22)).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)||Number(b.kind==='npc')-Number(a.kind==='npc'))[0];
    if(!obj&&this.client.state?.tools?.held==='tree_seed'&&this.map().cultivation){const cell=farmCell(this.map().cultivation!,x,y);this.clearInput();if(Math.hypot(cell.x-this.p.x,cell.y-this.p.y)<=65){void this.work(async()=>{await this.syncMove();const r=await this.client.command('tree_plant',{x:cell.x,y:cell.y});this.notice=r.message||'';});}else{this.hoeQueue=[cell];this.route=approachRoute(this.map(),this.p,cell);this.approach=this.route.length?{id:cell.id,map:this.sceneId}:null;}this.dirty=true;return;}
    if(obj&&Math.hypot(obj.x-this.p.x,obj.y-this.p.y)<65) { void this.interact(obj); return; }
    this.clearInput();
    this.route=obj?approachRoute(this.map(),this.p,obj):pathfind(this.map(),this.p,{x,y});
    this.approach=obj&&this.route.length?{id:obj.id,map:this.sceneId}:null;
    if(!this.route.length)this.error='这里无法通行，试试门前或小路。';
    this.dirty=true;
  }

  private hoePoint(e:EventTouch|EventMouse){
    const u=e.getUILocation(),local=this.node.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(u.x,u.y));
    const sx=local.x+this.width/2,sy=this.height/2-local.y;
    if(this.controls.some(c=>Math.abs(c.x-sx)<=c.w/2&&Math.abs(c.y-sy)<=c.h/2))return null;
    return {x:(local.x-this.world.position.x)/this.zoom,y:-(local.y-this.world.position.y)/this.zoom};
  }
  private hoeActive(){return !!this.handTool()&&this.mode==='world'&&this.shown&&this.client.state?.location==='overworld'&&!textOwnsInput();}
  private canRefill(){return (this.map().water_sources||[]).some(([x,y,w,h])=>Math.hypot(Math.max(x-this.p.x,0,this.p.x-x-w),Math.max(y-this.p.y,0,this.p.y-y-h))<=64);}
  private hoeStart(e:EventTouch){
    if(!this.hoeActive()||!this.canPlay()||this.busy)return;
    const p=this.hoePoint(e);if(!p)return;
    if(this.supportedObjects().some(o=>!['resource','plot','soil'].includes(o.kind)&&this.localScene.hit(o,p.x,p.y)))return;
    const key=this.handTool()!,target=toolTarget(this.map(),this.client.state!,serverNow(),key,p.x,p.y);
    if(!target||key!=='hoe'&&!['resource','plot'].includes(target.kind))return;
    this.clearInput();this.focusId='';this.hoePointer=e.getID()??0;this.toolDirection=this.actorDirection;this.toolGestureHits=0;this.toolGestureUntil=Infinity;this.hoeLastPoint=p;this.queueHoe(p.x,p.y);
  }
  private hoeDrag(e:EventTouch){
    if(!this.hoeActive()||this.hoePointer!==(e.getID()??0))return;
    const p=this.hoePoint(e);if(!p){this.hoeLastPoint=null;return;}
    const a=this.hoeLastPoint||p,n=Math.max(1,Math.ceil(Math.hypot(p.x-a.x,p.y-a.y)/20));
    for(let i=1;i<=n;i++)this.queueHoe(a.x+(p.x-a.x)*i/n,a.y+(p.y-a.y)*i/n);
    this.hoeLastPoint=p;
  }
  private hoeEnd(e:EventTouch){
    if(this.hoePointer!==(e.getID()??0))return;
    if(e.getEventCode()===Input.EventType.TOUCH_CANCEL)this.clearInput();
    if(this.toolGestureHits>0&&this.handTool()!=='hoe'){this.hoeQueue=[];this.route=[];this.approach=null;this.inputEpoch++;}
    this.toolGestureUntil=this.elapsed+.25;
    this.hoePointer=null;this.hoeLastPoint=null;
  }
  private hoeHover(e:EventMouse){
    if(!this.hoeActive())return;const p=this.hoePoint(e);
    if(p){this.hoeAim=toolTarget(this.map(),this.client.state!,serverNow(),this.handTool()!,p.x,p.y);this.dirty=true;}
  }
  private hoeTarget(){
    const key=this.handTool();if(!key)return null;
    const moving=this.touches.size>0||[KeyCode.KEY_W,KeyCode.KEY_A,KeyCode.KEY_S,KeyCode.KEY_D,KeyCode.ARROW_UP,KeyCode.ARROW_DOWN,KeyCode.ARROW_LEFT,KeyCode.ARROW_RIGHT].some(k=>this.keys.has(k));
    if(this.hoeAim&&!moving)return this.map().objects.find(o=>o.id===this.hoeAim!.id)||this.hoeAim;
    const [dx,dy]=[[0,1],[0,-1],[-1,0],[1,0]][this.actorDirection];
    return toolTarget(this.map(),this.client.state!,serverNow(),key,this.p.x+dx*40,this.p.y+dy*40);
  }
  private hoeTargetSafe(){return this.client.state&&this.client.world&&this.hoeActive()?this.hoeTarget():null;}
  private queueHoe(x:number,y:number){
    if(!this.hoeActive()||!this.canPlay())return;const map=this.map(),s=this.client.state!,key=this.handTool()!,target=toolTarget(map,s,serverNow(),key,x,y);
    this.hoeAim=target;this.dirty=true;if(!target)return;
    const cells=['hoe','watering_can'].includes(key)?toolCells(map,target.x,target.y,this.toolDirection??this.actorDirection,this.toolRange):[target];
    let added=false;
    for(const raw of cells){const cell=map.objects.find(o=>o.id===raw.id)||raw,reason=toolReason(map,s,key,cell);
      if(reason){if(cells.length===1)this.error=reason;continue;}
      if(this.hoeQueue.some(o=>o.id===cell.id)||this.hoeQueue.length>=16)continue;
      this.hoeQueue.push(cell);added=true;
    }
    if(added)this.error='';
  }
  private updateHoe(){
    if(!this.hoeActive()){if(this.hoeOverlay)this.hoeOverlay.active=false;return;}
    if(!this.focusId&&this.elapsed>=this.hoeHoldNext){
      if(this.keys.has(KeyCode.SPACE)){const cell=this.hoeTarget();if(cell)this.queueHoe(cell.x,cell.y);}
      else if(this.hoePointer!==null&&this.hoeLastPoint)this.queueHoe(this.hoeLastPoint.x,this.hoeLastPoint.y);
      this.hoeHoldNext=this.elapsed+.18;
    }
    if(!this.busy&&this.canPlay()&&this.hoeQueue.length&&!this.route.length&&!this.approach&&this.elapsed>=this.hoeNext){
      const raw=this.hoeQueue[0],cell=this.map().objects.find(o=>o.id===raw.id)||raw;
      if(toolReason(this.map(),this.client.state!,this.handTool()!,cell))this.hoeQueue.shift();
      else if(Math.hypot(cell.x-this.p.x,cell.y-this.p.y)<=65)void this.swingHoe(cell);
      else{this.route=approachRoute(this.map(),this.p,cell);this.approach=this.route.length?{id:cell.id,map:this.sceneId}:null;if(!this.route.length){this.error='暂时无法靠近目标，请从小路绕行。';this.hoeQueue=[];}this.dirty=true;}
    }
    if(!this.hoeOverlay){this.hoeOverlay=this.make(this.world,'HoeOverlay',0,0,0,0);this.hoeOverlay.addComponent(Graphics);this.depths.set(this.hoeOverlay,10000);}
    this.hoeOverlay.active=true;const g=this.hoeOverlay.getComponent(Graphics)!;g.clear();const cell=this.hoeQueue[0]||this.hoeTarget(),key=this.handTool()!;
    if(cell){const reason=toolReason(this.map(),this.client.state!,key,cell);g.strokeColor=new Color(reason?C.danger:C.paper);g.lineWidth=1.5;
      const cells=this.hoeQueue.length?this.hoeQueue:['hoe','watering_can'].includes(key)?toolCells(this.map(),cell.x,cell.y,this.toolDirection??this.actorDirection,this.toolRange):[cell];
      for(const c of cells){g.rect(c.x-21,-c.y-18,42,36);g.stroke();}
    }
  }
  private async swingHoe(cell:WorldObject){
    if(this.busy||!this.hoeActive()||!this.canPlay())return;
    const epoch=this.inputEpoch,key=this.handTool()!;this.busy=true;this.error='';this.dirty=true;
    try{
      await this.syncMove();
      if(epoch!==this.inputEpoch||!this.hoeActive()||this.handTool()!==key||!this.canPlay())return;
      const reason=toolReason(this.map(),this.client.state!,key,cell);if(reason)throw Error(reason);
      if(staminaNow(this.client.state!,serverNow())<toolCost(this.client.state!,key))throw Error('体力不足，回家睡觉可以补满。');
      this.actorDirection=facingDirection(Math.atan2(cell.y-this.p.y,cell.x-this.p.x));
      this.workMotion={kind:key,target:cell,started:this.elapsed,direction:this.actorDirection};this.hoeSwing={x:cell.x,y:cell.y,until:this.elapsed+.48};
      await new Promise(resolve=>setTimeout(resolve,170));
      if(epoch!==this.inputEpoch||!this.hoeActive()||this.handTool()!==key)return;
      const live=this.map().objects.find(o=>o.id===cell.id)||cell;
      const action=live.kind==='resource'?'tool_strike':key==='hoe'?'till':key==='watering_can'?'water':'reclaim';
      const data=action==='tool_strike'?{target:cell.id,expected_version:live.resource_state!.version}:{target:cell.id,x:cell.x,y:cell.y};
      const r=await this.client.command(action,data);if(this.hoePointer!==null)this.toolGestureHits++;this.notice=r.message||'';soundEffects.play(key==='watering_can'?'swing':'hit');
    }catch(e){this.error=(e as Error).message;this.hoeQueue=[];this.hoePointer=null;this.keys.delete(KeyCode.SPACE);}
    finally{this.hoeQueue=this.hoeQueue.filter(o=>o.id!==cell.id);this.busy=false;this.hoeNext=this.elapsed+.36;this.dirty=true;}
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
    if(this.hoeActive()&&obj&&['resource','plot','soil'].includes(obj.kind)){void this.swingHoe(obj);return;}
    const seed=this.client.state?.tools?.held;
    if(seed&&seedCrop(seed)&&obj?.kind==='plot'&&!this.client.state!.plots[obj.id]){void this.work(async()=>{await this.syncMove();const r=await this.client.command('plant',{target:obj.id,seed});this.notice=r.message||'';});return;}
    if(seed==='tree_seed'&&obj?.kind==='soil'){this.hoeQueue=[];void this.work(async()=>{await this.syncMove();const r=await this.client.command('tree_plant',{x:obj.x,y:obj.y});this.notice=r.message||'';});return;}
    if(!obj||this.busy||this.mode!=='world'||!this.canPlay())return;
    this.clearInput(); const epoch=this.inputEpoch;this.busy=true; this.error='';this.responseObject=obj.id;this.responseUntil=Infinity; this.dirty=true;
    try {
      await this.syncMove();
      if(epoch!==this.inputEpoch||!this.shown||this.mode!=='world'||textOwnsInput())return;
      if(Math.hypot(obj.x-this.client.state!.position.x,obj.y-this.client.state!.position.y)>65)throw new Error('尚未走到目标附近，请再靠近一些。');
      this.context=obj;
      if(obj.kind==='blacksmith'){this.open('armory');
      } else if(obj.id==='armory_counter'){this.open('forge');
      } else if(obj.kind==='production'){this.open('production-machine');
      } else if(obj.kind==='carpenter'||['home_desk','workshop_counter'].includes(obj.id)){this.open('construction');
      } else if(['animal','shelter','ranch_ledger'].includes(obj.kind)){this.open('ranch');
      } else if(['plot','soil'].includes(obj.kind)&&!(obj.kind==='plot'&&this.client.state!.plots[obj.id]&&plotStage(this.client.state!,this.client.state!.plots[obj.id],serverNow())===4)){this.open('farm');
      } else if(obj.kind==='npc') {
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
    if(this.client.state&&this.client.world)this.updateHoe();
    if(this.notice!==this.lastWorldNotice){this.lastWorldNotice=this.notice;this.worldNoticeUntil=this.elapsed+3.2;this.dirty=true;}
    if(this.worldNoticeUntil&&this.elapsed>=this.worldNoticeUntil){this.worldNoticeUntil=0;this.dirty=true;}
    if(this.client.state?.character&&this.client.world&&this.sceneId!==this.client.state.location){this.p={...this.client.state.position};this.buildWorld();this.dirty=true;}
    if(this.client.state&&this.mode==='world'&&this.shown&&this.canPlay()) {
      // Creator's array-spread transform assumes arrays, not Map iterators.
      const touchKeys=Array.from(this.touches.values());
      let dx=Number(this.keys.has(KeyCode.KEY_D)||this.keys.has(KeyCode.ARROW_RIGHT)||touchKeys.includes(KeyCode.ARROW_RIGHT))-Number(this.keys.has(KeyCode.KEY_A)||this.keys.has(KeyCode.ARROW_LEFT)||touchKeys.includes(KeyCode.ARROW_LEFT));
      let dy=Number(this.keys.has(KeyCode.KEY_S)||this.keys.has(KeyCode.ARROW_DOWN)||touchKeys.includes(KeyCode.ARROW_DOWN))-Number(this.keys.has(KeyCode.KEY_W)||this.keys.has(KeyCode.ARROW_UP)||touchKeys.includes(KeyCode.ARROW_UP));
      if(this.route.length){const to=this.route[0],from=this.client.state.location.startsWith('cave_')?this.client.state.position:this.p,d=Math.hypot(to.x-from.x,to.y-from.y);if(d<(this.route.length===1&&this.approach?3:8))this.route.shift();else{const scale=this.client.state.location.startsWith('cave_')?Math.min(1,d/40):1;dx=(to.x-from.x)/d*scale;dy=(to.y-from.y)/d*scale;}}
      if(!this.route.length&&this.approach){const intent=this.approach;this.approach=null;this.dirty=true;const obj=this.supportedObjects().find(o=>o.id===intent.id)||this.hoeQueue.find(o=>o.id===intent.id);if(obj&&intent.map===this.sceneId&&Math.hypot(obj.x-(this.sceneId.startsWith('cave_')?this.client.state.position:this.p).x,obj.y-(this.sceneId.startsWith('cave_')?this.client.state.position:this.p).y)<=65)void this.interact(obj);else this.error='目标已离开这里，请重新选择。';}
      const length=Math.max(1,Math.hypot(dx,dy)), step=Math.min(dt,0.05)*120*(this.client.state.ranching?.speed_multiplier||1);
      const cave=this.client.state.location.startsWith('cave_');
      // Resolve a newly pressed movement direction before accepting an attack.
      if(dx||dy)this.actorDirection=facingDirection(Math.atan2(dy,dx));
      const previous={...this.p},next={x:this.p.x+dx/length*step,y:this.p.y+dy/length*step};
      if(cave){
        this.previewCombat(dx,dy);
        const dash=this.authoritativeDodge()||(this.elapsed<this.localDodgeUntil?this.localDodge:null);
        this.p=this.combatMotion.step(this.map(),this.client.state.position,dash?dash.dx:dx,dash?dash.dy:dy,dt,this.elapsed,dash?360:160);
        this.updateCombat(dx,dy);
      }
      if(!cave&&!this.busy){
        const map=this.map(),x=walkable(map,next.x,this.p.y)?next.x:this.p.x,proposed={x,y:walkable(map,x,next.y)?next.y:this.p.y};
        const accepted=pendingSafeMove(map,this.p,proposed,this.client.state.position,this.moveTarget);
        const blocked=Math.hypot(accepted.x-this.p.x,accepted.y-this.p.y)<.000001&&Math.hypot(proposed.x-this.p.x,proposed.y-this.p.y)>.000001;
        this.p.x=accepted.x;this.p.y=accepted.y;
        if(blocked&&!this.movePromise&&Math.hypot(this.p.x-this.client.state.position.x,this.p.y-this.client.state.position.y)>.5)void this.syncMove();
      }
      const travelled=Math.hypot(this.p.x-previous.x,this.p.y-previous.y);
      if(!this.movementLearned&&travelled>0){this.movementDistance+=travelled;if(this.movementDistance>=48){this.movementLearned=true;this.dirty=true;try{sys.localStorage.setItem('realquest-movement-learned:'+this.client.saveId,'1');}catch{/* Optional teaching preference. */}}}
      if(travelled>.05&&this.elapsed-this.lastFootstep>.29){soundEffects.play('step');this.lastFootstep=this.elapsed;}
      this.actor.setPosition(this.p.x,-this.p.y+(this.client.state.ranch?.mounted?24:0));
      this.setActor(this.actor,this.actorArt(),sourceActorFrame(this.actorDirection,!!(dx||dy),this.elapsed,reducedMotion()));
      if(!this.busy&&!cave&&!this.movePromise&&this.elapsed-this.lastMove>0.18){this.lastMove=this.elapsed;void this.syncMove();}
      if(!this.busy&&this.elapsed-this.lastHeartbeat>3){this.lastHeartbeat=this.elapsed;void this.client.command('world_resume',{owner:this.owner}).catch(()=>{});}
      // A reconnect owns its replay + authoritative refresh. Background polling
      // must not race that refresh when the replay temporarily reports ready.
      if(!this.busy&&this.elapsed-this.lastRefresh>5){this.lastRefresh=this.elapsed;void this.refreshJourney();}
      this.restoreLocalCamera();
      const combat=this.client.state.combat,visualTime=(combat?.time||0)+Math.min(.12,Math.max(0,this.elapsed-this.combatReceiptAt));
      const local=this.localAction&&this.elapsed-this.localActionStart<this.localAction.until-this.localAction.started?{...this.localAction,started:visualTime-(this.elapsed-this.localActionStart),hit_at:visualTime-(this.elapsed-this.localActionStart)+(this.localAction.hit_at!-this.localAction.started),until:visualTime-(this.elapsed-this.localActionStart)+this.localAction.until-this.localAction.started}:null;
      const dodging=this.elapsed<this.localDodgeUntil||!!combat?.dash&&visualTime<combat.dash.until;
      const action=dodging?null:local||(combat?.action&&combat.action.until>visualTime?combat.action:null);
      const aim=this.aim();
      if(cave&&(aim.source!=='facing'||!dx&&!dy))this.actorDirection=facingDirection(Math.atan2(aim.y-this.p.y,aim.x-this.p.x));
      if(cave&&action?.angle!==undefined)this.actorDirection=Math.abs(Math.cos(action.angle))>Math.abs(Math.sin(action.angle))?(Math.cos(action.angle)>0?3:2):(Math.sin(action.angle)<0?1:0);
      const hurt=!!combat?.effects.some(e=>e.kind==='hurt'&&e.until>visualTime+.38);
      this.actor.setScale(1,1);this.actor.angle=0;
      const dodge=combat?.dash&&visualTime<combat.dash.until?combat.dash:this.elapsed<this.localDodgeUntil?{dx:this.localDodge.dx,dy:this.localDodge.dy,started:visualTime-(.18-(this.localDodgeUntil-this.elapsed)),until:visualTime+this.localDodgeUntil-this.elapsed}:null;
      this.swordPose=swordPresentation({appearance:this.client.state.character?.appearance||0,weapon:(!this.client.state.tools||this.client.state.tools.held===combat?.equipped)?combat?.equipped||null:null,owned:!!combat?.equipped&&!!this.client.state.inventory[combat.equipped],direction:this.actorDirection,action:cave?action:null,time:visualTime,elapsed:this.elapsed,moving:travelled>.05,dodge:cave?dodge:null,reduced:reducedMotion()});
      if(!cave){this.swordPose.phase=this.swordPose.moving?'walk':'ready';}
      const integratedSword=this.setSwordActor(this.swordPose);this.swordPose.active=integratedSword;
      if(cave&&!reducedMotion()&&!integratedSword){
        if(action){const phase=Math.min(1,Math.max(0,(visualTime-action.started)/.38)),lean=Math.sin(phase*Math.PI);this.actor.angle=-Math.cos(action.angle||0)*lean*8;}
        if(this.elapsed<this.localDodgeUntil)this.actor.angle=this.localDodge.dx*12;
      }
      const opacity=this.actor.getComponent(UIOpacity)||this.actor.addComponent(UIOpacity);opacity.opacity=cave&&hurt?175:255;
      if(cave&&action&&!integratedSword)this.setActor(this.actor,this.actorArt(),sourceActorFrame(this.actorDirection,false,this.elapsed,reducedMotion()));
      this.toolRenderer.updateResources(this.map(),this.p,this.elapsed,reducedMotion());
      this.toolPose=toolActorPresentation(this.client.state,this.actorDirection,this.elapsed,travelled>.05,reducedMotion(),this.workMotion);
      this.toolPose.active=this.setToolActor(this.toolPose);
      this.toolRenderer.updateHeld(this.client.state,this.p,this.elapsed,reducedMotion(),this.workMotion,this.toolPose);
      this.combatRenderer.draw(this.client.state,this.targetId,reducedMotion(),{x:this.world.position.x,y:this.world.position.y,zoom:this.zoom,width:this.width,height:this.height},{position:this.p,action,time:visualTime,facing:facingAngles[this.actorDirection],integratedSword,aim});
      for(const [id,node] of this.objects)if(['lia','noah','mira'].includes(id))node.active=false;
      for(const o of this.map().objects.filter(o=>o.kind==='soil')){const n=this.objects.get(o.id);if(n)n.active=this.farmingTool;}
      const fieldIds=new Set(this.map().objects.filter(o=>o.kind==='plot').map(o=>o.id));
      for(const id of Array.from(this.plotVisuals.keys()))if(!fieldIds.has(id)){const n=this.objects.get(id);if(n)n.active=false;this.plotVisuals.delete(id);}
      for(const obj of this.supportedObjects()){
        let n=this.objects.get(obj.id);
        if(obj.kind==='npc'&&!n){n=this.make(this.world,obj.id,obj.x,-obj.y,32,128/3);n.getComponent(UITransform)!.setAnchorPoint(.5,0);n.addComponent(Sprite).sizeMode=Sprite.SizeMode.CUSTOM;this.setActor(n,obj.id+'-actor',0);this.objects.set(obj.id,n);const tag=this.make(n,'NeighborName',0,44,76,26);this.box(tag,'NameGround',-38,-13,76,26,'#233d31eb',5);this.text(tag,'Name',obj.name,-36,-13,72,26,14,C.paper,true);}
        if(obj.kind==='npc'&&n){n.active=true;const tag=n.getChildByName('NeighborName');if(tag)tag.active=true;tag?.setScale(1/this.zoom,1/this.zoom);tag?.setPosition(0,44+14/this.zoom);const before=this.npcMotion.get(obj.id),dx=before?obj.x-before.x:0,dy=before?obj.y-before.y:0,moving=!!obj.walking&&Math.hypot(dx,dy)>.005,direction=moving?(Math.abs(dx)>Math.abs(dy)?(dx>0?3:2):(dy<0?1:0)):(before?.direction||0),frame=sourceActorFrame(direction,moving,this.elapsed,reducedMotion());this.setActor(n,obj.id+'-actor',frame);this.npcMotion.set(obj.id,{x:obj.x,y:obj.y,direction,frame});n.setPosition(obj.x,-obj.y);this.depths.set(n,obj.y);}
        if(n&&['wood','stone'].includes(obj.kind))n.active=(this.client.state.gathered[obj.id]||0)<=serverNow();
        if(!n&&obj.kind==='plot'){n=this.make(this.world,obj.id,obj.x,-obj.y+1,42,36);n.addComponent(Graphics);this.objects.set(obj.id,n);this.depths.set(n,obj.y-20);}
        if(n&&['plot','soil'].includes(obj.kind)){
          const crop=this.client.state.plots[obj.id],stage=crop?plotStage(this.client.state,crop,serverNow()):0;
          const visual=obj.kind==='soil'?'soil:'+this.farmingTool:crop?plotCrop(crop).id+':'+stage+':'+!!crop.watered:'empty';
          if(this.plotVisuals.get(obj.id)!==visual){
            this.plotVisuals.set(obj.id,visual);this.clear(n);n.active=obj.kind==='plot'||this.farmingTool;
            const g=n.getComponent(Graphics)!;g.clear();
            if(obj.kind==='soil'){g.strokeColor=new Color('#d6d8ac');g.lineWidth=1;g.roundRect(-20,-18,40,36,3);g.stroke();}
            else{paintFarmPlot(g,obj.id,!!crop?.watered);if(crop)this.image(n,'farming/'+plotCrop(crop).id+'-'+stage,0,-12,48,48);}
          }
        }
      }
    }
    if(this.client.state?.character&&this.client.world&&this.sceneId!==this.client.state.location){this.p={...this.client.state.position};this.buildWorld();this.dirty=true;}
    if(this.client.state&&this.features.lifeMode(this.mode)&&this.shown&&this.canPlay()&&!this.busy&&!textOwnsInput()&&this.elapsed-this.lastRefresh>15){
      this.lastRefresh=this.elapsed;void this.refreshJourney();
    }
    if(this.client.state&&this.client.world)this.localScene.update(this.client.state,this.p,this.mode==='world'&&!this.hoeActive()?this.nearest():undefined,this.route,this.mode!=='world'?this.context?.id:this.elapsed<this.responseUntil?this.responseObject:undefined,this.busy,reducedMotion(),this.elapsed);
    if(this.client.state)this.ranchRenderer.update(this.client.state,this.p,this.elapsed,reducedMotion());
    this.updateConversationCamera(dt);
    this.updateItemPreviewCamera();
    this.depths.set(this.actor,this.client.state?.location.startsWith('cave_')?Math.max(this.p.y,this.combatRenderer.playerDepth):this.p.y);
    [...this.world.children].sort((a,b)=>(this.depths.get(a)||-1000)-(this.depths.get(b)||-1000)).forEach((n,i)=>n.setSiblingIndex(i));
    const nearby=this.nearest(), signature=(nearby?.id||'')+JSON.stringify(nearby&&this.client.state?interactionFor(nearby,this.client.state,serverNow()):null);
    if(signature!==this.lastNearby){this.lastNearby=signature;this.dirty=true;}
    if(this.client.state&&this.mode!=='welcome'&&Math.floor(this.elapsed)!==this.lastSecond){this.lastSecond=Math.floor(this.elapsed);this.dirty=true;}
    if(this.shown&&this.mode!=='world'&&this.context?.kind==='npc'&&this.client.state?.npc_encounter&&this.elapsed-this.lastNpcKeep>10&&this.canPlay()){
      this.lastNpcKeep=this.elapsed;void this.client.command('npc_keep',{token:this.client.state.npc_encounter.token}).catch(()=>{});
    }
    // Keep the pressed target alive until pointer release. A clock tick must not
    // destroy the control that owns the current gesture.
    if(this.dirty&&!this.inventoryDrag.holding&&!this.pressedButtons.size&&(!textOwnsInput()||this.busy)){this.dirty=false;this.drawUI();this.syncSemantics();}
    this.features.tick(dt);
  }
  private async useQuick(slot:number){
    if(this.mode!=='world'||this.busy||!this.canPlay())return;this.inventoryView.init(this.panelHost());
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
    // Short landscape reserves a real play area above the pockets and actions.
    if(this.width<1000&&this.height<560&&!map.id.startsWith('cave_'))frame={zoom,x:-this.p.x*zoom,y:this.p.y*zoom+160-this.height/2};
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
    this.inventoryView.init(this.panelHost());const short=this.width<1000,cell=short?44:this.width<1200?48:56,gap=short?6:8,cols=short?4:8,rows=short?2:1,hand=short?48:64,w=hand+12+cell*cols+gap*(cols-1),x=short?184:(this.width-w)/2,y=this.height-(short?124:this.width<1200?150:82),s=this.client.state!,held=s.tools?.held;
    this.box(this.hud,'QuickCloth',x-8,y-8,w+16,rows*cell+(rows-1)*gap+16,C.moss,7);
    this.button(this.hud,'current-hand','当前手持：'+(held?(isTool(held)?toolName(s,held):itemNames[held]||held):'空手')+'，点击收起',x,y,hand,rows*cell+(rows-1)*gap,()=>held?this.holdItem(null):this.openInventory(),this.busy||!this.canPlay(),!!held,'pocket');
    const button=this.hud.getChildByName('current-hand')!;const original=button.getChildByName('Label')?.getComponent(Label);if(original)original.string='';
    if(held)this.image(button,'items/'+held,0,short?7:-3,short?30:38,short?30:38);
    this.text(button,'HandLabel','手持',-hand/2+2,short?22:14,hand-4,20,12,held?C.paper:C.ink,true);
    if(held)this.text(button,'HandName',isTool(held)?toolSpec(held).name:seedCrop(held)?'种子':held==='tree_seed'?'树种':'武器',-hand/2+2,short?-42:-27,hand-4,20,12,held?C.paper:C.ink,true);
    this.inventoryView.quick.forEach((id,i)=>this.itemSlot(this.hud,'world-quick-'+i,id,x+hand+12+(i%cols)*(cell+gap),y+Math.floor(i/cols)*(cell+gap),cell,cell,id?s.inventory[id]||0:0,!!id&&held===id,()=>void this.useQuick(i),true,i+1));
  }
  private conversationScene(){return this.context?.kind==='npc'&&((this.mode==='dialogue'&&this.features.npcTab==='talk')||['neighbor-topics','neighbor-gift'].includes(this.mode));}
  private updateConversationCamera(dt:number){
    if(!this.client.state||!this.client.world)return;
    const active=this.conversationScene(),npc=active?this.supportedObjects().find(o=>o.id===this.context!.id):null;
    if(!npc){
      if(this.conversationZoom){this.conversationZoom=0;this.restoreLocalCamera();this.actor.setPosition(this.p.x,-this.p.y+(this.client.state.ranch?.mounted?24:0));}
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
    this.clear(this.hud); this.clear(this.panel); this.controls=[];this.actions.clear();this.semanticTexts=[];this.semanticFields.clear();this.uiRegions=[];
    this.hud.setPosition(-this.width/2,this.height/2); this.panel.setPosition(-this.width/2,this.height/2);
    this.touchPad.active=this.mode==='world'&&this.width<1000;
    if(this.mode!=='world')this.combatRenderer.hide();
    if(this.mode!=='world'||!this.client.state?.location.startsWith('cave_'))this.combatDock?.hide();
    if(this.mode==='welcome'){this.welcome();return;}
    if(this.mode==='session'){this.drawSession();return;}
    const s=this.client.state!;
    if(this.mode==='world'){
      // Place names remain screen-sized native text, independent of camera zoom.
      const project=(x:number,y:number)=>({x:this.width/2+this.world.position.x+x*this.zoom,y:this.height/2-this.world.position.y+y*this.zoom});
      for(const sign of this.arrivalScene.signs){
        const p=project(sign.x,sign.y),w=sign.width*this.zoom-8,h=20*this.zoom;
        if(p.x+w/2<0||p.x-w/2>this.width||p.y+h/2<0||p.y-h/2>this.height)continue;
        this.text(this.hud,sign.id+'Text',sign.text,p.x-w/2,p.y-h/2,w,h,this.height<500?14:18,C.ink,true);
      }
      for(const npc of this.supportedObjects().filter(o=>o.kind==='travel_npc')){
        const p=project(npc.x,npc.y-53);
        this.box(this.hud,'TravelResidentName',p.x-28,p.y-12,56,24,C.moss,3);
        this.text(this.hud,'TravelResidentNameText',npc.name,p.x-26,p.y-11,52,22,14,C.paper,true);
      }
    }
    if(this.mode==='item-confirm'){this.drawItemPreviewMarker();this.drawPanel();return;}
    if(this.conversationScene()){
      const short=this.height<500;if(!short){this.box(this.hud,'ConversationPlace',20,short?8:20,short?190:260,short?32:40,C.moss,5);this.text(this.hud,'ConversationPlaceName',this.map().name+(short?'':' · Esc 离开'),32,short?9:24,short?166:236,30,16,C.paper);}
      this.drawPanel();return;
    }
    // Menus own input and presentation; world-only instructions/navigation rest.
    if(this.mode!=='world'){this.drawPanel();return;}
    if(!s.location.startsWith('cave_')){
      const clock=villageClock(s,serverNow());
      const x=20,y=20,w=284;
      this.hudCloth('LocalStatus',x,y,w,88);
      this.text(this.hud,'LocalTitle',this.map().name,x+14,y+7,150,26,18,C.raised);
      this.text(this.hud,'LocalGold',formatMoney(s.inventory.gold||0),x+166,y+7,106,26,14,C.paper);
      const vital=(id:string,label:string,value:number,max:number,xx:number)=>{
        this.text(this.hud,id+'Label',label,xx,y+36,28,20,12,C.paper);
        this.box(this.hud,id+'Track',xx+32,y+43,54,5,'#182d24',1);
        this.box(this.hud,id+'Fill',xx+32,y+43,54*Math.max(0,Math.min(1,value/Math.max(1,max))),5,id==='Health'?'#c9aa74':'#98b17d',1);
        this.text(this.hud,id+'Value',String(Math.floor(value)),xx+92,y+36,34,20,13,C.paper);
      };
      vital('Health','生命',s.vitality?.current??100,s.vitality?.max??100,x+14);
      vital('Stamina','体力',s.stamina?.current??100,s.stamina?.max??100,x+146);
      this.text(this.hud,'LocalClock',`第 ${clock.day} 天  ·  ${clockLabel(clock.minute)}`,x+14,y+61,144,20,12,'#d7ddc7');
      this.box(this.hud,'ConnectionDot',x+192,y+69,4,4,this.canPlay()?'#b3c889':C.amber,1);
      this.text(this.hud,'LocalConnection',this.busy?'正在回应':this.connectionLabel(),x+204,y+61,66,20,12,'#d7ddc7');
    }
    if(s.ranch?.mounted)this.button(this.hud,'ranch-dismount','下马',this.width-180,142,160,44,()=>this.sendFeature('ranch_dismount'),this.busy,false,'game');
    if(s.location==='overworld')this.button(this.hud,'world-farm',this.farmingTool?'收起锄头 · H':'拿起锄头 · H',this.width-180,88,160,44,()=>this.toggleHoe(),this.busy||!this.canPlay(),this.farmingTool,'hud',{label:'拿起或收起背包中的锄头，H',pressed:this.farmingTool});
    if(this.hoeActive()){const key=this.handTool()!,water=key==='watering_can'?' · 水'+s.tools!.water+'/'+s.tool_rules!.water_max:'';this.hudCloth('HoeHintGround',this.width-300,140,280,52);this.text(this.hud,'HoeHint',toolName(s,key)+' · '+toolCost(s,key)+'体力/次'+water+'\n按住连续操作 · Esc收起',this.width-292,144,264,44,13,C.paper,true);
      if(['hoe','watering_can'].includes(key)&&toolLevel(s,key)>0)this.button(this.hud,'tool-range','范围 '+this.toolRange+(key==='hoe'?' 格 · G':''),this.width-180,200,key==='hoe'?160:78,44,()=>{this.clearInput();this.toolRange=this.toolRange===1?toolCatalog.tiers[toolLevel(s,key)].area:1;this.dirty=true;},this.busy);
      if(key==='watering_can')this.button(this.hud,'tool-refill','补水 · E',this.width-(toolLevel(s,key)>0?94:180),200,toolLevel(s,key)>0?74:160,44,()=>this.sendFeature('tool_refill'),this.busy||!this.canRefill());
    }
    const caveNav=s.location.startsWith('cave_'),navW=caveNav?272:364,navX=this.width-navW-20;
    this.hudCloth('WorldNavigation',navX,20,navW,60);
    const entries=[['menu','旅程','随身页',()=>this.navigate('menu')],['inventory','行囊','I',()=>void this.openInventory()],['life','成长','L',()=>this.navigate('life')],...(!caveNav?[['find-neighbor','找村民','N',()=>this.features.findNeighbor(this.panelHost(),'lia')]]:[])] as [string,string,string,()=>unknown][];
    entries.forEach(([id,label,key,action],i)=>{
      const xx=navX+8+i*90,l=this.button(this.hud,id,label,xx,26,80,48,action,this.busy||!this.canPlay(),false,'hud',{label:label+(key.length===1?'，快捷键 '+key:'')});
      l.node.setPosition(0,7);l.node.getComponent(UITransform)!.setContentSize(76,26);
      this.text(l.node.parent!,'NavigationKey',key,-38,7,76,16,12,'#d2c5a4',true);
      if(i<entries.length-1)this.box(this.hud,'NavigationDivider',xx+85,35,1,30,'#71806480',0);
    });
    const key=this.hoeActive()?this.handTool():null,n=key?this.hoeTarget()||this.nearest():this.nearest(),action=n?key&&['resource','plot','soil'].includes(n.kind)?{label:toolSpec(key).verb+' · '+toolCost(s,key)+'体力',reason:toolReason(this.map(),s,key,n)||(staminaNow(s,serverNow())<toolCost(s,key)?'体力不足':undefined)}:interactionFor(n,s,serverNow()):null;
    const local=!!sceneLayouts[s.location],walking=!!this.route.length&&local;
    const caption=this.busy?'正在回应…':walking?`${this.approach?this.supportedObjects().find(o=>o.id===this.approach!.id)?.name||'目的地':'选定位置'}
停止行走 · Esc`:n?local?`${n.name===action!.label?'':n.name+'\n'}${action!.reason||action!.label}  E`:action!.reason||`${action!.label}  E`:s.location.startsWith('cave_')?'走近阶梯或休息平台':'点击门口或家具 · 可自动走近';
    if(n||walking||this.busy)this.button(this.hud,walking?'stop-walk':'interact',caption,this.width-(local?288:272),this.height-(local?80:76),local?268:252,local?60:56,()=>{if(walking){this.clearInput();this.dirty=true;}else if(this.hoeActive()&&n&&['resource','plot','soil'].includes(n.kind))this.queueHoe(n.x,n.y);else void this.interact();},!walking&&(!n||this.busy||!this.canPlay()||!!action?.reason),true);
    if(!this.movementLearned&&!s.location.startsWith('cave_')&&this.width>=1000){this.box(this.hud,'MovementHintGround',20,this.height-42,378,30,'#233d31',4);this.text(this.hud,'MovementHint','WASD 移动 · 点击走近交互 · Esc 停步',28,this.height-40,362,26,14,C.paper);}
    this.drawTouchPad();
    if(!this.canPlay()&&!this.busy){
      const compact=this.width<1000&&!s.location.startsWith('cave_');
      this.button(this.hud,'reconnect','重连并确认待保存操作',compact?316:20,compact?88:s.location.startsWith('cave_')?140:120,compact?Math.min(232,this.width-508):270,44,()=>this.reconnect(),false,true);
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
      b.on(Node.EventType.TOUCH_START,(event:EventTouch)=>{this.route=[];this.approach=null;this.hoeQueue=[];this.hoeAim=null;this.hoePointer=null;this.hoeLastPoint=null;this.toolDirection=null;this.toolGestureUntil=this.elapsed+.12;this.inputEpoch++;this.dirty=true;this.combatPointer=null;this.combatPointerScreen=null;this.touches.set(event.getID()??0,key);});
      b.on(Node.EventType.TOUCH_END,this.touchRelease,this);b.on(Node.EventType.TOUCH_CANCEL,this.touchRelease,this);
    }
    this.padControls=this.controls.slice(start);
  }
  private welcome() {
    let pendingDeletion=false,hasSession=false;
    try{const session=transport.getSession();pendingDeletion=!!session?.deletion;hasSession=!!session||!!sys.localStorage.getItem('realquest-cocos-guest-v1');}catch{/* Preserve malformed records for recovery. */}
    const ui=gameControls(this.panelHost()),compact=this.height<740||this.width<1050;
    const scale=Math.max(this.width/1586,this.height/992);
    this.box(this.panel,'ArrivalGround',0,0,this.width,this.height,C.moss,0);
    ui.image('ui/arrival',this.width/2,this.height/2,1586*scale,992*scale);
    this.box(this.panel,'ArrivalShade',0,0,this.width,this.height,'#15291d38',0);
    const left=compact?Math.max(180,Math.min(280,this.width*.26)):0;
    this.box(this.panel,'ArrivalBrandShade',compact?0:48,compact?0:56,compact?left:358,compact?this.height:144,'#233d31c9',compact?0:6);
    this.text(this.panel,'Title','RealQuest',compact?24:72,compact?32:74,compact?left-40:310,56,compact?28:44,C.paper);
    this.text(this.panel,'ArrivalPlace',compact?'回响村庄\n旅程的起点':'回响村庄 · 旅程的起点',compact?24:74,compact?94:140,compact?left-40:308,48,16,C.paper);
    const w=compact?this.width-left-20:536,height=compact?Math.min(376,this.height-32):680,x=compact?left:this.width-w-56,y=(this.height-height)/2;
    if(compact)paperSurface(ui,{x,y,w,h:height},true);else ui.image('ui/register',x+w/2,y+height/2,w,height);
    const px=x+(compact?24:70),pw=w-(compact?48:140),top=compact?12:120;
    ui.region('registration-paper',px,y+top,pw,compact?height-top-16:516);
    this.text(this.panel,'Subtitle',pendingDeletion?'旅程结果待确认':'旅人登记',px,y+top,pw,36,compact?24:28);
    if(!compact)this.text(this.panel,'ArrivalInvitation','留个名字，从这里出发。',px,y+158,pw,24,16,C.muted);
    const nameY=y+(compact?54:198);
    this.field('traveler-name','旅人姓名',this.registrationName,px,nameY,pw,v=>this.registrationName=v,false,16);
    if(!compact)this.text(this.panel,'NameHint','最多 16 字 · 留空即为「林间旅人」',px,y+284,pw,24,14,C.muted);
    const nameInput=this.panel.getChildByName('traveler-name');if(nameInput){nameInput.getComponent(EditBox)!.enabled=this.loaded&&!this.busy&&!pendingDeletion;this.controls.find(c=>c.id==='traveler-name')!.disabled=!this.loaded||this.busy||pendingDeletion;}
    this.text(this.panel,'AppearanceHeading','选择人物形象',px,y+(compact?134:324),pw,26,18);
    const gap=12,ww=(pw-2*gap)/3,cardH=compact?64:108,sy=y+(compact?164:360);
    registrationAppearances.forEach((a,i)=>{
      const bx=px+i*(ww+gap),selected=a.id===this.registrationAppearance;
      ui.button('appearance-'+a.id,'',bx,sy,ww,cardH,()=>{this.registrationAppearance=a.id;this.dirty=true;},this.busy||pendingDeletion||!this.loaded,selected,'game',{label:'人物形象 '+(i+1),pressed:selected});
      const n=this.panel.getChildByName('appearance-'+a.id)!;
      const sprite=this.make(n,'Traveler',0,compact?2:4,48,64);sprite.addComponent(Sprite).sizeMode=Sprite.SizeMode.CUSTOM;this.setActor(sprite,'actor-'+a.id,0);
      if(selected)this.text(n,'Selected','✓',ww/2-28,-cardH/2+4,24,24,18,C.paper,true);
    });
    const message=this.error||this.notice||(pendingDeletion?'上次删除结果待确认，请先确认。':hasSession?'接续时保留原角色与记录。':compact?'姓名可留空 · 旅程自动保存':'旅程与成长记录会自动保存。');
    this.text(this.panel,'WelcomeNote',compact?message.replace(/\n/g,' '):message,px,y+(compact?234:480),pw,compact?28:44,14,this.error?C.danger:C.muted);
    const half=(pw-12)/2,by=y+(compact?height-60:532);
    ui.button('start',this.busy?'正在连接…':pendingDeletion?'确认删除结果':hasSession?'继续旅程':'开始旅程',px,by,compact?half:pw,compact?44:50,()=>this.startJourney(),this.busy||!this.loaded,true);
    ui.button('import-save','登录 / 接续旅程',compact?px+half+12:px,compact?by:y+588,compact?half:pw,44,()=>this.open('session'),this.busy||pendingDeletion,false,'page');
  }
  private drawPanel() {
    this.controls=[];this.actions.clear();this.semanticTexts=[];this.semanticFields.clear();
    const sceneLed=['dialogue','neighbor-find','neighbor-topics','neighbor-gift','item-confirm'].includes(this.mode);
    const overlay=this.box(this.panel,'ModalScrim',0,0,this.width,this.height,sceneLed?'#15291d38':'#263b32b8',0);overlay.addComponent(BlockInputEvents);
    if(['inventory','item-confirm'].includes(this.mode)){this.inventoryView.draw(this.panelHost());return;}
    if(this.mode==='storage'){this.storageView.draw(this.panelHost());return;}
    if(this.features.handles(this.mode)){this.features.draw(this.panelHost());return;}
    const w=Math.min(880,this.width-40),h=Math.min(this.mode==='inventory'?430:['travel','storage','sleep','context'].includes(this.mode)?440:320,this.height-32),x=(this.width-w)/2,y=(this.height-h)/2;
    paperSurface(this.panelHost(),{x,y,w,h},true);
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
      drag:(id,spec)=>{const n=parent.getChildByName(id);if(n&&!self.busy&&self.canPlay())self.inventoryDrag.bind(n,spec);},
      itemSlot:(...args)=>self.itemSlot(parent,...args),box:(...args)=>{self.box(parent,...args);},text:(...args)=>self.text(parent,...args),button:(...args)=>self.button(parent,...args),image:(...args)=>{self.image(parent,...args);},
      line:(id,points,color,width=2)=>{for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.y-a.y);if(length<.01)continue;const n=self.box(parent,id+'-'+i,(a.x+b.x-length)/2,(a.y+b.y-width)/2,length,width,color,0);n.angle=-Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;}},
      hasArt:path=>self.frames.has(path),
      region:(id,x,y,w,h)=>self.uiRegions.push({id,x,y,w,h}),
      routeArt:(gate,x,y,w,h)=>{const obj={...(self.context||{kind:'cave',name:'石根山洞'}),id:gate?'village_departure':'cave_entry',x:0,y:0} as WorldObject;const n=self.make(parent,'RouteIllustration',x+w/2,-y-h*.84,140,110);paintGraphics(n.addComponent(Graphics),caveRouteArt(obj,self.client.state!));const scale=Math.min(w/140,h/110);n.setScale(scale,scale,1);},
      person:(name,x,y,w,h)=>{const n=self.make(parent,name,x,-y,w,h);n.addComponent(Sprite).sizeMode=Sprite.SizeMode.CUSTOM;self.setActor(n,name,0);n.getComponent(UITransform)!.setContentSize(w,h);},
      field:(id,label,value,x,y,w,change,numeric,maxLength,inline)=>self.field(id,label,value,x,y,w,change,numeric,maxLength,false,false,inline),send:(action,data={})=>self.sendFeature(action,data),follow:action=>self.followGuidance(action),go:(mode,replace)=>{if(mode==='growth'&&self.mode==='inventory'&&seedCrop(self.inventoryView.selected))self.features.growth='planting';self.navigate(mode,replace);},close:()=>self.closePanel(),redraw:(clearFeedback=false)=>{if(clearFeedback){self.notice='';self.error='';}self.dirty=true;},mark:(target,label)=>self.mark(target,label),uuid:()=>transport.uuid(),
      focus:id=>{self.focusId=id;self.dirty=true;},reconnect:()=>{void self.reconnect();},
      meet:id=>{const person=residentPositions(self.client.world!,self.client.state!,serverNow()).find(p=>p.id===id);if(!person)return;self.mark({mapId:person.location!,targetId:id},person.name);if(person.location===self.client.state!.location){if(Math.hypot(person.x-self.p.x,person.y-self.p.y)<=65)void self.interact(person);else{self.route=approachRoute(self.map(),self.p,person);self.approach=self.route.length?{id,map:self.sceneId}:null;if(!self.route.length)self.error='暂时找不到可通行的小路，请从门口靠近。';}}},
    };
  }
  private field(id:string,label:string,value:string,x:number,y:number,w:number,change:(v:string)=>void,numeric=false,maxLength=80,password=false,reveal=false,inline=false){
    const nameField=id==='traveler-name',singleLine=password||nameField||inline,height=nameField?(this.height<740||this.width<1050?48:52):44,offset=inline?0:nameField?28:22,fontSize=nameField?20:16;
    if(!inline)this.text(this.panel,'Label-'+id,label,x,y,w,22,nameField?16:14,C.muted);
    const n=this.make(this.panel,id,x+w/2,-y-offset-height/2,w,height),g=n.addComponent(Graphics);
    const paint=(focused=false)=>{g.clear();g.fillColor=new Color(C.raised);g.roundRect(-w/2,-height/2,w,height,8);g.fill();g.strokeColor=new Color(focused?C.amber:'#687455');g.lineWidth=focused?2:1;g.roundRect(-w/2,-height/2,w,height,8);g.stroke();};paint(this.focusId===id);
    // Creator chooses input vs textarea during component preload. Configure
    // secret fields before activation so native editing is masked as well.
    if(singleLine)n.active=false;
    const edit=n.addComponent(EditBox);
    edit.maxLength=maxLength;edit.inputMode=numeric?EditBox.InputMode.NUMERIC:EditBox.InputMode.ANY;
    if(singleLine){edit.inputMode=numeric?EditBox.InputMode.NUMERIC:EditBox.InputMode.SINGLE_LINE;edit.inputFlag=password&&!reveal?EditBox.InputFlag.PASSWORD:EditBox.InputFlag.DEFAULT;}
    if(singleLine)n.active=true;
    for(const child of [...n.children])child.destroy();
    const inset=nameField?14:12;
    edit.textLabel=this.text(n,'Value',value,-w/2+inset,-height/2,w-inset*2,height,fontSize);edit.placeholderLabel=this.text(n,'Placeholder',nameField?'林间旅人':'',-w/2+inset,-height/2,w-inset*2,height,fontSize,C.muted);edit.string=value;
    if(nameField){edit.textLabel.enableWrapText=false;edit.placeholderLabel.enableWrapText=false;}
    this.semanticFields.set(id,{label,value:password?(value?'已输入密码':''):value,secret:password,autocomplete:password?(this.accountForm==='register'?'new-password':'current-password'):id==='account-username'?'username':undefined});this.actions.set(id,()=>{this.clearInput();this.focusId=id;this.semantics.labelEditor(id,label);edit.focus();});
    n.on(EditBox.EventType.EDITING_DID_BEGAN,()=>{this.clearInput();this.focusId=id;paint(true);this.semantics.labelEditor(id,label);});
    const live=()=>n.isValid&&n.activeInHierarchy&&n.name===id;
    n.on(EditBox.EventType.TEXT_CHANGED,()=>{if(live())change(edit.string);});
    n.on(EditBox.EventType.EDITING_DID_ENDED,()=>{if(live()){change(edit.string);paint(false);this.dirty=true;}});
    // Canvas focus can request a redraw between pointer down and up. Retain
    // this editor until the press ends, just as the existing buttons do.
    n.on(Node.EventType.TOUCH_START,()=>{if(!this.busy)this.pressedButtons.add(n);});
    n.on(Node.EventType.TOUCH_END,()=>this.pressedButtons.delete(n));
    n.on(Node.EventType.TOUCH_CANCEL,()=>this.pressedButtons.delete(n));
    const wp=n.worldPosition;this.controls.push({id,label,x:wp.x,y:this.height-wp.y,w,h:height,disabled:this.busy});
    edit.enabled=!this.busy;
  }
  private async sendFeature(action:string,data:Record<string,unknown>={}){
    let success=false;
    await this.work(async()=>{const location=this.client.state!.location;const reply=await this.client.command(action,data);this.notice=reply.message||'';success=true;
      if(this.client.state!.location!==location){this.p={...this.client.state!.position};this.buildWorld();this.open('world');}
    });
    if(!success&&(action.startsWith('construction_')||action.startsWith('ranch_')||['knowledge_spend','skill_spend','health_spend','till','plant','water','harvest','reclaim','tool_upgrade','tool_strike','craft','sell','market_trade'].includes(action))&&this.client.status==='ready'){
      const message=this.error;this.busy=true;this.dirty=true;
      try{await this.client.refresh();this.error=message+'。已同步最新报价，请核对后再操作。';}
      catch{this.error=message+'。暂时无法同步，请先重连。';}
      finally{this.busy=false;this.dirty=true;}
    }
    return success;
  }
  private queueCombat(id:string){
    if(id==='dodge'&&(this.elapsed<this.localDodgeReady||this.authoritativeDodge()||(this.client.state?.combat?.dodge_at||0)>(this.client.state?.combat?.time||0)))return;
    this.combatQueued.queue(id);
    if(id==='attack')this.attackPulse=true;
    else if(id==='spark')this.sparkPulse=true;
    else if(id==='soup')this.soupPulse=true;
    else if(id==='dodge'){
      this.dodgePulse=true;
      const touches=Array.from(this.touches.values()),held=(key:KeyCode)=>this.keys.has(key)||touches.includes(key);
      let x=Number(held(KeyCode.KEY_D)||held(KeyCode.ARROW_RIGHT))-Number(held(KeyCode.KEY_A)||held(KeyCode.ARROW_LEFT));
      let y=Number(held(KeyCode.KEY_S)||held(KeyCode.ARROW_DOWN))-Number(held(KeyCode.KEY_W)||held(KeyCode.ARROW_UP));
      if(!x&&!y&&this.route.length){x=this.route[0].x-this.p.x;y=this.route[0].y-this.p.y;}
      if(!x&&!y){const aim=this.aim();x=this.p.x-aim.x;y=this.p.y-aim.y;}
      const length=Math.hypot(x,y)||1;this.dodgeIntent={dx:x/length,dy:y/length};
    }
  }
  private consumeCombat(id:string,queued:Record<string,number>){
    if(!this.combatQueued.consume(id,queued[id]))return;
    if(id==='attack')this.attackPulse=false;
    else if(id==='spark')this.sparkPulse=false;
    else if(id==='soup')this.soupPulse=false;
    else if(id==='dodge')this.dodgePulse=false;
  }
  private authoritativeDodge(){
    const c=this.client.state?.combat,time=(c?.time||0)+Math.min(.12,Math.max(0,this.elapsed-this.combatReceiptAt));
    return c?.dash&&time<c.dash.until?c.dash:null;
  }
  private previewCombat(dx:number,dy:number){
    for(const id of this.combatQueued.expired(this.elapsed))this.consumeCombat(id,this.combatQueued.snapshot());
    const s=this.client.state!,c=s.combat;if(!c||this.busy||this.client.status==='uncertain'||this.client.status==='offline')return;
    const aim=this.aim();
    if(this.dodgePulse&&this.elapsed>=this.localDodgeReady&&(c.dodge_at||0)<=c.time&&s.position.x>=166){
      this.localDodge={...this.dodgeIntent};this.localDodgeUntil=this.elapsed+.18;this.localDodgeReady=this.elapsed+1.15-(c.gear_stats?.dodge_bonus||0);this.localAction=null;
      void soundEffects.unlock();
    }
    const weapon=c.equipped?c.weapons[c.equipped]:null;
    const spark=this.sparkPulse,attack=this.attackPulse||this.mouseAttack||this.keys.has(KeyCode.SPACE)||!!this.combatDock?.held;
    if(this.elapsed<this.localActionReady||c.cast||this.elapsed<this.localDodgeUntil||this.dodgePending||this.authoritativeDodge()||c.attack_at>c.time||s.position.x<166)return;
    const magic=spark&&!!weapon&&!!s.inventory[c.equipped!]&&!weapon.use_reasons?.length&&c.spark_learned&&c.spark_at<=c.time&&(s.stamina?.current||0)>=4;
    if(!magic&&(!attack||!weapon||!s.inventory[c.equipped!]||weapon.use_reasons?.length))return;
    const duration=magic?.5:weapon!.style==='sweep'?weapon!.interval:Math.min(weapon!.interval,.38),angle=Math.atan2(aim.y-this.p.y,aim.x-this.p.x);
    this.localAction={kind:magic?'spark':'weapon',style:magic?'spark':weapon!.style,angle,reach:magic?96:weapon!.reach,started:c.time,hit_at:c.time+(magic?.28:weapon!.windup??weapon!.interval*.23),until:c.time+duration};
    this.localActionStart=this.elapsed;this.localActionReady=this.elapsed+(magic?.5:weapon!.interval);
    void soundEffects.unlock().then(()=>soundEffects.play(magic||weapon?.magic?'spell':'swing'));
  }
  private updateCombat(dx:number,dy:number){
    if(this.busy||this.combatPending||this.elapsed-this.combatLastTick<0.075)return;
    const intention=combatIntention(this.client.state!,this.owner,{dx,dy},this.targetId,{attack:this.mouseAttack||this.keys.has(KeyCode.SPACE)||!!this.combatDock?.held||this.attackPulse,spark:this.sparkPulse,soup:this.soupPulse,dodge:this.dodgePulse,dodge_x:this.dodgeIntent.dx,dodge_y:this.dodgeIntent.dy},this.aim());
    if(!intention)return;
    this.combatMotion.checkpoint(intention.data.seq);
    this.targetId=intention.targetId;this.combatLastTick=this.elapsed;
    const queued=this.combatQueued.snapshot(),dodgeAt=this.client.state!.combat?.dodge_at||0;
    this.combatQueued.markSent(queued,this.elapsed);
    const epoch=this.inputEpoch,location=this.client.state!.location;
    this.dodgePending=!!intention.data.dodge;
    this.combatPending=this.client.command('cave_tick',intention.data).then(reply=>{
      if(epoch===this.inputEpoch&&location===reply.state.location)this.combatMotion.acknowledge(intention.data.seq,reply.state.position,this.elapsed);
      else this.combatMotion.reset(reply.state.position,this.elapsed);
      this.combatReceiptAt=this.elapsed;
      if(epoch===this.inputEpoch){
        const c=reply.state.combat;
        if(c?.action?.seq===intention.data.seq){this.consumeCombat(c.action.kind==='spark'?'spark':'attack',queued);this.localAction=null;this.localActionReady=this.elapsed+Math.max(0,c.attack_at-c.time);}
        if(c?.cast?.kind==='soup'&&intention.data.soup)this.consumeCombat('soup',queued);
        if((c?.dodge_at||0)>dodgeAt&&intention.data.dodge){this.consumeCombat('dodge',queued);this.localAction=null;this.consumeCombat('attack',queued);}
      }
      if(reply.state.combat?.message)this.notice=reply.state.combat.message;
    }).catch(e=>{this.error=e.message;this.clearInput();}).finally(()=>{this.combatPending=null;this.dodgePending=false;this.dirty=true;});
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
    const compact=this.width<1000,x=compact?316:20,y=compact?88:120,w=compact?Math.min(284,this.width-508):284;
    if(compact&&this.hoeActive()){
      const label=h.button('tracker-open','目标',316,88,44,44,()=>this.navigate('guide-goal'),this.busy,false,'hud',{label:'查看当前目标：'+entry.title});label.fontSize=13;return;
    }
    if(this.continuation.cue){
      h.button('return-open','欢迎回来\n'+shortText(entry.title,Math.max(8,Math.floor((w-84)/16))),x,y,w-68,compact?44:68,()=>{this.continuation.dismiss();this.features.prepare();this.navigate('preparation');},this.busy,true);
      h.button('return-dismiss','收起',x+w-60,y,60,44,()=>{this.continuation.dismiss();this.dirty=true;},this.busy);return;
    }
    if(this.continuation.collapsed){h.button('tracker-toggle','展开目标',x,y,116,44,()=>{this.continuation.fold(false);this.dirty=true;},this.busy);return;}
    if(!compact){
      const nearby=this.nearest(),target=entry.action?.target;
      const direct=nearby&&target?.mapId===s.location&&target.targetId===nearby.id&&['armory_counter','blacksmith','cave_entry'].includes(nearby.id)&&!interactionFor(nearby,s,serverNow()).reason?nearby:null;
      const actionLabel=direct?(direct.id==='blacksmith'?'找阿焰买武器':direct.id==='armory_counter'?'打开锻造工作台':'查看洞穴入口'):entry.action?.label||'旅途委托';
      this.box(this.hud,'JourneyGoalEdge',x,y+2,w,116,C.wood,4);this.box(this.hud,'JourneyGoalPaper',x+1,y,w-2,116,C.paper,4);this.box(this.hud,'JourneyGoalRibbon',x+12,y,3,24,C.moss,0);
      this.text(this.hud,'JourneyGoalStep','旅途委托 · '+entry.progress,x+24,y+4,w-94,24,12,C.muted);
      h.button('tracker-toggle','收起',x+w-56,y+2,48,44,()=>{this.continuation.fold(true);this.dirty=true;},this.busy,false,'page');
      const title=h.button('tracker-open',entry.title,x+12,y+28,w-72,44,()=>this.navigate('guide-goal'),this.busy,false,'entry');title.fontSize=15;title.lineHeight=20;
      h.button('tracker-follow',actionLabel,x+12,y+72,w-24,44,()=>direct?void this.interact(direct):entry.action?this.followGuidance(entry.action):this.navigate('journal'),this.busy,false,'entry');
      return;
    }
    const title=shortText(entry.title,compact?Math.max(6,Math.floor((w-84)/16)):12),count=entry.note.match(/（(\d+\/\d+)）/);
    const detail=entry.kind==='quest'?(count?count[1]+' '+shortText(entry.note,compact?5:8):entry.progress+' · '+shortText(entry.note,compact?5:8)):entry.progress;
    h.button('tracker-open',title+'\n'+detail,x,y,w-68,compact?44:68,()=>this.navigate('guide-goal'),this.busy);
    h.button('tracker-toggle','收起',x+w-60,y,60,44,()=>{this.continuation.fold(true);this.dirty=true;},this.busy);
    if(!compact)h.button('tracker-follow',entry.action?.label||'旅途委托',x,y+76,w,44,()=>entry.action?this.followGuidance(entry.action):this.navigate('journal'),this.busy,true);
  }
  private drawStatus(){
    const s=this.client.state!;
    if(this.mode!=='world')return;
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
      this.text(this.hud,'CaveTarget',c.cast?`${v.castLabel} · ${Math.round(v.castProgress*100)}%`:v.target?`${v.target.name}  ${v.target.hp}/${v.target.max_hp} · 剩余 ${v.remaining}`:c.cleared?'可从路标继续或撤离':`自由瞄准 · 剩余 ${v.remaining}`,32,compact?80:82,270,24,14,'#e5d8ad');
      if(!compact)this.text(this.hud,'CaveWeapon',v.weapon?.name||'尚未持有已装备武器',32,106,270,20,12,'#d5d9bd');
      const hintX=compact?192:20,hintW=compact?this.width-192-284:610;
      this.box(this.hud,'CaveHintPaper',hintX,this.height-72,hintW,48,C.paper,6);
      this.text(this.hud,'CaveHint',this.error||v.hint,hintX+10,this.height-68,hintW-20,40,14,this.error?C.danger:C.ink);
      if(c.cast){const barX=compact?192:20,barY=this.height-94,barW=compact?hintW:240;this.box(this.hud,'CastTrack',barX,barY,barW,5,'#415a41',0);this.box(this.hud,'CastProgress',barX,barY,Math.max(1,barW*v.castProgress),5,'#dbc18a',0);}
      this.combatDock?.draw(this.width,this.height,s,!this.canPlay()||this.busy,this.controls,this.actions,this.focusId);

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
    await this.work(async()=>{
      await this.client.reconnect();if(!this.client.state){this.deletedJourney();return;}
      this.p={...this.client.state.position};
      // Reconcile the active input owner's lease before enabling actions. The
      // next heartbeat must not enqueue a fresh save just after recovery ends.
      if(this.client.state.character)await this.client.command(this.mode==='world'?'world_resume':'world_pause',{owner:this.owner});
      this.lastHeartbeat=this.lastRefresh=this.elapsed;
      this.confirmJourneySnapshot(serverNow(),true);this.notice='已重新确认服务器存档';this.worldNoticeUntil=this.elapsed+3.2;
    });
  }
  private exportCredential() {return this.work(async()=>{downloadRecovery(await this.client.recoveryFile());this.backupDownloadedSaveId=this.client.saveId;this.notice='凭证已下载，请妥善保存。';});}
  private deletedJourney(){
    this.inventoryView.deleted();this.continuation.reset();this.guideMarker=null;this.clearInput();this.world.active=false;this.context=null;this.sceneId='';this.marker=null;
    this.recovery=null;this.recoveryPreview=null;this.backedUpSaveId='';this.backupDownloadedSaveId='';
    this.confirmDelete=false;this.panelHistory=[];this.mode='welcome';this.notice=this.client.disconnectionReason==='logout'?'已退出登录，账号旅程已保留。可重新登录或开始游客旅程。':'旅程数据已删除，旧凭证已失效。\n点击开始才会新建旅程。';this.error='';this.dirty=true;
  }
  private clearAccountDraft(){
    if(this.accountPreview?.session_token)void transport.request('account/logout','POST',undefined,this.accountPreview.session_token).catch(()=>{});
    this.accountPassword='';this.accountConfirm='';this.passwordVisible=false;this.accountPreview=null;
  }
  private async submitAccount(){
    const username=this.accountUsername.trim();
    if(!/^[A-Za-z0-9_]{3,24}$/.test(username))throw new Error('用户名需为3–24位英文字母、数字或下划线');
    if(this.accountForm==='register'){
      const length=Array.from(this.accountPassword).length;
      if(length<15||length>128)throw new Error('密码需为15–128个字符，可使用空格和中文');
      if(this.accountPassword!==this.accountConfirm)throw new Error('两次输入的密码不一致');
    }
    if(!this.accountPassword)throw new Error('请输入密码');
    const reply=await this.client.authenticate(this.accountForm,username,this.accountPassword);
    this.accountPassword='';this.accountConfirm='';this.passwordVisible=false;
    if(this.accountForm==='login')this.accountPreview=reply;
    else{this.notice='账号已注册，当前旅程已绑定。请保存用户名和密码，旧游客凭证已失效。';this.error='';}
  }
  private async adoptAccount(){
    await this.client.adoptAccount(this.accountPreview!);this.accountPreview=null;
    try{await this.client.refresh();}
    finally{
      this.recovery=null;this.recoveryPreview=null;this.backedUpSaveId='';this.backupDownloadedSaveId='';
      this.sceneId='';this.panelHistory=[];this.marker=null;this.continuation.reset();this.inventoryView.deleted();
      if(this.client.state?.character){this.p={...this.client.state.position};this.inventoryView.init(this.panelHost());this.buildWorld();this.open('world');this.confirmJourneySnapshot(serverNow(),true);}
      else{this.world.active=false;this.open('welcome');}
    }
    this.notice='已登录并接续账号旅程';
  }
  private drawAccount(x:number,y:number,w:number,h:number){
    const ui=gameControls(this.panelHost()),compact=h<400,body=y+(compact?112:128),bottom=y+h-62,half=(w-64)/2;
    if(this.client.logoutPending){
      this.text(this.panel,'AccountLogoutPending','退出结果待确认，旅程数据仍保存在服务器。',x+24,body,w-48,60,18);
      ui.button('account-logout-retry','重试确认退出',x+24,bottom,w-48,44,()=>this.work(async()=>{await this.client.logout();this.deletedJourney();this.notice='已退出登录，账号旅程已保留。';}),this.busy,true);return;
    }
    if(this.accountPreview){
      const p=this.accountPreview,needsBackup=!!this.client.state?.character&&!this.client.account&&p.save_id!==this.client.saveId&&this.backedUpSaveId!==this.client.saveId;
      this.text(this.panel,'AccountPreview',`接续账号 ${p.account!.username} · ${p.state.character?.name||'尚未登记角色'}`,x+24,body,w-48,32,22);
      this.text(this.panel,'AccountPreviewHelp',needsBackup?'当前游客旅程尚未绑定，请先导出并保存凭证。':'接续该账号的最新旅程；当前旅程不会被覆盖或合并。',x+24,body+34,w-48,compact?28:52,15,C.muted);
      if(needsBackup){
        ui.button('account-backup','导出当前游客凭证',x+24,body+(compact?68:112),half,44,()=>this.exportCredential(),this.busy);
        ui.button('account-backup-saved','已妥善保存凭证',x+40+half,body+(compact?68:112),half,44,()=>{this.backedUpSaveId=this.client.saveId;this.dirty=true;},this.busy||this.backupDownloadedSaveId!==this.client.saveId);
      }
      ui.button('account-adopt','确认登录并接续',x+24,bottom,half,44,()=>this.work(()=>this.adoptAccount()),this.busy||needsBackup,true);
      ui.button('account-cancel','取消切换',x+40+half,bottom,half,44,()=>{this.clearAccountDraft();this.dirty=true;},this.busy);return;
    }
    if(this.client.account){
      this.text(this.panel,'AccountName','已登录 · '+this.client.account.username,x+24,body,w-48,36,24);
      this.text(this.panel,'AccountSave',`当前旅程：${this.client.state?.character?.name||'尚未登记角色'}\n游戏进度与现实成长记录随旅程保存。`,x+24,body+42,w-48,66,17);
      if(!compact)this.text(this.panel,'AccountHelp','换设备时，连接同一服务器并登录即可接续。\n退出登录保留存档；删除旅程不会注销账号。\n账号旅程使用密码接续，不再签发游客凭证。',x+24,body+132,w-48,110,17,C.muted);
      ui.button('account-logout','退出登录，保留旅程',x+24,bottom,w-48,44,()=>this.work(async()=>{await this.client.logout();this.deletedJourney();this.notice='已退出登录，账号旅程已保留。可重新登录或开始游客旅程。';}),this.busy||!!this.client.pending);return;
    }
    ui.button('account-mode-login','登录账号',x+24,body,120,44,()=>{this.clearAccountDraft();this.accountForm='login';this.error='';this.notice='';this.dirty=true;},this.busy,this.accountForm==='login');
    ui.button('account-mode-register','注册并绑定',x+152,body,132,44,()=>{this.clearAccountDraft();this.accountForm='register';this.error='';this.notice='';this.dirty=true;},this.busy,this.accountForm==='register');
    ui.button('account-password-visibility',this.passwordVisible?'隐藏密码':'显示密码',x+w-148,body,124,44,()=>{this.passwordVisible=!this.passwordVisible;this.dirty=true;},this.busy,false);
    const count=this.accountForm==='register'?3:2,gap=12,fieldW=(w-48-gap*(count-1))/count,fy=body+(compact?46:72);
    this.field('account-username','用户名（3–24位）',this.accountUsername,x+24,fy,fieldW,v=>this.accountUsername=v,false,24);
    this.field('account-password',this.accountForm==='register'?'密码（15–128字符）':'密码',this.accountPassword,x+24+fieldW+gap,fy,fieldW,v=>this.accountPassword=v,false,128,true,this.passwordVisible);
    if(count===3)this.field('account-confirm','确认密码',this.accountConfirm,x+24+2*(fieldW+gap),fy,fieldW,v=>this.accountConfirm=v,false,128,true,this.passwordVisible);
    if(!this.error&&!this.notice)this.text(this.panel,'AccountRules',this.accountForm==='register'?(this.client.saveId?'用户名不区分大小写；无自助找回密码。注册绑定当前旅程，旧游客凭证将失效。':'用户名不区分大小写；暂不支持自助找回密码。注册后可登记角色。'):'使用用户名和密码接续同一服务器的旅程。也可以返回继续游客体验。',x+24,y+h-108,w-48,42,14,C.muted);
    ui.button('account-submit',this.busy?'正在处理…':this.accountForm==='register'?(this.client.saveId?'注册账号并绑定当前旅程':'注册账号，开启新旅程'):'登录并查看账号旅程',x+24,bottom,w-48,44,()=>this.work(()=>this.submitAccount()),this.busy||!this.loaded||!!this.client.pending,true);
  }
  private async adoptJourney(){
    if(this.recoverySource==='web')await this.client.continueWebJourney(this.recoveryPreview.save_id);
    else await this.client.restore(this.recovery!);
    this.recovery=null;this.recoveryPreview=null;this.backedUpSaveId='';this.backupDownloadedSaveId='';
    this.p={...this.client.state!.position};this.inventoryView.init(this.panelHost());this.sceneId='';this.buildWorld();this.notice='已接续原旅程';this.open('world');this.confirmJourneySnapshot(serverNow(),true);
  }
  private drawSession() {
    const ui=gameControls(this.panelHost()),wide=this.width>=980&&this.height>=560;
    const outerW=Math.min(1100,this.width-32),h=Math.min(560,this.height-24),outerX=(this.width-outerW)/2,y=(this.height-h)/2;
    if(!this.client.state?.character){const scale=Math.max(this.width/1586,this.height/992);ui.image('ui/arrival',this.width/2,this.height/2,1586*scale,992*scale);}
    this.box(this.panel,'SessionShade',0,0,this.width,this.height,'#233d3188',0);
    const left=wide?Math.round(outerW*.29):0,x=wide?outerX+left+16:outerX,w=wide?outerW-left-16:outerW;
    if(wide){
      ui.image('ui/letter',outerX+left/2,y+205,234,350);
      this.box(this.panel,'CredentialClothLabel',outerX+14,y+382,left-28,150,C.moss,5);
      this.text(this.panel,'CredentialTitle',this.sessionPage==='account'?'旅程账号':'旅程凭证',outerX+28,y+392,left-56,38,24,C.paper,true);
      this.text(this.panel,'CredentialPurpose',this.sessionPage==='account'?'用熟悉的账号，接续你的旅程。\n请妥善保存用户名和密码。':'把旅程的钥匙妥善收好。\n凭证用于找回对应服务器的存档。',outerX+34,y+438,left-68,80,16,C.paper,true);
    }

    const body=y+120,row=y+(h<400?184:296),bottom=y+h-62,half=(w-64)/2;
    paperSurface(ui,{x,y,w,h},true);
    this.text(this.panel,'SessionTitle','旅程与存档',x+28,y+16,w-140,40,26);
    ui.button('session-close','返回',x+w-100,y+14,72,44,()=>{this.recovery=null;this.recoveryPreview=null;this.open(this.client.state?.character&&!this.client.deletionPending?'world':'welcome');},this.busy);
    const tabW=(w-72)/3;
    for(const [i,page] of (['recovery','account','data'] as const).entries())ui.button('session-tab-'+page,({recovery:'接续与凭证',account:'账号登录',data:'数据管理'})[page],x+24+i*(tabW+12),y+64,tabW,44,()=>{this.clearAccountDraft();this.sessionPage=page;this.confirmDelete=false;this.recovery=null;this.recoveryPreview=null;this.error='';this.notice='';this.dirty=true;},this.busy||this.client.deletionPending||this.client.logoutPending,this.sessionPage===page);
    if(this.client.deletionPending){
      this.text(this.panel,'DeletionPending','删除结果待确认',x+24,body,w-48,32,24,C.danger);
      this.text(this.panel,'DeletionPendingHelp','请重试核实服务器结果。确认前保留本机记录，不会新建旅程。',x+24,body+38,w-48,52,17);
      ui.button('delete-retry','重试并确认删除结果',x+24,bottom,w-48,44,()=>this.reconnect(),this.busy,true);
    }else if(this.sessionPage==='account'||this.client.logoutPending){
      this.drawAccount(x,y,w,h);
    }else if(this.sessionPage==='data'){
      const active=!!this.client.state?.character;
      this.text(this.panel,'DataJourney',active?`当前旅程：${this.client.state!.character!.name} · ${this.client.saveId.slice(0,8)}`:'请先连接要管理的旅程',x+24,body,w-48,32,22);
      if(this.confirmDelete){
        this.text(this.panel,'DeleteScope','永久删除此旅程的角色、活动、计时、世界和结算记录。\n所有会话和凭证失效；账号保留，再次登录从空白开始。',x+24,body+38,w-48,h<400?60:80,17,C.danger);
        ui.button('delete-cancel','取消，保留旅程',x+24,bottom,half,44,()=>{this.confirmDelete=false;this.dirty=true;},this.busy,true);
        ui.button('delete-confirm','确认永久删除此旅程',x+40+half,bottom,half,44,()=>this.work(async()=>{await this.client.deleteData();this.deletedJourney();}),this.busy||!active).color=new Color(C.danger);
      }else{
        this.text(this.panel,'ExportMeaning',h<400?'完整数据供查看；恢复请保存凭证。删除会撤销全部会话。':'完整数据供查看；找回请保存旅程凭证。删除会撤销此旅程所有会话。',x+24,body+34,w-48,h<400?28:76,h<400?15:17,C.muted);
        ui.button('export-data','导出完整数据与结算记录',x+24,row,half,44,()=>this.work(async()=>{downloadData(await this.client.exportData());this.notice='完整数据已下载；恢复旅程请另存旅程凭证。';}),this.busy||!active);
        ui.button('data-export-recovery',this.client.account?'账号旅程使用密码接续':'导出旅程凭证',x+40+half,row,half,44,()=>this.exportCredential(),this.busy||!active||!!this.client.account);
        ui.button('delete-begin','删除此旅程的数据…',x+24,bottom,w-48,44,()=>{this.confirmDelete=true;this.notice='';this.error='';this.dirty=true;},this.busy||!active).color=new Color(C.danger);
      }
    }else if(this.recoveryPreview){
      const p=this.recoveryPreview;
      const needsBackup=!!this.client.state?.character&&!this.client.account&&p.save_id!==this.client.saveId&&this.backedUpSaveId!==this.client.saveId;
      this.text(this.panel,'RestoreName',`接续：${p.character?.name||'未命名旅人'} · ${p.save_id.slice(0,8)}`,x+24,body,w-48,32,24);
      this.text(this.panel,'RestoreDetails','计划 '+p.plan_count+' · 记录 '+p.record_count+' · '+(needsBackup?'先保存当前凭证再切换':'原旅程保留，接续最新存档'),x+24,body+34,w-48,h<400?28:58,h<400?15:17,C.muted);
      if(needsBackup){
        ui.button('backup-before-restore','先导出当前凭证',x+24,row,half,44,()=>this.exportCredential(),this.busy);
        ui.button('backup-saved','已保存当前凭证',x+40+half,row,half,44,()=>{this.backedUpSaveId=this.client.saveId;this.dirty=true;},this.busy||this.backupDownloadedSaveId!==this.client.saveId);
      }
      ui.button('confirm-restore',this.busy?'正在连接…':'确认接续此旅程',x+24,bottom,half,44,()=>this.work(()=>this.adoptJourney()),this.busy||needsBackup,true);
      ui.button('cancel-restore','取消切换',x+40+half,bottom,half,44,()=>{this.recovery=null;this.recoveryPreview=null;this.notice='';this.dirty=true;},this.busy);
    } else {
      this.text(this.panel,'SessionStatus',`${this.client.state?.character?.name||'尚未连接旅程'} · ${this.connectionLabel()}`,x+24,body,w-48,32,22);
      this.text(this.panel,'SessionMeaning',h<400?'需连接同一服务器；独立预览库和数值导出不能恢复原库旅程。':'凭证可找回对应服务器中的旅程；完整数值导出供查看，不能用于恢复。',x+24,body+34,w-48,h<400?28:58,h<400?15:17,C.muted);
      ui.button('choose-recovery','导入旅程凭证',x+24,row,half,44,()=>this.work(async()=>{const text=await chooseRecovery();if(text){const file=readRecovery(text);const preview=await this.client.previewRecovery(file);if(this.client.pending&&preview.save_id!==this.client.saveId)throw new Error('当前有待确认操作，请先选择当前旅程的凭证');this.recoverySource='file';this.recoveryPreview=preview;this.recovery=file;}}),this.busy,true);
      ui.button('find-web-journey','查找浏览器中的旅程',x+40+half,row,half,44,()=>this.work(async()=>{
        try{this.recoveryPreview=await this.client.inspectWebJourney();this.recoverySource='web';}
        catch(e){if((e as any).status===401)throw new Error('未找到此浏览器的其他旅程。可导入已保存的凭证，并确认连接原服务器。');throw e;}
      }),this.busy);
      ui.button('export-recovery',this.client.account?'账号旅程使用密码接续':'导出当前凭证',x+24,bottom,half,44,()=>this.exportCredential(),this.busy||!this.client.state?.character||!!this.client.pending||!!this.client.account);
      ui.button('session-reconnect','重连并确认',x+40+half,bottom,half,44,()=>this.reconnect(),this.busy||!this.client.saveId);
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
      const art=this.frames.get('interiors/bed');if(art){const scale=Math.min(w*.30/art.width,(h-160)/art.height);this.image(this.panel,'interiors/bed',x+w*.20,y+h*.49,art.width*scale,art.height*scale);}
      const rx=x+w*.39,rw=w*.61-28;
      this.text(this.panel,'RestDetails',obj.id==='inn_bed'?'整夜住宿需要先向岚姨订房。':'睡到次日 06:00，恢复体力和生命。\n小憩推进 30 游戏分钟；新作物随游戏时间生长。',rx,y+80,rw,110,18);
      const needsBooking=obj.id==='inn_bed'&&s.departure?.booking_day!==villageClock(s,serverNow()).day;
      this.button(this.panel,'sleep-night',needsBooking?'需先向岚姨订房':'睡到明早',rx,y+h-80,(rw-12)/2,48,()=>mutate('rest',{expected_day:villageClock(s,serverNow()).day}),this.busy||needsBooking,true);
      if(obj.id==='home_bed')this.button(this.panel,'short-rest','小憩一会儿',rx+(rw+12)/2,y+h-80,(rw-12)/2,48,()=>mutate('short_rest',{expected_day:villageClock(s,serverNow()).day}),this.busy);
    } else if(this.mode==='travel'){
      const options=s.travel?.options.filter(q=>q.target===obj.id)||[],perPage=h<420?1:3,pages=Math.max(1,Math.ceil(options.length/perPage));
      options.slice(this.page*perPage,(this.page+1)*perPage).forEach((q,i)=>{const yy=y+76+i*88;
        const costs=Object.entries(q.costs).map(([id,n])=>id==='gold'?formatMoney(n):`${({plank:'木板',stone:'石料'} as Record<string,string>)[id]||id} ${n}`).join(' · ');
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
    if(s&&this.audibleState&&s!==this.audibleState&&save===this.audibleSave&&action&&!['move','world_resume','world_pause'].includes(action)){const cue=confirmedCue(this.audibleState,s);if(cue)soundEffects.play(cue);
      if(action==='cave_tick'&&s.combat?.encounter===this.audibleState.combat?.encounter){
        const old=new Set(this.audibleState.combat?.effects.map(e=>e.id??[e.kind,e.until,e.x,e.y].join(':')));
        const events=s.combat?.effects.filter(e=>!old.has(e.id??[e.kind,e.until,e.x,e.y].join(':')))||[];
        if(events.some(e=>e.kind==='hurt'))soundEffects.play('hurt');
        if(events.some(e=>e.kind==='hit'))soundEffects.play('hit');
        if(events.some(e=>e.kind==='defeat'))soundEffects.play('defeat');
      }
    }
    if(s&&(save!==this.audibleSave||s.tools?.held!==this.audibleState?.tools?.held)){this.toolRange=1;this.clearInput();this.workMotion=null;}
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
      feedback,hudRegions,uiRegions:this.uiRegions,
      actorFrame:this.actorFrame,combatAim:this.aim(),swordPresentation:this.swordPose,npcPresentation:Object.fromEntries(this.npcMotion),combatTarget:this.targetId,sessionPage:this.sessionPage,account:this.client.account,accountForm:this.accountForm,accountPreview:this.accountPreview?{username:this.accountPreview.account!.username,saveId:this.accountPreview.save_id}:null,logoutPending:this.client.logoutPending,deletionPending:this.client.deletionPending,recoverySource:this.recoveryPreview?this.recoverySource:null,coordinateSystem:'world: origin top-left, +x right, +y down; controls: CSS pixels from top-left',
      construction:s?.construction,constructionView:s?.construction_view,player:this.p, savedPosition:s?.position, saveId:this.client.saveId, revision:s?.revision, vitality:s?.vitality, combat:s?.combat, questLog:s?.quest_log, lifeJournal:s?.life_journal,villageIntro:s?.village_intro,trackedQuest:s?.tracked_quest, timer:s?.timer, studyTasks:s?.study_task_log, plans:s?.study_plan_log, growth:s?.character_growth_options, storage:s?.storage, features:this.features.snapshot(),guidance:this.client.state?{...this.continuation.inspect(),entry:currentGuidance(this.client.state,serverNow()),ownedMarker:this.guideMarker}:null,marker:this.marker,connection:this.client.status, pendingAction:this.client.pending?.body.action||null, location:s?.location, appearance:s?.character?.appearance, character:s?.character,xp:s?.xp,attributes:s?.attributes,points:s?{knowledge:s.knowledge_points,health:s.health_points,skill:s.skill_points}:null, sceneId:this.sceneId, map:this.client.state?{id:this.map().id,width:this.map().width,height:this.map().height,obstacles:this.map().obstacles}:null, inventory:s?.inventory, stamina:s?.stamina,
      tools:s?.tools,toolRules:s?.tool_rules,toolPresentation:this.toolRenderer.presentation,toolActor:this.toolPose,toolRange:this.toolRange,
      ranch:s?.ranch,ranching:s?.ranching,farm:s?.farm,farming:s?.farming,farmingTool:this.farmingTool,hoe:{aim:this.hoeTargetSafe(),queue:this.hoeQueue.map(o=>o.id),pointer:this.hoePointer,swing:this.hoeSwing},plots:s?.plots, activities:s?.activities.slice(-10), camera:{x:this.world.position.x,y:this.world.position.y,zoom:this.conversationZoom||this.zoom,width:this.width,height:this.height},
      plotPresentation:Object.fromEntries(this.plotVisuals),
      interactables:this.supportedObjects(),
      selected:this.inventoryView.selected, quick:this.inventoryView.quick, inventoryUi:{...this.inventoryView.snapshot(),target:this.mode==='item-confirm'?this.inventoryView.target(this.panelHost()):null}, nearby:this.nearest()||null, navigationBearing:this.marker&&s&&this.client.world?accessibleTarget(this.marker,this.client.world,s,serverNow()):null, controls:this.controls,
      serverTimeIsReal:true, navigationIntent:this.approach,route:this.route,localScene:{family:sceneLayouts[this.sceneId]?'fine-hearthwood':'temporary',response:this.responseObject,responseActive:this.elapsed<this.responseUntil},serverClock:s?.world_clock,experience:experienceSnapshot(),travelNotices:s?travelNotices(s,serverNow()):[],scope:'village-polish-local', uiArt:{loading:Array.from(this.loadingUIArt),failed:Array.from(this.failedUIArt)}, presentation:{family:'stone-root-v1',confirmedFeedback:this.combatRenderer.visibleFeedbackCount,reducedMotion:reducedMotion()} };
  }
}
