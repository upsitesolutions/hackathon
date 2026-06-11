import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
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

  const [navDirection, setNavDirection] = useState<'next' | 'prev'>('next');

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
                styles.primaryButtonWrap,
                styles.primaryButtonShadow,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}>
              <LinearGradient
                colors={['#FF6B6B', '#F59E0B', '#7B68EE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButton}>
                <ThemedText style={styles.primaryButtonText}>Start a new recipe</ThemedText>
              </LinearGradient>
            </Pressable>
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const navigateToStep = (nextIndex: number) => {
    const nextStep = recipe.steps[nextIndex];
    if (!nextStep) return;
    setNavDirection(nextIndex > stepIndex ? 'next' : 'prev');
    router.setParams({ stepId: nextStep.stepId });
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
      <LinearGradient
        colors={[theme.background, theme.backgroundElement, theme.background]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <ThemedView style={[styles.screen, { backgroundColor: 'transparent' }]}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.duration(450).springify()} style={styles.heading}>
              <View style={styles.progressRow}>
                <View
                  style={[
                    styles.progressTrack,
                    { backgroundColor: theme.backgroundElement },
                  ]}>
                  <LinearGradient
                    colors={['#FF6B6B', '#F59E0B', '#7B68EE']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.progressFill,
                      {
                        width: `${((stepIndex + 1) / recipe.steps.length) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <ThemedText type="small" themeColor="textSecondary" style={styles.progressLabel}>
                  Step {stepIndex + 1} / {recipe.steps.length}
                </ThemedText>
              </View>
              <ThemedText type="title" style={styles.recipeTitle}>
                {recipe.title}
              </ThemedText>
              {recipe.description ? (
                <ThemedText themeColor="textSecondary">{recipe.description}</ThemedText>
              ) : null}
            </Animated.View>

            <Animated.View
              key={`instr-${activeStep.stepId}`}
              entering={(navDirection === 'next' ? SlideInRight : SlideInLeft).duration(320)}
              style={[styles.card, styles.cardShadow, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.stepBadge, { backgroundColor: theme.accent }]}>
                  <ThemedText style={styles.stepBadgeText}>{stepIndex + 1}</ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  Instruction
                </ThemedText>
              </View>
              <ThemedText type="subtitle" style={styles.instruction}>
                {activeStep.instruction}
              </ThemedText>
            </Animated.View>

            <Animated.View
              key={`look-${activeStep.stepId}`}
              entering={(navDirection === 'next' ? SlideInRight : SlideInLeft)
                .delay(60)
                .duration(320)}
              style={[styles.card, styles.cardShadow, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" themeColor="textSecondary">
                👀 What to look for
              </ThemedText>
              <ThemedText style={styles.expectedState}>{activeStep.expectedVisualState}</ThemedText>
            </Animated.View>

            {activeStep.commonFailures.length > 0 ? (
              <Animated.View
                key={`fails-${activeStep.stepId}`}
                entering={(navDirection === 'next' ? SlideInRight : SlideInLeft)
                  .delay(120)
                  .duration(320)}
                style={[styles.card, styles.cardShadow, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  ⚠️ Watch out for
                </ThemedText>
                <View style={styles.failureList}>
                  {activeStep.commonFailures.map((failure) => (
                    <ThemedText key={failure} themeColor="textSecondary" style={styles.failureText}>
                      • {failure}
                    </ThemedText>
                  ))}
                </View>
              </Animated.View>
            ) : null}

            {selectedImage ? (
              <Animated.View
                entering={FadeIn.duration(300)}
                style={[styles.resultCard, styles.cardShadow, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  📸 Your photo
                </ThemedText>
                <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
              </Animated.View>
            ) : null}

            {isAssessing ? (
              <Animated.View
                entering={FadeIn.duration(200)}
                style={[styles.loadingCard, { backgroundColor: theme.backgroundElement }]}>
                <ActivityIndicator color={theme.text} />
                <ThemedText themeColor="textSecondary">SueChef is checking your photo…</ThemedText>
              </Animated.View>
            ) : null}

            {assessError ? (
              <Animated.View
                entering={FadeIn.duration(200)}
                style={[styles.errorCard, { backgroundColor: theme.backgroundElement, borderColor: theme.accent }]}>
                <ThemedText type="smallBold">Couldn&apos;t check this step</ThemedText>
                <ThemedText themeColor="textSecondary">{assessError}</ThemedText>
              </Animated.View>
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
                onPress={() => {
                  if (!savedAlready) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
                      () => {},
                    );
                  }
                  void handleSave();
                }}
                style={({ pressed }) => [
                  styles.primaryButtonWrap,
                  styles.primaryButtonShadow,
                  {
                    opacity: isSaving ? 0.6 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}>
                <LinearGradient
                  colors={
                    savedAlready
                      ? ['#2D8C5D', '#34A86A']
                      : ['#FF6B6B', '#F59E0B', '#7B68EE']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryButton}>
                  <ThemedText style={styles.primaryButtonText}>
                    {savedAlready
                      ? '✓ Saved to your recipes'
                      : isSaving
                        ? 'Saving…'
                        : 'Save this recipe'}
                  </ThemedText>
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                disabled={isAssessing}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  }
                  handleCheckPress();
                }}
                style={({ pressed }) => [
                  styles.primaryButtonWrap,
                  styles.primaryButtonShadow,
                  {
                    opacity: isAssessing ? 0.55 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}>
                <LinearGradient
                  colors={['#FF6B6B', '#F59E0B', '#7B68EE']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryButton}>
                  <ThemedText style={styles.primaryButtonText}>
                    {isAssessing ? 'Checking…' : '📸 Check it'}
                  </ThemedText>
                </LinearGradient>
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
  heading: { gap: Spacing.two },
  progressRow: { gap: Spacing.one },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: { fontWeight: '600' },
  recipeTitle: { fontSize: 36, lineHeight: 42, letterSpacing: -0.8 },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 16,
  },
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
  primaryButtonWrap: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  primaryButtonShadow: {
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  primaryButton: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 17, letterSpacing: 0.3 },
});
