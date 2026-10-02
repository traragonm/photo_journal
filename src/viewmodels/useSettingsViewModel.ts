import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import Constants from 'expo-constants';
import type { FrameColor, FrameType } from '@/models';
import { AlbumService } from '@/services/AlbumService';
import { useAppServices } from '@/services/AppServices';
import { AppLockService, type AppLockSupport } from '@/services/AppLockService';
import { Dialog } from '@/services/Dialog';
import { ExportService } from '@/services/ExportService';
import { LocationService, type LocationPermission } from '@/services/LocationService';
import { openPermissionSettings } from '@/services/openPermissionSettings';
import { ReminderService } from '@/services/ReminderService';
import { usePhotoStore, useSettings } from './shared';

export type PermissionStatus = LocationPermission;

export interface ReminderState {
  /** False on web: browsers can't schedule daily local notifications. */
  supported: boolean;
  enabled: boolean;
  /** "HH:MM" */
  time: string;
  /** "20:00" or "Tắt" */
  label: string;
}

export interface SettingsViewModel {
  // Khung ảnh
  frameType: FrameType;
  frameColor: FrameColor;
  setFrameType: (value: FrameType) => void;
  setFrameColor: (value: FrameColor) => void;
  // Nhật ký
  locationEnabled: boolean;
  /** Location is switched on but the OS blocks it: show the inline note + settings shortcut. */
  locationBlocked: boolean;
  developEffect: boolean;
  handwriting: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  setLocationEnabled: (enabled: boolean) => void;
  setDevelopEffect: (enabled: boolean) => void;
  setHandwriting: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  reminder: ReminderState;
  /** Applies the editor result. Resolves true when saved (false → keep the editor open). */
  saveReminder: (enabled: boolean, time: string) => Promise<boolean>;
  // Dữ liệu
  /** "Đang sao chép 3/12" while backing up, else null. */
  backupProgress: string | null;
  albumProgress: string | null;
  exportBackup: () => void;
  exportAlbum: () => void;
  // Quyền riêng tư
  cameraPermission: PermissionStatus;
  locationPermission: PermissionStatus;
  placeNamesEnabled: boolean;
  appLockEnabled: boolean;
  appLockSupport: AppLockSupport;
  photoCount: number;
  isDeleting: boolean;
  fixCameraPermission: () => void;
  fixLocationPermission: () => void;
  refreshPermissions: () => void;
  setPlaceNamesEnabled: (enabled: boolean) => void;
  setAppLockEnabled: (enabled: boolean) => void;
  confirmDeleteAll: () => void;
  // Footer
  appVersion: string;
}

const FALLBACK_VERSION = '1.0.0';
const REMINDER_OFF_LABEL = 'Tắt';
const UNKNOWN_ERROR = 'Đã có lỗi xảy ra.';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : UNKNOWN_ERROR;
}

export function useSettingsViewModel(): SettingsViewModel {
  const { settings, updateSettings } = useSettings();
  const { photos } = usePhotoStore();
  const { photoRepository } = useAppServices();
  const [cameraResponse, requestCameraPermission, getCameraPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<PermissionStatus>('undetermined');
  const [appLockSupport, setAppLockSupport] = useState<AppLockSupport>('unsupported');
  const [backupProgress, setBackupProgress] = useState<string | null>(null);
  const [albumProgress, setAlbumProgress] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const cameraPermission: PermissionStatus = !cameraResponse
    ? 'undetermined'
    : cameraResponse.granted
      ? 'granted'
      : cameraResponse.canAskAgain
        ? 'undetermined'
        : 'denied';

  // Re-read permissions on focus and when returning from the system Settings app.
  const refreshPermissions = useCallback(() => {
    LocationService.getPermission().then(setLocationPermission);
    getCameraPermission().catch(() => undefined);
    AppLockService.getSupport().then(setAppLockSupport);
  }, [getCameraPermission]);

  useFocusEffect(refreshPermissions);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshPermissions();
    });
    return () => subscription.remove();
  }, [refreshPermissions]);

  const persist = useCallback(
    (patch: Parameters<typeof updateSettings>[0]) => {
      updateSettings(patch).catch((error: unknown) => {
        console.warn('[settings] save failed', error);
        Dialog.notify('Không lưu được cài đặt', messageOf(error));
      });
    },
    [updateSettings],
  );

  // --- Permissions ---------------------------------------------------------------------------

  const fixCameraPermission = useCallback(() => {
    if (cameraPermission === 'denied') {
      openPermissionSettings('Camera');
      return;
    }
    requestCameraPermission().catch(() => undefined);
  }, [cameraPermission, requestCameraPermission]);

  const fixLocationPermission = useCallback(() => {
    LocationService.canAskAgain().then(async (canAsk) => {
      if (!canAsk) {
        openPermissionSettings('Location');
        return;
      }
      setLocationPermission(await LocationService.requestPermission());
    });
  }, []);

  const setLocationEnabled = useCallback(
    (enabled: boolean) => {
      persist({ locationEnabled: enabled, hasSeenLocationPrompt: true });
      if (!enabled || locationPermission === 'granted') return;
      // Ask now if the OS still allows it; otherwise the inline note offers the Settings shortcut.
      LocationService.canAskAgain().then(async (canAsk) => {
        if (canAsk) setLocationPermission(await LocationService.requestPermission());
        else setLocationPermission(await LocationService.getPermission());
      });
    },
    [persist, locationPermission],
  );

  // --- Reminder ------------------------------------------------------------------------------

  const saveReminder = useCallback(
    async (enabled: boolean, time: string): Promise<boolean> => {
      try {
        if (!enabled) {
          await ReminderService.cancel();
          await updateSettings({ reminderEnabled: false, reminderTime: time });
          return true;
        }
        const permission = await ReminderService.ensurePermission();
        if (permission !== 'granted') {
          await ReminderService.cancel();
          await updateSettings({ reminderEnabled: false, reminderTime: time });
          if (permission === 'blocked') {
            const open = await Dialog.confirm(
              'Chưa có quyền thông báo',
              'Hãy cho phép thông báo trong Cài đặt của máy để nhận lời nhắc mỗi ngày.',
              { confirmLabel: 'Mở Cài đặt', cancelLabel: 'Để sau' },
            );
            if (open) ReminderService.openSettings();
          } else {
            Dialog.notify('Chưa bật được nhắc nhở', 'Bạn cần cho phép thông báo để nhận lời nhắc mỗi ngày.');
          }
          return false;
        }
        await ReminderService.schedule(time);
        await updateSettings({ reminderEnabled: true, reminderTime: time });
        return true;
      } catch (error) {
        console.warn('[settings] reminder failed', error);
        Dialog.notify('Không đặt được nhắc nhở', messageOf(error));
        return false;
      }
    },
    [updateSettings],
  );

  // --- Data ----------------------------------------------------------------------------------

  const exportBackup = useCallback(() => {
    if (backupProgress !== null) return;
    if (photos.length === 0) {
      Dialog.notify('Chưa có gì để sao lưu', 'Hãy chụp một tấm ảnh trước nhé.');
      return;
    }
    setBackupProgress('Đang chuẩn bị…');
    ExportService.exportDiary(photos, (done, total) => setBackupProgress(`Đang sao chép ${done}/${total}`))
      .then((result) => {
        if (result.status === 'cancelled') return;
        const skipped =
          result.skippedCount > 0 ? `\n${result.skippedCount} ảnh hỏng đã được bỏ qua.` : '';
        Dialog.notify(
          'Đã sao lưu ra tệp',
          `${result.imageCount} ảnh và tệp nhật ký đã được lưu tại “${result.destination}”. Tệp nằm trên thiết bị của bạn, không được tải lên đâu cả.${skipped}`,
        );
      })
      .catch((error: unknown) => {
        console.warn('[settings] backup failed', error);
        Dialog.notify('Sao lưu không thành công', messageOf(error));
      })
      .finally(() => setBackupProgress(null));
  }, [backupProgress, photos]);

  const exportAlbum = useCallback(() => {
    if (albumProgress !== null) return;
    if (photos.length === 0) {
      Dialog.notify('Chưa có gì để xuất', 'Hãy chụp một tấm ảnh trước nhé.');
      return;
    }
    setAlbumProgress('Đang chuẩn bị…');
    AlbumService.exportAlbum(photos, settings.frameColor, (done, total) =>
      setAlbumProgress(done < total ? `Đang chuẩn bị ${done}/${total}` : 'Đang tạo album…'),
    )
      .then((result) => {
        if (result.status === 'empty') {
          Dialog.notify('Chưa có gì để xuất', 'Không đọc được tấm ảnh nào để đưa vào album.');
        } else if (result.skippedCount > 0) {
          Dialog.notify('Đã xuất album', `${result.skippedCount} ảnh hỏng đã được bỏ qua.`);
        }
      })
      .catch((error: unknown) => {
        console.warn('[settings] album failed', error);
        Dialog.notify('Xuất album không thành công', messageOf(error));
      })
      .finally(() => setAlbumProgress(null));
  }, [albumProgress, photos, settings.frameColor]);

  // --- Privacy -------------------------------------------------------------------------------

  const setAppLockEnabled = useCallback(
    (enabled: boolean) => {
      if (!enabled) {
        persist({ appLockEnabled: false });
        return;
      }
      if (appLockSupport !== 'available') return;
      AppLockService.authenticate('Xác nhận để bật khoá app').then((outcome) => {
        if (outcome === 'success') persist({ appLockEnabled: true });
        else Dialog.notify('Chưa bật khoá app', 'Cần xác thực thành công trước khi bật khoá app.');
      });
    },
    [appLockSupport, persist],
  );

  const deleteAll = useCallback(() => {
    setIsDeleting(true);
    photoRepository
      .removeAll()
      .catch((error: unknown) => {
        console.warn('[settings] delete all failed', error);
        Dialog.notify('Không xoá được ảnh', messageOf(error));
      })
      .finally(() => setIsDeleting(false));
  }, [photoRepository]);

  const confirmDeleteAll = useCallback(() => {
    if (photos.length === 0) {
      Dialog.notify('Chưa có ảnh nào', 'Nhật ký của bạn đang trống.');
      return;
    }
    Dialog.confirm('Xoá toàn bộ ảnh?', 'Mọi ảnh sẽ bị xoá khỏi máy này. Không thể hoàn tác.', {
      confirmLabel: 'Tiếp tục',
      cancelLabel: 'Huỷ',
      destructive: true,
    })
      .then((first) =>
        first
          ? Dialog.confirm('Bạn chắc chắn chứ?', `${photos.length} khoảnh khắc sẽ mất vĩnh viễn.`, {
              confirmLabel: 'Xoá tất cả',
              cancelLabel: 'Giữ lại',
              destructive: true,
            })
          : false,
      )
      .then((confirmed) => {
        if (confirmed) deleteAll();
      });
  }, [photos.length, deleteAll]);

  return {
    frameType: settings.frameType,
    frameColor: settings.frameColor,
    setFrameType: (value) => persist({ frameType: value }),
    setFrameColor: (value) => persist({ frameColor: value }),
    locationEnabled: settings.locationEnabled,
    locationBlocked: settings.locationEnabled && locationPermission === 'denied',
    developEffect: settings.developEffect,
    handwriting: settings.handwriting,
    soundEnabled: settings.soundEnabled,
    hapticsEnabled: settings.hapticsEnabled,
    setLocationEnabled,
    setDevelopEffect: (enabled) => persist({ developEffect: enabled }),
    setHandwriting: (enabled) => persist({ handwriting: enabled }),
    setSoundEnabled: (enabled) => persist({ soundEnabled: enabled }),
    setHapticsEnabled: (enabled) => persist({ hapticsEnabled: enabled }),
    reminder: {
      supported: ReminderService.isSupported,
      enabled: settings.reminderEnabled,
      time: settings.reminderTime,
      label: settings.reminderEnabled ? settings.reminderTime : REMINDER_OFF_LABEL,
    },
    saveReminder,
    backupProgress,
    albumProgress,
    exportBackup,
    exportAlbum,
    cameraPermission,
    locationPermission,
    placeNamesEnabled: settings.placeNamesEnabled,
    appLockEnabled: settings.appLockEnabled,
    appLockSupport,
    photoCount: photos.length,
    isDeleting,
    fixCameraPermission,
    fixLocationPermission,
    refreshPermissions,
    setPlaceNamesEnabled: (enabled) => persist({ placeNamesEnabled: enabled }),
    setAppLockEnabled,
    confirmDeleteAll,
    appVersion: Constants.expoConfig?.version ?? FALLBACK_VERSION,
  };
}
