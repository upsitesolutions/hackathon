import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AssessmentCard, type AssessmentStatus } from '@/components/assessment-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MOCK_RECIPES, type Recipe, type RecipeStep } from '@/constants/mock-recipes';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type RescueRouteParams = {
  expectedVisualState?: string | string[];
  id?: string | string[];
  recipeTitle?: string | string[];
  stepId?: string | string[];
  stepInstruction?: string | string[];
};

type RescueAssessment = {
  advice: string;
  status: AssessmentStatus;
  title: string;
};

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function findRecipeContext(recipeId?: string, stepId?: string) {
  if (!recipeId) {
    return { recipe: undefined, step: undefined, stepIndex: -1 };
  }

  const recipe = MOCK_RECIPES.find((candidate) => candidate.id === recipeId);
  const stepIndex = recipe?.steps.findIndex((candidate) => candidate.stepId === stepId) ?? -1;
  const step = stepIndex >= 0 ? recipe?.steps[stepIndex] : undefined;

  return { recipe, step, stepIndex };
}

async function mockRescueAssessment(args: {
  note: string;
  recipe?: Recipe;
  step?: RecipeStep;
}): Promise<RescueAssessment> {
  await new Promise((resolve) => setTimeout(resolve, 1100));

  const note = args.note.trim().toLowerCase();
  const targetState = args.step?.expectedVisualState;

  if (
    ['burn', 'smoke', 'char', 'bitter', 'black'].some((keyword) => note.includes(keyword))
  ) {
    return {
      status: 'adjust',
      title: 'Reset the heat first',
      advice:
        'Take the pan off the burner for 20–30 seconds, lower the heat one level, and restart only once the smell is clean again. If a surface looks dark or tastes bitter, scrape or wipe that part away before continuing.',
    };
  }

  if (
    ['raw', 'runny', 'wet', 'undercook', 'underdone', 'not done'].some((keyword) =>
      note.includes(keyword)
    )
  ) {
    return {
      status: 'adjust',
      title: 'Give it one short pass',
      advice: targetState
        ? `Stay with the current step a little longer and look for this signal: ${targetState}`
        : 'Stay on this step for another 30–60 seconds, keeping the same technique but reducing any rush. Check again before moving forward.',
    };
  }

  if (
    ['stuck', 'sticking', 'tear', 'broke', 'split', 'clump', 'curdled'].some((keyword) =>
      note.includes(keyword)
    )
  ) {
    return {
      status: 'adjust',
      title: 'Use a gentler recovery',
      advice:
        'Loosen the food with a spatula, add a small splash of water or fat if the pan looks dry, and switch to smaller movements. Once it releases cleanly again, continue with lower heat and less agitation.',
    };
  }

  if (
    ['fixed', 'better', 'looks good', 'good now', 'recovered', 'all set'].some((keyword) =>
      note.includes(keyword)
    )
  ) {
    return {
      status: 'done',
      title: 'Nice save',
      advice:
        'You are back in a good place. Move to the next checkpoint with the same pace, and keep an eye on color and texture instead of chasing extra time.',
    };
  }

  return {
    status: 'on_track',
    title: args.recipe ? `${args.recipe.title} looks recoverable` : 'You are likely still on track',
    advice: targetState
      ? `Pause for one breath, then compare your food against the target state: ${targetState} If it is close, make one small adjustment instead of restarting the whole step.`
      : 'Pause for one breath, make only one variable change, and check again in 20–30 seconds. Small corrections usually rescue the dish faster than a full restart.',
  };
}

export default function RescueScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<RescueRouteParams>();
  const recipeId = normalizeParam(params.id);
  const stepId = normalizeParam(params.stepId);
  const fallbackRecipeTitle = normalizeParam(params.recipeTitle);
  const fallbackInstruction = normalizeParam(params.stepInstruction);
  const fallbackExpectedState = normalizeParam(params.expectedVisualState);

  const { recipe, step, stepIndex } = useMemo(
    () => findRecipeContext(recipeId, stepId),
    [recipeId, stepId]
  );

  const recipeTitle = recipe?.title ?? fallbackRecipeTitle ?? 'Current cooking session';
  const instruction = step?.instruction ?? fallbackInstruction ?? 'Describe the step you are on.';
  const expectedVisualState =
    step?.expectedVisualState ??
    fallbackExpectedState ??
    'Share what the food should look like so rescue advice can be more precise.';

  const [issueText, setIssueText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessment, setAssessment] = useState<RescueAssessment | null>(null);
  const [cardVisible, setCardVisible] = useState(false);

  const canSubmit = issueText.trim().length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await mockRescueAssessment({
        note: issueText,
        recipe,
        step,
      });

      setAssessment(result);
      setCardVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardArea}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
              <ThemedText type="small">← Back</ThemedText>
            </Pressable>

            <View style={styles.header}>
              <ThemedText type="small" themeColor="textSecondary">
                Rescue mode
              </ThemedText>
              <ThemedText type="title" style={styles.title}>
                What went wrong?
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                Describe the problem in plain language and Sous will suggest the next best move.
              </ThemedText>
            </View>

            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="small" themeColor="textSecondary">
                Current recipe
              </ThemedText>
              <ThemedText type="subtitle" style={styles.recipeTitle}>
                {recipeTitle}
              </ThemedText>

              {stepIndex >= 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Step {stepIndex + 1}
                </ThemedText>
              ) : null}

              <ThemedText style={styles.cardBody}>{instruction}</ThemedText>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="small" themeColor="textSecondary">
                Target look
              </ThemedText>
              <ThemedText style={styles.cardBody}>{expectedVisualState}</ThemedText>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="small" themeColor="textSecondary">
                What went wrong
              </ThemedText>

              <TextInput
                accessibilityLabel="What went wrong"
                autoCapitalize="sentences"
                multiline
                onChangeText={setIssueText}
                placeholder="Example: The butter browned fast and now the garlic smells bitter."
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.backgroundSelected,
                    color: theme.text,
                  },
                ]}
                textAlignVertical="top"
                value={issueText}
              />

              <ThemedText themeColor="textSecondary" style={styles.helperText}>
                Include what changed, what it looks like now, and whether heat, texture, or timing
                feels off.
              </ThemedText>
            </ThemedView>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Get rescue advice"
              disabled={!canSubmit}
              onPress={() => void handleSubmit()}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: canSubmit
                    ? pressed
                      ? theme.backgroundSelected
                      : theme.text
                    : theme.backgroundSelected,
                  opacity: canSubmit ? 1 : 0.6,
                },
              ]}>
              {isSubmitting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={theme.background} />
                  <ThemedText style={[styles.primaryButtonText, { color: theme.background }]}>
                    Checking the rescue...
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={[styles.primaryButtonText, { color: theme.background }]}>
                  Get rescue advice
                </ThemedText>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {assessment ? (
        <AssessmentCard
          advice={assessment.advice}
          onContinue={() => setCardVisible(false)}
          status={assessment.status}
          title={assessment.title}
          visible={cardVisible}
        />
      ) : null}
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
    alignItems: 'center',
  },
  keyboardArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
  header: {
    gap: Spacing.one,
  },
  title: {
    fontSize: 42,
    lineHeight: 46,
  },
  subtitle: {
    lineHeight: 24,
    maxWidth: 560,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  recipeTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  cardBody: {
    fontSize: 18,
    lineHeight: 28,
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
  primaryButton: {
    minHeight: 56,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  primaryButtonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
});
