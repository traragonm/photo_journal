import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { useFrameStyle } from '@/viewmodels/shared';
import { useMapViewModel, type MapController } from '@/viewmodels/useMapViewModel';
import { LeafletMap } from './LeafletMap.web';
import { MapOverlay } from './MapOverlay';
import { sheetHeightFor } from './mapConstants';

/** Web map: Leaflet + OpenStreetMap tiles. Same ViewModel and overlay UI as native. */
export function MapScreen() {
  const controllerRef = useRef<MapController>(null);
  const vm = useMapViewModel(controllerRef);
  const insets = useSafeAreaInsets();
  const { frame } = useFrameStyle();

  return (
    <View style={styles.screen}>
      {vm.initialRegion && !vm.isEmpty ? (
        <LeafletMap
          ref={controllerRef}
          initialRegion={vm.initialRegion}
          items={vm.items}
          photosById={vm.photosById}
          selectedIds={vm.selectedIds}
          showsUserLocation={vm.showsUserLocation}
          frameFill={frame.fill}
          bottomPadding={sheetHeightFor(vm.sheetExpanded, insets.bottom)}
          onMapReady={vm.onMapReady}
          onRegionChangeComplete={vm.onRegionChangeComplete}
          onPhotoPress={vm.onPhotoPress}
          onClusterPress={vm.onClusterPress}
          onMapPress={vm.onMapPress}
        />
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
