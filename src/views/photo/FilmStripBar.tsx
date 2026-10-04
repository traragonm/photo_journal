import { StyleSheet, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from '@/components';
import { hasLocation, type PhotoEntry } from '@/models';
import { borderRadius, colors, filmFilters, fontSizes, moodStyles, weatherStyles } from '@/theme';
import { formatClock } from '@/utils/date';
import { formatPlace } from '@/utils/geo';

const FRAME_NAMES = { mini: 'MINI', square: 'SQ', wide: 'WIDE' } as const;

const PERF_DASH_WIDTH = 7;
const PERF_PITCH = 16;
const PERF_HEIGHT = 5;
const PERF_INSET = 6;
const PERF_OPACITY = 0.85;
const STRIP_PADDING = 7;
const PIN_SIZE = 13;
const NOTE_ICON_SIZE = 15;
const LETTER_SPACING = 0.88; // .08em of 11px

function PerforationRow({ width }: { width: number }) {
  const count = Math.max(1, Math.ceil((width - PERF_INSET * 2) / PERF_PITCH));
  return (
    <View style={styles.perfRow} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.perfDash} />
      ))}
    </View>
  );
}

export interface FilmStripBarProps {
  photo: PhotoEntry;
  width: number;
}

/** Dark film-strip info bar: place, time, frame, filter, weather and mood. */
export function FilmStripBar({ photo, width }: FilmStripBarProps) {
  const place = hasLocation(photo) ? formatPlace(photo.locationName, photo.latitude, photo.longitude) : null;
  return (
    <View style={[styles.strip, { width }]}>
      <PerforationRow width={width} />
      <View style={styles.info}>
        {place ? (
          <View style={styles.place}>
            <Ionicons name="location-outline" size={PIN_SIZE} color={colors.filmStripText} />
            <AppText variant="tab" numberOfLines={1} style={styles.text}>
              {place.toUpperCase()}
            </AppText>
          </View>
        ) : null}
        <AppText variant="tab" style={styles.text}>
          {formatClock(photo.createdAt)}
        </AppText>
        <AppText variant="tab" style={styles.text}>
          {FRAME_NAMES[photo.frameType]}
        </AppText>
        <AppText variant="tab" style={styles.text}>
          {filmFilters[photo.filter].label.toUpperCase()}
        </AppText>
        {photo.weather ? (
          <View accessible accessibilityRole="image" accessibilityLabel={`Thời tiết: ${weatherStyles[photo.weather].label}`}>
            <MaterialCommunityIcons name={weatherStyles[photo.weather].icon} size={NOTE_ICON_SIZE} color={colors.filmStripText} />
          </View>
        ) : null}
        {photo.mood ? (
          <View accessible accessibilityRole="image" accessibilityLabel={`Cảm xúc: ${moodStyles[photo.mood].label}`}>
            <MaterialCommunityIcons name={moodStyles[photo.mood].icon} size={NOTE_ICON_SIZE} color={colors.filmStripText} />
          </View>
        ) : null}
      </View>
      <PerforationRow width={width} />
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    borderRadius: borderRadius.sm,
    backgroundColor: colors.cameraDialFace,
    paddingVertical: STRIP_PADDING,
    gap: STRIP_PADDING,
    overflow: 'hidden',
  },
  perfRow: {
    flexDirection: 'row',
    gap: PERF_PITCH - PERF_DASH_WIDTH,
    marginHorizontal: PERF_INSET,
    height: PERF_HEIGHT,
    overflow: 'hidden',
    opacity: PERF_OPACITY,
  },
  perfDash: { width: PERF_DASH_WIDTH, height: PERF_HEIGHT, backgroundColor: colors.paper },
  info: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  place: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  text: { color: colors.filmStripText, fontSize: fontSizes.xs, letterSpacing: LETTER_SPACING },
});
