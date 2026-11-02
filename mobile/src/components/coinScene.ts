import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Nar sikkəsinin 3D səhnəsi (three.js) — web və native (expo-gl) eyni kodu işlədir.
 * Qızılı sikkə: dişli kənar, iç halqa, hər iki üzdə qabarıq qırmızı ürək. Yavaş fırlanır, toxunanda çevrilir.
 */
export interface CoinScene { render: (dt: number) => void; flip: () => void; resize: (w: number, h: number) => void; dispose: () => void }

function heartShape(s: number) {
  const h = new THREE.Shape();
  // Ürək: yuxarıda iki qövs, aşağıda iti uc (mərkəz 0,0)
  h.moveTo(0, -0.62 * s);
  h.bezierCurveTo(-0.08 * s, -0.5 * s, -0.78 * s, -0.12 * s, -0.78 * s, 0.22 * s);
  h.bezierCurveTo(-0.78 * s, 0.5 * s, -0.56 * s, 0.68 * s, -0.36 * s, 0.68 * s);
  h.bezierCurveTo(-0.18 * s, 0.68 * s, -0.06 * s, 0.58 * s, 0, 0.44 * s);
  h.bezierCurveTo(0.06 * s, 0.58 * s, 0.18 * s, 0.68 * s, 0.36 * s, 0.68 * s);
  h.bezierCurveTo(0.56 * s, 0.68 * s, 0.78 * s, 0.5 * s, 0.78 * s, 0.22 * s);
  h.bezierCurveTo(0.78 * s, -0.12 * s, 0.08 * s, -0.5 * s, 0, -0.62 * s);
  return h;
}

export function createCoinScene(renderer: THREE.WebGLRenderer, w: number, h: number, opts: { spin?: boolean } = {}): CoinScene {
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 100);
  camera.position.set(0, 0, 5.2);

  // Metal əksləri üçün mühit (otaq işığı); alınmasa adi işıqlar kifayətdir
  let envTex: THREE.Texture | null = null;
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();
  } catch { /* köhnə GPU */ }
  scene.add(new THREE.AmbientLight(0xffffff, envTex ? 0.25 : 0.9));
  const key = new THREE.DirectionalLight(0xfff2d6, envTex ? 1.6 : 2.4); key.position.set(2.5, 3, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff9a8a, 0.9); rim.position.set(-3, -1, -2); scene.add(rim);

  const gold = new THREE.MeshStandardMaterial({ color: 0xffbf2e, metalness: 0.95, roughness: 0.26 });
  const goldDeep = new THREE.MeshStandardMaterial({ color: 0xe39a12, metalness: 0.95, roughness: 0.34 });
  const red = new THREE.MeshPhysicalMaterial({ color: 0xd81b38, metalness: 0.1, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 });

  const coin = new THREE.Group();
  const R = 1, T = 0.2;
  // Gövdə: üzlər və yan tərəf
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, T, 96, 1), [goldDeep, gold, gold]);
  body.rotation.x = Math.PI / 2; coin.add(body);
  // Dişli kənar (yan səthdə 72 kiçik çıxıntı)
  const ridge = new THREE.BoxGeometry(0.03, 0.034, T * 0.9);
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const m = new THREE.Mesh(ridge, goldDeep);
    m.position.set(Math.cos(a) * (R + 0.008), Math.sin(a) * (R + 0.008), 0);
    m.rotation.z = a;
    coin.add(m);
  }
  for (const side of [1, -1]) {
    // Qabarıq xarici bant və iç halqa
    const band = new THREE.Mesh(new THREE.TorusGeometry(R - 0.05, 0.045, 16, 96), gold);
    band.position.z = side * (T / 2); coin.add(band);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.022, 12, 96), goldDeep);
    ring.position.z = side * (T / 2 + 0.005); coin.add(ring);
    // Ürək (həcmli, yumru kənarlı)
    const hg = new THREE.ExtrudeGeometry(heartShape(0.62), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.045, bevelSegments: 6, curveSegments: 32 });
    hg.center();
    const heart = new THREE.Mesh(hg, red);
    heart.position.z = side * (T / 2 + 0.05);
    if (side < 0) heart.rotation.y = Math.PI;
    coin.add(heart);
  }
  coin.rotation.x = -0.12;
  scene.add(coin);

  let t = 0; let flipT = 0; let flipFrom = 0;
  const spin = opts.spin !== false;
  return {
    render(dt) {
      t += dt;
      if (flipT > 0) {
        flipT = Math.max(0, flipT - dt);
        const k = 1 - flipT / 0.9; const e = 1 - Math.pow(1 - k, 3);
        coin.rotation.y = flipFrom + e * Math.PI * 2;
      } else if (spin) coin.rotation.y += dt * 0.9;
      else coin.rotation.y = Math.sin(t * 1.2) * 0.45;
      coin.position.y = Math.sin(t * 2) * 0.05;
      renderer.render(scene, camera);
    },
    flip() { flipFrom = coin.rotation.y; flipT = 0.9; },
    resize(nw, nh) { camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh, false); },
    dispose() {
      scene.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); });
      [gold, goldDeep, red].forEach((m) => m.dispose());
      envTex?.dispose(); renderer.dispose();
    },
  };
}
