import numpy as np, glob, os, json, sys
sys.path.insert(0, '/home/claude/spritework')
from PIL import Image
from scipy import ndimage as ndi
from seg import fg_mask
THR = int(sys.argv[1]) if len(sys.argv) > 1 else 240
OUT = 'items_out'; os.makedirs(OUT, exist_ok=True)
res = {}
for f in sorted(glob.glob('fe770520*/*/*.png')):
    name = f.split('/')[-1][:2]
    im = Image.open(f).convert('RGBA')
    bg = Image.new('RGBA', im.size, (255, 0, 255, 255)); bg.alpha_composite(im)
    arr = np.array(bg)
    al = np.array(im)[..., 3]
    rgb = np.array(im)[..., :3].astype(int)
    pinkish = (rgb[..., 0] > 200) & (rgb[..., 2] > 180) & (rgb[..., 1] > 150) & (np.abs(rgb[..., 0] - rgb[..., 2]) < 60)
    m = (al >= THR) & ~pinkish
    m = ndi.binary_fill_holes(ndi.binary_closing(m, iterations=1))
    m[:40] = False
    m = ndi.binary_opening(m, iterations=1)
    lab, n = ndi.label(m)
    sz = ndi.sum(m, lab, range(1, n + 1)); objs = ndi.find_objects(lab)
    comps = [(o, i + 1, s) for i, (o, s) in enumerate(zip(objs, sz)) if s > 250]
    # merge overlapping boxes
    boxes = []
    for o, i, s in comps:
        b = [o[1].start, o[0].start, o[1].stop, o[0].stop, [i], s]
        boxes.append(b)
    changed = True
    while changed:
        changed = False
        for a in range(len(boxes)):
            for c in range(a + 1, len(boxes)):
                A, C = boxes[a], boxes[c]
                if A[0] - 2 <= C[2] and C[0] - 2 <= A[2] and A[1] - 2 <= C[3] and C[1] - 2 <= A[3]:
                    boxes[a] = [min(A[0], C[0]), min(A[1], C[1]), max(A[2], C[2]), max(A[3], C[3]), A[4] + C[4], A[5] + C[5]]
                    boxes.pop(c); changed = True; break
            if changed: break
    # drop edge-cut fragments (touching left/right border and small)
    W = arr.shape[1]
    boxes = [b for b in boxes if not ((b[0] <= 1 or b[2] >= W - 1) and (b[2] - b[0]) < 30)]
    rows = sorted(boxes, key=lambda b: b[1])
    grouped = []
    for b in rows:
        if grouped and abs(b[1] - grouped[-1][0][1]) < 35: grouped[-1].append(b)
        else: grouped.append([b])
    ordered = [b for g in grouped for b in sorted(g, key=lambda b: b[0])]
    res[name] = []
    for k, b in enumerate(ordered):
        sub = np.isin(lab, b[4])
        crop = np.array(im)[b[1]:b[3], b[0]:b[2]].copy()
        crop[..., 3] = np.where(sub[b[1]:b[3], b[0]:b[2]], 255, 0)
        Image.fromarray(crop).save(f'{OUT}/{name}_{k:02d}.png')
        res[name].append([b[2] - b[0], b[3] - b[1]])
    print(name, len(ordered))
json.dump(res, open('items_boxes.json', 'w'))
# check sheet
fs = sorted(glob.glob(f'{OUT}/*.png'))
sh = Image.new('RGBA', (20 * 80, ((len(fs) // 20) + 1) * 90), (40, 40, 60, 255))
from PIL import ImageDraw
d = ImageDraw.Draw(sh)
for i, f in enumerate(fs):
    t = Image.open(f); t.thumbnail((70, 70)); x = (i % 20) * 80; y = (i // 20) * 90
    sh.paste(t, (x, y), t); d.text((x, y + 74), os.path.basename(f)[:-4], fill=(255, 255, 255))
sh.save('items_check.png')
