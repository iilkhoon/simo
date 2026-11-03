// Kompüterin Wi-Fi/LAN IPv4 ünvanını çap edir (telefon backend-ə və Expo-ya bununla qoşulur).
import os from 'node:os';

export function lanIp() {
  const skip = /vEthernet|WSL|Docker|VirtualBox|VMware|Hyper-V|Loopback|docker|br-|veth|utun|tailscale|zerotier/i;
  const cands = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (skip.test(name)) continue;
    for (const a of addrs ?? []) if (a.family === 'IPv4' && !a.internal) cands.push(a.address);
  }
  const rank = (ip) => (ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : 3);
  cands.sort((a, b) => rank(a) - rank(b));
  return cands[0] ?? '127.0.0.1';
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('lan-ip.mjs')) console.log(lanIp());
