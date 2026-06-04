import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  assess,
  getSession,
  saveSession,
  type AssessResponse,
  type Recipe,
  type Session,
} from '@/lib/api';

type SelectedImage = {
  base64: string;
  height: number;
  uri: string;
  width: number;
};

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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

  const [session, setSession] = useState<Session | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [isAssessing, setIsAssessing] = useState(false);
  const [verdict, setVerdict] = useState<AssessResponse | null>(null);
  const [assessError, setAssessError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [savedAlready, setSavedAlready] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setLoadError('Missing session id.');
      setIsLoadingSession(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const s = await getSession(sessionId);
        if (cancelled) return;
        setSession(s);
        setSavedAlready(Boolean(s.saved));
      } catch (err) {
        if (cancelled) return;
        setLoadError(getErrorMessage(err));
      } finally {
        if (!cancelled) setIsLoadingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Reset per-step state when the step changes
  useEffect(() => {
    setSelectedImage(null);
    setVerdict(null);
    setAssessError(null);
  }, [requestedStepId]);

  useEffect(() => {
    if (!selectedImage) return;
    const timeout = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(timeout);
  }, [selectedImage]);

  const recipe: Recipe | undefined = session?.recipe;
  const stepIndex = recipe
    ? Math.max(0, recipe.steps.findIndex((s) => s.stepId === requestedStepId))
    : 0;
  const activeStep = recipe?.steps[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = recipe ? stepIndex === recipe.steps.length - 1 : false;

  const submitForAssessment = useCallback(
    async (image: SelectedImage) => {
      if (!sessionId || !recipe || !activeStep) return;
      setIsAssessing(true);
      setAssessError(null);
      setVerdict(null);
      try {
        const result = await assess({
          sessionId,
          recipeId: recipe.id,
          stepId: activeStep.stepId,
          imageBase64: image.base64,
        });
        setVerdict(result);
      } catch (err) {
        setAssessError(getErrorMessage(err));
      } finally {
        setIsAssessing(false);
      }
    },
    [sessionId, recipe?.id, activeStep?.stepId]
  );

  if (isLoadingSession) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedView style={styles.centeredContent}>
            <ActivityIndicator color={theme.text} />
            <ThemedText themeColor="textSecondary">Loading your cooking session…</ThemedText>
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!session || !recipe || !activeStep || loadError) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedView style={styles.centeredContent}>
            <ThemedText type="subtitle">Couldn&apos;t load this session</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.centeredBody}>
              {loadError ?? 'No session data returned.'}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/')}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: pressed ? Colors.dark.backgroundSelected : '#1a1a1a' },
              ]}>
              <ThemedText style={styles.primaryButtonText}>Start a new recipe</ThemedText>
            </Pressable>
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const navigateToStep = (nextIndex: number) => {
    const nextStep = recipe.steps[nextIndex];
    if (!nextStep) return;
    router.replace({
      pathname: '/recipe/[id]',
      params: { id: recipe.id, sessionId, stepId: nextStep.stepId },
    });
  };

  const handlePickImage = async (source: 'camera' | 'library') => {
    if (isAssessing) return;
    try {
      setAssessError(null);
      const granted =
        source === 'camera' ? await requestCameraPermission() : await requestLibraryPermission();
      if (!granted) {
        setAssessError(
          source === 'camera'
            ? 'Camera access is required to check this step.'
            : 'Photo library access is required to pick an image.'
        );
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(imagePickerOptions)
          : await ImagePicker.launchImageLibraryAsync(imagePickerOptions);

      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64) {
        setAssessError('The selected image did not include base64 data.');
        return;
      }

      const next: SelectedImage = {
        base64: asset.base64,
        height: asset.height,
        uri: asset.uri,
        width: asset.width,
      };
      setSelectedImage(next);
      await submitForAssessment(next);
    } catch (err) {
      setAssessError(getErrorMessage(err));
    }
  };

  const handleCheckPress = () => {
    Alert.alert('Check this step', 'Take a photo or pick one from your library.', [
      { text: 'Camera', onPress: () => void handlePickImage('camera') },
      { text: 'Photo Library', onPress: () => void handlePickImage('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!sessionId || isSaving) return;
    setIsSaving(true);
    try {
      await saveSession(sessionId);
      setSavedAlready(true);
      Alert.alert('Saved!', 'This recipe is now in your Saved tab.');
    } catch (err) {
      Alert.alert('Could not save', getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const canProceed = verdict?.verdict === 'on_track' || verdict?.verdict === 'done';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.screen}>
          <ScrollView
            ref={scrollViewRef}
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
                Step {stepIndex + 1} of {recipe.steps.length}
              </ThemedText>
              <ThemedText type="title" style={styles.recipeTitle}>
                {recipe.title}
              </ThemedText>
              {recipe.description ? (
                <ThemedText themeColor="textSecondary">{recipe.description}</ThemedText>
              ) : null}
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

            {selectedImage ? (
              <ThemedView type="backgroundElement" style={styles.resultCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  Your photo
                </ThemedText>
                <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
              </ThemedView>
            ) : null}

            {isAssessing ? (
              <ThemedView type="backgroundElement" style={styles.loadingCard}>
                <ActivityIndicator color={theme.text} />
                <ThemedText themeColor="textSecondary">SueChef is checking your photo…</ThemedText>
              </ThemedView>
            ) : null}

            {assessError ? (
              <ThemedView
                accessibilityRole="alert"
                type="backgroundElement"
                style={[styles.errorCard, { borderColor: theme.accent }]}>
                <ThemedText type="smallBold">Couldn&apos;t check this step</ThemedText>
                <ThemedText themeColor="textSecondary">{assessError}</ThemedText>
              </ThemedView>
            ) : null}

            {verdict ? <VerdictCard result={verdict} /> : null}
          </ScrollView>

          <ThemedView style={styles.footer}>
            <ThemedView style={styles.navigationRow}>
              <Pressable
                accessibilityRole="button"
                disabled={isFirstStep}
                onPress={() => navigateToStep(stepIndex - 1)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    backgroundColor: pressed
                      ? theme.backgroundSelected
                      : theme.backgroundElement,
                    opacity: isFirstStep ? 0.45 : 1,
                  },
                ]}>
                <ThemedText>Prev</ThemedText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={isLastStep}
                onPress={() => navigateToStep(stepIndex + 1)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    backgroundColor: pressed
                      ? theme.backgroundSelected
                      : canProceed
                        ? '#E6F4EC'
                        : theme.backgroundElement,
                    opacity: isLastStep ? 0.45 : 1,
                  },
                ]}>
                <ThemedText>{canProceed ? 'Next →' : 'Next'}</ThemedText>
              </Pressable>
            </ThemedView>

            {isLastStep ? (
              <Pressable
                accessibilityRole="button"
                disabled={isSaving || savedAlready}
                onPress={() => void handleSave()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: savedAlready
                      ? '#2D8C5D'
                      : pressed
                        ? Colors.dark.backgroundSelected
                        : '#1a1a1a',
                    opacity: isSaving ? 0.6 : 1,
                  },
                ]}>
                <ThemedText style={styles.primaryButtonText}>
                  {savedAlready ? '✓ Saved to your recipes' : isSaving ? 'Saving…' : 'Save this recipe'}
                </ThemedText>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                disabled={isAssessing}
                onPress={handleCheckPress}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: pressed ? Colors.dark.backgroundSelected : '#1a1a1a',
                    opacity: isAssessing ? 0.55 : 1,
                  },
                ]}>
                <ThemedText style={styles.primaryButtonText}>
                  {isAssessing ? 'Checking…' : 'Check it'}
                </ThemedText>
              </Pressable>
            )}
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
  quality: 0.7,
};

async function requestCameraPermission() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  return permission.granted;
}

async function requestLibraryPermission() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return permission.granted;
}

function VerdictCard({ result }: { result: AssessResponse }) {
  const theme = useTheme();
  const copy = getVerdictCopy(result.verdict);
  const confidencePercent = Math.round(Math.max(0, Math.min(result.confidence, 1)) * 100);

  return (
    <ThemedView type="backgroundElement" style={[styles.verdictCard, { borderColor: copy.tint }]}>
      <ThemedView type="backgroundElement" style={styles.verdictHeader}>
        <ThemedView
          style={[
            styles.verdictBadge,
            { backgroundColor: copy.tintSoft, borderColor: copy.tint },
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
        SueChef says
      </ThemedText>
      <ThemedText style={styles.adviceText}>{result.advice}</ThemedText>
    </ThemedView>
  );
}

function getVerdictCopy(verdict: AssessResponse['verdict']) {
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
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center' },
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  scrollContent: { gap: Spacing.three, paddingBottom: Spacing.four },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  centeredBody: { textAlign: 'center', maxWidth: 420 },
  pressed: { opacity: 0.7 },
  backButton: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
  heading: { gap: Spacing.one },
  recipeTitle: { fontSize: 36, lineHeight: 42 },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  instruction: { fontSize: 24, lineHeight: 32 },
  expectedState: { fontSize: 18, lineHeight: 28, fontWeight: '600' },
  failureList: { gap: Spacing.one },
  failureText: { lineHeight: 24 },
  resultCard: { borderRadius: Spacing.three, gap: Spacing.two, padding: Spacing.two },
  previewImage: { width: '100%', height: 220, borderRadius: Spacing.three, resizeMode: 'cover' },
  loadingCard: {
    alignItems: 'center',
    borderRadius: Spacing.three,
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  errorCard: { borderRadius: Spacing.three, borderWidth: 1, gap: Spacing.two, padding: Spacing.three },
  verdictCard: { borderRadius: Spacing.three, borderWidth: 1, gap: Spacing.two, padding: Spacing.three },
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
  confidenceText: { fontSize: 14, lineHeight: 20 },
  verdictTitle: { fontSize: 22, lineHeight: 28 },
  adviceText: { fontSize: 18, fontWeight: '600', lineHeight: 28 },
  footer: { gap: Spacing.two },
  navigationRow: { flexDirection: 'row', gap: Spacing.two },
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
  primaryButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
});
