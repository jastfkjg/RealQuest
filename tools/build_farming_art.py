"""Reproducible crop-sheet slicing. Original generated sheets stay unmodified."""
import hashlib,json,sys
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
root=Path(__file__).resolve().parents[1]
hashfile=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
crops=json.loads((root/'backend/app/crops.json').read_text())
records=[];sources=[];contact=Image.new('RGBA',(768,12*112),(244,239,222,255))
for sheet in range(3):
 source=root/f'assets/generated/hearthwood/farming-v1/sheet-{sheet}.png';im=Image.open(source).convert('RGBA');assert im.size==(1536,1024)
 sources.append({'path':str(source.relative_to(root)),'sha256':hashfile(source),'width':im.width,'height':im.height,'prompt':str(source.relative_to(root)).replace('.png','.prompt.txt'),'prompt_sha256':hashfile(source.with_suffix('.prompt.txt'))})
 for row in range(4):
  c=crops[sheet*4+row]
  for col in range(6):
   xs=[0,288,512,784,1024,1308,1536];ys=([0,256,512,768,1024] if sheet==0 else [0,280,492,750,1024] if sheet==1 else [0,272,512,768,1024]);rect=(xs[col],ys[row],xs[col+1],ys[row+1]);cell=im.crop(rect)
   # Remove only low-alpha generated matte; retain source shape and pixel colors.
   alpha=cell.getchannel('A').point(lambda a:255 if a>=160 else 0);cell.putalpha(alpha)
   if col not in (0,5):
    # Generated spacing varies slightly: discard disconnected neighboring-cell slivers.
    w,h=alpha.size;pixels=alpha.load();seen=set();components=[]
    for yy in range(h):
     for xx in range(w):
      if not pixels[xx,yy] or (xx,yy) in seen:continue
      pending=[(xx,yy)];seen.add((xx,yy));part=[]
      while pending:
       ax,ay=pending.pop();part.append((ax,ay))
       for nx,ny in ((ax-1,ay),(ax+1,ay),(ax,ay-1),(ax,ay+1)):
        if 0<=nx<w and 0<=ny<h and pixels[nx,ny] and (nx,ny) not in seen:seen.add((nx,ny));pending.append((nx,ny))
      components.append(part)
    largest=max(map(len,components));clean=Image.new('L',(w,h));mask=clean.load()
    for part in components:
     if len(part)==largest:
      for xx,yy in part:mask[xx,yy]=255
    alpha=clean;cell.putalpha(alpha)
   bounds=alpha.getbbox();assert bounds,(c['id'],col,bounds)
   if col in (0,5):
    sprite=cell.crop(bounds);sprite.thumbnail((60,60),Image.Resampling.NEAREST);out=Image.new('RGBA',(64,64));out.alpha_composite(sprite,((64-sprite.width)//2,(64-sprite.height)//2));key=c['seed'] if col==0 else c['item'];relative=f'assets/derived/farming-v1/items/{key}.png';target='items/'+key
   else:
    sprite=cell.crop(bounds);sprite=sprite.resize((round(sprite.width*.34),round(sprite.height*.34)),Image.Resampling.NEAREST);out=Image.new('RGBA',(96,96));out.alpha_composite(sprite,((96-sprite.width)//2,86-sprite.height));key=c['id']+'-'+str(col);relative=f'assets/derived/farming-v1/plants/{key}.png';target='farming/'+key
   dest=root/relative;dest.parent.mkdir(parents=True,exist_ok=True)
   if '--check' in sys.argv:
    from io import BytesIO
    b=BytesIO();out.save(b,format='PNG');assert dest.read_bytes()==b.getvalue(),relative
   else:out.save(dest)
   records.append({'crop_id':c['id'],'role':['seed','sprout','young','growing','mature','produce'][col],'source':str(source.relative_to(root)),'crop':list(rect),'alpha_bounds':list(bounds),'alpha_threshold':160,'component_rule':'largest-connected-plant' if col not in (0,5) else 'all-icon-components','path':relative,'binding':target,'width':out.width,'height':out.height,'sha256':hashfile(dest)})
   preview=out.resize((96,96),Image.Resampling.NEAREST);contact.alpha_composite(preview,(col*128+16,(sheet*4+row)*112))
manifest={'schema_version':1,'creator':'OpenAI built-in image_gen; original RealQuest art','license':'Original project-generated artwork; no third-party sprites','processing':'six columns by four rows; alpha>=160; nearest-neighbor; source-pixel cell alignment retained for plant scale','sources':sources,'script':'tools/build_farming_art.py','script_sha256':hashfile(Path(__file__)),'records':records}
if '--check' not in sys.argv:
 (root/'docs/art/farming-art-v1.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 (root/'output/farming-120').mkdir(parents=True,exist_ok=True);contact.save(root/'output/farming-120/art-contact.png')
print('Verified' if '--check' in sys.argv else 'Built',len(records),'crop sprites')
