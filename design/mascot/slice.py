"""
Maskot pozalar cədvəlini ayrı şəffaf PNG-lərə kəsir və mobil manifesti yaradır.
İstifadə: python3 design/mascot/slice.py <cədvəl.png> <sütun> <sətir> [poza1,poza2,...]
Pozalar verilməsə POSES sırası işlənir. Manifest qovluqdakı bütün PNG-lərdən və ALIASES-dən yığılır,
ona görə bir neçə cədvəli ardıcıl kəsmək olar.
Fon (krem) künclərdən flood-fill ilə silinir, personaj kəsilib 512×512 kvadrata yerləşdirilir.
"""
import sys, os
from collections import deque
from PIL import Image, ImageFilter
import numpy as np

POSES = [
  'wave', 'love', 'wink', 'call', 'sing', 'gift',
  'coin', 'crown', 'search', 'wow', 'sleep', 'sad',
  'party', 'nazar', 'shy', 'think', 'laugh', 'kiss',
  'coffee', 'welcome', 'dance', 'music', 'game', 'trophy',
  'heart', 'thumbs', 'cute', 'rose', 'calm', 'cool',
]
# Ayrıca şəkli olmayan pozalar ən yaxın mövcud pozanı göstərir
ALIASES = {
  'thumbs': 'crown', 'trophy': 'crown', 'coffee': 'calm', 'dance': 'party', 'cute': 'shy',
  'laugh': 'party', 'kiss': 'love', 'welcome': 'wave', 'music': 'sing', 'game': 'wink',
  'heart': 'love', 'rose': 'love', 'cool': 'wink',
}
ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, '..', '..', 'mobile', 'assets', 'mascot')

def remove_bg(im, tol=12, edge=10):
    """Künclərdən flood-fill: piksel fona yaxın OLMALI və gəldiyi qonşudan kəskin fərqlənməməlidir
    (açıq rəngli krossovkalar fonla qarışmasın deyə kənar maneəsi)."""
    im = im.convert('RGBA'); w, h = im.size; px = im.load()
    bg = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    br = sum(c[0] for c in bg) // 4; bgc = sum(c[1] for c in bg) // 4; bb = sum(c[2] for c in bg) // 4
    # Hər sətrin fonu: sol və sağ kənar pikselinin ortası (qradiyent fon/döşəmə üçün)
    rowbg = [tuple((px[2, y][k] + px[w - 3, y][k]) // 2 for k in range(3)) for y in range(h)]
    def near_bg(c, y=None):
        r0 = rowbg[y] if y is not None else (br, bgc, bb)
        return abs(c[0] - r0[0]) + abs(c[1] - r0[1]) + abs(c[2] - r0[2]) < tol * 3
    seen = bytearray(w * h); q = deque()
    for x in range(w):
        q.append((x, 0, None)); q.append((x, h - 1, None))
    for y in range(h):
        q.append((0, y, None)); q.append((w - 1, y, None))
    while q:
        x, y, prev = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y * w + x]: continue
        c = px[x, y]
        if not near_bg(c, y): continue
        if prev is not None and abs(c[0] - prev[0]) + abs(c[1] - prev[1]) + abs(c[2] - prev[2]) > edge: continue
        seen[y * w + x] = 1
        px[x, y] = (c[0], c[1], c[2], 0)
        q.extend(((x + 1, y, c), (x - 1, y, c), (x, y + 1, c), (x, y - 1, c)))
    # Qapalı fon boşluqları (qolla bədən arası): fona çox yaxın, bircins, kifayət qədər böyük hissələr
    hole_tol = 7; seen2 = bytearray(w * h)
    for sy in range(h):
        for sx in range(w):
            i0 = sy * w + sx
            if seen2[i0] or px[sx, sy][3] == 0: continue
            c0 = px[sx, sy]
            if not (abs(c0[0] - br) + abs(c0[1] - bgc) + abs(c0[2] - bb) < hole_tol * 3): continue
            comp = []; st = [(sx, sy)]; seen2[i0] = 1
            while st:
                x, y = st.pop(); comp.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen2[ny * w + nx]:
                        c = px[nx, ny]
                        if c[3] and abs(c[0] - br) + abs(c[1] - bgc) + abs(c[2] - bb) < hole_tol * 3:
                            seen2[ny * w + nx] = 1; st.append((nx, ny))
            if len(comp) >= 120:
                for x, y in comp:
                    c = px[x, y]; px[x, y] = (c[0], c[1], c[2], 0)
    # Ən böyük hissə (personaj) + kənara toxunmayan bəzəklər (konfetti, ?, notlar) qalır;
    # xananın kənarına toxunan kiçik hissələr qonşu xanadan düşən qırıntılardır — silinir
    lab = [0] * (w * h); best = (0, 0); cur = 0; edge_comp = set(); sizes = {}
    for sy in range(h):
        for sx in range(w):
            if px[sx, sy][3] == 0 or lab[sy * w + sx]: continue
            cur += 1; n = 0; st = [(sx, sy)]; lab[sy * w + sx] = cur
            while st:
                x, y = st.pop(); n += 1
                if x in (0, w - 1) or y in (0, h - 1): edge_comp.add(cur)
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not lab[ny * w + nx] and px[nx, ny][3]:
                        lab[ny * w + nx] = cur; st.append((nx, ny))
            sizes[cur] = n
            if n > best[1]: best = (cur, n)
    keep = {best[0]} | {k for k, n in sizes.items() if k not in edge_comp and n >= 40}
    for y in range(h):
        for x in range(w):
            if px[x, y][3] and lab[y * w + x] not in keep: px[x, y] = (0, 0, 0, 0)
    return im

def refine(im, band=4, lo=10, hi=70):
    """Kənarı yumşaldır: fon zolağında alfa fon rəngindən uzaqlığa görə hesablanır,
    rəng fondan "ayrılır" (defringe) — krem halo və pilləli kənar qalmır."""
    a = np.asarray(im).astype(np.float32); rgb = a[..., :3]; al = a[..., 3] > 0
    h, w = al.shape
    corners = np.array([rgb[0, 0], rgb[0, w - 1], rgb[h - 1, 0], rgb[h - 1, w - 1]])
    bg = corners.mean(0)
    rowbg = ((rgb[:, 2] + rgb[:, w - 3]) / 2)[:, None, :]  # sətir fonu
    bgmask = Image.fromarray((~al).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(band * 2 + 1))
    zone = (np.asarray(bgmask) > 0) & al
    d = np.abs(rgb - rowbg).max(-1)
    soft = np.clip((d - lo) / (hi - lo), 0, 1)
    alpha = np.where(al, 1.0, 0.0); alpha[zone] = soft[zone]
    # Kənar zolağında fondan tünd, boz pikselllər yerə düşən kölgədir — silinir
    lum = rgb.mean(-1); sat = rgb.max(-1) - rgb.min(-1)
    shadow = zone & (lum < rowbg.mean(-1) - 4) & (sat < bg.max() - bg.min() + 18) & (lum > 120)
    alpha[shadow] = 0
    # 1 px daxili eroziya: ən kənar piksel həmişə fonla qarışıqdır
    er = np.asarray(Image.fromarray((al * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))) > 0
    alpha = np.where(er, alpha, alpha * 0.35)
    safe = np.maximum(alpha, 0.05)[..., None]
    un = np.clip((rgb - (1 - safe) * rowbg) / safe, 0, 255)
    rgb = np.where(zone[..., None], un, rgb)
    al8 = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    out = Image.fromarray(np.dstack([rgb, np.asarray(al8).astype(np.float32)]).astype(np.uint8), 'RGBA')
    return out

def main(path, cols, rows, poses=None):
    poses = poses or POSES
    os.makedirs(OUT, exist_ok=True)
    sheet = Image.open(path).convert('RGB'); W, H = sheet.size
    cw, ch = W / cols, H / rows; i = 0; made = []
    for r in range(rows):
        for c in range(cols):
            if i >= len(poses): break
            cell = sheet.crop((int(c * cw), int(r * ch), int((c + 1) * cw), int((r + 1) * ch)))
            cell = cell.resize((cell.width * 2, cell.height * 2), Image.LANCZOS)
            cut = refine(remove_bg(cell)); bbox = cut.getbbox()
            if bbox: cut = cut.crop(bbox)
            side = int(max(cut.size) * 1.08); canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
            canvas.paste(cut, ((side - cut.width) // 2, side - cut.height - int(side * 0.02)), cut)
            canvas = canvas.resize((512, 512), Image.LANCZOS)
            canvas.save(os.path.join(OUT, f'{poses[i]}.png'), optimize=True)
            made.append(poses[i]); i += 1
    man = os.path.join(ROOT, '..', '..', 'mobile', 'src', 'components', 'mascotAssets.ts')
    with open(man, 'w') as f:
        f.write('// AVTOMATİK: design/mascot/slice.py yaradır — əl ilə dəyişməyin\n')
        f.write('/* eslint-disable */\nexport const MASCOT: Record<string, number> = {\n')
        have = sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.png'))
        for p in have: f.write(f"  {p}: require('../../assets/mascot/{p}.png'),\n")
        for a, t in ALIASES.items():
            if a not in have and t in have: f.write(f"  {a}: require('../../assets/mascot/{t}.png'),\n")
        f.write('};\n')
    print('ok', len(made))

if __name__ == '__main__':
    main(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4].split(',') if len(sys.argv) > 4 else None)
