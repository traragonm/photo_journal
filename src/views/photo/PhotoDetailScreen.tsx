import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components';
import { colors, layout, printFormats, spacing } from '@/theme';
import { dayKeyOfIso, formatWeekdayDate } from '@/utils/date';
import { groupPhotosByDay } from '@/utils/days';
import { useFrameStyle, usePhotoStore } from '@/viewmodels/shared';
import { useWeatherLook } from '@/viewmodels/useAmbient';
import { usePhotoDetailViewModel } from '@/viewmodels/usePhotoDetailViewModel';
import { MoodButton } from '@/views/weather/MoodButton';
import { WeatherEffects } from '@/views/weather/WeatherEffects';
import { CaptionEditor } from './CaptionEditor';
import { DetailTopBar } from './DetailTopBar';
import { FilmStripBar } from './FilmStripBar';
import { FlippablePrint } from './FlippablePrint';
import { FullPhotoViewer } from './FullPhotoViewer';
import { PhotoActions } from './PhotoActions';
import { PhotoNotFound } from './PhotoNotFound';
import { PRINT_WIDTH, PRINT_WIDTH_WIDE, STRIP_WIDTH, detailScale } from './detailConstants';

const MAX_PRINT_HEIGHT_RATIO = 0.56;
/** Floating mood button (design: right 18, bottom 24). */
const MOOD_RIGHT = 18;
const MOOD_BOTTOM = 24;

export function PhotoDetailScreen({ photoId }: { photoId: string | undefined }) {
  const vm = usePhotoDetailViewModel(photoId);
  const { photos } = usePhotoStore();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { frame } = useFrameStyle();
  const [flipped, setFlipped] = useState(false);
  const look = useWeatherLook();
  const pageStyle = look.page ? { backgroundColor: look.page } : null;
  const { photo } = vm;

  const sameDay = useMemo(
    () => (photo ? (groupPhotosByDay(photos).get(dayKeyOfIso(photo.createdAt)) ?? []) : []),
    [photos, photo],
  );

  if (!photo) {
    return (
      <View style={[styles.screen, pageStyle, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <PhotoNotFound onBack={vm.goBack} />
      </View>
    );
  }

  const scale = detailScale(width);
  const format = printFormats[photo.frameType];
  const baseWidth = photo.frameType === 'mini' ? PRINT_WIDTH : PRINT_WIDTH_WIDE;
  const printWidth = Math.min(baseWidth * scale, (height * MAX_PRINT_HEIGHT_RATIO * format.w) / format.h);
  const noticeIsError = vm.notice?.kind === 'error';
  const dayIndex = Math.max(
    0,
    sameDay.findIndex((entry) => entry.id === photo.id),
  );

  return (
    <KeyboardAvoidingView style={[styles.screen, pageStyle]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <WeatherEffects sky={look.effectsSky} layer="back" width={width} height={height} />
      <View style={{ paddingTop: insets.top + spacing.sm }}>
        <DetailTopBar
          title={formatWeekdayDate(new Date(photo.createdAt))}
          index={dayIndex}
          count={sameDay.length}
          flipped={flipped}
          onBack={vm.goBack}
          onFlip={() => setFlipped((value) => !value)}
        />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FlippablePrint
          photo={photo}
          width={printWidth}
          frame={frame}
          flipped={flipped}
          onOpenViewer={vm.openViewer}
          onEdit={vm.startEditing}
        />
        <FilmStripBar photo={photo} width={Math.min(STRIP_WIDTH * scale, width - layout.screenGutter * 2)} />
        <View style={styles.details}>
          {vm.notice ? (
            <AppText
              variant="caption"
              color={noticeIsError ? 'accentText' : 'textMuted'}
              align="center"
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
              onShare={vm.share}
              onDelete={vm.confirmDelete}
            />
          )}
        </View>
      </ScrollView>
      <WeatherEffects sky={look.effectsSky} layer="front" width={width} height={height} />
      <MoodButton style={{ right: MOOD_RIGHT, bottom: insets.bottom + MOOD_BOTTOM }} />
      <FullPhotoViewer photo={photo} visible={vm.isViewerOpen} onClose={vm.closeViewer} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: {
    alignItems: 'center',
    gap: spacing.xl,
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
  },
  details: { alignSelf: 'stretch', gap: spacing.md },
});
