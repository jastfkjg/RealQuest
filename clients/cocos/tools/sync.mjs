// Canonical sources and unchanged art bindings; deliberate Web extractions have strict preservation guards.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { imageDimensions } from '../../../tools/cocos-image-info.mjs';
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(project, '../..');
execFileSync('python3',[path.join(root,'tools/generate_crop_catalog.py')]);
execFileSync('python3',[path.join(root,'tools/generate_tool_catalog.py')]);
execFileSync('python3',[path.join(root,'tools/generate_equipment_catalog.py')]);
execFileSync('python3',[path.join(root,'tools/generate_ranch_catalog.py')]);
const records = [];
async function bind(source, target, transform = x => x) {
  const bytes = await fs.readFile(path.join(root, source));
  const dest = path.join(project, target);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const result = transform(bytes);
  await fs.writeFile(dest, result);
  const extension=path.extname(target);
  if (extension==='.png'||extension==='.webp') {
    const hex = crypto.createHash('sha256').update('realquest-cocos/' + target).digest('hex').slice(0,32);
    const uuid = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    const [width,height] = imageDimensions(bytes,extension);
    const common = { wrapModeS: 'clamp-to-edge', wrapModeT: 'clamp-to-edge', minfilter: 'nearest', magfilter: 'nearest', mipfilter: 'none', premultiplyAlpha: false, anisotropy: 0, isUuid: true };
    // Keep valid editor-generated vertices/import metadata instead of rewriting
    // every unchanged image on each sync. Regenerate only the binding we own.
    let validMeta=false;
    try {
      const existing=JSON.parse(await fs.readFile(dest+'.meta','utf8'));
      const texture=existing.subMetas?.['6c48a']?.userData,frame=existing.subMetas?.['f9941']?.userData;
      validMeta=existing.uuid===uuid&&texture?.minfilter==='nearest'&&texture?.magfilter==='nearest'&&texture?.mipfilter==='none'&&frame?.trimType==='none'&&frame.rawWidth===width&&frame.rawHeight===height&&frame.width===width&&frame.height===height&&frame.packable===false;
    } catch { /* New or invalid metadata is generated below. */ }
    if(!validMeta)await fs.writeFile(dest + '.meta', JSON.stringify({ ver:'1.0.27', importer:'image', imported:true, uuid, files:[extension,'.json'], subMetas:{
      '6c48a':{ ver:'1.0.22',importer:'texture',uuid:uuid+'@6c48a',imported:true,files:['.json'],subMetas:{},displayName:path.basename(target,extension),id:'6c48a',name:'texture',userData:{...common,imageUuidOrDatabaseUri:uuid} },
      'f9941':{ ver:'1.0.12',importer:'sprite-frame',uuid:uuid+'@f9941',imported:true,files:['.json'],subMetas:{},displayName:path.basename(target,extension),id:'f9941',name:'spriteFrame',userData:{...common,trimType:'none',trimThreshold:1,rotated:false,offsetX:0,offsetY:0,trimX:0,trimY:0,width,height,rawWidth:width,rawHeight:height,borderTop:0,borderBottom:0,borderLeft:0,borderRight:0,imageUuidOrDatabaseUri:uuid+'@6c48a',atlasUuid:'',packable:false} }
    },userData:{type:'sprite-frame',redirect:uuid+'@f9941',hasAlpha:true}},null,2)+'\n');
  }
  const previous=records.findIndex(r=>r.target===target);if(previous>=0)records.splice(previous,1);
  records.push({ source, target, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), output_sha256: crypto.createHash('sha256').update(result).digest('hex') });
}
await bind('assets/generated/hearthwood/shop-interior-v2.png','assets/resources/ui/shop-interior.png');
const blacksmithArt=JSON.parse(await fs.readFile(path.join(root,'docs/art/blacksmith-art-v1.json'),'utf8'));
for(const record of blacksmithArt.records)await bind(record.path,'assets/resources/'+record.binding+'.png');
await bind('assets/generated/hearthwood/satchel-shell-v1.png','assets/resources/ui/satchel.png');
await bind('assets/generated/hearthwood/commission-wood-v1.png','assets/resources/ui/notice-timber.png');
await bind('assets/derived/panel-materials/notice-paper.png','assets/resources/ui/notice-paper.png');
const panelMaterials=JSON.parse(await fs.readFile(path.join(root,'docs/art/cocos-panel-materials-v1.json'),'utf8'));
for(const record of panelMaterials.records){const name=path.basename(record.path,'.png');if(name!=='notice-paper')await bind(record.path,'assets/resources/ui/'+name+'.png');await bind(record.source,'assets/resources/ui/'+name+'-web.webp');}
await bind('assets/runtime/hearthwood/detail/items/journal.png','assets/resources/items/journal.png');
const inventoryArt=JSON.parse(await fs.readFile(path.join(root,'docs/art/cocos-inventory-icons-v1.json'),'utf8'));
const equipmentIds=new Set(JSON.parse(await fs.readFile(path.join(root,'backend/app/equipment_catalog.json'),'utf8')).equipment.map(g=>g.id));
// These four old64px bindings are superseded by96px equipment artwork. Do not
// rewrite their metadata twice, losing Creator's valid import geometry on sync.
for(const record of inventoryArt.records)if(!equipmentIds.has(record.id))await bind(record.path,'assets/resources/items/'+record.id+'.png');
for(const item of ['wooden_chest','reinforced_chest'])await bind('assets/runtime/hearthwood/detail/interiors/chest-closed.png','assets/resources/items/'+item+'.png');
for(const [facility,item] of [['mayo','mayo_machine'],['loom','loom_machine'],['cheese','cheese_press'],['oil','oil_press']])await bind('assets/derived/ranching-v1/facilities/'+facility+'.png','assets/resources/items/'+item+'.png');
await bind('shared/game/protocol.ts', 'assets/scripts/core/protocol.ts');
await bind('assets/runtime/hearthwood/world-map-terrain-v1.png','assets/resources/atlas/terrain.png');
for(const id of ['lia','noah','mira','adu','lanya'])await bind(`assets/runtime/hearthwood/residents/${id}-portrait.png`,`assets/resources/atlas/${id}.png`);
for (const name of ['currency', 'interaction', 'stamina', 'residents', 'villageIntro', 'story', 'navigation', 'appearances', 'client', 'clock', 'features', 'swordMotion', 'combatMotion', 'caveArt', 'caveView', 'localScene', 'sceneLayout', 'lifeJournalDates', 'lifeRecords', 'dossier', 'nextDeparture', 'guidance', 'continuation', 'places', 'atlas', 'cropCatalog', 'gearCatalog', 'ranchCatalog', 'ranching', 'construction', 'toolCatalog', 'tools', 'farming', 'items', 'inventory', 'preferences']) {
  await bind(`shared/game/${name}.ts`, `assets/scripts/core/${name}.ts`, b => b.toString().replaceAll('"../types"', '"./protocol"').replace('"../stores/game"', '"./clock"'));
}
const art = ['home','workshop','library','guild','oak','oak-alt','fir','birch','shrub','board','wood','stone','bridge','grass','grass-patch','bank-stones','fence','bench','lantern','actor-0'];
for (const name of art) await bind(`assets/runtime/hearthwood/village/${name}.png`, `assets/resources/village/${name}.png`);
await bind('assets/runtime/hearthwood/market/shop.png','assets/resources/village/shop.png');
await bind('assets/runtime/hearthwood/market/counter.png','assets/resources/interiors/market-counter.png');
for (const id of ['lia','noah','mira','adu','lanya']) await bind(`assets/runtime/hearthwood/residents/${id}-actor.png`, `assets/resources/village/${id}-actor.png`);
for (const id of ['wood','stone','seed','crop','plank','backpack','gold']) await bind(`assets/runtime/hearthwood/detail/items/${id}.png`, `assets/resources/items/${id}.png`);
for (const id of ['notice','bookcase','workbench','desk-88','desk-96','bed','hearth','planter','barrel','anvil','rug','window','chest-open','book','lantern','wall','chest-closed']) await bind(`assets/runtime/hearthwood/detail/interiors/${id}.png`, `assets/resources/interiors/${id}.png`);
for (let i=1;i<6;i++) await bind(`assets/runtime/hearthwood/village/actor-${i}.png`, `assets/resources/village/actor-${i}.png`);
// Reuse actual scene sprite inputs and reproducibly baked Web terrain/rugs.
const sceneArt=JSON.parse(await fs.readFile(path.join(root,'docs/art/local-scene-art-v1.json'),'utf8'));
for(const source of [...sceneArt.existing_sprite_inputs,...sceneArt.records.map(r=>r.path)]){
 const relative=source.startsWith('assets/derived/local-scenes/')?'local-scenes/'+path.basename(source):source.split('assets/runtime/hearthwood/')[1];
 const target='assets/resources/'+(relative.startsWith('local-scenes/')?'scenes/'+path.basename(relative):relative.startsWith('detail/interiors/')?'interiors/'+path.basename(relative):relative==='market/counter.png'?'interiors/market-counter.png':relative==='market/shop.png'?'village/shop.png':relative);
 if(!records.some(r=>r.target===target))await bind(source,target);
}
const lossless=JSON.parse(await fs.readFile(path.join(root,'docs/art/cocos-lossless-textures-v1.json'),'utf8'));
if(lossless.records.length!==1||lossless.records[0].source!=='assets/derived/local-scenes/terrain.png'||lossless.records[0].decoded_rgba_equal!==true)throw Error('Expected the reviewed single lossless terrain derivative.');
await bind(lossless.records[0].path,'assets/resources/scenes/terrain-web.webp');
const farmingArt=JSON.parse(await fs.readFile(path.join(root,'docs/art/farming-art-v1.json'),'utf8'));
for(const record of farmingArt.records)await bind(record.path,'assets/resources/'+record.binding+'.png');
const toolArt=JSON.parse(await fs.readFile(path.join(root,'docs/art/tool-art-v1.json'),'utf8'));
for(const r of toolArt.records)await bind(r.path,'assets/resources/'+r.binding+'.png');
const equipmentArt=JSON.parse(await fs.readFile(path.join(root,'docs/art/equipment-art-v1.json'),'utf8'));
for(const r of equipmentArt.records)await bind(r.path,'assets/resources/'+r.binding+'.png');
const swordArt=JSON.parse(await fs.readFile(path.join(root,'docs/art/sword-motion-v1.json'),'utf8'));
for(const r of swordArt.records)await bind(r.path,'assets/resources/'+r.binding+'.png');
const ranchArt=JSON.parse(await fs.readFile(path.join(root,'docs/art/ranching-art-v1.json'),'utf8'));
for(const r of [...ranchArt.records,...ranchArt.aliases])await bind(r.path,'assets/resources/'+r.binding+'.png');
await fs.writeFile(path.join(project, 'asset-bindings.json'), JSON.stringify({schema_version:1,note:'Canonical shared/game logic and cave presentation; existing PNGs and reproducible scene derivatives, see tasks35–38.',records},null,2)+'\n');
console.log(`Bound ${records.length} canonical sources and unchanged art files.`);
