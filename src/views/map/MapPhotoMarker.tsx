import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { PhotoImage } from '@/components';
import type { PhotoEntry } from '@/models';
import { borderRadius, colors, shadows } from '@/theme';
import { formatClock } from '@/utils/date';
import { rotationFor } from '@/utils/rotation';
import {
  MARKER_LOAD_TIMEOUT_MS,
  MARKER_SETTLE_MS,
  PIN_ANCHOR,
  PIN_BITMAP_MARGIN,
  PIN_BOTTOM_PADDING,
  PIN_BOX_HEIGHT,
  PIN_BOX_WIDTH,
  PIN_BOTTOM_PADDING_SELECTED,
  PIN_DOT_RING,
  PIN_DOT_TOTAL,
  PIN_HEIGHT,
  PIN_HEIGHT_SELECTED,
  PIN_RING_WIDTH,
  PIN_SIDE_PADDING,
  PIN_STICK_HEIGHT,
  PIN_STICK_WIDTH,
  PIN_WIDTH,
  PIN_WIDTH_SELECTED,
} from './mapConstants';

export interface MapPhotoMarkerProps {
  photo: PhotoEntry;
  latitude: number;
  longitude: number;
  selected: boolean;
  /** Border colour of the print (Settings › Màu viền). */
  frameFill: string;
  onPress: (id: string) => void;
}

/**
 * Tilted mini print on a stick with an ink dot. Selected: accent ring, stick and dot, slightly bigger.
 * `tracksViewChanges` stays true only until the image has loaded (then briefly after any
 * visual change), otherwise Android either renders an empty bitmap or re-rasterises constantly.
 */
function MapPhotoMarkerBase({ photo, latitude, longitude, selected, frameFill, onPress }: MapPhotoMarkerProps) {
  const [isLoaded, setIsLoaded] = useState(!photo.isImageAvailable);
  // The visual state that has been rasterised; tracking runs until it catches up.
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const visualKey = `${isLoaded}:${selected}:${frameFill}:${photo.filter}`;
  const isTracking = !isLoaded || settledKey !== visualKey;
  const coordinate = useMemo(() => ({ latitude, longitude }), [latitude, longitude]);

  const handleLoad = useCallback(() => setIsLoaded(true), []);
  const handlePress = useCallback(() => onPress(photo.id), [onPress, photo.id]);

  // Give up waiting for the image eventually.
  useEffect(() => {
    if (isLoaded) return;
    const timer = setTimeout(() => setIsLoaded(true), MARKER_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isLoaded]);

  // Track while loading; after load or a visual change, track briefly then freeze.
  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => setSettledKey(visualKey), MARKER_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [isLoaded, visualKey]);

  const accent = selected ? colors.accent : colors.ink;

  return (
    <Marker
      coordinate={coordinate}
      anchor={PIN_ANCHOR}
      tracksViewChanges={isTracking}
      stopPropagation
      onPress={handlePress}
      accessibilityLabel={`${photo.caption ?? 'Ảnh'}, ${formatClock(photo.createdAt)}`}
    >
      <View style={styles.wrapper} collapsable={false}>
        <View
          style={[
            styles.print,
            shadows.soft,
            selected ? styles.printSelected : null,
            {
              backgroundColor: frameFill,
              borderColor: colors.accent,
              transform: [{ rotate: `${rotationFor(photo.id)}deg` }],
            },
          ]}
        >
          <PhotoImage
            uri={photo.imageUri}
            isAvailable={photo.isImageAvailable}
            filter={photo.filter}
            style={styles.image}
            compact
            onLoad={handleLoad}
          />
        </View>
        <View style={[styles.stick, { backgroundColor: accent }]} />
        <View style={[styles.dot, { backgroundColor: accent }]} />
      </View>
    </Marker>
  );
}

export const MapPhotoMarker = memo(MapPhotoMarkerBase);

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: PIN_BOX_WIDTH,
    height: PIN_BOX_HEIGHT,
    padding: PIN_BITMAP_MARGIN,
  },
  print: {
    width: PIN_WIDTH,
    height: PIN_HEIGHT,
    paddingHorizontal: PIN_SIDE_PADDING,
    paddingTop: PIN_SIDE_PADDING,
    paddingBottom: PIN_BOTTOM_PADDING,
    borderRadius: borderRadius.xs,
  },
  printSelected: {
    width: PIN_WIDTH_SELECTED,
    height: PIN_HEIGHT_SELECTED,
    paddingBottom: PIN_BOTTOM_PADDING_SELECTED,
    borderWidth: PIN_RING_WIDTH,
  },
  image: {
    flex: 1,
  },
  stick: {
    width: PIN_STICK_WIDTH,
    height: PIN_STICK_HEIGHT,
  },
  dot: {
    width: PIN_DOT_TOTAL,
    height: PIN_DOT_TOTAL,
    borderRadius: borderRadius.pill,
    borderWidth: PIN_DOT_RING,
    borderColor: colors.frameWhite,
  },
});
