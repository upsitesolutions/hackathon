import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { generateRecipe } from '@/lib/api';

function lightHaptic() {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

const QUICK_START_PROMPTS = [
  "I'm making salmon",
  'Need help with garlic butter pasta',
  'Classic French omelette',
];

export default function HomeScreen() {
  const theme = useTheme();
  const [sourceText, setSourceText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmedSourceText = sourceText.trim();
  const canSubmit = trimmedSourceText.length > 0 && !isLoading;

  const handleCook = async (input: string) => {
    const normalizedInput = input.trim();

    if (!normalizedInput || isLoading) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { sessionId, recipeId, recipe } = await generateRecipe(normalizedInput);
      const initialStep = recipe.steps[0];

      if (!initialStep) {
        setErrorMessage('SueChef returned a recipe with no steps. Try rewording the request.');
        return;
      }

      router.push({
        pathname: '/recipe/[id]',
        params: { id: recipeId, sessionId, stepId: initialStep.stepId },
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={[theme.background, theme.backgroundElement, theme.background]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(500).springify()} style={styles.header}>
            <View style={styles.brandRow}>
              <LinearGradient
                colors={[theme.accent, '#FF6B6B', '#7B68EE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGlow}>
                <View style={[styles.logoInner, { backgroundColor: theme.background }]}>
                  <Image
                    source={require('@/assets/images/SueChef_clean.png')}
                    contentFit="contain"
                    style={styles.logo}
                  />
                </View>
              </LinearGradient>
              <View style={styles.brandTextCol}>
                <ThemedText type="title" style={styles.appTitle}>
                  SueChef
                </ThemedText>
                <View style={[styles.eyebrowPill, { backgroundColor: theme.accentSoft }]}>
                  <ThemedText type="small" style={[styles.eyebrowText, { color: theme.accent }]}>
                    ✨ Your AI sous-chef
                  </ThemedText>
                </View>
              </View>
            </View>
            <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
              Tell SueChef what you&apos;re making or paste the recipe you have.
            </ThemedText>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(120).duration(500).springify()}
            style={[styles.card, styles.cardShadow, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary">
              What are you making?
            </ThemedText>

            <TextInput
              accessibilityLabel="Recipe input"
              autoCapitalize="sentences"
              editable={!isLoading}
              multiline
              onChangeText={setSourceText}
              placeholder="Examples: “I’m making salmon”, a recipe URL, or pasted recipe steps."
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.background,
                  borderColor: theme.backgroundSelected,
                },
              ]}
              textAlignVertical="top"
              value={sourceText}
            />

            <ThemedText themeColor="textSecondary" style={styles.helperText}>
              Start with a dish name, a rough idea, or full recipe text. Sous keeps the mock recipe
              selection locally, then starts a real API session.
            </ThemedText>

            <View style={styles.quickStartSection}>
              <ThemedText type="small" themeColor="textSecondary">
                Quick starts
              </ThemedText>
              <View style={styles.quickStartList}>
                {QUICK_START_PROMPTS.map((prompt, idx) => (
                  <Pressable
                    key={prompt}
                    accessibilityRole="button"
                    onPress={() => {
                      lightHaptic();
                      setSourceText(prompt);
                    }}
                    style={({ pressed }) => [
                      styles.quickStartChip,
                      {
                        backgroundColor: pressed
                          ? theme.backgroundSelected
                          : theme.background,
                        borderColor: theme.backgroundSelected,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      },
                    ]}>
                    <ThemedText style={styles.quickStartChipText}>
                      {['🐟', '🧄', '🥚'][idx] ?? '✨'} {prompt}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          </Animated.View>

          {errorMessage ? (
            <ThemedView
              accessibilityRole="alert"
              type="backgroundElement"
              style={[styles.errorCard, { borderColor: theme.accent }]}>
              <ThemedText type="smallBold">Couldn&apos;t start cooking</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.helperText}>
                {errorMessage}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                disabled={!trimmedSourceText || isLoading}
                onPress={() => void handleCook(trimmedSourceText)}
                style={({ pressed }) => [
                  styles.retryButton,
                  {
                    backgroundColor: pressed ? theme.backgroundSelected : theme.background,
                    opacity: trimmedSourceText && !isLoading ? 1 : 0.6,
                  },
                ]}>
                <ThemedText type="smallBold">Try again</ThemedText>
              </Pressable>
            </ThemedView>
          ) : null}

          <Animated.View entering={FadeInUp.delay(220).duration(500).springify()}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start cooking"
              disabled={!canSubmit}
              onPress={() => {
                if (canSubmit) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
                    () => {},
                  );
                }
                void handleCook(trimmedSourceText);
              }}
              style={({ pressed }) => [
                styles.cookButtonWrap,
                styles.cookButtonShadow,
                {
                  opacity: canSubmit ? 1 : 0.55,
                  transform: [{ scale: pressed && canSubmit ? 0.98 : 1 }],
                },
              ]}>
              <LinearGradient
                colors={
                  canSubmit
                    ? ['#FF6B6B', '#F59E0B', '#7B68EE']
                    : [theme.backgroundSelected, theme.backgroundSelected]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cookButton}>
                {isLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#ffffff" />
                    <ThemedText style={styles.cookButtonText}>
                      Sous is researching your recipe…
                    </ThemedText>
                  </View>
                ) : (
                  <ThemedText style={styles.cookButtonText}>Let&apos;s Cook  →</ThemedText>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  content: {
    flexGrow: 1,
    width: '100%',
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  header: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  brandTextCol: {
    flex: 1,
    gap: Spacing.one,
  },
  logoGlow: {
    width: 76,
    height: 76,
    borderRadius: 22,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  logoInner: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: Spacing.two,
  },
  appTitle: {
    letterSpacing: -1.5,
    fontSize: 44,
    lineHeight: 48,
  },
  eyebrowPill: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  eyebrowText: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: Spacing.two,
    fontSize: 17,
    lineHeight: 26,
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  input: {
    minHeight: 180,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 18,
    lineHeight: 28,
  },
  helperText: {
    lineHeight: 24,
  },
  quickStartSection: {
    gap: Spacing.one,
  },
  quickStartList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  quickStartChip: {
    borderRadius: Spacing.five,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  quickStartChipText: {
    fontWeight: '600',
  },
  errorCard: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  retryButton: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  cookButtonWrap: {
    borderRadius: Spacing.four,
    overflow: 'hidden',
  },
  cookButtonShadow: {
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cookButton: {
    borderRadius: Spacing.four,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cookButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 0.3,
  },
});

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while creating your SousAI session. Please try again.';
}
