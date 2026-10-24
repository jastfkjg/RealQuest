"""Pack generated integrated tool actors, preserving source poses and colors.

Only alpha thresholding, component selection, common-foot anchoring and nearest
sampling are applied. No body part, grip, tool or action is painted by Python.
"""
import argparse,hashlib,json,colorsys
from io import BytesIO
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path('assets/generated/hearthwood/tool-poses-v1')
OUT=Path('assets/derived/tool-poses-v1')
MANIFEST=Path('docs/art/tool-actor-art-v1.json')
TOOLS=('hoe','axe','pickaxe','watering_can')
DIRECTIONS=('south','north','west','east')
STAGES=('ready','windup','contact','follow','walk_a','walk_b')
# Selected real poses only. Do not bind the can-above-head source windup.
# Source walk keys missing the tool are explicitly replaced with a valid ready
# transition, retaining the valid stride key rather than an empty-handed frame.
OVERRIDES={('axe',1,2,5):0,('axe',1,3,5):0,('pickaxe',1,2,5):0,('hoe',2,3,5):0,('axe',4,0,3):2}

def sha(data):return hashlib.sha256(data).hexdigest()
def png(im):
 b=BytesIO();im.save(b,format='PNG');return b.getvalue()
def components(mask):
 w,h=mask.size;pix=mask.load();seen=set();parts=[]
 for y in range(h):
  for x in range(w):
   if not pix[x,y] or (x,y) in seen:continue
   queue=[(x,y)];seen.add((x,y));part=[]
   while queue:
    xx,yy=queue.pop();part.append((xx,yy))
    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)):
     nx,ny=xx+dx,yy+dy
     if 0<=nx<w and 0<=ny<h and pix[nx,ny] and (nx,ny) not in seen:seen.add((nx,ny));queue.append((nx,ny))
   parts.append({'pixels':part,'bounds':(min(x for x,y in part),min(y for x,y in part),1+max(x for x,y in part),1+max(y for x,y in part))})
 return parts

def distance(a,b):
 return max(a[0]-b[2],b[0]-a[2],0)**2+max(a[1]-b[3],b[1]-a[3],0)**2

def feet(im,rect,mask):
 # Measured broad leather boot regions, excluding thin wooden shafts and small
 # blade bindings. Support midpoint includes both boots even if one is lifted.
 x0,y0,x1,y1=rect;warm=Image.new('L',(x1-x0,y1-y0));px=warm.load()
 for y in range(y0+int((y1-y0)*.67),y1):
  for x in range(x0,x1):
   r,g,b,a=im.getpixel((x,y))
   if mask.getpixel((x,y)) and 22<r<190 and r>g*1.22 and g>b*1.22:px[x-x0,y-y0]=255
 choices=[]
 for part in components(warm):
  bx,by,bw,bh=part['bounds'];w,h=bw-bx,bh-by;n=len(part['pixels'])
  if w>=12 and h>=7 and n>=70 and n/(w*h)>=.24 and bh>=(y1-y0)*.75:choices.append(part)
 assert choices,('No measured boot support',rect)
 # Larger broad boot pieces outrank tiny leather bindings; retain both feet.
 choices=sorted(choices,key=lambda part:len(part['pixels']),reverse=True)
 largest=len(choices[0]['pixels']);choices=[p for p in choices if len(p['pixels'])>=largest*.18][:4]
 xleft=min(p['bounds'][0] for p in choices);xright=max(p['bounds'][2] for p in choices);bottom=max(p['bounds'][3] for p in choices)
 return ((xleft+xright)/2+x0,bottom+y0)

def support_foot(im,rect,mask,expected):
 # Generated cells share a row's ground baseline. Inspect solid sole spans near
 # that line; choose the two supports nearest the body, not a distant blade.
 x0,y0,x1,y1=rect;ex,ey=expected;top=max(y0,round(ey)-14);bottom=min(y1,round(ey)+5)
 occupied=[]
 for x in range(x0,x1):
  count=0
  for y in range(top,bottom):
   r,g,b,a=im.getpixel((x,y))
   if mask.getpixel((x,y)) and r>20 and r>g*1.2 and g>b*1.2:count+=1
  if count>=3:occupied.append(x)
 spans=[];start=previous=None
 for x in occupied+[99999]:
  if previous is not None and x>previous+1:
   if previous-start>=9:spans.append((start,previous+1))
   start=None
  if start is None:start=x
  previous=x
 assert spans,('No sole spans',rect,expected)
 spans=sorted(spans,key=lambda v:abs((v[0]+v[1])/2-ex))[:2]
 left=min(v[0] for v in spans);right=max(v[1] for v in spans)
 ground=max(y+1 for a,b in spans for x in range(a,b) for y in range(top,bottom) if mask.getpixel((x,y)))
 return ((left+right)/2,ground)

def build(partial=False):
 outputs={};records=[];sources=[];poses=[];allframes={}
 for appearance in range(6):
  for tool in TOOLS:
   path=SOURCE/f'{tool}-{appearance}.png'
   if not (ROOT/path).exists():
    if partial:continue
    raise AssertionError(f'Missing generated source: {path}')
   im=Image.open(ROOT/path).convert('RGBA');assert im.size==(1536,1024),(path,im.size)
   alpha=im.getchannel('A').point(lambda a:255 if a>=160 else 0);parts=components(alpha)
   mains=[p for p in parts if len(p['pixels'])>3500];assert len(mains)==24,(path,len(mains))
   grid={}
   for part in mains:
    rect=part['bounds'];col=int((rect[0]+rect[2])/2/256);row=int((rect[1]+rect[3])/2/256)
    assert (row,col) not in grid,(path,row,col)
    grid[row,col]=part
   assert set(grid)=={(row,col) for row in range(4) for col in range(6)}
   masks={}
   for key,part in grid.items():
    m=Image.new('L',im.size);px=m.load()
    for x,y in part['pixels']:px[x,y]=255
    masks[key]=m
   # Retain nearby disconnected water droplets; discarded speckles cannot add
   # another cell's limb. All selection is deterministic and recorded.
   if tool=='watering_can':
    for part in parts:
     if 2<=len(part['pixels'])<=3500:
      key,near=min(grid.items(),key=lambda pair:distance(part['bounds'],pair[1]['bounds']))
      if distance(part['bounds'],near['bounds'])<=55**2:
       px=masks[key].load()
       for x,y in part['pixels']:px[x,y]=255
   sheet=Image.new('RGBA',(672,448));packed=[]
   for row,direction in enumerate(DIRECTIONS):
    standing=grid[row,0]['bounds'];foot_ready=feet(im,standing,masks[row,0]);scale=54/(foot_ready[1]-standing[1])
    for col,stage in enumerate(STAGES):
     source_col=OVERRIDES.get((tool,appearance,row,col),3 if tool=='watering_can' and col==1 else col)
     part=grid[row,source_col];mask=masks[row,source_col];rect=mask.getbbox();anchor=support_foot(im,part['bounds'],mask,(foot_ready[0]+source_col*256,foot_ready[1]))
     cut=im.crop(rect);cut.putalpha(mask.crop(rect));clean=Image.new('RGBA',cut.size);clean.alpha_composite(cut)
     target=tuple(round(x*scale) for x in clean.size);cut=clean.resize(target,Image.Resampling.NEAREST)
     offset=(round(56-(anchor[0]-rect[0])*scale),round(96-(anchor[1]-rect[1])*scale))
     assert min(offset)>=0 and offset[0]+cut.width<=112 and offset[1]+cut.height<=112,(path,row,col,offset,target)
     frame=Image.new('RGBA',(112,112));frame.alpha_composite(cut,offset);sheet.alpha_composite(frame,(col*112,row*112));packed.append(frame)
     poses.append(dict(appearance=appearance,tool=tool,direction=direction,stage=stage,source=str(path),source_column=source_col,crop=list(rect),source_boot_anchor=list(anchor),scale=scale,destination_offset=list(offset),visible_bounds=list(frame.getbbox()),atlas_rect=[col*112,row*112,112,112]))
   dest=OUT/f'{tool}-{appearance}.png';data=png(sheet);outputs[dest]=data;prompt=SOURCE/f'{tool}-{appearance}.prompt.txt'
   sources.append(dict(path=str(path),sha256=sha((ROOT/path).read_bytes()),width=1536,height=1024,prompt_path=str(prompt),prompt_sha256=sha((ROOT/prompt).read_bytes())))
   records.append(dict(path=str(dest),binding=f'tool-actors/{tool}-{appearance}',appearance=appearance,tool=tool,width=672,height=448,sha256=sha(data),source=str(path),source_sha256=sources[-1]['sha256'],prompt_path=str(prompt),prompt_sha256=sources[-1]['prompt_sha256']))
   allframes[tool,appearance]=packed
   contact=Image.new('RGBA',(1424,940),'#e5dfca');d=ImageDraw.Draw(contact)
   for col,stage in enumerate(STAGES):d.text((66+col*224,8),stage,fill='#293b30')
   for row,direction in enumerate(DIRECTIONS):
    d.text((6,70+row*224),direction,fill='#293b30')
    for col in range(6):
     x,y=64+col*224,28+row*224;d.line((x,y+192,x+223,y+192),fill='#baa98b');contact.alpha_composite(packed[row*6+col].resize((224,224),Image.Resampling.NEAREST),(x,y))
   outputs[Path(f'output/tool-poses-132/contact/{tool}-{appearance}.png')]=png(contact)
 if not partial:
  draft=Path('docs/art/references/tool-poses-v1/axe4-repair-draft.png');draft_prompt=draft.with_suffix('.prompt.txt')
  sources.append(dict(path=str(draft),sha256=sha((ROOT/draft).read_bytes()),runtime_input=False,prompt_path=str(draft_prompt),prompt_sha256=sha((ROOT/draft_prompt).read_bytes()),review='Targeted repair did not correct west windup and duplicated strides. Rejected as runtime input; valid east row is mirrored natively for axe appearance4, and south follow uses actual contact key.'))
  manifest=dict(schema_version=1,created_on='2026-10-24',status='runtime_candidate_owner_review_pending',creator='OpenAI built-in image_gen; original RealQuest artwork',license='Original project-generated sources; existing project-owned character/tool/sword references only; no third-party or font added',script='tools/build_tool_actor_art.py',script_sha256=sha(Path(__file__).read_bytes()),sources=sources,records=records,references=[dict(path=str(p),sha256=sha((ROOT/p).read_bytes())) for p in [*[Path(f'assets/runtime/hearthwood/village/actor-{a}.png') for a in range(6)],*[Path(f'assets/derived/tools-v1/tools/{k}-0.png') for k in TOOLS],Path('docs/art/references/sword-motion-preview-v1/preview.png')]],processing='Alpha>=160; measured connected silhouettes (including cross-cell bounds), nearby can water drops; per-direction fixed standing body54px; boot support anchor(56,96); nearest-neighbor to112px cells. No pose painting, source recolor, body-part compositing or tool overlays.',frame_size=[112,112],sheet_size=[672,448],foot_anchor=[56,96],world_canvas=[224/3,224/3],world_scale=2/3,directions=DIRECTIONS,stages=STAGES,poses=poses,runtime_direction_overrides=[dict(tool='axe',appearance=4,facing='west',source_direction='east',native_flip_x=True,reason='Generated west windup/walk face east; reuse the valid complete east row with native sprite mirroring.')],selection_notes='Overhead watering source windups excluded, using upright return key. Explicit missing-tool walking keys use their valid ready transition; original sources are immutable.',overrides=[dict(tool=k[0],appearance=k[1],direction=k[2],column=k[3],source_column=v) for k,v in OVERRIDES.items()],limits=['Whole-body tool geometry is shared across upgrade tiers; saved tier/material names and existing unique inventory icons remain authoritative.','Limited six-key animation; no invented high-frame-count motion or user approval claimed.'])
  outputs[MANIFEST]=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode()
 return outputs,allframes

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check',action='store_true');parser.add_argument('--partial',action='store_true');args=parser.parse_args()
 outputs,frames=build(args.partial)
 for p,data in outputs.items():
  dest=ROOT/p
  if args.check:assert dest.read_bytes()==data,f'Rebuild differs: {p}'
  else:dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
 print(('Verified' if args.check else 'Packed'),len(frames),'integrated tool actor sheets /',len(frames)*24,'cells; source files untouched')
if __name__=='__main__':main()
