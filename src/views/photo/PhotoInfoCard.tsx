import { StyleSheet, View } from 'react-native';
import { AppText, LocationBadge } from '@/components';
import { hasLocation, type PhotoEntry } from '@/models';
import { borderRadius, colors, filmFilters, spacing } from '@/theme';
import { formatClock, formatWeekdayDate } from '@/utils/date';


export interface PhotoInfoCardProps {
  photo: PhotoEntry;
}

const FRAME_NAMES = { mini: 'Mini', square: 'Square', wide: 'Wide' } as const;

/** "Thứ Sáu, 2 tháng 10, 2026" */
function fullDate(iso: string): string {
  const date = new Date(iso);
  return `${formatWeekdayDate(date)}, ${date.getFullYear()}`;
}

/** White card: date, time, place and a muted frame / film / camera line. */
export function PhotoInfoCard({ photo }: PhotoInfoCardProps) {
  const meta = [
    `Khung ${FRAME_NAMES[photo.frameType]}`,
    `Lọc ${filmFilters[photo.filter].label}`,
    photo.cameraType === 'front' ? 'Camera trước' : 'Camera sau',
  ].join(' · ');
  return (
    <View style={styles.card}>
      <AppText variant="cardTitle">{fullDate(photo.createdAt)}</AppText>
      <AppText variant="body" color="textSecondary">
        {formatClock(photo.createdAt)}
      </AppText>
      {hasLocation(photo) ? (
        <LocationBadge
          locationName={photo.locationName}
          latitude={photo.latitude}
          longitude={photo.longitude}
        />
      ) : (
        <AppText variant="caption" color="textMuted">
          Không có vị trí
        </AppText>
      )}
      <AppText variant="caption" color="textMuted">
        {meta}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: borderRadius.cardLarge,
    padding: spacing.lg,
    gap: spacing.xs,
  },
});