import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(project,'../..');
const ownership=spawnSync(process.execPath,[path.join(root,'tools/cocos-sources.mjs'),'--check'],{stdio:'inherit'});
if(ownership.status!==0)process.exit(ownership.status||1);
const bindings=JSON.parse(await fs.readFile(path.join(project,'asset-bindings.json'),'utf8'));
for(const record of bindings.records){
  for(const [file,sha] of [[path.join(root,record.source),record.sha256],[path.join(project,record.target),record.output_sha256]]){
    const hash=crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
    if(hash!==sha)throw new Error('Source/binding drift: '+file);
  }
}
const editor=process.env.COCOS_CREATOR;
if(!editor)throw new Error('COCOS_CREATOR is required; check uses actual bundled Cocos declarations.');
const declarations=path.resolve(path.dirname(editor),'../Resources/resources/3d/engine/bin/.declarations/cc.d.ts');
const config={compilerOptions:{target:'ES2022',module:'ESNext',moduleResolution:'bundler',strict:true,skipLibCheck:true,noEmit:true,experimentalDecorators:true,useDefineForClassFields:false},files:[declarations],include:[path.join(project,'assets/scripts/**/*.ts')]};
const target=path.join(root,'output/cocos-migration/typecheck.json');await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,JSON.stringify(config));
const result=spawnSync(process.execPath,[createRequire(new URL('../../../package.json',import.meta.url)).resolve('typescript/bin/tsc'),'--project',target],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status||1);
console.log(`${bindings.records.length} source bindings and real Cocos types verified.`);
