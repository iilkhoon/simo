/**
 * npm install-dan sonra native modullardakı köhnə import-ları düzəldir (postinstall).
 * React Native 0.88 prebuilt React.framework ilə `#import "RCTBridge.h"` tapılmır —
 * `<React/RCTBridge.h>` olmalıdır (react-native-agora 4.6.x iOS build xətası).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HEADERS = ['RCTBridge', 'RCTBridgeModule', 'RCTEventEmitter', 'RCTUtils', 'RCTLog', 'RCTConvert', 'RCTUIManager', 'RCTViewManager'];
const PKGS = ['react-native-agora', 'react-native-callkeep', 'react-native-voip-push-notification'];
const re = new RegExp(`#import "(${HEADERS.join('|')})\\.h"`, 'g');

let changed = 0;
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!e.name.endsWith('.xcodeproj')) walk(p); continue; }
    if (!/\.(m|mm|h)$/.test(e.name)) continue;
    const src = fs.readFileSync(p, 'utf8');
    const out = src.replace(re, '#import <React/$1.h>');
    if (out !== src) { fs.writeFileSync(p, out); changed++; console.log(`[patch-native] ${path.relative(root, p)}`); }
  }
}
for (const pkg of PKGS) {
  const dir = path.join(root, 'node_modules', pkg, 'ios');
  if (fs.existsSync(dir)) walk(dir);
}
console.log(`[patch-native] ${changed} fayl düzəldildi`);
