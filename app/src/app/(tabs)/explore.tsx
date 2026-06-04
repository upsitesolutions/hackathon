import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listSavedSessions, type SavedSessionSummary } from '@/lib/api';

function openSession(summary: SavedSessionSummary) {
  router.push({
    pathname: '/recipe-result',
    params: { sessionId: summary.sessionId },
  });
}

function formatSavedAt(saved?: string) {
  if (!saved) return 'recently';
  try {
    return new Date(saved).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'recently';
  }
}

export default function SavedRecipesTabScreen() {
  const theme = useTheme();
  const [sessions, setSessions] = useState<SavedSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setErrorMessage(null);
      const data = await listSavedSessions();
      setSessions(data);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not load saved recipes.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setIsLoading(true);
        await load();
        if (!cancelled) setIsLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  return (
    <ScrollView
      style={styles.scrollView}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}>
      <ThemedView style={styles.header}>
        <ThemedText type="small" themeColor="textSecondary">
          Saved Recipes
        </ThemedText>
        <ThemedText type="subtitle" style={styles.title}>
          Your cooking wins
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          Tap any saved recipe to revisit the steps.
        </ThemedText>
      </ThemedView>

      {isLoading ? (
        <ThemedView style={styles.centeredCard}>
          <ActivityIndicator color={theme.text} />
          <ThemedText themeColor="textSecondary">Loading saved recipes…</ThemedText>
        </ThemedView>
      ) : errorMessage ? (
        <ThemedView type="backgroundElement" style={styles.errorCard}>
          <ThemedText type="smallBold">Couldn&apos;t load saved recipes</ThemedText>
          <ThemedText themeColor="textSecondary">{errorMessage}</ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => void load()}
            style={({ pressed }) => [
              styles.retryButton,
              { backgroundColor: pressed ? theme.backgroundSelected : theme.background },
            ]}>
            <ThemedText type="smallBold">Try again</ThemedText>
          </Pressable>
        </ThemedView>
      ) : sessions.length === 0 ? (
        <ThemedView type="backgroundElement" style={styles.emptyCard}>
          <ThemedText type="smallBold">Nothing saved yet</ThemedText>
          <ThemedText themeColor="textSecondary">
            Finish a cooking session and tap “Save this recipe” to add it here.
          </ThemedText>
        </ThemedView>
      ) : (
        <ThemedView style={styles.section}>
          {sessions.map((session) => (
            <Pressable
              key={session.sessionId}
              accessibilityRole="button"
              onPress={() => openSession(session)}
              style={({ pressed }) => [styles.cardPressable, pressed && { opacity: 0.82 }]}>
              <ThemedView type="backgroundElement" style={styles.recipeCard}>
                <View style={styles.recipeTopRow}>
                  <View style={styles.recipeMeta}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {session.stepCount} steps · {session.turnCount} checks
                    </ThemedText>
                    <ThemedText type="default" style={styles.recipeTitle}>
                      {session.title}
                    </ThemedText>
                  </View>
                </View>

                <ThemedText themeColor="textSecondary" style={styles.recipeSummary}>
                  &ldquo;{session.prompt}&rdquo;
                </ThemedText>

                <View style={styles.cardFooter}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Saved {formatSavedAt(session.savedAt)}
                  </ThemedText>
                  <ThemedText type="smallBold">Open →</ThemedText>
                </View>
              </ThemedView>
            </Pressable>
          ))}
        </ThemedView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  header: { gap: Spacing.one },
  title: { fontSize: 36, lineHeight: 40 },
  subtitle: { lineHeight: 24, maxWidth: 560 },
  section: { gap: Spacing.two },
  centeredCard: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  emptyCard: { gap: Spacing.one, padding: Spacing.three, borderRadius: 24 },
  errorCard: { gap: Spacing.two, padding: Spacing.three, borderRadius: 24 },
  retryButton: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  cardPressable: { borderRadius: 24 },
  recipeCard: {
    borderRadius: 24,
    padding: Spacing.three,
    gap: Spacing.two,
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
  },
  recipeTopRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  recipeMeta: { flex: 1, gap: Spacing.one },
  recipeTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  recipeSummary: { lineHeight: 24, fontStyle: 'italic' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
