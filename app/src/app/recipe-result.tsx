import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getSession, type Session } from '@/lib/api';

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function RecipeResultScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const sessionId = normalizeParam(params.sessionId);

  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setErrorMessage('Missing session id.');
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const s = await getSession(sessionId);
        if (!cancelled) setSession(s);
      } catch (err) {
        if (!cancelled) setErrorMessage(err instanceof Error ? err.message : 'Failed to load.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Recipe' }} />
        <ThemedView style={styles.centered}>
          <ActivityIndicator color={theme.text} />
        </ThemedView>
      </>
    );
  }

  if (!session || errorMessage) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Recipe' }} />
        <ThemedView style={styles.centered}>
          <ThemedText type="subtitle">Couldn&apos;t load this recipe</ThemedText>
          <ThemedText themeColor="textSecondary">
            {errorMessage ?? 'No session data returned.'}
          </ThemedText>
        </ThemedView>
      </>
    );
  }

  const recipe = session.recipe;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          title: 'Recipe Card',
        }}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <ThemedView type="backgroundElement" style={styles.heroCard}>
          <ThemedText type="small" themeColor="textSecondary">
            Saved recipe
          </ThemedText>
          <ThemedText type="subtitle" style={styles.heroTitle}>
            {recipe.title}
          </ThemedText>
          {recipe.description ? (
            <ThemedText themeColor="textSecondary" style={styles.heroSummary}>
              {recipe.description}
            </ThemedText>
          ) : null}
          <ThemedText themeColor="textSecondary" style={styles.prompt}>
            Started from: &ldquo;{session.prompt}&rdquo;
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold">Steps</ThemedText>
          {recipe.steps.map((step, index) => {
            const stepTurns = session.turns.filter((t) => t.stepId === step.stepId);
            return (
              <ThemedView key={step.stepId} type="backgroundElement" style={styles.stepCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  Step {index + 1}
                </ThemedText>
                <ThemedText type="default" style={styles.stepTitle}>
                  {step.instruction}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.stepBody}>
                  Look for: {step.expectedVisualState}
                </ThemedText>
                {stepTurns.length > 0 ? (
                  <View style={styles.turnRow}>
                    <ThemedText type="smallBold">Your check-ins</ThemedText>
                    {stepTurns.map((turn, turnIndex) => {
                      const copy = getVerdictCopy(turn.verdict);
                      return (
                        <ThemedView
                          key={`${turn.promptedAt}-${turnIndex}`}
                          type="backgroundElement"
                          style={[styles.turnCard, { borderColor: copy.tint }]}>
                          {turn.imageDataUrl ? (
                            <Image
                              source={{ uri: turn.imageDataUrl }}
                              style={styles.turnImage}
                            />
                          ) : null}
                          <View
                            style={[
                              styles.verdictPill,
                              { backgroundColor: copy.tintSoft, borderColor: copy.tint },
                            ]}>
                            <ThemedText
                              style={[styles.verdictPillText, { color: copy.tint }]}>
                              {copy.label}
                            </ThemedText>
                          </View>
                          <ThemedText themeColor="textSecondary" style={styles.stepBody}>
                            {turn.advice}
                          </ThemedText>
                        </ThemedView>
                      );
                    })}
                  </View>
                ) : null}
              </ThemedView>
            );
          })}
        </ThemedView>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/')}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: pressed ? Colors.dark.backgroundSelected : '#1a1a1a' },
          ]}>
          <ThemedText style={styles.primaryButtonText}>Cook something new</ThemedText>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: Spacing.three, paddingTop: Spacing.four, paddingBottom: Spacing.four, gap: Spacing.three },
  heroCard: { borderRadius: 28, padding: Spacing.three, gap: Spacing.two },
  heroTitle: { fontSize: 30, lineHeight: 36 },
  heroSummary: { lineHeight: 24 },
  prompt: { fontStyle: 'italic' },
  section: { gap: Spacing.two },
  stepCard: { borderRadius: 24, padding: Spacing.three, gap: Spacing.one },
  stepTitle: { fontWeight: '700' },
  stepBody: { lineHeight: 22 },
  turnRow: { marginTop: Spacing.two, gap: Spacing.two },
  turnCard: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two,
    padding: Spacing.two,
  },
  turnImage: {
    width: '100%',
    height: 200,
    borderRadius: Spacing.two,
    resizeMode: 'cover',
  },
  verdictPill: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.five,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  verdictPillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  primaryButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
});

function getVerdictCopy(verdict: Session['turns'][number]['verdict']) {
  switch (verdict) {
    case 'on_track':
      return { label: 'On track', tint: '#2D8C5D', tintSoft: '#E6F4EC' };
    case 'adjust':
      return { label: 'Adjust', tint: '#C96D00', tintSoft: '#FFF1DF' };
    case 'done':
      return { label: 'Done', tint: '#5765F2', tintSoft: '#E9EBFF' };
    default:
      return { label: 'Checked', tint: '#555', tintSoft: '#EEE' };
  }
}
