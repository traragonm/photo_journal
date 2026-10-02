import { useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView from 'react-native-maps';
import { colors, layout } from '@/theme';
import { useFrameStyle } from '@/viewmodels/shared';
import { useMapViewModel } from '@/viewmodels/useMapViewModel';
import { MapClusterMarker } from './MapClusterMarker';
import { MapOverlay } from './MapOverlay';
import { MapPhotoMarker } from './MapPhotoMarker';
import { PAPER_MAP_STYLE, SEGMENT_TOP_GAP, sheetHeightFor } from './mapConstants';

export function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const vm = useMapViewModel(mapRef);
  const insets = useSafeAreaInsets();
  const { frame } = useFrameStyle();

  // Keep the usable map between the floating switch and the sheet.
  const mapPadding = useMemo(
    () => ({
      top: insets.top + SEGMENT_TOP_GAP + layout.iconButtonSize,
      right: 0,
      bottom: sheetHeightFor(vm.sheetExpanded, insets.bottom),
      left: 0,
    }),
    [insets.top, insets.bottom, vm.sheetExpanded],
  );

  return (
    <View style={styles.screen}>
      {vm.initialRegion && !vm.isEmpty ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={vm.initialRegion}
          customMapStyle={PAPER_MAP_STYLE}
          mapPadding={mapPadding}
          userInterfaceStyle="light"
          showsUserLocation={vm.showsUserLocation}
          showsMyLocationButton={false}
          showsCompass={false}
          showsBuildings={false}
          showsPointsOfInterests={false}
          toolbarEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          onMapReady={vm.onMapReady}
          onRegionChangeComplete={vm.onRegionChangeComplete}
          onPress={vm.onMapPress}
        >
          {vm.items.map((item) => {
            if (item.kind === 'cluster') {
              return (
                <MapClusterMarker
                  key={item.key}
                  item={item}
                  cover={vm.photosById.get(item.coverId)}
                  frameFill={frame.fill}
                  onPress={vm.onClusterPress}
                />
              );
            }
            const photo = vm.photosById.get(item.id);
            if (!photo) return null;
            return (
              <MapPhotoMarker
                key={item.key}
                photo={photo}
                latitude={item.latitude}
                longitude={item.longitude}
                selected={vm.selectedIds.has(item.id)}
                frameFill={frame.fill}
                onPress={vm.onPhotoPress}
              />
            );
          })}
        </MapView>
      ) : null}

      <MapOverlay vm={vm} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.mapLand,
  },
});
