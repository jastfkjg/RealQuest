"""Check visible text colors against captured texture beneath their DOM ranges.

Run frontend/scripts/character-contrast.mjs first. Pillow reads pixels only;
this does not edit artwork. Evidence is limited to the captured starter view.
"""
import json
import math
import re
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1] / 'output/character-reference'
image = Image.open(root / 'contrast-background.png').convert('RGB')


def luminance(rgb):
    values = [v / 255 for v in rgb]
    values = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in values]
    return sum(a * b for a, b in zip(values, [.2126, .7152, .0722]))


results = []
for sample in json.loads((root / 'contrast-text.json').read_text()):
    foreground = luminance([float(n) for n in re.findall(r'[\d.]+', sample['color'])[:3]])
    x, y, w, h = sample['rect']
    ratios = []
    for py in range(max(0, math.ceil(y)), min(image.height, math.floor(y + h)), 2):
        for px in range(max(0, math.ceil(x)), min(image.width, math.floor(x + w)), 2):
            background = luminance(image.getpixel((px, py)))
            ratios.append((max(foreground, background) + .05) / (min(foreground, background) + .05))
    if ratios:
        results.append({'text': sample['text'], 'minimum_ratio': min(ratios), 'samples': len(ratios)})
(root / 'contrast-result.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
failures = [s for s in results if s['minimum_ratio'] < 4.5]
assert not failures, failures
print(f"PASS {len(results)} text runs against captured texture; minimum {min(s['minimum_ratio'] for s in results):.2f}:1")
