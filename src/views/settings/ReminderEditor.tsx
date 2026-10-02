import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, IconButton, Toggle } from '@/components';
import {
  clockOrDefault,
  formatReminderTime,
  REMINDER_MINUTE_STEP,
  shiftHour,
  shiftMinute,
  type ReminderClock,
} from '@/services/reminderTime';
import { borderRadius, colors, shadows, spacing } from '@/theme';
import { ROW_HEIGHT_TALL, SHEET_PADDING } from './settingsConstants';

const STEPPER_VALUE_WIDTH = 36;
const DEFAULT_CLOCK: ReminderClock = { hour: 20, minute: 0 };
const TIME_FONT_SIZE = 44;
const STEPPER_ICON_SIZE = 22;

interface ReminderEditorProps {
  initialEnabled: boolean;
  initialTime: string;
  /** Resolves true when saved; the editor closes then. */
  onSave: (enabled: boolean, time: string) => Promise<boolean>;
  onClose: () => void;
}

interface StepperProps {
  label: string;
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  disabled: boolean;
}

function Stepper({ label, value, onDecrease, onIncrease, disabled }: StepperProps) {
  return (
    <View style={styles.stepper}>
      <AppText variant="eyebrow" color="textMuted">
        {label}
      </AppText>
      <View style={styles.stepperRow}>
        <IconButton
          icon="remove"
          iconSize={STEPPER_ICON_SIZE}
          accessibilityLabel={`Giảm ${label.toLowerCase()}`}
          onPress={onDecrease}
          disabled={disabled}
        />
        <AppText variant="subheading" align="center" style={styles.stepperValue} accessibilityLiveRegion="polite">
          {String(value).padStart(2, '0')}
        </AppText>
        <IconButton
          icon="add"
          iconSize={STEPPER_ICON_SIZE}
          accessibilityLabel={`Tăng ${label.toLowerCase()}`}
          onPress={onIncrease}
          disabled={disabled}
        />
      </View>
    </View>
  );
}

/** Small bottom sheet (sheet styling) to switch the daily reminder on/off and pick its time. */
export function ReminderEditor({ initialEnabled, initialTime, onSave, onClose }: ReminderEditorProps) {
  const insets = useSafeAreaInsets();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [clock, setClock] = useState<ReminderClock>(() => clockOrDefault(initialTime, DEFAULT_CLOCK));
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    onSave(enabled, formatReminderTime(clock))
      .then((saved) => {
        if (saved) onClose();
      })
      .finally(() => setSaving(false));
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Đóng"
        />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, shadows.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg }]}
        >
          <AppText variant="subheading" accessibilityRole="header">
            Nhắc chụp mỗi ngày
          </AppText>
          <View style={styles.toggleRow}>
            <AppText variant="body">Bật nhắc nhở</AppText>
            <Toggle value={enabled} onValueChange={setEnabled} accessibilityLabel="Bật nhắc chụp mỗi ngày" />
          </View>
          <AppText
            variant="heading"
            align="center"
            style={[styles.time, !enabled && styles.timeOff]}
            accessibilityLabel={`Giờ nhắc ${formatReminderTime(clock)}`}
          >
            {formatReminderTime(clock)}
          </AppText>
          <View style={styles.steppers}>
            <Stepper
              label="Giờ"
              value={clock.hour}
              onDecrease={() => setClock((c) => shiftHour(c, -1))}
              onIncrease={() => setClock((c) => shiftHour(c, 1))}
              disabled={!enabled}
            />
            <Stepper
              label="Phút"
              value={clock.minute}
              onDecrease={() => setClock((c) => shiftMinute(c, -REMINDER_MINUTE_STEP))}
              onIncrease={() => setClock((c) => shiftMinute(c, REMINDER_MINUTE_STEP))}
              disabled={!enabled}
            />
          </View>
          <AppText variant="caption" color="textMuted">
            Lời nhắc là thông báo ngay trên máy, không gửi dữ liệu đi đâu.
          </AppText>
          <View style={styles.actions}>
            <Button label="Huỷ" variant="secondary" onPress={onClose} disabled={saving} />
            <Button label="Xong" onPress={save} loading={saving} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: borderRadius.sheet,
    borderTopRightRadius: borderRadius.sheet,
    paddingHorizontal: SHEET_PADDING,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: borderRadius.card,
    paddingHorizontal: spacing.lg,
    minHeight: ROW_HEIGHT_TALL,
  },
  time: { fontSize: TIME_FONT_SIZE, lineHeight: TIME_FONT_SIZE + spacing.sm },
  timeOff: { color: colors.faint },
  steppers: { flexDirection: 'row', justifyContent: 'space-around' },
  stepper: { alignItems: 'center', gap: spacing.sm },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepperValue: { minWidth: STEPPER_VALUE_WIDTH },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
});
