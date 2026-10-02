import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, spacing, type ColorToken } from '@/theme';
import { formatPlace } from '@/utils/geo';
import { AppText } from './AppText';

export interface LocationBadgeProps {
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  color?: ColorToken;
  style?: StyleProp<ViewStyle>;
}

/** Pin + place name (or GPS coordinates). Renders nothing when there's no location. */
export function LocationBadge({ locationName, latitude, longitude, color = 'textMuted', style }: LocationBadgeProps) {
  const place = formatPlace(locationName, latitude, longitude);
  if (!place) return null;
  return (
    <View style={[styles.row, style]} accessibilityLabel={`Vị trí: ${place}`}>
      <Ionicons name="location-outline" size={fontSizes.md} color={colors[color]} />
      <AppText variant="caption" color={color} numberOfLines={1} style={styles.text}>
        {place}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  text: {
    flexShrink: 1,
  },
});
