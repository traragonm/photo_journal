import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Marker } from 'react-native-maps';
import { AppText, PhotoImage } from '@/components';
import type { PhotoEntry } from '@/models';
import { borderRadius, borderWidth, colors, shadows } from '@/theme';
import type { MapItem } from '@/utils/clustering';
import {
  CLUSTER_BACK_ROTATION,
  CLUSTER_BADGE_MIN_SIZE,
  CLUSTER_BADGE_OFFSET,
  CLUSTER_BOX,
  CLUSTER_FRAME_PADDING,
  CLUSTER_FRONT_ROTATION,
  CLUSTER_ICON_SIZE,
  CLUSTER_MIDDLE_ROTATION,
  CLUSTER_PADDING,
  CLUSTER_PRINT_SIZE,
  CLUSTER_STACK_OFFSET,
  MARKER_SETTLE_MS,
} from './mapConstants';

type ClusterItem = Extract<MapItem, { kind: 'cluster' }>;

export interface MapClusterMarkerProps {
  item: ClusterItem;
  /** Newest photo in the cluster, shown on the top print. */
  cover: PhotoEntry | undefined;
  /** Border colour of the prints (Settings › Màu viền). */
  frameFill: string;
  onPress: (item: ClusterItem) => void;
}

const ANCHOR = { x: 0.5, y: 0.5 } as const;

/** Stack of prints with an ink count badge. */
function MapClusterMarkerBase({ item, cover, frameFill, onPress }: MapClusterMarkerProps) {
  // The visual state that has been rasterised; tracking runs until it catches up.
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const [loadedUri, setLoadedUri] = useState<string | null>(null);
  const coverUri = cover?.isImageAvailable ? cover.imageUri : null;
  // Keep tracking until the cover image has loaded (Android rasterises markers to bitmaps).
  const visualKey = `${item.count}:${frameFill}:${coverUri ?? ''}:${coverUri === loadedUri}`;
  const isTracking = settledKey !== visualKey;
  const coordinate = useMemo(
    () => ({ latitude: item.latitude, longitude: item.longitude }),
    [item.latitude, item.longitude],
  );
  const handlePress = useCallback(() => onPress(item), [onPress, item]);

  // Static content: track only long enough to rasterise, again if count/colour change.
  useEffect(() => {
    const timer = setTimeout(() => setSettledKey(visualKey), MARKER_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [visualKey]);

  const print = [styles.print, shadows.soft, { backgroundColor: frameFill }];

  return (
    <Marker
      coordinate={coordinate}
      anchor={ANCHOR}
      tracksViewChanges={isTracking}
      stopPropagation
      onPress={handlePress}
      accessibilityLabel={`${item.count} ảnh gần nhau. Chạm để phóng to.`}
    >
      <View style={styles.wrapper} collapsable={false}>
        <View style={[print, styles.back]} />
        <View style={[print, styles.middle]} />
        <View style={[print, styles.front]}>
          {cover && coverUri ? (
            <PhotoImage
              uri={coverUri}
              filter={cover.filter}
              style={styles.well}
              compact
              onLoad={() => setLoadedUri(coverUri)}
            />
          ) : (
            <View style={styles.well}>
              <Ionicons name="images" size={CLUSTER_ICON_SIZE} color={colors.muted} />
            </View>
          )}
        </View>
        <View style={styles.badge}>
          <AppText variant="label" style={styles.badgeText}>
            {String(item.count)}
          </AppText>
        </View>
      </View>
    </Marker>
  );
}

export const MapClusterMarker = memo(MapClusterMarkerBase);

const styles = StyleSheet.create({
  wrapper: {
    width: CLUSTER_BOX,
    height: CLUSTER_BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  print: {
    position: 'absolute',
    width: CLUSTER_PRINT_SIZE,
    height: CLUSTER_PRINT_SIZE,
    padding: CLUSTER_FRAME_PADDING,
    borderRadius: borderRadius.xs,
    borderWidth: borderWidth.hairline,
    borderColor: colors.hairline,
  },
  back: {
    transform: [{ rotate: `${CLUSTER_BACK_ROTATION}deg` }, { translateX: -CLUSTER_STACK_OFFSET }],
  },
  middle: {
    transform: [{ rotate: `${CLUSTER_MIDDLE_ROTATION}deg` }, { translateX: CLUSTER_STACK_OFFSET }],
  },
  front: {
    transform: [{ rotate: `${CLUSTER_FRONT_ROTATION}deg` }],
  },
  well: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chip,
  },
  badge: {
    position: 'absolute',
    top: CLUSTER_PADDING - CLUSTER_BADGE_OFFSET,
    right: CLUSTER_PADDING - CLUSTER_BADGE_OFFSET,
    minWidth: CLUSTER_BADGE_MIN_SIZE,
    height: CLUSTER_BADGE_MIN_SIZE,
    paddingHorizontal: CLUSTER_FRAME_PADDING * 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.pill,
    backgroundColor: colors.ink,
  },
  badgeText: {
    color: colors.onInk,
  },
});
