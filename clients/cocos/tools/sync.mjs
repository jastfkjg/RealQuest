// Reproducible bindings: original Web sources and artwork are never modified.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(project, '../..');
const records = [];
async function bind(source, target, transform = x => x) {
  const bytes = await fs.readFile(path.join(root, source));
  const dest = path.join(project, target);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const result = transform(bytes);
  await fs.writeFile(dest, result);
  if (target.endsWith('.png')) {
    const hex = crypto.createHash('sha256').update('realquest-cocos/' + target).digest('hex').slice(0,32);
    const uuid = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    const common = { wrapModeS: 'clamp-to-edge', wrapModeT: 'clamp-to-edge', minfilter: 'nearest', magfilter: 'nearest', mipfilter: 'none', premultiplyAlpha: false, anisotropy: 0, isUuid: true };
    await fs.writeFile(dest + '.meta', JSON.stringify({ ver:'1.0.27', importer:'image', imported:true, uuid, files:['.png','.json'], subMetas:{
      '6c48a':{ ver:'1.0.22',importer:'texture',uuid:uuid+'@6c48a',imported:true,files:['.json'],subMetas:{},displayName:path.basename(target,'.png'),id:'6c48a',name:'texture',userData:{...common,imageUuidOrDatabaseUri:uuid} },
      'f9941':{ ver:'1.0.12',importer:'sprite-frame',uuid:uuid+'@f9941',imported:true,files:['.json'],subMetas:{},displayName:path.basename(target,'.png'),id:'f9941',name:'spriteFrame',userData:{...common,trimType:'none',trimThreshold:1,rotated:false,offsetX:0,offsetY:0,trimX:0,trimY:0,width,height,rawWidth:width,rawHeight:height,borderTop:0,borderBottom:0,borderLeft:0,borderRight:0,imageUuidOrDatabaseUri:uuid+'@6c48a',atlasUuid:'',packable:false} }
    },userData:{type:'sprite-frame',redirect:uuid+'@f9941',hasAlpha:true}},null,2)+'\n');
  }
  records.push({ source, target, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), output_sha256: crypto.createHash('sha256').update(result).digest('hex') });
}
await bind('shared/game/protocol.ts', 'assets/scripts/core/protocol.ts');
for (const name of ['interaction', 'stamina', 'residents', 'villageIntro', 'navigation', 'appearances', 'client', 'clock']) {
  await bind(`shared/game/${name}.ts`, `assets/scripts/core/${name}.ts`, b => b.toString().replaceAll('"../types"', '"./protocol"').replace('"../stores/game"', '"./clock"'));
}
const art = ['home','workshop','library','guild','oak','oak-alt','fir','birch','shrub','board','wood','stone','bridge','grass','grass-patch','bank-stones','fence','bench','lantern','actor-0'];
for (const name of art) await bind(`frontend/public/assets/hearthwood/village/${name}.png`, `assets/resources/village/${name}.png`);
await bind('frontend/public/assets/hearthwood/market/shop.png','assets/resources/village/shop.png');
await bind('frontend/public/assets/hearthwood/market/counter.png','assets/resources/interiors/market-counter.png');
for (const id of ['lia','noah','mira']) await bind(`frontend/public/assets/hearthwood/residents/${id}-actor.png`, `assets/resources/village/${id}-actor.png`);
for (const id of ['wood','stone','seed','crop','plank']) await bind(`frontend/public/assets/hearthwood/detail/items/${id}.png`, `assets/resources/items/${id}.png`);
for (const id of ['notice','bookcase','workbench','desk-88','desk-96','bed','hearth','planter','barrel','anvil','rug','window','chest-open','book','lantern','wall','chest-closed']) await bind(`frontend/public/assets/hearthwood/detail/interiors/${id}.png`, `assets/resources/interiors/${id}.png`);
for (let i=1;i<6;i++) await bind(`frontend/public/assets/hearthwood/village/actor-${i}.png`, `assets/resources/village/actor-${i}.png`);
await fs.writeFile(path.join(project, 'asset-bindings.json'), JSON.stringify({schema_version:1,note:'Canonical shared/game modules; unchanged approved artwork, see task35.',records},null,2)+'\n');
console.log(`Bound ${records.length} canonical sources and unchanged art files.`);
