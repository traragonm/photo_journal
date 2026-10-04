import { useCallback } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, EmptyState, IconButton } from '@/components';
import type { PhotoEntry } from '@/models';
import { colors, spacing } from '@/theme';
import { useWeatherLook } from '@/viewmodels/useAmbient';
import { LIBRARY_COLUMNS, useLibraryViewModel } from '@/viewmodels/useLibraryViewModel';
import { MoodButton } from '@/views/weather/MoodButton';
import { useLayoutSize } from '@/views/weather/useLayoutSize';
import { WeatherEffects } from '@/views/weather/WeatherEffects';
import { LibraryCell } from './LibraryCell';

const PAGE_PADDING = 18;
const ROW_GAP = 16;
const COLUMN_GAP = 12;
const TITLE_SIZE = 28;
const SUBTITLE_SIZE = 12;
const COUNT_SIZE = 16;
/** Floating mood button (design: right 18, bottom 32). */
const MOOD_RIGHT = 18;
const MOOD_BOTTOM = 32;

/** "Thư viện": every photo, grouped by month, as a grid of mini prints. */
export function LibraryScreen() {
  const vm = useLibraryViewModel();
  const insets = useSafeAreaInsets();
  const [size, onLayout] = useLayoutSize();
  const { width } = size;
  const look = useWeatherLook();
  const cellWidth = Math.floor((width - PAGE_PADDING * 2 - COLUMN_GAP * (LIBRARY_COLUMNS - 1)) / LIBRARY_COLUMNS);

  const renderRow = useCallback(
    ({ item, index }: { item: PhotoEntry[]; index: number }) => (
      <View style={styles.row}>
        {item.map((photo, column) => (
          <LibraryCell
            key={photo.id}
            photo={photo}
            width={cellWidth}
            rotationIndex={index * LIBRARY_COLUMNS + column}
            onPress={vm.openPhoto}
          />
        ))}
      </View>
    ),
    [cellWidth, vm.openPhoto],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }, look.page ? { backgroundColor: look.page } : null]} onLayout={onLayout}>
      <WeatherEffects sky={look.effectsSky} layer="back" width={size.width} height={size.height} />
      <View style={styles.header}>
        <IconButton
          icon="chevron-back"
          tone="plain"
          accessibilityLabel="Quay lại nhật ký"
          onPress={vm.goBack}
        />
        <View style={styles.headerText}>
          <AppText variant="title" accessibilityRole="header" style={styles.title}>
            Thư viện
          </AppText>
          <AppText variant="caption" color="textMuted" style={styles.subtitle}>
            {vm.subtitle}
          </AppText>
        </View>
      </View>

      {vm.isLoaded && vm.total === 0 ? (
        <View style={styles.empty}>
          <EmptyState title="Chưa có ảnh nào" message="Những tấm ảnh bạn chụp sẽ xếp ở đây theo từng tháng." />
        </View>
      ) : width > 0 ? (
        <SectionList
          sections={vm.sections}
          keyExtractor={(row) => row[0].id}
          renderItem={renderRow}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <AppText variant="eyebrow" color="textMuted" accessibilityRole="header">
                {section.title}
              </AppText>
              <AppText variant="hand" color="textMuted" style={styles.count}>
                {`${section.count} tấm`}
              </AppText>
            </View>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
          initialNumToRender={4}
          windowSize={7}
          showsVerticalScrollIndicator={false}
        />
      ) : null}

      <WeatherEffects sky={look.effectsSky} layer="front" width={size.width} height={size.height} />
      <MoodButton style={{ right: MOOD_RIGHT, bottom: insets.bottom + MOOD_BOTTOM }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerText: {
    flexShrink: 1,
  },
  title: {
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_SIZE + 4,
  },
  subtitle: {
    fontSize: SUBTITLE_SIZE,
  },
  content: {
    paddingHorizontal: PAGE_PADDING,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  count: {
    fontSize: COUNT_SIZE,
    lineHeight: COUNT_SIZE + 3,
  },
  row: {
    flexDirection: 'row',
    gap: COLUMN_GAP,
    marginBottom: ROW_GAP,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
