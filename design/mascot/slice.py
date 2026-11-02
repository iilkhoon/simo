"""
Maskot pozalar cədvəlini ayrı şəffaf PNG-lərə kəsir və mobil manifesti yaradır.
İstifadə: python3 design/mascot/slice.py <cədvəl.png> <sütun> <sətir>
Fon (krem) künclərdən flood-fill ilə silinir, personaj kəsilib 512×512 kvadrata yerləşdirilir.
"""
import sys, os
from collections import deque
from PIL import Image

POSES = [
  'wave', 'love', 'wink', 'call', 'sing', 'gift',
  'coin', 'crown', 'search', 'wow', 'sleep', 'sad',
  'party', 'nazar', 'shy', 'think', 'laugh', 'kiss',
  'coffee', 'welcome', 'dance', 'music', 'game', 'trophy',
  'heart', 'thumbs', 'cute', 'rose', 'calm', 'cool',
]
ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, '..', '..', 'mobile', 'assets', 'mascot')

def remove_bg(im, tol=12, edge=10):
    """Künclərdən flood-fill: piksel fona yaxın OLMALI və gəldiyi qonşudan kəskin fərqlənməməlidir
    (açıq rəngli krossovkalar fonla qarışmasın deyə kənar maneəsi)."""
    im = im.convert('RGBA'); w, h = im.size; px = im.load()
    bg = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    br = sum(c[0] for c in bg) // 4; bgc = sum(c[1] for c in bg) // 4; bb = sum(c[2] for c in bg) // 4
    def near_bg(c): return abs(c[0] - br) + abs(c[1] - bgc) + abs(c[2] - bb) < tol * 3
    seen = bytearray(w * h); q = deque()
    for x in range(w):
        q.append((x, 0, None)); q.append((x, h - 1, None))
    for y in range(h):
        q.append((0, y, None)); q.append((w - 1, y, None))
    while q:
        x, y, prev = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y * w + x]: continue
        c = px[x, y]
        if not near_bg(c): continue
        if prev is not None and abs(c[0] - prev[0]) + abs(c[1] - prev[1]) + abs(c[2] - prev[2]) > edge: continue
        seen[y * w + x] = 1
        px[x, y] = (c[0], c[1], c[2], 0)
        q.extend(((x + 1, y, c), (x - 1, y, c), (x, y + 1, c), (x, y - 1, c)))
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

def main(path, cols, rows):
    os.makedirs(OUT, exist_ok=True)
    sheet = Image.open(path).convert('RGB'); W, H = sheet.size
    cw, ch = W / cols, H / rows; i = 0; made = []
    for r in range(rows):
        for c in range(cols):
            if i >= len(POSES): break
            cell = sheet.crop((int(c * cw), int(r * ch), int((c + 1) * cw), int((r + 1) * ch)))
            cut = remove_bg(cell); bbox = cut.getbbox()
            if bbox: cut = cut.crop(bbox)
            side = int(max(cut.size) * 1.08); canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
            canvas.paste(cut, ((side - cut.width) // 2, side - cut.height - int(side * 0.02)), cut)
            canvas = canvas.resize((512, 512), Image.LANCZOS)
            canvas.save(os.path.join(OUT, f'{POSES[i]}.png'), optimize=True)
            made.append(POSES[i]); i += 1
    man = os.path.join(ROOT, '..', '..', 'mobile', 'src', 'components', 'mascotAssets.ts')
    with open(man, 'w') as f:
        f.write('// AVTOMATİK: design/mascot/slice.py yaradır — əl ilə dəyişməyin\n')
        f.write('/* eslint-disable */\nexport const MASCOT: Record<string, number> = {\n')
        for p in made: f.write(f"  {p}: require('../../assets/mascot/{p}.png'),\n")
        f.write('};\n')
    print('ok', len(made))

if __name__ == '__main__':
    main(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]))
