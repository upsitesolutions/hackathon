import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  MOCK_RECIPE_HISTORY,
  MOCK_SAVED_RECIPES,
  type PersonalizedRecipeCard,
} from '@/constants/mock-recipe-surfaces';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function openRecipeCard(recipeId: PersonalizedRecipeCard['id']) {
  router.push({
    pathname: '/recipe-result',
    params: { recipeId },
  });
}

export default function RecipesTabScreen() {
  const theme = useTheme();

  return (
    <ScrollView
      style={styles.scrollView}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      <ThemedView style={styles.header}>
        <ThemedText type="small" themeColor="textSecondary" selectable>
          Recipes
        </ThemedText>
        <ThemedText type="subtitle" style={styles.title} selectable>
          Your saved cooking wins
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle} selectable>
          Keep lightweight mock history here until the cooking session flow starts saving completed
          results automatically.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="smallBold" selectable>
            Saved personalized recipes
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" selectable>
            {MOCK_SAVED_RECIPES.length} cards
          </ThemedText>
        </View>

        {MOCK_SAVED_RECIPES.map((recipe) => (
          <Pressable
            key={recipe.id}
            accessibilityHint={`Opens the saved recipe card for ${recipe.title}`}
            accessibilityRole="button"
            onPress={() => openRecipeCard(recipe.id)}
            style={({ pressed }) => [
              styles.cardPressable,
              pressed && { opacity: 0.82 },
            ]}>
            <ThemedView type="backgroundElement" style={styles.recipeCard}>
              <View style={styles.recipeTopRow}>
                <View style={styles.recipeMeta}>
                  <ThemedText type="small" themeColor="textSecondary" selectable>
                    {recipe.mealType}
                  </ThemedText>
                  <ThemedText type="default" style={styles.recipeTitle} selectable>
                    {recipe.title}
                  </ThemedText>
                </View>
                <ThemedView
                  type="backgroundSelected"
                  style={[styles.statusPill, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="small" selectable>
                    {recipe.savedLabel}
                  </ThemedText>
                </ThemedView>
              </View>

              <ThemedText themeColor="textSecondary" style={styles.recipeSummary} selectable>
                {recipe.personalizationSummary}
              </ThemedText>

              <View style={styles.badgeRow}>
                {recipe.tags.map((tag) => (
                  <ThemedView key={tag} type="backgroundSelected" style={styles.badge}>
                    <ThemedText type="small" selectable>
                      {tag}
                    </ThemedText>
                  </ThemedView>
                ))}
              </View>

              <View style={styles.cardFooter}>
                <ThemedText type="small" themeColor="textSecondary" selectable>
                  Last cooked {recipe.lastCookedLabel}
                </ThemedText>
                <ThemedText type="smallBold" selectable>
                  Open recipe card →
                </ThemedText>
              </View>
            </ThemedView>
          </Pressable>
        ))}
      </ThemedView>

      <ThemedView style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="smallBold" selectable>
            Recent cooking history
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" selectable>
            Mock session snapshots
          </ThemedText>
        </View>

        {MOCK_RECIPE_HISTORY.map((entry) => (
          <Pressable
            key={entry.id}
            accessibilityHint={`Opens the saved recipe card for ${entry.title}`}
            accessibilityRole="button"
            onPress={() => openRecipeCard(entry.recipeId)}
            style={({ pressed }) => [
              styles.cardPressable,
              pressed && { opacity: 0.82 },
            ]}>
            <ThemedView type="backgroundElement" style={styles.historyCard}>
              <View style={styles.historyTopRow}>
                <View style={styles.recipeMeta}>
                  <ThemedText type="default" style={styles.historyTitle} selectable>
                    {entry.title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" selectable>
                    {entry.cookedAtLabel}
                  </ThemedText>
                </View>
                <ThemedView type="backgroundSelected" style={styles.historyOutcome}>
                  <ThemedText type="small" selectable>
                    {entry.outcome}
                  </ThemedText>
                </ThemedView>
              </View>

              <ThemedText style={styles.historyAdjustment} selectable>
                {entry.adjustment}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.historyNote} selectable>
                {entry.note}
              </ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.calloutCard}>
        <ThemedText type="smallBold" selectable>
          Integration note
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.calloutBody} selectable>
          The tab is intentionally self-contained for M8. Final wiring can swap this mock data for
          completed cooking sessions and explicit “save recipe” actions later.
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.one,
  },
  title: {
    fontSize: 36,
    lineHeight: 40,
  },
  subtitle: {
    lineHeight: 24,
    maxWidth: 560,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardPressable: {
    borderRadius: 24,
  },
  recipeCard: {
    borderRadius: 24,
    padding: Spacing.three,
    gap: Spacing.two,
    borderCurve: 'continuous',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
  },
  recipeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  recipeMeta: {
    flex: 1,
    gap: Spacing.one,
  },
  recipeTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  recipeSummary: {
    lineHeight: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  historyCard: {
    borderRadius: 24,
    padding: Spacing.three,
    gap: Spacing.one,
    borderCurve: 'continuous',
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  historyTitle: {
    fontWeight: '700',
  },
  historyOutcome: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  historyAdjustment: {
    lineHeight: 24,
    fontWeight: '600',
  },
  historyNote: {
    lineHeight: 22,
  },
  calloutCard: {
    borderRadius: 24,
    padding: Spacing.three,
    gap: Spacing.one,
    borderCurve: 'continuous',
  },
  calloutBody: {
    lineHeight: 24,
  },
});
