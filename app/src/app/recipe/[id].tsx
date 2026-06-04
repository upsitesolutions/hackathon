import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MOCK_RECIPES } from '@/constants/mock-recipes';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sendMessage, type SendMessageResponse } from '@/lib/api';

const QUICK_ACTIONS = ["What's next?", 'What did I do wrong?'] as const;
type QuickActionQuestion = (typeof QUICK_ACTIONS)[number];

type SelectedImage = {
  base64: string;
  height: number;
  uri: string;
  width: number;
};

type StepInteractionState = {
  activeQuestion: QuickActionQuestion;
  errorMessage: string | null;
  isSending: boolean;
  key: string;
  result: SendMessageResponse | null;
  selectedImage: SelectedImage | null;
};

const DEFAULT_QUICK_ACTION: QuickActionQuestion = "What's next?";

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function createStepInteractionState(key: string): StepInteractionState {
  return {
    activeQuestion: DEFAULT_QUICK_ACTION,
    errorMessage: null,
    isSending: false,
    key,
    result: null,
    selectedImage: null,
  };
}

export default function RecipeStepScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{
    id?: string | string[];
    sessionId?: string | string[];
    stepId?: string | string[];
  }>();
  const recipeId = normalizeParam(params.id);
  const sessionId = normalizeParam(params.sessionId);
  const requestedStepId = normalizeParam(params.stepId);
  const recipe = MOCK_RECIPES.find((item) => item.id === recipeId);
  const stateKey = `${recipeId ?? 'missing-recipe'}:${requestedStepId ?? 'first-step'}`;
  const [interactionState, setInteractionState] = useState<StepInteractionState>(() =>
    createStepInteractionState(stateKey)
  );
  const currentInteractionState =
    interactionState.key === stateKey ? interactionState : createStepInteractionState(stateKey);
  const { activeQuestion, errorMessage, isSending, result, selectedImage } =
    currentInteractionState;
  const updateInteractionState = (nextState: Partial<Omit<StepInteractionState, 'key'>>) => {
    setInteractionState((currentState) => ({
      ...(currentState.key === stateKey ? currentState : createStepInteractionState(stateKey)),
      ...nextState,
    }));
  };

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
      params: { id: recipe.id, sessionId, stepId: nextStep.stepId },
    });
  };

  const handleSubmitImage = async (image: SelectedImage, question: QuickActionQuestion) => {
    if (!sessionId) {
      updateInteractionState({
        errorMessage: 'This cooking session is missing an API session id. Go back and start again.',
      });
      return;
    }

    updateInteractionState({ errorMessage: null, isSending: true, result: null });

    try {
      const response = await sendMessage({
        sessionId,
        recipeId: recipe.id,
        stepId: activeStep.stepId,
        question,
        imageBase64: image.base64,
      });
      updateInteractionState({ result: response });
    } catch (error) {
      updateInteractionState({ errorMessage: getErrorMessage(error) });
    } finally {
      updateInteractionState({ isSending: false });
    }
  };

  const handlePickImage = async (
    source: 'camera' | 'library',
    question: QuickActionQuestion = activeQuestion
  ) => {
    if (isSending) {
      return;
    }

    try {
      updateInteractionState({ activeQuestion: question, errorMessage: null });

      const permissionGranted =
        source === 'camera' ? await requestCameraPermission() : await requestLibraryPermission();

      if (!permissionGranted) {
        updateInteractionState({
          errorMessage:
            source === 'camera'
              ? 'Camera access is required to capture a checkpoint photo.'
              : 'Photo library access is required to choose a checkpoint photo.',
        });
        return;
      }

      const pickerResult =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(imagePickerOptions)
          : await ImagePicker.launchImageLibraryAsync(imagePickerOptions);

      if (pickerResult.canceled) {
        return;
      }

      const asset = pickerResult.assets[0];

      if (!asset?.base64) {
        updateInteractionState({
          errorMessage: 'The selected image did not include a base64 payload. Please try again.',
        });
        return;
      }

      const nextImage: SelectedImage = {
        base64: asset.base64,
        height: asset.height,
        uri: asset.uri,
        width: asset.width,
      };

      updateInteractionState({ selectedImage: nextImage });
      await handleSubmitImage(nextImage, question);
    } catch (error) {
      updateInteractionState({ errorMessage: getErrorMessage(error), isSending: false });
    }
  };

  const handleOpenImageSource = (question: QuickActionQuestion = activeQuestion) => {
    Alert.alert('Check this step', 'Choose a cooking checkpoint photo source.', [
      {
        text: 'Camera',
        onPress: () => void handlePickImage('camera', question),
      },
      {
        text: 'Photo Library',
        onPress: () => void handlePickImage('library', question),
      },
      {
        style: 'cancel',
        text: 'Cancel',
      },
    ]);
  };

  const handleQuickAction = (question: QuickActionQuestion) => {
    updateInteractionState({ activeQuestion: question });

    if (selectedImage) {
      void handleSubmitImage(selectedImage, question);
      return;
    }

    handleOpenImageSource(question);
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

            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="small" themeColor="textSecondary">
                Ask Sous with a photo
              </ThemedText>
              <ThemedText style={styles.expectedState}>
                Pick a quick question, then capture or choose a checkpoint image.
              </ThemedText>

              <ThemedView type="backgroundElement" style={styles.quickActionRow}>
                {QUICK_ACTIONS.map((question) => {
                  const isActive = activeQuestion === question;

                  return (
                    <Pressable
                      key={question}
                      accessibilityRole="button"
                      disabled={isSending}
                      onPress={() => handleQuickAction(question)}
                      style={({ pressed }) => [
                        styles.quickActionButton,
                        {
                          backgroundColor: isActive
                            ? theme.backgroundSelected
                            : pressed
                              ? theme.backgroundSelected
                              : theme.background,
                          opacity: isSending ? 0.55 : 1,
                        },
                      ]}>
                      <ThemedText type="smallBold">{question}</ThemedText>
                    </Pressable>
                  );
                })}
              </ThemedView>

              {selectedImage ? (
                <ThemedView type="backgroundElement" style={styles.resultCard}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Selected image
                  </ThemedText>
                  <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
                  <ThemedText type="small" themeColor="textSecondary">
                    {selectedImage.width} × {selectedImage.height} px
                  </ThemedText>
                </ThemedView>
              ) : null}

              {isSending ? (
                <ThemedView type="backgroundElement" style={styles.loadingCard}>
                  <ActivityIndicator color={theme.text} />
                  <ThemedText themeColor="textSecondary">Sous is reviewing your photo…</ThemedText>
                </ThemedView>
              ) : null}

              {errorMessage ? (
                <ThemedView
                  accessibilityRole="alert"
                  type="backgroundElement"
                  style={[styles.errorCard, { borderColor: theme.accent }]}>
                  <ThemedText type="smallBold">Couldn&apos;t assess this step</ThemedText>
                  <ThemedText themeColor="textSecondary">{errorMessage}</ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSending}
                    onPress={() =>
                      selectedImage
                        ? void handleSubmitImage(selectedImage, activeQuestion)
                        : handleOpenImageSource(activeQuestion)
                    }
                    style={({ pressed }) => [
                      styles.inlineButton,
                      {
                        backgroundColor: pressed ? theme.backgroundSelected : theme.background,
                        opacity: isSending ? 0.55 : 1,
                      },
                    ]}>
                    <ThemedText type="smallBold">Try again</ThemedText>
                  </Pressable>
                </ThemedView>
              ) : null}

              {result ? <VerdictCard result={result} /> : null}
            </ThemedView>
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
              disabled={isSending}
              onPress={() => handleOpenImageSource(activeQuestion)}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: pressed ? Colors.dark.backgroundSelected : '#1a1a1a',
                  opacity: isSending ? 0.55 : 1,
                },
              ]}>
              <ThemedText style={styles.primaryButtonText}>
                {isSending ? 'Checking…' : 'Check it'}
              </ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const imagePickerOptions: ImagePicker.ImagePickerOptions = {
  allowsEditing: false,
  base64: true,
  exif: false,
  mediaTypes: ['images'],
  quality: 0.75,
};

async function requestCameraPermission() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  return permission.granted;
}

async function requestLibraryPermission() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return permission.granted;
}

function VerdictCard({ result }: { result: SendMessageResponse }) {
  const theme = useTheme();
  const copy = getVerdictCopy(result.verdict);
  const confidencePercent = Math.round(Math.max(0, Math.min(result.confidence, 1)) * 100);

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.verdictCard, { borderColor: copy.tint }]}>
      <ThemedView type="backgroundElement" style={styles.verdictHeader}>
        <ThemedView
          style={[
            styles.verdictBadge,
            {
              backgroundColor: copy.tintSoft,
              borderColor: copy.tint,
            },
          ]}>
          <ThemedText style={[styles.verdictBadgeText, { color: copy.tint }]}>
            {copy.label}
          </ThemedText>
        </ThemedView>
        <ThemedText type="smallBold" style={[styles.confidenceText, { color: theme.text }]}>
          {confidencePercent}% confidence
        </ThemedText>
      </ThemedView>

      <ThemedText type="subtitle" style={styles.verdictTitle}>
        Sous says
      </ThemedText>
      <ThemedText style={styles.adviceText}>{result.advice}</ThemedText>
    </ThemedView>
  );
}

function getVerdictCopy(verdict: SendMessageResponse['verdict']) {
  switch (verdict) {
    case 'on_track':
      return { label: 'On track', tint: '#2D8C5D', tintSoft: '#E6F4EC' };
    case 'adjust':
      return { label: 'Adjust', tint: '#C96D00', tintSoft: '#FFF1DF' };
    case 'done':
      return { label: 'Done', tint: '#5765F2', tintSoft: '#E9EBFF' };
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while checking this step. Please try again.';
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
  quickActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  quickActionButton: {
    borderRadius: Spacing.five,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  resultCard: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    padding: Spacing.two,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: Spacing.three,
    resizeMode: 'cover',
  },
  loadingCard: {
    alignItems: 'center',
    borderRadius: Spacing.three,
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  errorCard: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  inlineButton: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  verdictCard: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  verdictHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  verdictBadge: {
    borderRadius: Spacing.five,
    borderWidth: 1,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
  },
  verdictBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  confidenceText: {
    fontSize: 14,
    lineHeight: 20,
  },
  verdictTitle: {
    fontSize: 26,
    lineHeight: 32,
  },
  adviceText: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 28,
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
