import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CameraPermission = {
  granted: boolean;
  canAskAgain?: boolean;
  status?: string;
};

type CameraCaptureAsset = {
  uri: string;
  width: number;
  height: number;
};

type ProcessedCaptureAsset = CameraCaptureAsset & {
  base64: string;
  mimeType: 'image/jpeg';
};

type CameraViewHandle = {
  takePictureAsync: (options?: Record<string, unknown>) => Promise<CameraCaptureAsset>;
};

type CameraModule = {
  CameraView: React.ComponentType<Record<string, unknown>>;
  useCameraPermissions: () => [CameraPermission | null, () => Promise<CameraPermission>];
};

type ImageManipulatorModule = {
  ImageManipulator?: {
    manipulate: (uri: string) => {
      resize: (size: { width: number | null; height: number | null }) => unknown;
      renderAsync: () => Promise<{
        saveAsync: (options?: Record<string, unknown>) => Promise<ProcessedCaptureAsset>;
      }>;
    };
  };
  SaveFormat?: {
    JPEG?: string;
  };
  manipulateAsync?: (
    uri: string,
    actions: Array<{ resize: { width?: number; height?: number } }>,
    options?: Record<string, unknown>
  ) => Promise<ProcessedCaptureAsset>;
};

const expoCameraModule = optionalRequire<CameraModule>('expo-camera');
const expoImageManipulatorModule = optionalRequire<ImageManipulatorModule>(
  'expo-image-manipulator'
);

export type CameraAssessmentPayload = ProcessedCaptureAsset & {
  capturedAt: string;
};

export type CameraCaptureProps<TVerdict = unknown> = {
  visible: boolean;
  onClose: () => void;
  onAssess: (payload: CameraAssessmentPayload) => Promise<TVerdict>;
  onAssessmentComplete?: (verdict: TVerdict, payload: CameraAssessmentPayload) => void;
  onAssessmentError?: (error: Error, payload?: CameraAssessmentPayload) => void;
  renderVerdict?: (verdict: TVerdict) => ReactNode;
  title?: string;
  subtitle?: string;
  stepLabel?: string;
  captureLabel?: string;
  closeLabel?: string;
};

export function CameraCapture<TVerdict = unknown>(props: CameraCaptureProps<TVerdict>) {
  if (!expoCameraModule?.CameraView || !expoCameraModule.useCameraPermissions) {
    return <CameraCaptureUnavailable {...props} />;
  }

  return <CameraCaptureEnabled {...props} cameraModule={expoCameraModule} />;
}

function CameraCaptureEnabled<TVerdict = unknown>({
  cameraModule,
  captureLabel = 'Capture and assess',
  closeLabel = 'Close',
  onAssess,
  onAssessmentComplete,
  onAssessmentError,
  onClose,
  renderVerdict,
  stepLabel,
  subtitle,
  title = 'Check your progress',
  visible,
}: CameraCaptureProps<TVerdict> & { cameraModule: CameraModule }) {
  const theme = useTheme();
  const cameraRef = useRef<CameraViewHandle | null>(null);
  const isMountedRef = useRef(true);
  const [permission, requestPermission] = cameraModule.useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back');
  const [isAssessing, setIsAssessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latestCapture, setLatestCapture] = useState<CameraCaptureAsset | null>(null);
  const [latestVerdict, setLatestVerdict] = useState<TVerdict | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      setErrorMessage(null);
      setIsAssessing(false);
      setLatestCapture(null);
      setLatestVerdict(null);
      setCameraFacing('back');
    }
  }, [visible]);

  const permissionState = permission?.granted
    ? 'granted'
    : permission?.canAskAgain
      ? 'requestable'
      : 'blocked';

  const handleRequestPermission = useCallback(async () => {
    const nextPermission = await requestPermission();

    if (nextPermission.granted) {
      setErrorMessage(null);
      return;
    }

    setErrorMessage('Camera access is required to assess the current checkpoint.');
  }, [requestPermission]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isAssessing) {
      return;
    }

    try {
      setErrorMessage(null);
      setLatestVerdict(null);

      const rawCapture = await cameraRef.current.takePictureAsync({
        base64: false,
        exif: false,
        quality: 1,
        skipProcessing: false,
      });

      const payload = await prepareAssessmentPayload(rawCapture);

      if (!isMountedRef.current) {
        return;
      }

      setLatestCapture({
        uri: payload.uri,
        width: payload.width,
        height: payload.height,
      });
      setIsAssessing(true);

      const verdict = await onAssess(payload);

      if (!isMountedRef.current) {
        return;
      }

      setLatestVerdict(verdict);
      onAssessmentComplete?.(verdict, payload);
    } catch (error) {
      const normalizedError = normalizeError(error);

      if (!isMountedRef.current) {
        return;
      }

      setErrorMessage(normalizedError.message);
      onAssessmentError?.(normalizedError);
    } finally {
      if (isMountedRef.current) {
        setIsAssessing(false);
      }
    }
  }, [isAssessing, onAssess, onAssessmentComplete, onAssessmentError]);

  const verdictContent = useMemo(() => {
    if (!latestVerdict) {
      return null;
    }

    if (renderVerdict) {
      return renderVerdict(latestVerdict);
    }

    return <DefaultVerdict verdict={latestVerdict} />;
  }, [latestVerdict, renderVerdict]);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : 'fullScreen'}
      statusBarTranslucent
      visible={visible}>
      <ThemedView style={styles.modalRoot}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
          <View style={styles.sheet}>
            <ThemedView style={styles.header}>
              <Pressable
                accessibilityRole="button"
                disabled={isAssessing}
                onPress={onClose}
                style={({ pressed }) => [
                  styles.headerButton,
                  { opacity: isAssessing ? 0.4 : pressed ? 0.7 : 1 },
                ]}>
                <ThemedText type="smallBold">{closeLabel}</ThemedText>
              </Pressable>

              <ThemedView style={styles.headerText}>
                <ThemedText type="small" themeColor="textSecondary">
                  {stepLabel ? `Checkpoint • ${stepLabel}` : 'Camera checkpoint'}
                </ThemedText>
                <ThemedText type="subtitle" style={styles.headerTitle}>
                  {title}
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  {subtitle ?? 'Capture a clear photo so the parent screen can assess this step.'}
                </ThemedText>
              </ThemedView>
            </ThemedView>

            {permissionState === 'granted' ? (
              <View style={styles.cameraStack}>
                <View style={styles.cameraFrame}>
                  <cameraModule.CameraView
                    active={visible && !isAssessing}
                    animateShutter
                    autofocus="on"
                    facing={cameraFacing}
                    flash="off"
                    mode="picture"
                    mirror={cameraFacing === 'front'}
                    onMountError={(event: { message?: string }) =>
                      setErrorMessage(event?.message ?? 'Camera preview could not start.')
                    }
                    ref={cameraRef}
                    style={StyleSheet.absoluteFill}
                  />

                  {isAssessing ? (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator color="#ffffff" size="large" />
                      <ThemedText style={styles.loadingText}>Assessing your checkpoint…</ThemedText>
                    </View>
                  ) : null}
                </View>

                <ThemedView style={styles.actionsRow}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isAssessing}
                    onPress={() =>
                      setCameraFacing((current) => (current === 'back' ? 'front' : 'back'))
                    }
                    style={({ pressed }) => [
                      styles.secondaryAction,
                      {
                        backgroundColor: pressed
                          ? theme.backgroundSelected
                          : theme.backgroundElement,
                        opacity: isAssessing ? 0.5 : 1,
                      },
                    ]}>
                    <ThemedText type="smallBold">Flip</ThemedText>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    disabled={isAssessing}
                    onPress={handleCapture}
                    style={({ pressed }) => [
                      styles.captureAction,
                      {
                        backgroundColor: pressed ? Colors.dark.backgroundSelected : '#111111',
                        opacity: isAssessing ? 0.5 : 1,
                      },
                    ]}>
                    <ThemedText style={styles.captureActionText}>{captureLabel}</ThemedText>
                  </Pressable>
                </ThemedView>
              </View>
            ) : (
              <ThemedView type="backgroundElement" style={styles.permissionCard}>
                <ThemedText type="subtitle" style={styles.permissionTitle}>
                  Camera access needed
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.permissionBody}>
                  {permissionState === 'requestable'
                    ? 'Allow camera access to capture a checkpoint photo.'
                    : 'Camera access is unavailable. Please enable it in Settings before checking this step.'}
                </ThemedText>

                {permissionState === 'requestable' ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleRequestPermission}
                    style={({ pressed }) => [
                      styles.captureAction,
                      {
                        alignSelf: 'flex-start',
                        backgroundColor: pressed ? Colors.dark.backgroundSelected : '#111111',
                      },
                    ]}>
                    <ThemedText style={styles.captureActionText}>Allow camera</ThemedText>
                  </Pressable>
                ) : null}
              </ThemedView>
            )}

            {errorMessage ? (
              <ThemedView type="backgroundElement" style={styles.feedbackCard}>
                <ThemedText type="smallBold">Something went wrong</ThemedText>
                <ThemedText themeColor="textSecondary">{errorMessage}</ThemedText>
              </ThemedView>
            ) : null}

            {latestCapture ? (
              <ThemedView type="backgroundElement" style={styles.feedbackCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  Latest capture
                </ThemedText>
                <Image source={{ uri: latestCapture.uri }} style={styles.previewImage} />
                <ThemedText themeColor="textSecondary" type="small">
                  {latestCapture.width} × {latestCapture.height} px
                </ThemedText>
              </ThemedView>
            ) : null}

            {verdictContent ? (
              <ThemedView type="backgroundElement" style={styles.feedbackCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  Assessment
                </ThemedText>
                {verdictContent}
              </ThemedView>
            ) : null}
          </View>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

function CameraCaptureUnavailable<TVerdict = unknown>({
  closeLabel = 'Close',
  onClose,
  visible,
}: CameraCaptureProps<TVerdict>) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent
      visible={visible}>
      <ThemedView style={styles.modalRoot}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
          <View style={styles.sheet}>
            <ThemedView type="backgroundElement" style={styles.permissionCard}>
              <ThemedText type="subtitle" style={styles.permissionTitle}>
                Camera module unavailable
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.permissionBody}>
                This component expects expo-camera and expo-image-manipulator to be installed for
                native capture and resizing.
              </ThemedText>

              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.captureAction,
                  {
                    alignSelf: 'flex-start',
                    backgroundColor: pressed ? Colors.dark.backgroundSelected : '#111111',
                  },
                ]}>
                <ThemedText style={styles.captureActionText}>{closeLabel}</ThemedText>
              </Pressable>
            </ThemedView>
          </View>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

function DefaultVerdict({ verdict }: { verdict: unknown }) {
  if (typeof verdict === 'string') {
    return <ThemedText>{verdict}</ThemedText>;
  }

  if (typeof verdict === 'object' && verdict) {
    const summary =
      typeof getObjectProperty(verdict, 'summary') === 'string'
        ? (getObjectProperty(verdict, 'summary') as string)
        : null;
    const label =
      typeof getObjectProperty(verdict, 'verdict') === 'string'
        ? (getObjectProperty(verdict, 'verdict') as string)
        : null;
    const guidance =
      typeof getObjectProperty(verdict, 'guidance') === 'string'
        ? (getObjectProperty(verdict, 'guidance') as string)
        : null;

    return (
      <View style={styles.verdictStack}>
        {label ? <ThemedText type="smallBold">{label}</ThemedText> : null}
        {summary ? <ThemedText>{summary}</ThemedText> : null}
        {guidance ? (
          <ThemedText themeColor="textSecondary" style={styles.verdictGuidance}>
            {guidance}
          </ThemedText>
        ) : null}
        {!label && !summary && !guidance ? (
          <ThemedText themeColor="textSecondary">Assessment complete.</ThemedText>
        ) : null}
      </View>
    );
  }

  return <ThemedText themeColor="textSecondary">Assessment complete.</ThemedText>;
}

async function prepareAssessmentPayload(capture: CameraCaptureAsset): Promise<CameraAssessmentPayload> {
  if (!expoImageManipulatorModule) {
    throw new Error('expo-image-manipulator is required to resize checkpoint images.');
  }

  const largestEdge = Math.max(capture.width, capture.height);
  const resizeScale = largestEdge > 1024 ? 1024 / largestEdge : 1;
  const targetWidth = resizeScale < 1 ? Math.round(capture.width * resizeScale) : capture.width;
  const targetHeight =
    resizeScale < 1 ? Math.round(capture.height * resizeScale) : capture.height;
  const saveOptions = {
    base64: true,
    compress: 0.8,
    format: expoImageManipulatorModule.SaveFormat?.JPEG ?? 'jpeg',
  };

  let processed: ProcessedCaptureAsset;

  if (expoImageManipulatorModule.ImageManipulator?.manipulate) {
    const manipulationContext = expoImageManipulatorModule.ImageManipulator.manipulate(capture.uri);

    if (resizeScale < 1) {
      manipulationContext.resize({
        width: targetWidth,
        height: targetHeight,
      });
    }

    const rendered = await manipulationContext.renderAsync();
    processed = await rendered.saveAsync(saveOptions);
  } else if (expoImageManipulatorModule.manipulateAsync) {
    processed = await expoImageManipulatorModule.manipulateAsync(
      capture.uri,
      resizeScale < 1 ? [{ resize: { width: targetWidth, height: targetHeight } }] : [],
      saveOptions
    );
  } else {
    throw new Error('expo-image-manipulator does not expose a supported resize API.');
  }

  if (!processed.base64) {
    throw new Error('Resized checkpoint image did not include a base64 payload.');
  }

  return {
    ...processed,
    base64: processed.base64,
    capturedAt: new Date().toISOString(),
    mimeType: 'image/jpeg',
  };
}

function getObjectProperty(source: object, key: string) {
  return (source as Record<string, unknown>)[key];
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  return new Error(typeof error === 'string' ? error : 'Unknown camera capture error.');
}

function optionalRequire<T>(moduleName: string): T | null {
  try {
    return require(moduleName) as T;
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
  },
  sheet: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  header: {
    gap: Spacing.two,
  },
  headerButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  headerText: {
    gap: Spacing.one,
  },
  headerTitle: {
    fontSize: 34,
    lineHeight: 40,
  },
  cameraStack: {
    gap: Spacing.three,
  },
  cameraFrame: {
    minHeight: 420,
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#000000',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  secondaryAction: {
    minWidth: 92,
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureAction: {
    flexGrow: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureActionText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  permissionCard: {
    gap: Spacing.two,
    borderRadius: 24,
    padding: Spacing.four,
  },
  permissionTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  permissionBody: {
    maxWidth: 520,
  },
  feedbackCard: {
    gap: Spacing.two,
    borderRadius: 24,
    padding: Spacing.three,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 18,
    resizeMode: 'cover',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
  },
  loadingText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  verdictStack: {
    gap: Spacing.one,
  },
  verdictGuidance: {
    lineHeight: 22,
  },
});
