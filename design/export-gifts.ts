/**
 * Hədiyyə rəsmlərini vebə (və design/gifts/) SVG fayl kimi ixrac edir.
 * Mənbə yeganədir: mobile/src/components/gifts/art.ts (GIFT_ART) və mobile/src/assets/giftSvgs.ts (COIN_SVG, DIAMOND_SVG).
 * Köhnə design/gifts.mjs silindi — o, yeni rəsmləri köhnə düz ikonlarla əvəz edirdi.
 *
 *   cd backend && npx tsx ../design/export-gifts.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GIFT_ART } from '../mobile/src/components/gifts/art';
import { COIN_SVG, DIAMOND_SVG } from '../mobile/src/assets/giftSvgs';

const root = path.dirname(fileURLToPath(import.meta.url));
const out = [path.join(root, 'gifts'), path.join(root, '..', 'web', 'assets', 'gifts')];
const all: Record<string, string> = { ...GIFT_ART, coin: COIN_SVG, diamond: DIAMOND_SVG };
for (const dir of out) {
  fs.mkdirSync(dir, { recursive: true });
  for (const [id, body] of Object.entries(all)) fs.writeFileSync(path.join(dir, `${id}.svg`), body.replace(/\n/g, ''));
}
console.log(`✓ ${Object.keys(all).length} SVG → ${out.map((d) => path.relative(path.join(root, '..'), d)).join(', ')}`);
