import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';

import { Spacing } from '@/constants/theme';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const SERIF = Platform.select({ ios: 'Georgia', default: 'serif' });
const SANS = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: 'sans-serif' });
const GOLD = '#c9a84c';
const CREAM = '#f0e4d0';
const DIM = 'rgba(240,228,208,0.55)';

// Warm dark for Copilot slide, cool dark for Azure slide
const BG_WARM = '#0f0c08';
const BG_COOL = '#0b0e16';

interface Props {
  onDone: () => void;
}

function SlideIn({ children, slide }: { children: React.ReactNode; slide: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(20);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 480, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.spring(translateY, { toValue: 0, tension: 55, friction: 11, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
  }, [slide]);

  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

export function PostDemoSlides({ onDone }: Props) {
  const [slide, setSlide] = useState(0);

  const advance = () => {
    if (slide < 1) setSlide(s => s + 1);
    else onDone();
  };

  // ── Slide 0: GitHub Copilot ───────────────────────────────────────────────
  if (slide === 0) {
    return (
      <Pressable style={[s.screen, { backgroundColor: BG_WARM }]} onPress={advance}>
        <View style={[s.accentBar, { backgroundColor: 'rgba(201,168,76,0.5)' }]} />
        <SafeAreaView style={s.safe}>
          <SlideIn slide={slide}>
            <Text style={s.eyebrow}>How we built it</Text>
            <Text style={s.headline}>GitHub{'\n'}Copilot.</Text>
            <View style={s.rule} />
            <View style={s.list}>
              <Row text="4 custom Copilot agents — one per team stream" />
              <Row text="Azure Functions v4 scaffolded in minutes" />
              <Row text="Cosmos DB client with retry logic, generated whole" />
              <Row text="React Native camera + routing boilerplate, zero googling" />
            </View>
            <View style={s.rule} />
            <Text style={s.quote}>
              "The Azure Functions backend and Cosmos DB layer were scaffolded with Copilot.
              The vision models run on Azure OpenAI. The whole stack is Microsoft."
            </Text>
            <Text style={s.hint}>tap →</Text>
          </SlideIn>
        </SafeAreaView>
      </Pressable>
    );
  }

  // ── Slide 1: Azure $25K ───────────────────────────────────────────────────
  return (
    <Pressable style={[s.screen, { backgroundColor: BG_COOL }]} onPress={advance}>
      <View style={[s.accentBar, { backgroundColor: GOLD }]} />
      <SafeAreaView style={s.safe}>
        <SlideIn slide={slide}>
          <Text style={s.eyebrow}>Where $25K takes this</Text>
          <Text style={s.headline}>The moat.</Text>
          <View style={s.rule} />
          <View style={s.list}>
            <BigRow
              label="Data flywheel"
              detail="Azure ML labels every photo — raw, caramelizing, golden, burnt. More users → better model → harder to clone."
            />
            <BigRow
              label="Live video"
              detail={'Azure Video Indexer + streaming. "SueChef watches the pan so you don\'t have to."'}
            />
            <BigRow
              label="B2B API"
              detail="Azure API Management lets AllRecipes or NYT Cooking embed our vision layer. We become infrastructure."
            />
          </View>
          <View style={s.rule} />
          <Text style={s.quote}>
            Data flywheel + live video = a product meaningfully harder to clone.
          </Text>
          <Text style={s.hint}>tap to finish</Text>
        </SlideIn>
      </SafeAreaView>
    </Pressable>
  );
}

function Row({ text }: { text: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowDash}>—</Text>
      <Text style={s.rowText}>{text}</Text>
    </View>
  );
}

function BigRow({ label, detail }: { label: string; detail: string }) {
  return (
    <View style={s.bigRow}>
      <Text style={s.bigRowLabel}>{label}</Text>
      <Text style={s.bigRowDetail}>{detail}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  safe: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.four,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  eyebrow: {
    fontFamily: SANS,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.8,
    color: GOLD,
    textTransform: 'uppercase',
    marginBottom: Spacing.three,
  },
  headline: {
    fontFamily: SERIF,
    fontSize: 72,
    fontWeight: '700',
    color: CREAM,
    lineHeight: 72,
    letterSpacing: -2.5,
    marginBottom: Spacing.three,
  },
  rule: {
    height: 1,
    backgroundColor: 'rgba(201,168,76,0.14)',
    marginVertical: Spacing.three,
  },
  list: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  rowDash: {
    fontFamily: SANS,
    fontSize: 14,
    color: GOLD,
    lineHeight: 22,
  },
  rowText: {
    fontFamily: SANS,
    fontSize: 15,
    lineHeight: 23,
    color: 'rgba(240,228,208,0.82)',
    flex: 1,
  },
  bigRow: {
    gap: 5,
  },
  bigRowLabel: {
    fontFamily: SERIF,
    fontSize: 21,
    fontWeight: '700',
    color: CREAM,
    letterSpacing: -0.4,
  },
  bigRowDetail: {
    fontFamily: SANS,
    fontSize: 14,
    lineHeight: 22,
    color: DIM,
  },
  quote: {
    fontFamily: SERIF,
    fontSize: 15,
    lineHeight: 25,
    color: 'rgba(240,228,208,0.4)',
    fontStyle: 'italic',
  },
  hint: {
    fontFamily: SANS,
    fontSize: 12,
    color: 'rgba(201,168,76,0.3)',
    letterSpacing: 0.5,
    marginTop: Spacing.four,
  },
});
