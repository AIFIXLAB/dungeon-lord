# รวม sprite เป็น atlas + ย่อภาพห้อง
import json, glob, os
from PIL import Image
OUT = '/home/claude/dungeon-lord/assets'
os.makedirs(f'{OUT}/sprites', exist_ok=True); os.makedirs(f'{OUT}/rooms', exist_ok=True)
meta = {}
for f in ['meta_partial.json', 'meta_mon.json', 'meta_grid.json']: meta.update(json.load(open(f)))
meta = {k: v for k, v in meta.items() if os.path.exists(f'out/{k}.png') and k != 'mon_blue_drake'}
def pack(keys, name, width=2048):
    ims = [(k, Image.open(f'out/{k}.png')) for k in keys]
    ims.sort(key=lambda t: -t[1].height)
    x = y = rowh = 0; pos = {}
    for k, im in ims:
        if x + im.width + 1 > width: x = 0; y += rowh + 1; rowh = 0
        pos[k] = [x, y, im.width, im.height]; x += im.width + 1; rowh = max(rowh, im.height)
    H = y + rowh
    sheet = Image.new('RGBA', (width, H), (0, 0, 0, 0))
    for k, im in ims: sheet.paste(im, tuple(pos[k][:2]))
    sheet.save(f'{OUT}/sprites/{name}.webp', lossless=True, method=6)
    return {k: [name] + v for k, v in pos.items()}
atlas = {}
atlas.update(pack([k for k in meta if k.startswith('hero_')], 'heroes'))
atlas.update(pack([k for k in meta if k.startswith('mon_')], 'monsters'))
atlas.update(pack([k for k in meta if k.startswith('boss_')], 'bosses'))
json.dump(atlas, open(f'{OUT}/sprites/atlas.json', 'w'), separators=(',', ':'))
for f in sorted(glob.glob('/tmp/claude-0/-home-claude/c5d78efb-2ae2-508f-900b-8f52a4704343/scratchpad/rooms/*.png')):
    im = Image.open(f).convert('RGBA'); bb = im.getbbox(); im = im.crop(bb)
    im.resize((768, 768), Image.LANCZOS).save(f'{OUT}/rooms/{os.path.basename(f)[:-4].lower()}.webp', quality=92)
print(len(atlas))
