import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {imageDimensions} from './cocos-image-info.mjs';

const projectRoot=fileURLToPath(new URL('../',import.meta.url));
if(Number(process.versions.node.split('.')[0])!==22)throw Error('Cocos source checks require Node22; run nvm use (see .nvmrc).');
const ts=createRequire(new URL('../package.json',import.meta.url))('typescript');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const compare=(a,b)=>a<b?-1:a>b?1:0;
const policyFile='docs/migration/cocos-source-policy.json';
const inventoryFile='docs/migration/cocos-source-inventory.json';
const provenanceFiles=['docs/art/sword-motion-v1.json','docs/art/ranching-art-v1.json','docs/art/equipment-art-v1.json','docs/art/farming-art-v1.json','docs/art/asset-manifest.json','docs/art/village-art-v2.json','docs/art/detail-art-v3.json','docs/art/resident-art-v1.json','docs/art/market-art-v1.json','docs/art/departure-art-v1.json','docs/art/local-scene-art-v1.json','docs/art/cocos-inventory-icons-v1.json','docs/art/cocos-lossless-textures-v1.json','docs/art/cocos-panel-materials-v1.json'];
const isFilePath=value=>typeof value==='string'&&/^(?:assets|docs|clients|shared|tools|backend)\/[\w./-]+\.[\w-]+$/.test(value);

export function sourceOwner(file,policy){
 const owner=policy.owners.find(o=>o.paths?.includes(file)||o.prefix&&file.startsWith(o.prefix));
 if(!owner)throw Error('Unowned Cocos source: '+file);
 return owner.id;
}

export function webReferences(file,text){
 const found=[];
 const add=(value,offset)=>{if(value.includes('frontend/')||value.includes('/assets/hearthwood/'))found.push({file,line:text.slice(0,offset).split('\n').length,literal:value});};
 if(file.endsWith('.py')){
  // Collect static string bodies, including f-string prefixes; skip comments.
  // This deliberately does not claim to evaluate arbitrary Python expressions.
  for(let i=0;i<text.length;i++){
   if(text[i]==='#'){const end=text.indexOf('\n',i);i=end<0?text.length:end;continue;}
   if(text[i]!=="'"&&text[i]!=='"')continue;
   const start=i,q=text[i],delimiter=text.slice(i,i+3)===q.repeat(3)?q.repeat(3):q;let value='';i+=delimiter.length;
   for(;i<text.length&&!text.startsWith(delimiter,i);i++){if(text[i]==='\\'&&i+1<text.length)i++;value+=text[i];}
   add(value,start);i+=delimiter.length-1;
  }
 }else{
  const literals=new Set([ts.SyntaxKind.StringLiteral,ts.SyntaxKind.NoSubstitutionTemplateLiteral,ts.SyntaxKind.TemplateHead,ts.SyntaxKind.TemplateMiddle,ts.SyntaxKind.TemplateTail]);
  const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
  function visit(node){if(literals.has(node.kind))add(node.text,node.getStart(source));ts.forEachChild(node,visit);}
  visit(source);
 }
 return found;
}

export function referenceRole(reference,policy,producers=[]){
 const {file,literal}=reference;
 if(policy.descriptive_web_url_modules.includes(file)&&!literal.includes('frontend/')){
  const valid=file.endsWith('/appearances.ts')?/^\/assets\/hearthwood\/village\/actor-[0-5]\.png$/.test(literal):literal==='/assets/hearthwood/detail/items/';
  if(valid)return 'descriptive-id-url-native-binding-used';
 }
 if(policy.reference_roles[file])return policy.reference_roles[file];
 if(producers.includes(file))return 'original-art-producer-input-or-output';
 if(sourceOwner(file,policy)==='offline-scene-art'&&!literal.includes('frontend/'))return 'offline-original-scene-url';
 throw Error('Unregistered Web reference: '+file+':'+reference.line+' '+literal);
}

async function walk(root,relative){
 const files=[];
 for(const entry of (await fs.readdir(path.join(root,relative),{withFileTypes:true})).sort((a,b)=>compare(a.name,b.name))){
  const file=relative+'/'+entry.name;
  if(entry.isDirectory())files.push(...await walk(root,file));else if(entry.isFile())files.push(file);
 }
 return files;
}

/** Inventories real bindings/provenance; no registry is permitted to replace canonical rules. */
export async function inspectSources(root=projectRoot){
 const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
 const policy=await read(policyFile),bindings=await read('clients/cocos/asset-bindings.json');
 const nodes=new Map(),documents=new Map(),artIndex=new Map(),producerFiles=new Set();
 function safe(file){if(path.isAbsolute(file)||file.split('/').includes('..'))throw Error('Unsafe inventory path: '+file);return file;}
 async function add(file,role,consumer,expected){
  safe(file);let record=nodes.get(file);
  if(!record){const bytes=await fs.readFile(path.join(root,file));record={path:file,owner:sourceOwner(file,policy),sha256:digest(bytes),bytes:bytes.length,roles:new Set(),consumers:new Set(),provenance:new Set(),inputs:new Set()};
   if(/\.(png|webp)$/.test(file))record.dimensions=imageDimensions(bytes,path.extname(file));
   nodes.set(file,record);
  }
  if(expected&&record.sha256!==expected)throw Error('Source/provenance hash drift: '+file);
  record.roles.add(role);if(consumer)record.consumers.add(consumer);return record;
 }
 for(const file of provenanceFiles){
  const data=await read(file);documents.set(file,data);await add(file,'provenance','source-inventory');
  const producer=data.rebuild||data.script;
  if(isFilePath(producer)){producerFiles.add(producer);await add(producer,'art-producer',file,data.rebuild_sha256||data.script_sha256);}
  function index(value,pointer=''){
   if(!value||typeof value!=='object')return;
   for(const [field,hashField] of [['path','sha256'],['runtime_path','sha256'],['source_path','source_sha256'],['source','source_sha256']]){
    const image=value[field],hash=value[hashField];if(!isFilePath(image)||!/\.(png|webp)$/.test(image)||!hash)continue;
    const list=artIndex.get(image)||[];list.push({document:file,pointer,hash,record:value,producer:isFilePath(producer)?producer:null});artIndex.set(image,list);
   }
   for(const [key,child] of Object.entries(value))if(child&&typeof child==='object')index(child,pointer+'/'+key);
  }
  // A scene checksum is an input contract, not the original image's rights or
  // creation provenance. Only the baker's own output rows are provenance here.
  index(file==='docs/art/local-scene-art-v1.json'?{records:data.records}:data);
 }
 await add('backend/app/ranch_catalog.json','authoritative-ranch-catalogue','shared/game/ranchCatalog.ts');
 await add('tools/generate_ranch_catalog.py','catalogue-generator','shared/game/ranchCatalog.ts');
 await add('backend/app/ranching.py','authoritative-ranch-rules','shared/game/ranchCatalog.ts');
 await add('backend/app/equipment_catalog.json','authoritative-equipment-catalogue','shared/game/gearCatalog.ts');
 await add('tools/generate_equipment_catalog.py','catalogue-generator','shared/game/gearCatalog.ts');
 await add('backend/app/equipment.py','authoritative-equipment-rules','shared/game/gearCatalog.ts');
 await add('backend/app/crops.json','authoritative-crop-catalogue','shared/game/cropCatalog.ts');
 await add('tools/generate_crop_catalog.py','catalogue-generator','shared/game/cropCatalog.ts');
 await add(policyFile,'ownership-policy','source-inventory');
 await add('clients/cocos/asset-bindings.json','binding-contract','source-inventory');
 await add('docs/migration/cocos-client-retirement.json','relocation-provenance','source-inventory');
 for(const file of ['package.json','package-lock.json','.nvmrc','.npmrc'])await add(file,'locked-toolchain','source-inventory');
 await add('tools/requirements-art.lock.txt','optional-packer-toolchain','source-inventory');
 for(const file of ['tools/cocos_sqlite_backup.py','tools/test_cocos_sqlite_backup.py','tools/cocos_restore_fixture.py'])await add(file,'sqlite-backup-and-isolated-recovery-tool','tools/cocos-backup.mjs');
 for(const file of ['deploy/cocos/nginx.conf.template','deploy/cocos/Dockerfile.template','deploy/cocos/base-image.json','.github/workflows/ci.yml'])await add(file,'cocos-delivery-input','tools/cocos-release.mjs');
 const copied=[];
 for(const binding of bindings.records){
  const source=await add(binding.source,'canonical-binding-source',binding.target,binding.sha256);
  const target='clients/cocos/'+binding.target,output=await add(target,'generated-copy',binding.source,binding.output_sha256);
  if(source.sha256!==output.sha256)throw Error('Unexpected binding transform: '+binding.source);
  copied.push({source:binding.source,target,sha256:source.sha256});
  if(output.dimensions){
   const meta=await read(target+'.meta'),frame=meta.subMetas?.f9941?.userData,texture=meta.subMetas?.['6c48a']?.userData;
   if(frame?.trimType!=='none'||frame.rawWidth!==output.dimensions[0]||frame.rawHeight!==output.dimensions[1]||frame.width!==frame.rawWidth||frame.height!==frame.rawHeight||texture?.minfilter!=='nearest'||texture?.magfilter!=='nearest'||texture?.mipfilter!=='none'||frame.packable!==false)throw Error('Cocos importer drift: '+target);
   const hex=digest(Buffer.from('realquest-cocos/'+binding.target)).slice(0,32),uuid=`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
   if(meta.uuid!==uuid||meta.subMetas.f9941.uuid!==uuid+'@f9941'||meta.subMetas['6c48a'].uuid!==uuid+'@6c48a')throw Error('Cocos stable importer ID drift: '+target);
   copied[copied.length-1].importer={uuid,frame:meta.subMetas.f9941.uuid,texture:meta.subMetas['6c48a'].uuid,dimensions:output.dimensions,filter:'nearest',trim:'none',packable:false};
  }
 }
 const scene=documents.get('docs/art/local-scene-art-v1.json'),icons=documents.get('docs/art/cocos-inventory-icons-v1.json');
 for(const input of scene.inputs)await add(input.path,'scene-bake-input','tools/build_local_scene_art.mjs',input.sha256);
 await add(scene.layout.path,'scene-layout-output','tools/build_local_scene_art.mjs',scene.layout.sha256);
 for(const record of scene.records)await add(record.path,'scene-raster-output','tools/build_local_scene_art.mjs',record.sha256);
 for(const record of icons.records){await add(record.path,'icon-output','tools/build_inventory_art.mjs',record.sha256);await add(record.source,'icon-definition','tools/build_inventory_art.mjs');}
 // Original packers may process a whole sheet/family even when only a subset
 // is bound by Cocos. Retain every archived input they declare, not just the
 // source of today's selected sprite (e.g. departure cliff/boat sources).
 for(const [document,data] of documents){
  if(document==='docs/art/asset-manifest.json')continue;
  for(const input of data.sources||[])if(isFilePath(input.path))await add(input.path,'original-producer-input',document,input.sha256);
  for(const record of data.records||data.assets||[]){
   for(const [field,hashField] of [['source','source_sha256'],['source_path','source_sha256'],['path','sha256']]){
    const input=record[field];
    if(isFilePath(input)&&(input.startsWith('assets/generated/')||input.startsWith('docs/art/generated/')))await add(input,'original-producer-input',document,record[hashField]);
   }
  }
 }
 // Follow exact existing per-image provenance, including archived source PNGs.
 const pending=[...nodes.values()].filter(n=>n.dimensions&&!n.roles.has('generated-copy')).map(n=>n.path),visited=new Set();
 while(pending.length){const file=pending.shift();if(visited.has(file))continue;visited.add(file);const node=nodes.get(file);
  const provenance=(artIndex.get(file)||[]).filter(p=>p.hash===node.sha256);
  if(!provenance.length)throw Error('Missing matching image provenance: '+file);
  for(const p of provenance){
   node.provenance.add(p.document+'#'+p.pointer);if(p.producer)node.inputs.add(p.producer);
   for(const [field,hashField] of [['source','source_sha256'],['source_path','source_sha256'],['prompt_path','prompt_sha256']]){
    const input=p.record[field];if(!isFilePath(input)||input===file)continue;
    await add(input,/\.(png|webp)$/.test(input)?'archived-art-source':'art-prompt',file,p.record[hashField]);node.inputs.add(input);
    if(/\.(png|webp)$/.test(input))pending.push(input);
   }
   for(const input of p.record.processing_sources||[]){
    if(!isFilePath(input.path)||input.path===file)continue;
    await add(input.path,'archived-art-source',file,input.sha256);node.inputs.add(input.path);pending.push(input.path);
   }
  }
 }
 // Producer manifests also own prompts/layouts not repeated in every packed row.
 for(const [file,data] of documents){
  for(const prompt of data.prompts||[])if(isFilePath(prompt.path))await add(prompt.path,'art-prompt',file,prompt.sha256);
  if(isFilePath(data.actor_layout))await add(data.actor_layout,'packing-layout',file,data.actor_layout_sha256);
 }
 const scope=new Set();
 for(const folder of ['shared/game','clients/cocos/assets/scripts','clients/cocos/tools'])for(const file of await walk(root,folder))if(/\.(ts|mjs|py)$/.test(file))scope.add(file);
 for(const file of await walk(root,'tools'))if(/^tools\/(?:cocos-|test-cocos-)[^/]+\.mjs$/.test(file))scope.add(file);
 for(const file of producerFiles)scope.add(file);
 for(const file of policy.owners.find(o=>o.id==='offline-scene-art').paths)scope.add(file);
 for(const file of policy.owners.find(o=>o.id==='shared-tests').paths)scope.add(file);
 const references=[];
 for(const file of [...scope].sort()){
  await add(file,'inspected-source','source-inventory');
  for(const reference of webReferences(file,await fs.readFile(path.join(root,file),'utf8')))references.push({...reference,role:referenceRole(reference,policy,[...producerFiles])});
 }
 // Legacy descriptive symbols must resolve to the native sprites actually used.
 for(let i=0;i<6;i++)if(!copied.some(r=>r.source==='assets/runtime/hearthwood/village/actor-'+i+'.png'&&r.target==='clients/cocos/assets/resources/village/actor-'+i+'.png'))throw Error('Unbound descriptive appearance '+i);
 for(const id of ['wood','stone','seed','crop','plank','backpack','gold'])if(!copied.some(r=>r.source===(['seed','crop'].includes(id)?'assets/derived/farming-v1/items/'+id+'.png':'assets/runtime/hearthwood/detail/items/'+id+'.png')&&r.target==='clients/cocos/assets/resources/items/'+id+'.png'))throw Error('Unbound descriptive item '+id);
 const records=[...nodes.values()].map(n=>({...n,roles:[...n.roles].sort(),consumers:[...n.consumers].sort(),provenance:[...n.provenance].sort(),inputs:[...n.inputs].sort()})).sort((a,b)=>compare(a.path,b.path));
 return {schema_version:1,policy:policyFile,note:'Generated inventory from actual byte-checked bindings, complete scene read set, existing provenance and scoped static Web references. Cocos is the only client; retired locations are provenance only.',counts:{bindings:copied.length,runtimePNGs:copied.filter(r=>r.target.endsWith('.png')).length,runtimeWebPs:copied.filter(r=>r.target.endsWith('.webp')).length,sharedModules:copied.filter(r=>r.target.endsWith('.ts')).length,sceneInputs:scene.inputs.length,files:records.length,references:references.length},bindings:copied,records,references};
}

async function main(){
 const args=process.argv.slice(2);if(args.some(a=>!['--write','--check'].includes(a))||args.includes('--write')&&args.includes('--check'))throw Error('Usage: node tools/cocos-sources.mjs [--check|--write]');
 const inventory=await inspectSources(),text=JSON.stringify(inventory,null,2)+'\n',target=path.join(projectRoot,inventoryFile);
 if(args.includes('--write'))await fs.writeFile(target,text);else if(await fs.readFile(target,'utf8')!==text)throw Error('Cocos source inventory drift. Inspect changes, then run npm run cocos:sources:write.');
 console.log((args.includes('--write')?'Recorded ':'Verified ')+JSON.stringify(inventory.counts));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
