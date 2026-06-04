import { Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Alert, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  findMockRecipeCard,
  MOCK_SAVED_RECIPES,
  type PersonalizedRecipeCard,
} from '@/constants/mock-recipe-surfaces';
import { Colors, Spacing } from '@/constants/theme';

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildShareMessage(recipe: PersonalizedRecipeCard) {
  const steps = recipe.adjustedInstructions
    .map((step, index) => `${index + 1}. ${step.title}: ${step.detail}`)
    .join('\n');

  return `${recipe.title}\n${recipe.personalizationSummary}\n\nAdjusted instructions:\n${steps}\n\nSous notes:\n• ${recipe.notes.join('\n• ')}`;
}

export default function RecipeResultScreen() {
  const params = useLocalSearchParams<{ recipeId?: string | string[] }>();
  const recipeId = normalizeParam(params.recipeId);
  const recipe = findMockRecipeCard(recipeId) ?? MOCK_SAVED_RECIPES[0];

  const handleShare = async () => {
    try {
      // expo-sharing is available in this app, but in SDK 56 it shares file URLs.
      // This milestone screen is still text-only mock data, so use the native share sheet
      // until the app exports a card asset or saved file that can be passed to shareAsync.
      await Sharing.isAvailableAsync();
      await Share.share({
        title: recipe.title,
        message: buildShareMessage(recipe),
      });
    } catch {
      Alert.alert('Share unavailable', 'We could not open the share sheet for this recipe card.');
    }
  };

  return (
    <>
      <ScrollView
        style={styles.scrollView}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        <ThemedView type="backgroundElement" style={styles.heroCard}>
          <ThemedText type="small" themeColor="textSecondary" selectable>
            Personalized recipe result
          </ThemedText>
          <ThemedText type="subtitle" style={styles.heroTitle} selectable>
            {recipe.title}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.heroSummary} selectable>
            {recipe.personalizationSummary}
          </ThemedText>

          <View style={styles.metricRow}>
            <ThemedView type="backgroundSelected" style={styles.metricChip}>
              <ThemedText type="small" selectable>
                {recipe.mealType}
              </ThemedText>
            </ThemedView>
            <ThemedView type="backgroundSelected" style={styles.metricChip}>
              <ThemedText type="small" selectable>
                {recipe.cookTimeLabel}
              </ThemedText>
            </ThemedView>
            <ThemedView type="backgroundSelected" style={styles.metricChip}>
              <ThemedText type="small" selectable>
                {recipe.savedLabel}
              </ThemedText>
            </ThemedView>
          </View>

          <ThemedView style={styles.noteBlock}>
            <ThemedText type="smallBold" selectable>
              Why this version works
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.noteText} selectable>
              {recipe.heroNote}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold" selectable>
            Adjusted instructions
          </ThemedText>
          {recipe.adjustedInstructions.map((step, index) => (
            <ThemedView key={step.id} type="backgroundElement" style={styles.stepCard}>
              <ThemedText type="small" themeColor="textSecondary" selectable>
                Step {index + 1}
              </ThemedText>
              <ThemedText type="default" style={styles.stepTitle} selectable>
                {step.title}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.stepBody} selectable>
                {step.detail}
              </ThemedText>
            </ThemedView>
          ))}
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold" selectable>
            Sous notes
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.notesCard}>
            {recipe.notes.map((note) => (
              <ThemedText key={note} style={styles.listItem} selectable>
                • {note}
              </ThemedText>
            ))}
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold" selectable>
            Best used when
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.notesCard}>
            <ThemedText themeColor="textSecondary" style={styles.noteText} selectable>
              {recipe.bestFor}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Share ${recipe.title}`}
          onPress={() => void handleShare()}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: pressed ? Colors.dark.backgroundSelected : '#1a1a1a' },
          ]}>
          <ThemedText style={styles.primaryButtonText}>Share recipe card</ThemedText>
        </Pressable>

        <ThemedText themeColor="textSecondary" style={styles.footerNote} selectable>
          expo-sharing is available in the app, but this text-first mock card still uses the native
          share sheet until the cooking flow exports a file or card asset that can be passed to the
          Expo Sharing API.
        </ThemedText>
      </ScrollView>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          title: 'Recipe Card',
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  heroCard: {
    borderRadius: 28,
    padding: Spacing.three,
    gap: Spacing.two,
    borderCurve: 'continuous',
    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.1)',
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 38,
  },
  heroSummary: {
    lineHeight: 24,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  metricChip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  noteBlock: {
    gap: Spacing.one,
  },
  noteText: {
    lineHeight: 24,
  },
  section: {
    gap: Spacing.two,
  },
  stepCard: {
    borderRadius: 24,
    padding: Spacing.three,
    gap: Spacing.one,
    borderCurve: 'continuous',
  },
  stepTitle: {
    fontWeight: '700',
  },
  stepBody: {
    lineHeight: 24,
  },
  notesCard: {
    borderRadius: 24,
    padding: Spacing.three,
    gap: Spacing.one,
    borderCurve: 'continuous',
  },
  listItem: {
    lineHeight: 24,
  },
  primaryButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  footerNote: {
    lineHeight: 22,
  },
});
