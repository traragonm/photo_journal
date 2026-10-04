import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { CameraView } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, spacing } from '@/theme';
import { useCameraViewModel } from '@/viewmodels/useCameraViewModel';
import { CameraControls } from './CameraControls';
import { CameraPermissionView } from './CameraPermissionView';
import { CameraToast } from './CameraToast';
import { DevelopingPrint } from './DevelopingPrint';
import { computeCameraLayout, zoomSpec, type CameraLayout } from './cameraGeometry';
import { FlashOverlay } from './FlashOverlay';
import { LocationPromptCard } from './LocationPromptCard';
import { Viewfinder } from './Viewfinder';

/**
 * Camera pane: dark body with the live viewfinder print (flip button on its corner), then the
 * zoom ruler, film strip, flash / timer switches around the frame drum, the shutter and the
 * weather / mood drums.
 * Pure view — every decision lives in `useCameraViewModel`. The native camera is mounted
 * only while this pane is active and the app is in the foreground.
 */
export function CameraScreen() {
  const cameraRef = useRef<CameraView>(null);
  const vm = useCameraViewModel(cameraRef);
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const { actions } = vm;

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) => (current && current.width === width && current.height === height ? current : { width, height }));
  }, []);

  if (vm.permission !== 'granted') {
    return (
      <View style={styles.root} onLayout={onLayout}>
        {vm.permission === 'checking' ? null : (
          <CameraPermissionView isBlocked={vm.permission === 'blocked'} onEnable={actions.requestCameraPermission} />
        )}
      </View>
    );
  }

  const cameraLayout: CameraLayout | null = size
    ? computeCameraLayout({ ...size, insetTop: insets.top, insetBottom: insets.bottom })
    : null;
  const zoom = zoomSpec(vm.zoom);

  const camera = vm.isCameraActive ? (
    <CameraView
      ref={cameraRef}
      style={StyleSheet.absoluteFill}
      facing={vm.facing}
      flash={vm.flashMode}
      zoom={zoom.cameraZoom}
      mode="picture"
      mirror={vm.facing === 'front'}
      animateShutter={false}
      onCameraReady={actions.onCameraReady}
      onMountError={actions.onMountError}
      accessibilityLabel="Khung ngắm camera"
    />
  ) : null;

  const status = !vm.isCameraActive ? 'Camera đang nghỉ' : !vm.isCameraReady ? 'Đang mở camera…' : null;

  return (
    <View style={styles.root} onLayout={onLayout}>
      {cameraLayout && size ? (
        <>
          <View
            style={[styles.viewfinderArea, { top: cameraLayout.viewfinderTop, height: cameraLayout.viewfinderHeight }]}
          >
            <Viewfinder
              scale={cameraLayout.scale}
              maxWidth={cameraLayout.printMaxWidth}
              maxHeight={cameraLayout.printMaxHeight}
              frameType={vm.frameType}
              filter={vm.filter}
              zoomLabel={zoom.label}
              weather={vm.weather}
              mood={vm.mood}
              countdown={vm.countdown}
              status={status}
              camera={camera}
              onFlip={actions.toggleFacing}
              flipDisabled={vm.isCapturing || vm.countdown !== null}
            />
          </View>

          <View style={[styles.cluster, { top: cameraLayout.clusterTop }]} pointerEvents="box-none">
            <CameraControls
              vm={vm}
              width={size.width}
              scale={cameraLayout.scale}
              clusterLeft={cameraLayout.clusterLeft}
            />
          </View>

          <View
            pointerEvents="box-none"
            style={[
              styles.messages,
              {
                top: cameraLayout.viewfinderTop,
                left: layout.screenGutter + insets.left,
                right: layout.screenGutter + insets.right,
              },
            ]}
          >
            {vm.toast ? <CameraToast toast={vm.toast} onDismiss={actions.dismissToast} /> : null}
            {vm.showLocationPrompt ? (
              <LocationPromptCard onAllow={actions.allowLocation} onDismiss={actions.dismissLocationPrompt} />
            ) : null}
          </View>

          <FlashOverlay trigger={vm.flashTrigger} />

          {vm.developing ? (
            <DevelopingPrint
              key={vm.developing.id}
              print={vm.developing}
              paneWidth={size.width}
              paneHeight={size.height}
              captionMaxLength={vm.captionMaxLength}
              onChangeCaption={actions.setCaption}
              onDone={actions.finishPrint}
              onDismiss={actions.dismissPrint}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cameraBody,
  },
  viewfinderArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cluster: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  messages: {
    position: 'absolute',
    gap: spacing.sm,
  },
});
