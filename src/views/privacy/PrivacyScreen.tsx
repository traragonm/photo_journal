import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Button, IconButton } from '@/components';
import { AppLockService, type AppLockSupport } from '@/services/AppLockService';
import { LOCK_AFTER_BACKGROUND_MS } from '@/viewmodels/useAppLock';
import type { PermissionStatus, SettingsViewModel } from '@/viewmodels/useSettingsViewModel';
import { Hairline, SettingsGroup } from '@/views/settings/SettingsGroup';
import { ToggleRow } from '@/views/settings/SettingsRows';
import { borderRadius, colors, spacing } from '@/theme';
import {
  CARD_PADDING_X,
  ROW_HEIGHT,
  SECTION_GAP,
  SHEET_BOTTOM_PADDING,
  SHEET_PADDING,
  SHEET_TOP_PADDING,
} from '@/views/settings/settingsConstants';

type PrivacyViewModel = Pick<
  SettingsViewModel,
  | 'cameraPermission'
  | 'locationPermission'
  | 'placeNamesEnabled'
  | 'autoWeatherEnabled'
  | 'appLockEnabled'
  | 'appLockSupport'
  | 'photoCount'
  | 'isDeleting'
  | 'fixCameraPermission'
  | 'fixLocationPermission'
  | 'setPlaceNamesEnabled'
  | 'setAutoWeatherEnabled'
  | 'setAppLockEnabled'
  | 'confirmDeleteAll'
>;

interface PrivacyScreenProps {
  viewModel: PrivacyViewModel;
  onBack: () => void;
}

const STATUS_TEXT: Record<PermissionStatus, string> = {
  granted: 'Đã cho phép',
  denied: 'Đã chặn trong Cài đặt của máy',
  undetermined: 'Chưa cấp quyền',
};
const LOCK_SECONDS = LOCK_AFTER_BACKGROUND_MS / 1000;

function appLockNote(support: AppLockSupport): string {
  if (!AppLockService.isPlatformSupported) return 'Chỉ có trên điện thoại. Trình duyệt không có khoá an toàn của máy.';
  if (support === 'unsupported') return 'Thiết bị này không có Face ID hoặc vân tay.';
  if (support === 'not_enrolled') {
    return 'Hãy thêm Face ID hoặc vân tay trong Cài đặt của máy rồi quay lại đây.';
  }
  return `Cần xác thực khi mở app và khi quay lại sau hơn ${LOCK_SECONDS} giây. Có thể dùng mật mã của máy thay thế.`;
}

interface PermissionRowProps {
  label: string;
  status: PermissionStatus;
  onFix: () => void;
}

function PermissionRow({ label, status, onFix }: PermissionRowProps) {
  const granted = status === 'granted';
  return (
    <View style={styles.permissionRow}>
      <View style={styles.permissionText}>
        <AppText variant="body">{label}</AppText>
        <AppText variant="caption" color={granted ? 'textMuted' : 'accentText'}>
          {STATUS_TEXT[status]}
        </AppText>
      </View>
      {granted ? null : (
        <Button
          label={status === 'denied' ? 'Mở Cài đặt' : 'Cho phép'}
          variant="ghost"
          onPress={onFix}
          accessibilityHint={`Sửa quyền ${label.toLowerCase()}`}
        />
      )}
    </View>
  );
}

/** "Quyền riêng tư & khoá app": rendered by SettingsSheet, sliding over the settings body. */
export function PrivacyScreen({ viewModel, onBack }: PrivacyScreenProps) {
  const lockAvailable = viewModel.appLockSupport === 'available';
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" accessibilityLabel="Quay lại" onPress={onBack} />
        <AppText variant="subheading" accessibilityRole="header">
          Quyền riêng tư
        </AppText>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statement}>
          <AppText variant="cardTitle">Ảnh của bạn chỉ nằm trên máy này.</AppText>
          <AppText variant="body" color="textSecondary">
            Không tài khoản, không máy chủ: ảnh, ghi chú và vị trí được lưu ngay trên thiết bị. Chỉ có ba
            trường hợp dùng mạng, đều tuỳ chọn: tên địa điểm (bộ giải mã địa chỉ của điện thoại có thể liên
            hệ Apple hoặc Google), thời tiết tự động (gửi toạ độ làm tròn khoảng 1 km tới Open-Meteo) và ô bản
            đồ (nhà cung cấp bản đồ biết khu vực bạn đang xem, nhưng không bao giờ thấy ảnh).
          </AppText>
        </View>

        <SettingsGroup title="Quyền truy cập">
          <PermissionRow label="Máy ảnh" status={viewModel.cameraPermission} onFix={viewModel.fixCameraPermission} />
          <Hairline />
          <PermissionRow label="Vị trí" status={viewModel.locationPermission} onFix={viewModel.fixLocationPermission} />
        </SettingsGroup>

        <SettingsGroup title="Địa điểm">
          <ToggleRow
            label="Tên địa điểm"
            value={viewModel.placeNamesEnabled}
            onValueChange={viewModel.setPlaceNamesEnabled}
            note="Đổi toạ độ thành tên nơi chốn (ví dụ “Hoàn Kiếm, Hà Nội”) bằng bộ giải mã địa chỉ của hệ điều hành, có thể cần mạng và liên hệ máy chủ của Apple hoặc Google. Tắt thì chỉ lưu toạ độ."
          />
          <Hairline />
          <ToggleRow
            label="Thời tiết tự động"
            value={viewModel.autoWeatherEnabled}
            onValueChange={viewModel.setAutoWeatherEnabled}
            note="Khi mở camera, lấy thời tiết hiện tại ở nơi bạn đứng từ Open-Meteo (chỉ gửi toạ độ làm tròn khoảng 1 km, không gửi ảnh). Cần bật ghi vị trí. Bạn vẫn xoay ô thời tiết bằng tay được."
          />
        </SettingsGroup>

        <SettingsGroup title="Khoá app">
          <ToggleRow
            label="Khoá app bằng Face ID / vân tay"
            value={viewModel.appLockEnabled}
            onValueChange={viewModel.setAppLockEnabled}
            disabled={!lockAvailable && !viewModel.appLockEnabled}
            note={appLockNote(viewModel.appLockSupport)}
          />
        </SettingsGroup>

        <View style={styles.danger}>
          <Button
            label="Xoá toàn bộ ảnh"
            variant="danger"
            icon="trash-outline"
            onPress={viewModel.confirmDeleteAll}
            loading={viewModel.isDeleting}
            accessibilityHint="Xoá mọi ảnh khỏi máy này, cần xác nhận hai lần"
          />
          <AppText variant="caption" color="textMuted" align="center">
            {viewModel.photoCount > 0
              ? `Xoá ${viewModel.photoCount} ảnh khỏi máy này. Không thể hoàn tác.`
              : 'Nhật ký đang trống.'}
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sheet },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: SHEET_PADDING,
    paddingTop: SHEET_TOP_PADDING,
    paddingBottom: spacing.md,
  },
  content: {
    paddingHorizontal: SHEET_PADDING,
    paddingBottom: SHEET_BOTTOM_PADDING,
    gap: SECTION_GAP,
  },
  statement: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.card,
    padding: CARD_PADDING_X,
    gap: spacing.sm,
  },
  permissionRow: {
    minHeight: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  permissionText: { flexShrink: 1 },
  danger: { alignItems: 'center', gap: spacing.xs },
});
