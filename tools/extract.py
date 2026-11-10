import numpy as np, json, os, sys
from PIL import Image
from scipy import ndimage as ndi
from seg import fg_mask
from labels import find_labels
A='/mnt/user-data/attachments/c5d78efb-2ae2-508f-900b-8f52a4704343'
OUT='out'; os.makedirs(OUT, exist_ok=True)

def cluster_rows(items, key, gap=30):
    items = sorted(items, key=key); rows=[]; 
    for it in items:
        if rows and key(it) - key(rows[-1][-1]) < gap: rows[-1].append(it)
        else: rows.append([it])
    return rows

def save_sprite(arr, mask, box, name, maxdim):
    x0,y0,x1,y1 = box
    crop = arr[y0:y1, x0:x1].copy()
    m = mask[y0:y1, x0:x1]
    crop[...,3] = np.where(m, 255, 0)
    im = Image.fromarray(crop)
    bb = im.getbbox()
    if not bb: return None
    im = im.crop(bb)
    s = min(1, maxdim / max(im.size))
    if s < 1:
        rgb = im.convert('RGBA').resize((max(1,round(im.width*s)), max(1,round(im.height*s))), Image.LANCZOS)
        a = np.array(rgb); a[...,3] = np.where(a[...,3] > 110, 255, 0); im = Image.fromarray(a)
    im.save(f'{OUT}/{name}.png')
    return im.size

def comp_boxes(mask, minh=20, minw=14):
    lab, n = ndi.label(mask)
    res=[]
    for i,s in enumerate(ndi.find_objects(lab)):
        h=s[0].stop-s[0].start; w=s[1].stop-s[1].start
        if h>=minh and w>=minw: res.append([s[1].start,s[0].start,s[1].stop,s[0].stop, int((lab[s]==i+1).sum())])
    return res

def merge_boxes(boxes, pad=3):
    boxes=[b[:] for b in boxes]; changed=True
    while changed:
        changed=False
        for i in range(len(boxes)):
            for j in range(i+1,len(boxes)):
                a,b=boxes[i],boxes[j]
                if a[0]-pad<=b[2] and b[0]-pad<=a[2] and a[1]-pad<=b[3] and b[1]-pad<=a[3]:
                    boxes[i]=[min(a[0],b[0]),min(a[1],b[1]),max(a[2],b[2]),max(a[3],b[3]),a[4]+b[4]]; boxes.pop(j); changed=True; break
            if changed: break
    return boxes

meta = {}
# ---------------- Bosses (labels under sprites) ----------------
BOSS = ['Slime King','Goblin Warlord','Giant Spider','Stone Golem','Ogre Chieftain','Treant Elder','Manticore','Basilisk','Ice Yeti','Lava Behemoth',
 'Bone Dragon','Vampire Lord','Sea Leviathan','Fire Elemental Lord','Frost Queen','Thunder Colossus','Poison Monarch','Dark Knight Lord','Serpent Hydra','Centaur Warlord',
 'Chimera Lord','Kraken','Phoenix Lord','Ancient Golem','Lich King','Demon General','Storm Dragon','Forest Guardian','Abyssal Worm','Angelic Marshal',
 'Shadow Emperor','Dragon Emperor','Leviathan King','Titan','Time Warden','Void Behemoth','Holy Dragon','Apocalypse Knight','Celestial Seraph','Chaos Hydra',
 'Demon Lord','Goddess of Light','God Dragon','Abyss Lord','Nature Overlord','Elemental Sovereign','Void King','Ragnarok Beast','Primordial Entity','Eternal Dark God']
arr = np.array(Image.open(f'{A}/46607d77-image.png').convert('RGBA'))
mask = fg_mask(arr)
labels = find_labels(arr)
rows = cluster_rows(labels, key=lambda b: b[1])
labels = [b for r in rows for b in sorted(r, key=lambda b: b[0])]
assert len(labels)==50, len(labels)
m2 = mask.copy()
for (x,y,w,h) in labels: m2[y-2:y+h+2, x-2:x+w+2] = False
m2[:, :160] = False  # rank plates on the left
for i,(x,y,w,h) in enumerate(labels):
    row = i // 10; col = i % 10
    rl = labels[row*10:(row+1)*10]
    cxs = [b[0]+b[2]/2 for b in rl]
    lx = 165 if col == 0 else int((cxs[col-1]+cxs[col])/2)
    rx = 1536 if col == 9 else int((cxs[col]+cxs[col+1])/2)
    top = max(0, y - 195) if row else 0
    sub = np.zeros_like(m2); sub[top:y-1, lx:rx] = m2[top:y-1, lx:rx]
    lab, n = ndi.label(sub)
    if n == 0: print('no sprite', BOSS[i]); continue
    sizes = ndi.sum(sub, lab, range(1, n+1))
    keep = np.isin(lab, [k+1 for k,v in enumerate(sizes) if v > sizes.max()*0.08])
    sub = keep
    ys, xs = np.where(sub); x0,x1,y0,y1 = xs.min(), xs.max()+1, ys.min(), ys.max()+1
    # keep only components that belong to sel
    sid='boss_'+BOSS[i].lower().replace(' ','_')
    meta[sid] = {'name':BOSS[i], 'size':save_sprite(arr, sub, (x0,y0,x1,y1), sid, 96), 'tier': i//10+1}

# ---------------- Heroes (4 views per class) ----------------
HEROES = ['Warrior','Knight','Mage','Rogue','Cleric','Archer','Berserker','Paladin','Necromancer','Dragon Slayer','Monk','Samurai','Ninja','Ranger','Druid','Witch','Bard','Alchemist','Engineer','Gunner','Tamer','Beastmaster','Swordmaster','Spellblade','Summoner','Lancer','Gladiator','Valkyrie','Dark Knight','Holy Warrior',
 'Assassin','Inquisitor','Crusader','Black Mage','White Mage','Scholar','Sage','Warlock','Shaman','Warlord','Marshal','Captain','Pirate','Corsair','Hunter','Tracker','Scout','Mountaineer','Knight Captain','Royal Guard','Imperial Knight','Rune Knight','Arcane Knight','Shadowblade','Spirit Caller','Elementalist','Chronomancer','Astrologer','Dragon Knight','Saint']
VIEWS=['down','backright','up','left']
for sheet, off in [('4efc3e0b-image.png',0),('37bf7b09-image.png',30)]:
    arr = np.array(Image.open(f'{A}/{sheet}').convert('RGBA'))
    mask = fg_mask(arr)
    plates = find_labels(arr, 140, 240, 25, 48)
    prow = cluster_rows(plates, key=lambda b: b[1])
    plates = [b for r in prow for b in sorted(r, key=lambda b: b[0])]
    if len(plates) != 30: print('plates', len(plates))
    figs = []
    for j,(px,py,pw,ph) in enumerate(plates):
        r = j // 6; c = j % 6
        rowp = plates[r*6:(r+1)*6]
        lx = 0 if c == 0 else (rowp[c-1][0]+rowp[c-1][2] + px)//2
        rx = 1536 if c == 5 else (px+pw + rowp[c+1][0])//2
        y0 = py + ph + 2; y1 = min(1024, y0 + 125)
        cell = mask[y0:y1, lx:rx].copy()
        proj = cell.sum(0).astype(float)
        cols = np.where(proj > 0)[0]
        a0, a1 = cols.min(), cols.max()
        cuts = []
        for q in (1,2,3):
            t = a0 + (a1-a0)*q/4
            lo, hi = int(t-12), int(t+12)
            seg = proj[lo:hi]
            cuts.append(lo + int(np.argmin(seg)))
        edges = [a0] + cuts + [a1+1]
        for q in range(4):
            figs.append([lx+edges[q], y0, lx+edges[q+1], y1])
    for k,b in enumerate(figs[:120]):
        cls = HEROES[off + k//4]; v = VIEWS[k%4]
        sid=f"hero_{cls.lower().replace(' ','_')}_{v}"
        sub=np.zeros_like(mask); sub[b[1]:b[3], b[0]:b[2]] = mask[b[1]:b[3], b[0]:b[2]]
        lab,n=ndi.label(sub)
        if n>1:
            sizes=ndi.sum(sub,lab,range(1,n+1)); sub=np.isin(lab,[q+1 for q,v in enumerate(sizes) if v>sizes.max()*0.05])
        meta[sid]={'name':cls,'view':v,'size':save_sprite(arr, sub, (b[0],b[1],b[2],b[3]), sid, 110)}
json.dump(meta, open('meta_partial.json','w'), indent=1)
print('done', len(meta))
