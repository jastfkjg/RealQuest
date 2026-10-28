// Rasterize the original project-authored Web SVG symbols; no new icon design.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(new URL('../package.json',import.meta.url)),ts=require('typescript'),{chromium}=require('playwright');
const source='shared/game/items.ts',esbuild=require('esbuild');
const bundled=await esbuild.build({entryPoints:[path.join(root,source)],bundle:true,write:false,format:'esm',platform:'node'});
const {itemDefinitions}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const check=process.argv.includes('--check'),browser=await chromium.launch({headless:true}),records=[];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
try{
 const page=await browser.newPage();
 for(const [id,item] of Object.entries(itemDefinitions).filter(([,v])=>v.icon.startsWith('data:image/svg+xml,'))){
  const data=await page.evaluate(async src=>{const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(img,0,0,64,64);return c.toDataURL('image/png').split(',')[1];},item.icon),bytes=Buffer.from(data,'base64'),output='assets/derived/inventory-icons/'+id+'.png';
  if(check){if(!(await fs.readFile(path.join(root,output))).equals(bytes))throw Error('Icon derivative drift: '+id);}else{await fs.mkdir(path.dirname(path.join(root,output)),{recursive:true});await fs.writeFile(path.join(root,output),bytes);}
  records.push({id,source,source_svg_sha256:hash(decodeURIComponent(item.icon.split(',')[1])),path:output,width:64,height:64,size_bytes:bytes.length,sha256:hash(bytes)});
 }
 const manifest={schema_version:1,note:'Original project SVG item symbols, rendered without design changes. Existing five bitmap icons and satchel remain unchanged.',renderer:'Playwright Chromium '+browser.version(),script:'tools/build_inventory_art.mjs',script_sha256:hash(await fs.readFile(fileURLToPath(import.meta.url))),records};
 const target=path.join(root,'docs/art/cocos-inventory-icons-v1.json');if(check){if((await fs.readFile(target,'utf8'))!==JSON.stringify(manifest,null,2)+'\n')throw Error('Icon provenance drift');}else await fs.writeFile(target,JSON.stringify(manifest,null,2)+'\n');
 console.log(`${check?'Verified':'Built'} ${records.length} original64px SVG-derived item icons; browser closes in finally.`);
}finally{await browser.close();}
