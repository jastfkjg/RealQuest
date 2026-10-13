"""Rebuild two original 16px semantic icons. No source artwork is modified."""
from pathlib import Path
import argparse
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'frontend/public/assets/hearthwood/items'
OUT.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check', action='store_true')
args = parser.parse_args()
def save_icon(image, name):
    path = OUT / f'{name}.png'
    if args.check:
        with Image.open(path) as existing:
            assert existing.size == image.size and existing.convert('RGBA').tobytes() == image.tobytes(), path
    else:
        image.save(path)

# Two bark-covered logs with light cut ends and visible growth rings.
im = Image.new('RGBA', (16, 16)); d = ImageDraw.Draw(im)
for y, x in [(2, 4), (8, 1)]:
    d.polygon([(x+3,y),(x+10,y),(x+12,y+2),(x+12,y+5),(x+9,y+7),(x+2,y+7),(x,y+5),(x,y+2)], fill='#493b2b')
    d.rectangle((x+3,y+1,x+10,y+5), fill='#91633d')
    d.line((x+4,y+2,x+10,y+2), fill='#bc8951')
    d.line((x+5,y+5,x+10,y+5), fill='#67452f')
    d.polygon([(x+1,y+2),(x+2,y+1),(x+4,y+1),(x+5,y+2),(x+5,y+5),(x+4,y+6),(x+2,y+6),(x+1,y+5)], fill='#e3c791')
    d.rectangle((x+2,y+2,x+3,y+4), fill='#a87d48')
    d.point((x+3,y+3), fill='#f5e0aa')
save_icon(im, 'wood')

# Open seed pouch: loose grains, tied mouth and a sprout on the fabric.
im = Image.new('RGBA', (16, 16)); d = ImageDraw.Draw(im)
d.polygon([(5,5),(10,5),(11,7),(13,10),(13,13),(11,15),(3,15),(1,13),(2,9),(4,7)], fill='#55482f')
d.polygon([(5,6),(9,6),(10,8),(12,10),(12,13),(10,14),(4,14),(2,12),(3,9)], fill='#d6bd82')
d.line((4,8,10,8), fill='#916d43'); d.line((3,11,3,12), fill='#f0deb1')
d.rectangle((5,3,9,5), fill='#73572f')
for x,y in [(5,2),(8,2),(10,3),(13,10),(14,13)]:
    d.rectangle((x,y,x+1,y+1), fill='#a77c3f'); d.point((x,y), fill='#ead095')
d.line((7,10,7,13), fill='#3f6348')
d.line((7,11,5,10), fill='#3f6348'); d.line((8,10,9,9), fill='#3f6348')
save_icon(im, 'seed')
print('Verified' if args.check else 'Built', 'original wood/seed 16×16 RGBA icons; source pack unchanged.')
