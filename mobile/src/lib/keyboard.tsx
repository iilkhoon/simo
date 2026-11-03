/**
 * react-native-keyboard-controller native moduldur. Expo Go-da olmasa tətbiq çökməsin deyə
 * yoxdursa React Native-in standart komponentlərinə keçirik.
 */
import React from 'react';
import { KeyboardAvoidingView as RNKeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import type * as KC from 'react-native-keyboard-controller';

let kc: typeof KC | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  kc = require('react-native-keyboard-controller') as typeof KC;
  // Modul JS-də var, amma native hissə yoxdursa (Expo Go) istifadə etmirik
  if (!kc?.KeyboardProvider) kc = null;
} catch {
  kc = null;
}

function FallbackAvoiding(props: React.ComponentProps<typeof RNKeyboardAvoidingView>) {
  return <RNKeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} {...props} />;
}
function FallbackProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export const KeyboardAvoidingView = (kc?.KeyboardAvoidingView ?? FallbackAvoiding) as typeof KC.KeyboardAvoidingView;
export const KeyboardAwareScrollView = (kc?.KeyboardAwareScrollView ?? ScrollView) as typeof KC.KeyboardAwareScrollView;
export const KeyboardProvider = (kc?.KeyboardProvider ?? FallbackProvider) as typeof KC.KeyboardProvider;
