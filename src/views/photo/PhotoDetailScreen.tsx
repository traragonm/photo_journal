import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, IconButton, PhotoImage, PolaroidFrame, PressableScale } from '@/components';
import { colors, layout, printFormats, spacing } from '@/theme';
import { formatClock } from '@/utils/date';
import { rotationFor } from '@/utils/rotation';
import { useFrameStyle } from '@/viewmodels/shared';
import { usePhotoDetailViewModel } from '@/viewmodels/usePhotoDetailViewModel';
import { CaptionEditor } from './CaptionEditor';
import { FullPhotoViewer } from './FullPhotoViewer';
import { PhotoActions } from './PhotoActions';
import { PhotoInfoCard } from './PhotoInfoCard';
import { PhotoNotFound } from './PhotoNotFound';

const MAX_PRINT_WIDTH = 340;
const MAX_PRINT_HEIGHT_RATIO = 0.6;
const MAX_TILT = 2;

export function PhotoDetailScreen({ photoId }: { photoId: string | undefined }) {
  const vm = usePhotoDetailViewModel(photoId);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { frame, captionVariant } = useFrameStyle();
  const { photo } = vm;

  if (!photo) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <PhotoNotFound onBack={vm.goBack} />
      </View>
    );
  }

  const format = printFormats[photo.frameType];
  const printWidth = Math.min(
    width - layout.screenGutter * 2,
    MAX_PRINT_WIDTH,
    (height * MAX_PRINT_HEIGHT_RATIO * format.w) / format.h,
  );
  const tilt = Math.max(-MAX_TILT, Math.min(MAX_TILT, rotationFor(photo.id)));
  const noticeIsError = vm.notice?.kind === 'error';

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <IconButton icon="chevron-down" accessibilityLabel="Đóng" onPress={vm.goBack} />
        <IconButton icon="share-outline" accessibilityLabel="Chia sẻ ảnh" onPress={vm.share} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PolaroidFrame
          width={printWidth}
          frameType={photo.frameType}
          colorStyle={frame}
          rotation={tilt}
          shadow="printLifted"
          image={
            <PressableScale
              onPress={vm.openViewer}
              accessibilityRole="imagebutton"
              accessibilityLabel="Ảnh. Chạm để xem toàn màn hình"
              style={styles.fill}
            >
              <PhotoImage
                uri={photo.imageUri}
                isAvailable={photo.isImageAvailable}
                filter={photo.filter}
                style={styles.fill}
              />
            </PressableScale>
          }
          footer={
            <>
              {photo.caption ? (
                <AppText variant={captionVariant} numberOfLines={2} style={{ color: frame.ink }}>
                  {photo.caption}
                </AppText>
              ) : null}
              <AppText variant="handSmall" style={{ color: frame.inkSoft }}>
                {formatClock(photo.createdAt)}
              </AppText>
            </>
          }
        />

        <View style={styles.details}>
          <PhotoInfoCard photo={photo} />
          {vm.notice ? (
            <AppText
              variant="caption"
              color={noticeIsError ? 'accentText' : 'textMuted'}
              accessibilityRole={noticeIsError ? 'alert' : undefined}
            >
              {vm.notice.text}
            </AppText>
          ) : null}
          {vm.isEditing ? (
            <CaptionEditor
              value={vm.draft}
              maxLength={vm.maxCaptionLength}
              isSaving={vm.isSaving}
              onChange={vm.setDraft}
              onSave={vm.saveCaption}
              onCancel={vm.cancelEditing}
            />
          ) : (
            <PhotoActions
              hasCaption={Boolean(photo.caption)}
              canViewOnMap={vm.canViewOnMap}
              onEditCaption={vm.startEditing}
              onViewOnMap={vm.viewOnMap}
              onDelete={vm.confirmDelete}
            />
          )}
        </View>
      </ScrollView>
      <FullPhotoViewer photo={photo} visible={vm.isViewerOpen} onClose={vm.closeViewer} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  topBar: {
    paddingHorizontal: layout.screenGutter,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: spacing.xl,
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
  },
  fill: { flex: 1 },
  details: { alignSelf: 'stretch', gap: spacing.md },
});