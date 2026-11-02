import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import * as THREE from 'three';
import { createCoinScene, type CoinScene } from './coinScene';
import { CoinIcon } from './GiftIcon';

/** 3D Nar sikkəsi (web: <canvas> + WebGL). WebGL yoxdursa adi ikon göstərilir. */
export function Coin3D({ size = 120, spin = true, style }: { size?: number; spin?: boolean; style?: StyleProp<ViewStyle> }) {
  const host = useRef<unknown>(null);
  const sceneRef = useRef<CoinScene | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = host.current as unknown as HTMLElement | null;
    if (!el) return;
    const canvas = document.createElement('canvas');
    canvas.style.width = `${size}px`; canvas.style.height = `${size}px`; canvas.style.display = 'block';
    el.appendChild(canvas);
    let raf = 0; let last = performance.now();
    try {
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(size, size, false);
      const sc = createCoinScene(renderer, size, size, { spin });
      sceneRef.current = sc;
      const loop = (now: number) => { sc.render(Math.min(0.05, (now - last) / 1000)); last = now; raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    } catch { setFailed(true); }
    return () => { cancelAnimationFrame(raf); sceneRef.current?.dispose(); sceneRef.current = null; canvas.remove(); };
  }, [size, spin]);
  if (failed) return <CoinIcon size={size} />;
  return (
    <Pressable onPress={() => sceneRef.current?.flip()} style={[{ width: size, height: size }, style]}>
      <View ref={host as never} style={{ width: size, height: size }} />
    </Pressable>
  );
}
