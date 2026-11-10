import numpy as np, json
from PIL import Image
from scipy import ndimage as ndi
from seg import fg_mask
from labels import find_labels
from extract import save_sprite, cluster_rows, A
NAMES = [
 ['Slime','Slime Blue','Slime King','Goblin','Goblin Archer','Goblin Shaman','Wolf','Dire Wolf','Boar','Bat','Giant Bat','Rat','Mushroom','Treant'],
 ['Skeleton','Skeleton Archer','Skeleton Knight','Zombie','Ghoul','Mummy','Wraith','Ghost','Banshee','Lich','Golem','Stone Golem','Iron Golem','Clockwork','Trap Golem'],
 ['Fire Slime','Flame Imp','Lava Beast','Fire Hound','Salamander','Ifrit','Water Slime','Nixie','Sea Serpent','Aqua Beast','Merfolk','Leviathan','Ice Slime','Frost Wolf','Ice Golem','Snowman','Frost Witch','Ice Dragon'],
 ['Wind Sprite','Harpy','Sylph','Thunder Bird','Wyvern','Storm Eagle','Rock Slime','Earth Worm','Ogre','Troll','Earth Golem','Titan','Spark Slime','Thunder Imp','Raiju','Volt Golem','Thunder Beast','Thunder Dragon'],
 ['Dark Slime','Shadow','Dark Elf','Nightmare','Demon','Archdemon','Light Slime','Angel','Holy Knight','Seraph','Unicorn','Holy Dragon','Poison Slime','Plant Monster','Venus Trap','Spore Mage','Toxic Spider','Mandrake'],
 ['Bear','Tiger','Lion','Griffin','Chimera','Manticore','Wyrm','Red Dragon','Blue Dragon','Green Dragon','Black Dragon','Ancient Dragon','Kraken','Behemoth','Phoenix','Bahamut','Demon Lord'],
]
arr = np.array(Image.open(f'{A}/566c4bc4-image.png').convert('RGBA'))
mask = fg_mask(arr)
labs = find_labels(arr, 30, 160, 12, 30)
heads = find_labels(arr, 170, 420, 22, 50)
for (x,y,w,h) in heads: mask[y-3:y+h+3, x-3:x+w+40] = False
bands = cluster_rows(labs, key=lambda b: b[1], gap=40)
bands = [b for b in bands if len(b) >= 5]
print('bands', len(bands), [len(b) for b in bands])
meta = {}
prev_bottom = 0
for bi, band in enumerate(bands):
    ttop = int(np.median([b[1] for b in band])) - 4
    region = np.zeros_like(mask); region[prev_bottom:ttop, :] = mask[prev_bottom:ttop, :]
    prev_bottom = int(np.median([b[1]+b[3] for b in band])) + 2
    lab, n = ndi.label(region)
    objs = ndi.find_objects(lab)
    sizes = ndi.sum(region, lab, range(1, n+1))
    comps = [[s[1].start, s[1].stop, s[0].start, s[0].stop, sizes[i], i+1] for i, s in enumerate(objs) if sizes[i] > 60]
    comps.sort(key=lambda c: c[0])
    groups = []
    for c in comps:
        if groups and c[0] < groups[-1]['x1'] - 4:
            g = groups[-1]; g['x1'] = max(g['x1'], c[1]); g['ids'].append(c[5]); g['size'] += c[4]
        else: groups.append({'x0': c[0], 'x1': c[1], 'ids': [c[5]], 'size': c[4]})
    groups = [g for g in groups if g['size'] > 250]
    names = NAMES[bi]
    if len(groups) != len(names): print('band', bi, 'groups', len(groups), 'names', len(names), [(g['x0'], g['x1'], int(g['size'])) for g in groups])
    for g, nm in zip(groups, names):
        sub = np.isin(lab, g['ids'])
        ys, xs = np.where(sub)
        sid = 'mon_' + nm.lower().replace(' ', '_')
        meta[sid] = {'name': nm, 'size': save_sprite(arr, sub, (xs.min(), ys.min(), xs.max()+1, ys.max()+1), sid, 128)}
json.dump(meta, open('meta_mon.json', 'w'), indent=1)
ims = [Image.open(f'out/{k}.png') for k in meta]
sh = Image.new('RGBA', (18*70, 6*70), (40, 40, 60, 255))
i = 0
for bi, names in enumerate(NAMES):
    for j, nm in enumerate(names):
        k = 'mon_' + nm.lower().replace(' ', '_')
        if k in meta: im = Image.open(f'out/{k}.png'); sh.paste(im, (j*70, bi*70), im)
sh.save('mon_check.png')
print(len(meta))
