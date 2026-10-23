"""Coordinate-based home terrain. IDs are stable; undeveloped grass is not an object."""
import math
import re

def overlaps(a, b):
    x,y,w,h=a; rx,ry,rw,rh=b
    return x < rx+rw and x+w > rx and y < ry+rh and y+h > ry

def point_segment(px, py, a, b):
    ax,ay=a; bx,by=b; dx,dy=bx-ax,by-ay
    t=max(0,min(1,((px-ax)*dx+(py-ay)*dy)/max(1,dx*dx+dy*dy)))
    return math.hypot(px-ax-t*dx,py-ay-t*dy)

def segment_box(a, b, box):
    """Minimum segment/rectangle distance, including segments crossing its interior."""
    x,y,w,h=box; lo,hi=0.,1.
    for start,delta,lower,upper in [(a[0],b[0]-a[0],x,x+w),(a[1],b[1]-a[1],y,y+h)]:
        if delta == 0:
            if not lower <= start <= upper: lo,hi=1,0;break
        else:
            t0,t1=sorted(((lower-start)/delta,(upper-start)/delta));lo=max(lo,t0);hi=min(hi,t1)
    if lo<=hi:return 0
    return min(*[point_segment(px,py,a,b) for px,py in [(x,y),(x+w,y),(x,y+h),(x+w,y+h)]],
               *[math.hypot(max(x-px,0,px-x-w),max(y-py,0,py-y-h)) for px,py in (a,b)])

def cell_at(land, x, y):
    if any(isinstance(v,bool) or not isinstance(v,(int,float)) or abs(v)>10000 or not math.isfinite(v) for v in (x,y)):
        return None
    ox,oy=land['origin'];step=land['step']
    col,row=math.floor((x-ox)/step+.5),math.floor((y-oy)/step+.5)
    x,y=ox+col*step,oy+row*step
    old=next((o for o in land['legacy'] if o['x']==x and o['y']==y),None)
    return {'id':old['id'] if old else f'field_{col}_{row}','kind':'soil','name':'草地','x':x,'y':y}

def cell_by_id(land, key):
    if not isinstance(key,str):return None
    old=next((o for o in land['legacy'] if o['id']==key),None)
    if old:return {**old,'kind':'soil','name':'草地'}
    match=re.fullmatch(r'field_(-?\d{1,3})_(-?\d{1,3})',key)
    if not match:return None
    col,row=map(int,match.groups());ox,oy=land['origin'];cell=cell_at(land,ox+col*land['step'],oy+row*land['step'])
    return cell if cell['id']==key else None

def soil_reason(land, cell):
    x,y=cell['x'],cell['y'];box=[x-21,y-18,42,36];rx,ry,w,h=land['bounds']
    if box[0]<rx or box[1]<ry or x+21>rx+w or y+18>ry+h:return '只能在家园范围内的草地开垦'
    if any(overlaps(box,b) for b in land['blocked']):return '建筑、树干、水面和设施不能开垦'
    for points,width in land['roads']:
        if any(segment_box(a,b,box)<=width/2+2 for a,b in zip(points,points[1:])):return '小路不能开垦，请选择草地'
    return None

def available_cells(land):
    ox,oy=land['origin'];rx,ry,w,h=land['bounds'];step=land['step']
    for row in range(math.floor((ry-oy)/step),math.ceil((ry+h-oy)/step)+1):
        for col in range(math.floor((rx-ox)/step),math.ceil((rx+w-ox)/step)+1):
            cell=cell_at(land,ox+col*step,oy+row*step)
            if not soil_reason(land,cell):yield cell
