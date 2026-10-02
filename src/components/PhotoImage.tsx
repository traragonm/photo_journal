import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image, type ImageContentFit } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { FilmFilter } from '@/models';
import { colors, durations, filmFilters, spacing } from '@/theme';
import { AppText } from './AppText';

export interface PhotoImageProps {
  uri: string;
  isAvailable?: boolean;
  /** Film look chosen at capture; applied non-destructively at display time. */
  filter?: FilmFilter;
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  accessibilityLabel?: string;
  /** Shrink the "damaged" placeholder for small thumbnails. */
  compact?: boolean;
  onLoad?: () => void;
}

const PLACEHOLDER_ICON_SIZE = 26;
const PLACEHOLDER_ICON_SIZE_COMPACT = 14;

/**
 * Image with the photo's film filter, and a graceful fallback when the file is
 * missing or corrupted. The filter uses the `filter` style (web/Android) plus a colour
 * wash (all platforms), so iOS — which supports only part of `filter` — still shows the look.
 */
export function PhotoImage({
  uri,
  isAvailable = true,
  filter = 'original',
  style,
  contentFit = 'cover',
  accessibilityLabel,
  compact = false,
  onLoad,
}: PhotoImageProps) {
  const [failed, setFailed] = useState(false);
  const look = filmFilters[filter];

  if (!isAvailable || failed || !uri) {
    return (
      <View style={[styles.placeholder, style]} accessibilityLabel="Ảnh không còn đọc được">
        <Ionicons
          name="image-outline"
          size={compact ? PLACEHOLDER_ICON_SIZE_COMPACT : PLACEHOLDER_ICON_SIZE}
          color={colors.muted}
        />
        {compact ? null : (
          <AppText variant="caption" color="textMuted">
            Ảnh bị hỏng
          </AppText>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.image, style]}>
      <View style={[StyleSheet.absoluteFill, look.filter ? { filter: look.filter } : null]}>
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          transition={durations.fast}
          recyclingKey={uri}
          onLoad={onLoad}
          onError={() => {
            setFailed(true);
            onLoad?.();
          }}
          accessibilityLabel={accessibilityLabel}
        />
      </View>
      {look.tint ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: look.tint.color, opacity: look.tint.opacity }]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.chip,
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});
