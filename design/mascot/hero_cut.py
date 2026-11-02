"""Əsas şəkil (hero) üçün: qradiyentli döşəmə flood-fill ilə təmiz çıxmır, ona görə GrabCut (OpenCV).
İstifadə: python3 design/mascot/hero_cut.py <giriş> <çıxış.png>   (pip install opencv-python-headless)"""
import sys
import cv2
import numpy as np
from PIL import Image

src = cv2.imread(sys.argv[1])
h, w = src.shape[:2]
mask = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
# Kənar zolaq — dəqiq fon; mərkəz — ehtimal olunan personaj
mask[:12, :] = mask[-12:, :] = cv2.GC_BGD; mask[:, :12] = mask[:, -12:] = cv2.GC_BGD
hsv = cv2.cvtColor(src, cv2.COLOR_BGR2HSV)
red = ((hsv[..., 0] < 12) | (hsv[..., 0] > 168)) & (hsv[..., 1] > 120)
mask[red] = cv2.GC_FGD                          # qırmızı bədən mütləq personajdır
# Ayaqqabılar (krem, fona yaxın) — mərkəzləri mütləq personaj, ətrafı ehtimal
for x0, y0, x1, y1 in ((0.175, 0.80, 0.39, 0.96), (0.465, 0.80, 0.72, 0.955)):
    X0, Y0, X1, Y1 = int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)
    mask[Y0 - 10:Y1 + 6, X0 - 10:X1 + 10][mask[Y0 - 10:Y1 + 6, X0 - 10:X1 + 10] != cv2.GC_FGD] = cv2.GC_PR_FGD
    core = np.zeros_like(mask)
    cv2.ellipse(core, ((X0 + X1) // 2, int(Y0 + (Y1 - Y0) * 0.62)), (int((X1 - X0) * 0.36), int((Y1 - Y0) * 0.26)), 0, 0, 360, 1, -1)
    mask[core == 1] = cv2.GC_FGD
bgd = np.zeros((1, 65), np.float64); fgd = np.zeros((1, 65), np.float64)
cv2.grabCut(src, mask, None, bgd, fgd, 8, cv2.GC_INIT_WITH_MASK)
fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
# Ən böyük hissə saxlanılır
n, lab, stats, _ = cv2.connectedComponentsWithStats(fg)
big = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA]); fg = np.where(lab == big, 255, 0).astype(np.uint8)
fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
fg = cv2.erode(fg, np.ones((3, 3), np.uint8))
alpha = cv2.GaussianBlur(fg, (0, 0), 1.6)
rgba = np.dstack([cv2.cvtColor(src, cv2.COLOR_BGR2RGB), alpha])
im = Image.fromarray(rgba, 'RGBA'); bbox = im.getbbox(); im = im.crop(bbox)
side = int(max(im.size) * 1.08); canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
canvas.paste(im, ((side - im.width) // 2, side - im.height - int(side * 0.02)), im)
canvas.resize((512, 512), Image.LANCZOS).save(sys.argv[2], optimize=True)
print('ok')
