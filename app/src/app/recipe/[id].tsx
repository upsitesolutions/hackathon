import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MOCK_RECIPES } from '@/constants/mock-recipes';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function RecipeStepScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[]; stepId?: string | string[] }>();
  const recipeId = normalizeParam(params.id);
  const requestedStepId = normalizeParam(params.stepId);
  const recipe = MOCK_RECIPES.find((item) => item.id === recipeId);

  if (!recipe) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedView style={styles.centeredContent}>
            <ThemedText type="subtitle">Recipe unavailable</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.centeredBody}>
              We couldn&apos;t find that cooking session in the current mock data.
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/')}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: pressed ? Colors.dark.backgroundSelected : '#1a1a1a' },
              ]}>
              <ThemedText style={styles.primaryButtonText}>Back to recipes</ThemedText>
            </Pressable>
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const stepIndex = recipe.steps.findIndex((step) => step.stepId === requestedStepId);
  const activeStepIndex = stepIndex >= 0 ? stepIndex : 0;
  const activeStep = recipe.steps[activeStepIndex];
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex === recipe.steps.length - 1;

  const navigateToStep = (nextIndex: number) => {
    const nextStep = recipe.steps[nextIndex];

    if (!nextStep) {
      return;
    }

    router.replace({
      pathname: '/recipe/[id]',
      params: { id: recipe.id, stepId: nextStep.stepId },
    });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.screen}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/')}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
              <ThemedText type="small">← Back to recipes</ThemedText>
            </Pressable>

            <ThemedView style={styles.heading}>
              <ThemedText type="small" themeColor="textSecondary">
                Step {activeStepIndex + 1} of {recipe.steps.length}
              </ThemedText>
              <ThemedText type="title" style={styles.recipeTitle}>
                {recipe.title}
              </ThemedText>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="small" themeColor="textSecondary">
                Instruction
              </ThemedText>
              <ThemedText type="subtitle" style={styles.instruction}>
                {activeStep.instruction}
              </ThemedText>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="small" themeColor="textSecondary">
                What to look for
              </ThemedText>
              <ThemedText style={styles.expectedState}>{activeStep.expectedVisualState}</ThemedText>
            </ThemedView>

            {activeStep.commonFailures.length > 0 ? (
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="small" themeColor="textSecondary">
                  Watch out for
                </ThemedText>
                <ThemedView type="backgroundElement" style={styles.failureList}>
                  {activeStep.commonFailures.map((failure) => (
                    <ThemedText key={failure} themeColor="textSecondary" style={styles.failureText}>
                      • {failure}
                    </ThemedText>
                  ))}
                </ThemedView>
              </ThemedView>
            ) : null}
          </ScrollView>

          <ThemedView style={styles.footer}>
            <ThemedView style={styles.navigationRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go to previous step"
                disabled={isFirstStep}
                onPress={() => navigateToStep(activeStepIndex - 1)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    backgroundColor: isFirstStep
                      ? theme.backgroundElement
                      : pressed
                        ? theme.backgroundSelected
                        : theme.backgroundElement,
                    opacity: isFirstStep ? 0.45 : 1,
                  },
                ]}>
                <ThemedText>Prev</ThemedText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isLastStep ? 'Stay on final step' : 'Go to next step'}
                disabled={isLastStep}
                onPress={() => navigateToStep(activeStepIndex + 1)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    backgroundColor: isLastStep
                      ? theme.backgroundElement
                      : pressed
                        ? theme.backgroundSelected
                        : theme.backgroundElement,
                    opacity: isLastStep ? 0.45 : 1,
                  },
                ]}>
                <ThemedText>Next</ThemedText>
              </Pressable>
            </ThemedView>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Check ${recipe.title} at step ${activeStepIndex + 1}`}
              onPress={() =>
                Alert.alert(
                  'Check it',
                  'Camera capture is the next milestone. This button will open the camera in M3.'
                )
              }
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: pressed ? Colors.dark.backgroundSelected : '#1a1a1a' },
              ]}>
              <ThemedText style={styles.primaryButtonText}>Check it</ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>
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
    alignItems: 'center',
  },
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  centeredBody: {
    textAlign: 'center',
    maxWidth: 420,
  },
  pressed: {
    opacity: 0.7,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
  heading: {
    gap: Spacing.one,
  },
  recipeTitle: {
    fontSize: 40,
    lineHeight: 44,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  instruction: {
    fontSize: 28,
    lineHeight: 36,
  },
  expectedState: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '600',
  },
  failureList: {
    gap: Spacing.one,
  },
  failureText: {
    lineHeight: 24,
  },
  footer: {
    gap: Spacing.two,
  },
  navigationRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 4,
    alignItems: 'center',
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
});
