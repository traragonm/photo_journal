import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AppText, Button, SegmentedControl, type SegmentOption } from '@/components';
import type { FrameType } from '@/models';
import { durations, easings, spacing } from '@/theme';
import { useSettingsViewModel } from '@/viewmodels/useSettingsViewModel';
import { PrivacyScreen } from '@/views/privacy/PrivacyScreen';
import { FrameColorPicker } from './FrameColorPicker';
import { ReminderEditor } from './ReminderEditor';
import { Hairline, SettingsGroup } from './SettingsGroup';
import { NavRow, ToggleRow } from './SettingsRows';
import {
  FOOTER_NOTE,
  ROW_HEIGHT_TALL,
  SECTION_GAP,
  SHEET_BOTTOM_PADDING,
  SHEET_PADDING,
  SHEET_TOP_PADDING,
} from './settingsConstants';

const FRAME_OPTIONS: readonly SegmentOption<FrameType>[] = [
  { value: 'mini', label: 'Mini' },
  { value: 'square', label: 'Square' },
  { value: 'wide', label: 'Wide' },
];
const REMINDER_UNSUPPORTED_LABEL = 'Trên điện thoại';
/** Fraction of the width the settings body drifts left while privacy slides in (subtle depth). */
const MAIN_PARALLAX = 0.25;
const SLIDE_EASING = Easing.bezier(...easings.dial);

type Screen = 'main' | 'privacy';

/** Body of the Settings curtain (HomeScreen renders the container, safe-area padding and close handle). */
export function SettingsSheet() {
  const vm = useSettingsViewModel();
  const [screen, setScreen] = useState<Screen>('main');
  const [editingReminder, setEditingReminder] = useState(false);
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withTiming(screen === 'privacy' ? 1 : 0, { duration: durations.pane, easing: SLIDE_EASING }));
  }, [screen, progress]);

  const privacyStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - progress.get()) * width }],
  }));
  const mainStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -progress.get() * width * MAIN_PARALLAX }],
  }));

  const openPrivacy = () => {
    vm.refreshPermissions();
    setScreen('privacy');
  };
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const privacyOpen = screen === 'privacy';

  return (
    <View style={styles.root} onLayout={onLayout}>
      <Animated.View
        style={[styles.fill, mainStyle]}
        pointerEvents={privacyOpen ? 'none' : 'auto'}
        accessibilityElementsHidden={privacyOpen}
        importantForAccessibility={privacyOpen ? 'no-hide-descendants' : 'auto'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AppText variant="title" accessibilityRole="header">
            Cài đặt
          </AppText>

          <SettingsGroup title="Khung ảnh" tall>
            <View style={styles.tallRow}>
              <AppText variant="body">Kiểu khung</AppText>
              <SegmentedControl
                options={FRAME_OPTIONS}
                value={vm.frameType}
                onChange={vm.setFrameType}
                appearance="inset"
                size="compact"
                accessibilityLabel="Kiểu khung mặc định"
              />
            </View>
            <Hairline />
            <View style={styles.tallRow}>
              <AppText variant="body">Màu viền</AppText>
              <FrameColorPicker value={vm.frameColor} onChange={vm.setFrameColor} />
            </View>
          </SettingsGroup>

          <SettingsGroup title="Nhật ký">
            <ToggleRow
              label="Ghi vị trí vào ảnh"
              value={vm.locationEnabled}
              onValueChange={vm.setLocationEnabled}
            >
              {vm.locationBlocked ? (
                <View style={styles.blockedNote} accessibilityLiveRegion="polite">
                  <AppText variant="caption" color="accentText">
                    Vị trí đang bị chặn trong Cài đặt của máy nên ảnh chưa ghi được nơi chụp.
                  </AppText>
                  <Button
                    label="Mở Cài đặt"
                    variant="ghost"
                    onPress={vm.fixLocationPermission}
                    style={styles.startAligned}
                  />
                </View>
              ) : null}
            </ToggleRow>
            <ToggleRow label="Hiệu ứng ảnh hiện dần" value={vm.developEffect} onValueChange={vm.setDevelopEffect} />
            <ToggleRow label="Ghi chú kiểu chữ viết tay" value={vm.handwriting} onValueChange={vm.setHandwriting} />
            <ToggleRow label="Âm thanh màn trập" value={vm.soundEnabled} onValueChange={vm.setSoundEnabled} />
            <ToggleRow label="Rung khi chụp" value={vm.hapticsEnabled} onValueChange={vm.setHapticsEnabled} />
            <NavRow
              label="Nhắc chụp mỗi ngày"
              value={vm.reminder.supported ? vm.reminder.label : REMINDER_UNSUPPORTED_LABEL}
              disabled={!vm.reminder.supported}
              onPress={() => setEditingReminder(true)}
              accessibilityHint="Mở bộ chỉnh giờ nhắc"
            />
          </SettingsGroup>

          <SettingsGroup title="Dữ liệu">
            <NavRow
              label="Sao lưu ra tệp"
              value={vm.backupProgress ?? undefined}
              disabled={vm.backupProgress !== null}
              onPress={vm.exportBackup}
              accessibilityHint="Lưu một bản sao nhật ký thành tệp trên thiết bị"
            />
            <NavRow
              label="Xuất album (PDF / in ảnh)"
              value={vm.albumProgress ?? undefined}
              disabled={vm.albumProgress !== null}
              onPress={vm.exportAlbum}
              accessibilityHint="Tạo album PDF gồm mọi tấm ảnh để lưu hoặc in"
            />
            <NavRow label="Quyền riêng tư & khoá app" onPress={openPrivacy} />
          </SettingsGroup>

          <View style={styles.footer}>
            <AppText variant="caption" color="textMuted" align="center">
              {FOOTER_NOTE}
            </AppText>
            <AppText variant="caption" color="textMuted" align="center">
              {`Nhật ký ảnh · phiên bản ${vm.appVersion}`}
            </AppText>
          </View>
        </ScrollView>
      </Animated.View>

      <Animated.View
        style={[styles.fill, styles.privacy, privacyStyle]}
        pointerEvents={privacyOpen ? 'auto' : 'none'}
        accessibilityElementsHidden={!privacyOpen}
        importantForAccessibility={privacyOpen ? 'auto' : 'no-hide-descendants'}
      >
        <PrivacyScreen viewModel={vm} onBack={() => setScreen('main')} />
      </Animated.View>

      {editingReminder ? (
        <ReminderEditor
          initialEnabled={vm.reminder.enabled}
          initialTime={vm.reminder.time}
          onSave={vm.saveReminder}
          onClose={() => setEditingReminder(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  fill: { flex: 1 },
  privacy: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  content: {
    paddingHorizontal: SHEET_PADDING,
    paddingTop: SHEET_TOP_PADDING,
    paddingBottom: SHEET_BOTTOM_PADDING,
    gap: SECTION_GAP,
  },
  tallRow: {
    minHeight: ROW_HEIGHT_TALL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  blockedNote: { paddingBottom: spacing.sm, gap: spacing.xs },
  startAligned: { alignSelf: 'flex-start', paddingHorizontal: 0 },
  footer: { gap: spacing.xs, paddingTop: spacing.sm },
});
