import { StyleSheet, View } from 'react-native';
import { PhotoThumbnail, PressableScale } from '@/components';
import type { PhotoEntry } from '@/models';
import { borderRadius, shadows } from '@/theme';
import { cameraColors } from './cameraTokens';
import { cluster } from './dialGeometry';

/** Empty print proportions (design: 40 × 52, padding 4 4 12). */
const EMPTY_ASPECT = 52 / 40;
const EMPTY_SIDE = 4;
const EMPTY_BOTTOM = 12;

export interface LastPrintButtonProps {
  scale: number;
  photo: PhotoEntry | undefined;
  onPress: () => void;
}

/** Bottom-left: the latest print, tilted; opens the diary. An empty print when there are no photos. */
export function LastPrintButton({ scale, photo, onPress }: LastPrintButtonProps) {
  const u = (value: number) => value * scale;
  const { lastPrint } = cluster;
  const width = u(lastPrint.printWidth);
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={photo ? 'Mở nhật ký hôm nay' : 'Chưa có ảnh nào. Mở nhật ký'}
      style={[
        styles.slot,
        { left: u(lastPrint.left), top: u(lastPrint.top), width: u(lastPrint.width), height: u(lastPrint.height) },
      ]}
    >
      {photo ? (
        <PhotoThumbnail photo={photo} width={width} rotation={lastPrint.tilt} />
      ) : (
        <View
          style={[
            styles.empty,
            shadows.soft,
            {
              width,
              height: width * EMPTY_ASPECT,
              padding: u(EMPTY_SIDE),
              paddingBottom: u(EMPTY_BOTTOM),
              transform: [{ rotate: `${lastPrint.tilt}deg` }],
            },
          ]}
        >
          <View style={styles.emptyWindow} />
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    borderRadius: borderRadius.xs,
    backgroundColor: cameraColors.viewfinderFill,
  },
  emptyWindow: {
    flex: 1,
    backgroundColor: cameraColors.viewfinderEmpty,
  },
});
