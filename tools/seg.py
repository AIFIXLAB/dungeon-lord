import numpy as np, sys
from PIL import Image
from scipy import ndimage as ndi
def fg_mask(arr, T=38):
    a = arr[...,:3].astype(np.float32)
    gx = np.abs(np.diff(a, axis=1, append=a[:, -1:])).sum(2)
    gy = np.abs(np.diff(a, axis=0, append=a[-1:])).sum(2)
    g = np.maximum(gx, gy)
    # also left/up diffs
    gx2 = np.abs(np.diff(a, axis=1, prepend=a[:, :1])).sum(2)
    gy2 = np.abs(np.diff(a, axis=0, prepend=a[:1])).sum(2)
    g = np.maximum(g, np.maximum(gx2, gy2))
    edge = g > T
    passable = ~edge
    lab, n = ndi.label(passable)
    # background = passable components touching image border OR large area (blurred bg regions)
    sizes = ndi.sum(np.ones_like(lab), lab, index=np.arange(1, n+1))
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:,0], lab[:,-1]])))
    bg_ids = np.zeros(n+1, bool)
    for i in border: bg_ids[i] = True
    bg_ids[1:][sizes > 3000] = True
    bg_ids[0] = False
    bg = bg_ids[lab]
    fg = ~bg
    fg = ndi.binary_opening(fg, iterations=1)
    fg = ndi.binary_fill_holes(fg)
    return fg
if __name__ == '__main__':
    im = np.array(Image.open(sys.argv[1]).convert('RGBA'))
    fg = fg_mask(im)
    out = im.copy(); out[~fg] = [255,0,255,255]
    Image.fromarray(out).save(sys.argv[2])
    lab, n = ndi.label(fg)
    objs = ndi.find_objects(lab)
    boxes=[(s[1].start,s[0].start,s[1].stop-s[1].start,s[0].stop-s[0].start) for s in objs]
    big=[b for b in boxes if b[2]*b[3]>600]
    print(len(big))
    for b in sorted(big,key=lambda b:(b[1]//100,b[0]))[:40]: print(b)
