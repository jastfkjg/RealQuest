"""Reproduce the CC0 gabled-house derivatives. Requires Pillow; never resamples pixels."""
from pathlib import Path
from PIL import Image, ImageDraw
assets = Path(__file__).resolve().parents[1] / 'assets/runtime/ninja-adventure'
source = Image.open(assets / 'village.png').convert('RGBA')
house = source.crop((176,96,256,176))
mask = Image.new('L', house.size)
draw = ImageDraw.Draw(mask)
draw.polygon([(48,0),(0,65),(79,65)],fill=255)
draw.rectangle((10,55,79,79),fill=255)
for palette, name in [((169,79,54),'house-home'),((69,125,139),'house-library')]:
    result = house.copy()
    pixels=result.load()
    for y in range(80):
        for x in range(80):
            r,g,b,a=pixels[x,y]
            if not mask.getpixel((x,y)): pixels[x,y]=(0,0,0,0); continue
            # Moss shades become roof tiles; timber colors remain the source art.
            if g > r*0.89 and r > b*1.25 and g > b*1.6 and a:
                brightness=((r+g)/2-125)*0.65
                pixels[x,y]=tuple(max(0,min(255,int(c+brightness))) for c in palette)+(a,)
    result.save(assets / f'{name}.png')

# Inventory uses actual native pixel assets rather than CSS blocks.
icons=assets / 'icons'
icons.mkdir(exist_ok=True)
clean=Image.open(assets/'tileset.png').convert('RGBA')
clean.crop((16,144,32,160)).save(icons/'wood.png')
stone=clean.crop((16,112,32,128))
for y in range(16):
    for x in range(16):
        r,g,b,a=stone.getpixel((x,y))
        if a:
            value=int(r*0.3+g*0.6+b*0.1)
            stone.putpixel((x,y),(max(0,value-10),value,max(0,value-4),a))
stone.save(icons/'stone.png')
for name in ['seed','crop','plank']:
    im=Image.new('RGBA',(16,16)); d=ImageDraw.Draw(im)
    if name=='seed':
        d.rectangle((3,6,12,14),fill='#705333'); d.rectangle((4,7,11,13),fill='#c59a5d')
        d.rectangle((5,4,10,6),fill='#946841'); d.rectangle((4,6,11,7),fill='#e6bb76')
        d.rectangle((7,9,8,12),fill='#f1d88d'); d.rectangle((6,10,9,11),fill='#f1d88d')
    elif name=='crop':
        d.rectangle((7,2,8,9),fill='#3f723b'); d.rectangle((3,3,7,5),fill='#6f9e46'); d.rectangle((9,1,12,5),fill='#8ab652')
        d.rectangle((4,7,11,12),fill='#d2bd85'); d.rectangle((5,7,10,11),fill='#f0deb0'); d.rectangle((7,12,8,14),fill='#c6ac72')
    else:
        d.rectangle((2,5,13,13),fill='#684a30'); d.rectangle((3,5,12,12),fill='#b68a52')
        d.line((3,7,12,7),fill='#edc889'); d.line((4,10,11,10),fill='#8b643c'); d.line((2,4,13,4),fill='#d8ad69')
    im.save(icons/f'{name}.png')
stone=Image.new('RGBA',(16,16)); d=ImageDraw.Draw(stone)
d.polygon([(4,3),(10,2),(14,6),(14,12),(10,14),(3,13),(1,9)],fill='#52665f')
d.polygon([(4,4),(10,3),(12,6),(8,10),(2,9)],fill='#aeb798')
d.polygon([(9,8),(13,7),(13,12),(9,13)],fill='#748c7b')
d.line((4,5,9,4),fill='#d4d4ae',width=1)
d.rectangle((5,9,6,10),fill='#92bcc1')
stone.save(icons/'stone.png')
coin=Image.new('RGBA',(16,16)); d=ImageDraw.Draw(coin)
for rect in [(5,1,10,14),(2,4,13,11),(3,2,12,13)]: d.rectangle(rect,fill='#99703b')
for rect in [(5,2,10,13),(3,4,12,11),(4,3,11,12)]: d.rectangle(rect,fill='#e8b94d')
d.rectangle((5,4,10,11),fill='#f4d67c'); d.rectangle((5,4,6,9),fill='#fff0a4'); d.rectangle((9,7,10,10),fill='#c5943b')
coin.save(icons/'gold.png')
