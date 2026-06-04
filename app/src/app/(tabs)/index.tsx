import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Colors, Spacing } from '@/constants/theme';
import { enrichMockRecipeFromInput } from '@/constants/mock-recipes';
import { useTheme } from '@/hooks/use-theme';

const QUICK_START_PROMPTS = [
  "I'm making salmon",
  'Need help with garlic butter pasta',
  'Classic French omelette',
];

export default function HomeScreen() {
  const theme = useTheme();
  const [sourceText, setSourceText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const trimmedSourceText = sourceText.trim();
  const canSubmit = trimmedSourceText.length > 0 && !isLoading;

  const handleCook = async (input: string) => {
    const normalizedInput = input.trim();

    if (!normalizedInput || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 900));

      const recipe = enrichMockRecipeFromInput(normalizedInput);
      const initialStep = recipe.steps[0];

      if (!initialStep) {
        return;
      }

      router.push({
        pathname: '/recipe/[id]',
        params: { id: recipe.id, stepId: initialStep.stepId },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.appTitle}>
              Sous
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
              Tell Sous what you&apos;re making or paste the recipe you have.
            </ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
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
              Start with a dish name, a rough idea, or full recipe text. The mock flow will map it
              to a cooking session until the API is live.
            </ThemedText>

            <ThemedView type="backgroundElement" style={styles.quickStartSection}>
              <ThemedText type="small" themeColor="textSecondary">
                Quick starts
              </ThemedText>
              <ThemedView type="backgroundElement" style={styles.quickStartList}>
                {QUICK_START_PROMPTS.map((prompt) => (
                  <Pressable
                    key={prompt}
                    accessibilityRole="button"
                    onPress={() => setSourceText(prompt)}
                    style={({ pressed }) => [
                      styles.quickStartChip,
                      {
                        backgroundColor: pressed
                          ? theme.backgroundSelected
                          : theme.background,
                      },
                    ]}>
                    <ThemedText>{prompt}</ThemedText>
                  </Pressable>
                ))}
              </ThemedView>
            </ThemedView>
          </ThemedView>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start cooking"
            disabled={!canSubmit}
            onPress={() => void handleCook(trimmedSourceText)}
            style={({ pressed }) => [
              styles.cookButton,
              {
                backgroundColor: canSubmit
                  ? pressed
                    ? Colors.dark.backgroundSelected
                    : '#1a1a1a'
                  : theme.backgroundSelected,
                opacity: canSubmit ? 1 : 0.6,
              },
            ]}>
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#ffffff" />
                <ThemedText style={styles.cookButtonText}>
                  Sous is researching your recipe…
                </ThemedText>
              </View>
            ) : (
              <ThemedText style={styles.cookButtonText}>Let&apos;s Cook</ThemedText>
            )}
          </Pressable>
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
    gap: Spacing.one,
  },
  appTitle: {
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: Spacing.one,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
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
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  cookButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cookButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});
