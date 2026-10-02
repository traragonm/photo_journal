import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AnimatedEntry, PolaroidCard, printGeometry } from '@/components';
import type { PhotoEntry } from '@/models';
import { fitPrintWidth, layoutColumn, layoutPile, type PileItem } from '@/utils/pile';

export interface PrintPileProps {
  /** Prints oldest → newest. For the scattered pile pass only the newest few. */
  photos: readonly PhotoEntry[];
  width: number;
  height: number;
  /** Zig-zag scrollable column instead of the scattered pile. */
  expanded: boolean;
  onPressPhoto: (photo: PhotoEntry) => void;
  onLongPressPhoto: (photo: PhotoEntry) => void;
}

interface PlacedPrintProps {
  photo: PhotoEntry;
  item: PileItem;
  slotWidth: number;
  slotHeight: number;
  order: number;
  isTop: boolean;
  onPress: (photo: PhotoEntry) => void;
  onLongPress: (photo: PhotoEntry) => void;
}

/** One print centred in its layout slot. */
function PlacedPrint({ photo, item, slotWidth, slotHeight, order, isTop, onPress, onLongPress }: PlacedPrintProps) {
  const printWidth = fitPrintWidth(slotWidth, photo.frameType);
  const geometry = printGeometry(printWidth, photo.frameType);
  return (
    <AnimatedEntry
      index={order}
      style={[
        styles.print,
        {
          left: item.left + (slotWidth - printWidth) / 2,
          top: item.top + (slotHeight - geometry.height) / 2,
          zIndex: item.zIndex,
        },
      ]}
    >
      <PolaroidCard
        photo={photo}
        width={printWidth}
        rotation={item.rotation}
        shadow={isTop ? 'printLifted' : 'print'}
        onPress={onPress}
        onLongPress={onLongPress}
      />
    </AnimatedEntry>
  );
}

/** The selected day's prints as a scattered, overlapping table (or a scrollable column when expanded). */
export function PrintPile({ photos, width, height, expanded, onPressPhoto, onLongPressPhoto }: PrintPileProps) {
  const seeds = useMemo(() => photos.map((photo) => photo.id), [photos]);
  const pile = useMemo(() => layoutPile(seeds, width, height), [seeds, width, height]);
  const column = useMemo(() => layoutColumn(seeds, width), [seeds, width]);

  if (expanded) {
    return (
      <ScrollView
        style={styles.fill}
        contentContainerStyle={{ height: column.contentHeight }}
        showsVerticalScrollIndicator={false}
      >
        {column.items.map((item) => (
          <PlacedPrint
            key={photos[item.index].id}
            photo={photos[item.index]}
            item={item}
            slotWidth={column.slotWidth}
            slotHeight={column.slotHeight}
            order={item.index}
            isTop={item.index === photos.length - 1}
            onPress={onPressPhoto}
            onLongPress={onLongPressPhoto}
          />
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.fill}>
      {pile.items.map((item, order) => (
        <PlacedPrint
          key={photos[item.index].id}
          photo={photos[item.index]}
          item={item}
          slotWidth={pile.slotWidth}
          slotHeight={pile.slotHeight}
          order={order}
          isTop={order === pile.items.length - 1}
          onPress={onPressPhoto}
          onLongPress={onLongPressPhoto}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  print: {
    position: 'absolute',
  },
});
