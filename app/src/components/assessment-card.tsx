import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AssessmentStatus = 'on_track' | 'adjust' | 'done';

type AssessmentCardProps = {
  advice: string;
  onContinue: () => void;
  status: AssessmentStatus;
  title?: string;
  visible: boolean;
};

const STATUS_COPY: Record<
  AssessmentStatus,
  { badge: string; eyebrow: string; tint: string; tintSoft: string }
> = {
  on_track: {
    badge: 'On track',
    eyebrow: 'Keep going',
    tint: '#2D8C5D',
    tintSoft: '#E6F4EC',
  },
  adjust: {
    badge: 'Adjust',
    eyebrow: 'Quick rescue',
    tint: '#C96D00',
    tintSoft: '#FFF1DF',
  },
  done: {
    badge: 'Done',
    eyebrow: 'You recovered it',
    tint: '#5765F2',
    tintSoft: '#E9EBFF',
  },
};

export function AssessmentCard({
  advice,
  onContinue,
  status,
  title = 'Sous assessment',
  visible,
}: AssessmentCardProps) {
  const theme = useTheme();
  const statusCopy = STATUS_COPY[status];

  return (
    <Modal
      animationType="slide"
      onRequestClose={onContinue}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Dismiss assessment" onPress={onContinue} style={styles.scrim} />

        <ThemedView type="background" style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={styles.header}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: statusCopy.tintSoft,
                  borderColor: statusCopy.tint,
                },
              ]}>
              <ThemedText style={[styles.badgeText, { color: statusCopy.tint }]}>
                {statusCopy.badge}
              </ThemedText>
            </View>

            <ThemedText type="small" themeColor="textSecondary">
              {statusCopy.eyebrow}
            </ThemedText>
            <ThemedText type="subtitle" style={styles.title}>
              {title}
            </ThemedText>
          </View>

          <ThemedView
            type="backgroundElement"
            style={[styles.advicePanel, { borderColor: theme.backgroundSelected }]}>
            <ThemedText style={styles.adviceText}>{advice}</ThemedText>
          </ThemedView>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue"
            onPress={onContinue}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: pressed ? theme.backgroundSelected : theme.text,
              },
            ]}>
            <ThemedText style={[styles.buttonText, { color: theme.background }]}>Continue</ThemedText>
          </Pressable>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  sheet: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: -8,
    },
    elevation: 18,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: Spacing.two,
    backgroundColor: '#C7CBD1',
    marginBottom: Spacing.one,
  },
  header: {
    gap: Spacing.one,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: Platform.select({ ios: 30, default: 28 }) ?? 28,
    lineHeight: Platform.select({ ios: 38, default: 36 }) ?? 36,
  },
  advicePanel: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
  },
  adviceText: {
    fontSize: Platform.select({ ios: 24, default: 22 }) ?? 22,
    lineHeight: Platform.select({ ios: 32, default: 30 }) ?? 30,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  button: {
    minHeight: 56,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
  },
  buttonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
});
