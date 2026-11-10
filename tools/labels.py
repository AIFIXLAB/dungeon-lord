import numpy as np, sys, json
from PIL import Image
from scipy import ndimage as ndi
from seg import fg_mask
def find_labels(arr, wmin=36, wmax=220, hmin=14, hmax=40):
    a = arr[...,:3].astype(np.int32)
    lum = (a[...,0]*3 + a[...,1]*6 + a[...,2]) / 10
    sat = a.max(2) - a.min(2)
    dark = (lum < 55) & (sat < 40)
    d = ndi.binary_closing(dark, structure=np.ones((5, 9)))
    lab, n = ndi.label(d)
    out = []
    for i, s in enumerate(ndi.find_objects(lab)):
        h = s[0].stop - s[0].start; w = s[1].stop - s[1].start
        fill = (lab[s] == i + 1).mean()
        if wmin <= w <= wmax and hmin <= h <= hmax and fill > 0.55 and w > h * 1.6:
            out.append((s[1].start, s[0].start, w, h))
    return out
if __name__ == '__main__':
    arr = np.array(Image.open(sys.argv[1]).convert('RGBA'))
    L = find_labels(arr)
    L.sort(key=lambda b: (round((b[1] + b[3]) / 40), b[0]))
    print(len(L))
    for b in L: print(b)
