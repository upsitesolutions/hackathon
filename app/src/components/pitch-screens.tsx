import {
  Animated,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { Text } from 'react-native';

import { Spacing } from '@/constants/theme';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const SERIF = Platform.select({ ios: 'Georgia', default: 'serif' });
const SANS = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: 'sans-serif' });
const GOLD = '#c9a84c';
const CREAM = '#f0e4d0';

interface Props {
  onDone: () => void;
}

export function PitchScreens({ onDone }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const dotOpacity = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 1100,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, { toValue: 0.75, duration: 1500, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(dotOpacity, { toValue: 0.15, duration: 1500, useNativeDriver: USE_NATIVE_DRIVER }),
      ])
    ).start();
  }, []);

  return (
    <Pressable style={s.screen} onPress={onDone}>
      <ImageBackground
        source={require('../../assets/images/steak-good.jpeg')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      <View style={s.overlay} />
      <SafeAreaView style={s.safe}>
        <Animated.View style={[s.inner, { opacity }]}>
          <View style={s.brand}>
            <Image
              source={require('../../assets/images/suechef-logo.png')}
              style={s.logo}
              resizeMode="contain"
            />
            <Text style={s.appName}>SueChef</Text>
            <Text style={s.tagline}>Cook at home.{'\n'}Save your marriage.</Text>
          </View>

          <Animated.View style={[s.dot, { opacity: dotOpacity }]} />
        </Animated.View>
      </SafeAreaView>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0c0602',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,5,2,0.72)',
  },
  safe: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.five,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brand: {
    gap: Spacing.three,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 16,
  },
  appName: {
    fontFamily: SERIF,
    fontSize: 46,
    fontWeight: '700',
    color: CREAM,
    letterSpacing: -1.5,
    lineHeight: 50,
    marginTop: Spacing.two,
  },
  tagline: {
    fontFamily: SERIF,
    fontSize: 20,
    fontWeight: '400',
    color: 'rgba(240,228,208,0.68)',
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
    alignSelf: 'center',
  },
});
