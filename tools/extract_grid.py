import numpy as np, json
from PIL import Image
from scipy import ndimage as ndi
from seg import fg_mask
from extract import save_sprite, A
arr = np.array(Image.open(f'{A}/dc09db9b-image.png').convert('RGBA'))
mask = fg_mask(arr)
lab, n = ndi.label(mask)
sizes = ndi.sum(mask, lab, range(1, n+1))
objs = ndi.find_objects(lab)
comps = [(s, i+1) for i, s in enumerate(objs) if sizes[i] > 400]
# row bands by y center
rows = {}
for s, i in comps:
    cy = (s[0].start + s[0].stop) / 2
    r = int(cy // 128)
    rows.setdefault(r, []).append((s, i))
pick = {(1, 0): 'Goblin Warrior', (1, 3): 'Goblin Champion', (3, 1): 'Giant Mushroom', (0, 4): 'Wisp', (1, 7): 'Fenrir', (0, 2): 'Pink Slime', (2, 5): 'Cave Spider', (2, 3): 'Mimic', (2, 4): 'Mimic Chest', (2, 6): 'Giant Spider', (2, 7): 'Scorpion', (2, 2): 'Eyeball', (2, 8): 'Sand Worm', (2, 9): 'Jelly',
        (0, 8): 'Reaper', (5, 0): 'Imp', (5, 5): 'Dark Knight', (6, 0): 'Lizardman', (6, 3): 'Boar Warrior', (7, 0): 'Fire Drake', (7, 1): 'Blue Drake'}
meta = {}
sh = Image.new('RGBA', (14*70, 8*70), (40, 40, 60, 255))
for r in sorted(rows):
    items = sorted(rows[r], key=lambda t: t[0][1].start)
    # merge overlapping x
    groups = []
    for s, i in items:
        if groups and s[1].start < groups[-1][1] - 4: groups[-1][1] = max(groups[-1][1], s[1].stop); groups[-1][2].append(i)
        else: groups.append([s[1].start, s[1].stop, [i]])
    for c, g in enumerate(groups):
        sub = np.isin(lab, g[2]); ys, xs = np.where(sub)
        nm = pick.get((r, c), f'grid_{r}_{c}')
        sid = 'mon_' + nm.lower().replace(' ', '_')
        meta[sid] = {'name': nm, 'size': save_sprite(arr, sub, (xs.min(), ys.min(), xs.max()+1, ys.max()+1), sid, 128)}
        im = Image.open(f'out/{sid}.png'); sh.paste(im, (c*70, r*70), im)
sh.save('grid_check.png')
json.dump({k: v for k, v in meta.items() if not k.startswith('mon_grid_')}, open('meta_grid.json', 'w'), indent=1)
print({r: len(v) for r, v in rows.items()})
