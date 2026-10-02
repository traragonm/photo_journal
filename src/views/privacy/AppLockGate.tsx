import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button } from '@/components';
import { useAppLock } from '@/viewmodels/useAppLock';
import { borderRadius, colors, spacing } from '@/theme';

const LOCK_ICON_SIZE = 34;
const LOCK_BADGE_SIZE = 84;
const OVERLAY_Z_INDEX = 1000;

/**
 * Wraps the app. Children stay mounted (navigation state survives) but are covered by an opaque,
 * touch-blocking paper screen while locked. Never locks on web.
 */
export function AppLockGate({ children }: { children: ReactNode }) {
  const { locked, authenticating, failed, unlock } = useAppLock();

  return (
    <View style={styles.root}>
      <View
        style={styles.root}
        accessibilityElementsHidden={locked}
        importantForAccessibility={locked ? 'no-hide-descendants' : 'auto'}
      >
        {children}
      </View>
      {locked ? (
        <View
          style={styles.overlay}
          pointerEvents="auto"
          accessibilityViewIsModal
          accessibilityLabel="Nhật ký đang khoá"
        >
          <View style={styles.badge}>
            <Ionicons name="lock-closed" size={LOCK_ICON_SIZE} color={colors.ink} />
          </View>
          <AppText variant="heading" align="center" accessibilityRole="header">
            Nhật ký đang khoá
          </AppText>
          <AppText variant="body" color="textMuted" align="center">
            Dùng Face ID, vân tay hoặc mật mã của máy để xem ảnh.
          </AppText>
          <Button
            label="Mở khoá"
            icon="finger-print"
            onPress={unlock}
            loading={authenticating}
            accessibilityHint="Mở hộp thoại xác thực của thiết bị"
          />
          {failed ? (
            <AppText variant="caption" color="accentText" align="center" accessibilityLiveRegion="polite">
              Chưa mở khoá được. Thử lại nhé.
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: OVERLAY_Z_INDEX,
    elevation: OVERLAY_Z_INDEX,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xxl,
  },
  badge: {
    width: LOCK_BADGE_SIZE,
    height: LOCK_BADGE_SIZE,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
