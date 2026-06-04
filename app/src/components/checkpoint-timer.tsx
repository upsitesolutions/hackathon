import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type NotificationRequest = {
  activeStepId: string;
  activeStepLabel: string;
  checkpointMinutes: number;
  dueAt: Date;
};

type NotificationsModule = {
  AndroidImportance?: {
    DEFAULT?: number;
  };
  SchedulableTriggerInputTypes?: {
    TIME_INTERVAL?: string;
  };
  cancelScheduledNotificationAsync?: (identifier: string) => Promise<void>;
  getPermissionsAsync?: () => Promise<{ granted?: boolean; status?: string }>;
  requestPermissionsAsync?: () => Promise<{ granted?: boolean; status?: string }>;
  scheduleNotificationAsync?: (request: {
    content: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
    };
    trigger:
      | {
          type?: string;
          seconds: number;
        }
      | null;
  }) => Promise<string>;
  setNotificationChannelAsync?: (
    channelId: string,
    input: { importance?: number; name: string }
  ) => Promise<void>;
};

export type CheckpointTimerNotificationAdapter = {
  schedule: (request: NotificationRequest) => Promise<string | null>;
  cancel: (identifier: string) => Promise<void>;
};

export type CheckpointTimerProps = {
  activeStepId: string;
  activeStepLabel: string;
  checkpointMinutes: number;
  onCheckNow: () => void | Promise<void>;
  onDueChange?: (isDue: boolean) => void;
  enableNotifications?: boolean;
  notificationAdapter?: CheckpointTimerNotificationAdapter | null;
  style?: StyleProp<ViewStyle>;
};

export function CheckpointTimer({
  activeStepId,
  activeStepLabel,
  checkpointMinutes,
  enableNotifications = false,
  notificationAdapter,
  onCheckNow,
  onDueChange,
  style,
}: CheckpointTimerProps) {
  const theme = useTheme();
  const dueStateRef = useRef<boolean | null>(null);
  const durationMs = Math.max(0, Math.round(checkpointMinutes * 60 * 1000));
  const [startedAt, setStartedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());

  const deadline = startedAt + durationMs;
  const remainingMs = Math.max(0, deadline - now);
  const isDue = durationMs === 0 || remainingMs === 0;

  const resolvedNotificationAdapter = useMemo(
    () =>
      notificationAdapter === undefined
        ? enableNotifications
          ? createExpoNotificationsAdapter()
          : null
        : notificationAdapter,
    [enableNotifications, notificationAdapter]
  );

  useEffect(() => {
    const nextStart = Date.now();
    setStartedAt(nextStart);
    setNow(nextStart);
    dueStateRef.current = null;
  }, [activeStepId, checkpointMinutes]);

  useEffect(() => {
    if (durationMs === 0) {
      return;
    }

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [durationMs, activeStepId]);

  useEffect(() => {
    if (dueStateRef.current === isDue) {
      return;
    }

    dueStateRef.current = isDue;
    onDueChange?.(isDue);
  }, [isDue, onDueChange]);

  useEffect(() => {
    if (!resolvedNotificationAdapter || durationMs === 0) {
      return;
    }

    let active = true;
    let scheduledIdentifier: string | null = null;

    void resolvedNotificationAdapter
      .schedule({
        activeStepId,
        activeStepLabel,
        checkpointMinutes,
        dueAt: new Date(deadline),
      })
      .then(async (identifier) => {
        if (!identifier) {
          return;
        }

        if (!active) {
          await resolvedNotificationAdapter.cancel(identifier);
          return;
        }

        scheduledIdentifier = identifier;
      })
      .catch(() => {
        scheduledIdentifier = null;
      });

    return () => {
      active = false;

      if (scheduledIdentifier) {
        void resolvedNotificationAdapter.cancel(scheduledIdentifier);
      }
    };
  }, [
    activeStepId,
    activeStepLabel,
    checkpointMinutes,
    deadline,
    durationMs,
    resolvedNotificationAdapter,
  ]);

  const handleCheckNow = useCallback(() => {
    void onCheckNow();
  }, [onCheckNow]);

  return (
    <ThemedView
      style={[
        styles.container,
        {
          backgroundColor: isDue ? '#FFF4D6' : theme.backgroundElement,
          borderColor: isDue ? '#F4C76A' : 'transparent',
        },
        style,
      ]}>
      <ThemedView style={styles.copyBlock}>
        <ThemedText type="small" themeColor={isDue ? undefined : 'textSecondary'}>
          {isDue ? 'Checkpoint due' : 'Checkpoint timer'}
        </ThemedText>
        <ThemedText type="smallBold" style={styles.stepLabel}>
          {isDue ? `Time to check your ${activeStepLabel}` : activeStepLabel}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {isDue
            ? 'Tap to open the next camera check for this step.'
            : `${formatRemainingTime(remainingMs)} remaining before the next visual check.`}
        </ThemedText>
      </ThemedView>

      <Pressable
        accessibilityRole="button"
        onPress={handleCheckNow}
        style={({ pressed }) => [
          isDue ? styles.primaryAction : styles.secondaryAction,
          {
            backgroundColor: isDue
              ? pressed
                ? '#111111'
                : '#1A1A1A'
              : pressed
                ? theme.backgroundSelected
                : theme.background,
          },
        ]}>
        <ThemedText style={isDue ? styles.primaryActionText : undefined}>
          {isDue ? 'Check now' : 'Check early'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function createExpoNotificationsAdapter(): CheckpointTimerNotificationAdapter | null {
  const notifications = optionalRequire<NotificationsModule>('expo-notifications');

  if (!notifications?.scheduleNotificationAsync) {
    return null;
  }

  return {
    schedule: async ({ activeStepId, activeStepLabel, dueAt }) => {
      const currentPermissions = await notifications.getPermissionsAsync?.();
      let isGranted =
        currentPermissions?.granted === true || currentPermissions?.status === 'granted';

      if (!isGranted) {
        const requestedPermissions = await notifications.requestPermissionsAsync?.();
        isGranted =
          requestedPermissions?.granted === true || requestedPermissions?.status === 'granted';
      }

      if (!isGranted) {
        return null;
      }

      if (
        Platform.OS === 'android' &&
        notifications.setNotificationChannelAsync &&
        notifications.AndroidImportance?.DEFAULT
      ) {
        await notifications.setNotificationChannelAsync('checkpoint-reminders', {
          name: 'Checkpoint reminders',
          importance: notifications.AndroidImportance.DEFAULT,
        });
      }

      const seconds = Math.max(1, Math.ceil((dueAt.getTime() - Date.now()) / 1000));

      return notifications.scheduleNotificationAsync({
        content: {
          title: 'Cooking checkpoint',
          body: `Time to check your ${activeStepLabel}`,
          data: {
            activeStepId,
          },
        },
        trigger: notifications.SchedulableTriggerInputTypes?.TIME_INTERVAL
          ? {
              type: notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds,
            }
          : {
              seconds,
            },
      });
    },
    cancel: async (identifier) => {
      await notifications.cancelScheduledNotificationAsync?.(identifier);
    },
  };
}

function formatRemainingTime(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function optionalRequire<T>(moduleName: string): T | null {
  try {
    return require(moduleName) as T;
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.three,
  },
  copyBlock: {
    gap: Spacing.one,
  },
  stepLabel: {
    fontSize: 18,
    lineHeight: 24,
  },
  primaryAction: {
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  secondaryAction: {
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  primaryActionText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
