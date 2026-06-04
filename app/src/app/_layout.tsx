import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { PitchScreens } from '@/components/pitch-screens';
import { PostDemoSlides } from '@/components/post-demo-slides';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [pitchDone, setPitchDone] = useState(false);
  const [showPostDemo, setShowPostDemo] = useState(false);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="recipe/[id]" />
        <Stack.Screen name="recipe-result" />
      </Stack>
      <AnimatedSplashOverlay />

      {!pitchDone && (
        <View style={StyleSheet.absoluteFillObject}>
          <PitchScreens onDone={() => setPitchDone(true)} />
        </View>
      )}

      {pitchDone && !showPostDemo && (
        <Pressable
          style={({ pressed }) => [s.deckBtn, pressed && s.deckBtnPressed]}
          onPress={() => setShowPostDemo(true)}
        >
          <Text style={s.deckBtnText}>deck</Text>
        </Pressable>
      )}

      {pitchDone && showPostDemo && (
        <View style={StyleSheet.absoluteFillObject}>
          <PostDemoSlides onDone={() => setShowPostDemo(false)} />
        </View>
      )}
    </ThemeProvider>
  );
}

const s = StyleSheet.create({
  deckBtn: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  deckBtnPressed: {
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  deckBtnText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '500',
  },
});
