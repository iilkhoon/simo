import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { palette } from '../theme';
import { Icon } from './Icon';

const COLORS = [palette.nar, palette.saffron, palette.xazar, palette.lime, palette.narSoft, palette.mint];

interface H { id: number; anim: Animated.Value; color: string; drift: number }
export interface HeartsHandle { burst: (n?: number) => void }

let seq = 0;

/** Canlı yayında bəyənmə ürəkləri — mürəkkəb konturlu stiker ürəklər */
export const Hearts = forwardRef<HeartsHandle>(function Hearts(_, ref) {
  const [hearts, setHearts] = useState<H[]>([]);
  useImperativeHandle(ref, () => ({
    burst(n = 1) {
      const add: H[] = Array.from({ length: Math.min(n, 6) }, () => ({
        id: ++seq,
        anim: new Animated.Value(0),
        color: COLORS[seq % COLORS.length],
        drift: (Math.random() - 0.5) * 80,
      }));
      setHearts((cur) => [...cur.slice(-24), ...add]);
      add.forEach((h, i) =>
        Animated.timing(h.anim, { toValue: 1, duration: 2200 + i * 120, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() =>
          setHearts((cur) => cur.filter((x) => x.id !== h.id)),
        ),
      );
    },
  }));
  return (
    <View pointerEvents="none" style={styles.wrap}>
      {hearts.map((h) => (
        <Animated.View
          key={h.id}
          style={{
            position: 'absolute',
            bottom: 0,
            opacity: h.anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 0.9, 0] }),
            transform: [
              { translateY: h.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -320] }) },
              { translateX: h.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, h.drift, h.drift * 0.3] }) },
              { scale: h.anim.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.3, 1.1, 0.8] }) },
              { rotate: `${h.drift / 4}deg` },
            ],
          }}
        >
          <View>
            <View style={{ position: 'absolute', left: -2, top: -1 }}><Icon name="heart" size={34} color={palette.ink} /></View>
            <Icon name="heart" size={30} color={h.color} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({ wrap: { position: 'absolute', right: 30, bottom: 90, width: 60, height: 360, alignItems: 'center' } });
