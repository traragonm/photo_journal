import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, printRotations, spacing } from '@/theme';
import { useFrameStyle } from '@/viewmodels/shared';
import { AppText } from './AppText';
import { Button } from './Button';
import { PolaroidFrame } from './PolaroidFrame';

export interface EmptyStateProps {
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Handwritten note on the blank print. */
  note?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Smaller print, for sheets and cards. */
  compact?: boolean;
}

const PRINT_WIDTH = 150;
const PRINT_WIDTH_COMPACT = 96;
const ICON_SIZE = 30;
const BACK_OFFSET = 14;

/** A blank, undeveloped print with a handwritten note — never a cold, empty screen. */
export function EmptyState({
  title,
  message,
  icon = 'camera-outline',
  note = 'chưa có gì…',
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateProps) {
  const { frame, captionVariant } = useFrameStyle();
  const width = compact ? PRINT_WIDTH_COMPACT : PRINT_WIDTH;
  return (
    <View style={styles.container}>
      <View style={styles.stack}>
        <PolaroidFrame
          width={width}
          colorStyle={frame}
          rotation={printRotations[1]}
          shadow="soft"
          style={[styles.back, { left: BACK_OFFSET }]}
          image={<View style={styles.blank} />}
        />
        <PolaroidFrame
          width={width}
          colorStyle={frame}
          rotation={printRotations[2]}
          image={
            <View style={[styles.blank, styles.center]}>
              <Ionicons name={icon} size={ICON_SIZE} color={colors.muted} />
            </View>
          }
          footer={
            <AppText variant={captionVariant} style={{ color: frame.inkSoft }}>
              {note}
            </AppText>
          }
        />
      </View>
      <AppText variant={compact ? 'cardTitle' : 'subheading'} align="center">
        {title}
      </AppText>
      <AppText variant="body" color="textMuted" align="center" style={styles.message}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} icon="camera-outline" variant="accent" style={styles.action} />
      ) : null}
    </View>
  );
}

const MESSAGE_MAX_WIDTH = 280;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.sm,
  },
  stack: {
    marginBottom: spacing.xl,
  },
  back: {
    position: 'absolute',
    top: BACK_OFFSET / 2,
  },
  blank: {
    flex: 1,
    backgroundColor: colors.chip,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    maxWidth: MESSAGE_MAX_WIDTH,
  },
  action: {
    marginTop: spacing.md,
  },
});
