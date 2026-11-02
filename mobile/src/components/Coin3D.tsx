import React, { useEffect, useRef, useState } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import { createCoinScene, type CoinScene } from './coinScene';
import { CoinIcon } from './GiftIcon';

/** 3D Nar sikkəsi (iOS/Android: expo-gl + three.js). Toxunanda çevrilir. GL alınmasa adi ikon. */
export function Coin3D({ size = 120, spin = true, style }: { size?: number; spin?: boolean; style?: StyleProp<ViewStyle> }) {
  const sceneRef = useRef<CoinScene | null>(null);
  const raf = useRef(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => () => { cancelAnimationFrame(raf.current); sceneRef.current?.dispose(); sceneRef.current = null; }, []);
  if (failed) return <CoinIcon size={size} />;
  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    try {
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
      // three.js canvas gözləyir — expo-gl kontekstini saxta canvas ilə veririk
      const canvas = { width: w, height: h, style: {}, addEventListener: () => {}, removeEventListener: () => {}, clientHeight: h, getContext: () => gl } as unknown as HTMLCanvasElement;
      const renderer = new THREE.WebGLRenderer({ canvas, context: gl as unknown as WebGLRenderingContext, antialias: true, alpha: true });
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      const sc = createCoinScene(renderer, w, h, { spin });
      sceneRef.current = sc;
      let last = Date.now();
      const loop = () => {
        const now = Date.now();
        sc.render(Math.min(0.05, (now - last) / 1000)); last = now;
        gl.endFrameEXP();
        raf.current = requestAnimationFrame(loop);
      };
      loop();
    } catch { setFailed(true); }
  };
  return (
    <Pressable onPress={() => sceneRef.current?.flip()} style={[{ width: size, height: size }, style]}>
      <GLView style={{ width: size, height: size }} onContextCreate={onContextCreate} />
    </Pressable>
  );
}
