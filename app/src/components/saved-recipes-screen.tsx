import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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

export default function SavedRecipesTabScreen({
  showSearch = false,
  title = 'Recipes',
}: {
  showSearch?: boolean;
  title?: string;
} = {}) {
  const theme = useTheme();
  const [sessions, setSessions] = useState<SavedSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const filteredSessions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => {
      const haystack = `${s.title ?? ''} ${s.prompt ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [sessions, query]);

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
      <Stack.Screen
        options={{
          title,
          headerSearchBarOptions: showSearch
            ? {
                placeholder: 'Search saved recipes',
                placement: 'integrated',
                allowToolbarIntegration: true,
                hideWhenScrolling: false,
                obscureBackground: false,
                onChangeText: (e) => setQuery(e.nativeEvent.text),
                onCancelButtonPress: () => setQuery(''),
              }
            : undefined,
        }}
      />
      <View style={styles.header}>
        <View style={[styles.eyebrowPill, { backgroundColor: theme.accentSoft }]}>
          <ThemedText type="small" style={[styles.eyebrowText, { color: theme.accent }]}>
            ★ Saved Recipes
          </ThemedText>
        </View>
        <ThemedText type="subtitle" style={styles.title}>
          Your cooking wins
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          A cookbook of every dish you&apos;ve nailed. Tap one to revisit the steps.
        </ThemedText>
        {sessions.length > 0 && !isLoading ? (
          <View style={styles.statsRow}>
            <View style={[styles.statChip, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">{sessions.length}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {sessions.length === 1 ? 'recipe' : 'recipes'}
              </ThemedText>
            </View>
            <View style={[styles.statChip, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">
                {sessions.reduce((acc, s) => acc + s.stepCount, 0)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                steps cooked
              </ThemedText>
            </View>
          </View>
        ) : null}
      </View>

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
          <ThemedText type="smallBold" style={styles.emptyTitle}>
            Your cookbook is empty
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
            Finish a cooking session and tap “Save this recipe” — it&apos;ll land here as your
            next cooking win.
          </ThemedText>
        </ThemedView>
      ) : (
        <View style={styles.section}>
          {filteredSessions.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.emptyCard}>
              <ThemedText type="smallBold" style={styles.emptyTitle}>
                No matches
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
                Nothing matched “{query.trim()}”. Try a different word from the title or
                prompt.
              </ThemedText>
            </ThemedView>
          ) : null}
          {filteredSessions.map((session) => (
            <Pressable
              key={session.sessionId}
              accessibilityRole="button"
              onPress={() => openSession(session)}
              style={({ pressed }) => [
                styles.cardPressable,
                pressed && styles.cardPressed,
              ]}>
              <ThemedView type="backgroundElement" style={styles.recipeCard}>
                <View style={[styles.accentStripe, { backgroundColor: theme.accent }]} />
                <View style={styles.recipeMeta}>
                  <ThemedText type="default" style={styles.recipeTitle} numberOfLines={2}>
                    {session.title}
                  </ThemedText>
                  <View style={styles.chipRow}>
                    <View style={[styles.chip, { backgroundColor: theme.background }]}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {session.stepCount} {session.stepCount === 1 ? 'step' : 'steps'}
                      </ThemedText>
                    </View>
                    <View style={[styles.chip, { backgroundColor: theme.background }]}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {session.turnCount} {session.turnCount === 1 ? 'check' : 'checks'}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                <ThemedText
                  themeColor="textSecondary"
                  style={styles.recipeSummary}
                  numberOfLines={3}>
                  &ldquo;{session.prompt}&rdquo;
                </ThemedText>

                <View style={[styles.divider, { backgroundColor: theme.background }]} />

                <View style={styles.cardFooter}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Saved {formatSavedAt(session.savedAt)}
                  </ThemedText>
                  <ThemedText type="smallBold" style={{ color: theme.accent }}>
                    Open →
                  </ThemedText>
                </View>
              </ThemedView>
            </Pressable>
          ))}
        </View>
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
  header: { gap: Spacing.two },
  eyebrowPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
  },
  eyebrowText: { fontWeight: '700', letterSpacing: 0.5 },
  title: { fontSize: 40, lineHeight: 44, fontWeight: '800' },
  subtitle: { lineHeight: 24, maxWidth: 560 },
  statsRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  statChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  section: { gap: Spacing.three },
  centeredCard: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  emptyCard: {
    gap: Spacing.one,
    padding: Spacing.four,
    borderRadius: 24,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 16 },
  emptyBody: { textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  errorCard: { gap: Spacing.two, padding: Spacing.three, borderRadius: 24 },
  retryButton: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  cardPressable: { borderRadius: 24, overflow: 'hidden' },
  cardPressed: { opacity: 0.85 },
  recipeCard: {
    borderRadius: 24,
    padding: Spacing.three,
    paddingLeft: Spacing.three + Spacing.one,
    gap: Spacing.three,
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
    overflow: 'hidden',
    position: 'relative',
  },
  accentStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  recipeMeta: { gap: Spacing.one },
  recipeTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: Spacing.one, flexWrap: 'wrap', marginTop: Spacing.half },
  chip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
  },
  recipeSummary: { lineHeight: 22, fontStyle: 'italic' },
  divider: { height: 1, opacity: 0.6 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
