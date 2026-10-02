import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import { colors } from '@/theme';
import { useFrameStyle } from '@/viewmodels/shared';
import { useMapViewModel } from '@/viewmodels/useMapViewModel';
import { MapClusterMarker } from './MapClusterMarker';
import { MapOverlay } from './MapOverlay';
import { MapPhotoMarker } from './MapPhotoMarker';
import { PAPER_MAP_STYLE } from './mapConstants';

export function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const vm = useMapViewModel(mapRef);
  const { frame } = useFrameStyle();

  return (
    <View style={styles.screen}>
      {vm.initialRegion && !vm.isEmpty ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={vm.initialRegion}
          customMapStyle={PAPER_MAP_STYLE}
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
