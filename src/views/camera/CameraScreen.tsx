import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { CameraView } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components';
import { FILM_FILTERS } from '@/models';
import { colors, filmFilters, fontFamilies, fontSizes, layout, spacing } from '@/theme';
import { useCameraViewModel, type CameraViewModel } from '@/viewmodels/useCameraViewModel';
import { CameraDial, Triangle } from './CameraDial';
import { CameraPermissionView } from './CameraPermissionView';
import { CameraToast } from './CameraToast';
import { CameraTopBar } from './CameraTopBar';
import { DevelopingPrint } from './DevelopingPrint';
import {
  DESIGN_WIDTH,
  TOP_ROW_LEFT,
  TOP_ROW_RIGHT,
  ZOOM_STOPS,
  cluster,
  computeCameraLayout,
  filterIndexOf,
  topSwitchWidth,
  zoomIndexOf,
  zoomSpec,
  type CameraLayout,
} from './dialGeometry';
import { FlashOverlay } from './FlashOverlay';
import { FrameKnob } from './FrameKnob';
import { LastPrintButton } from './LastPrintButton';
import { LocationPromptCard } from './LocationPromptCard';
import { Viewfinder } from './Viewfinder';

const READOUT_LINE_HEIGHT = 16;
/** Design: letter-spacing 0.12em on 11px. */
const READOUT_LETTER_SPACING = 1.3;

/**
 * Camera pane: dark body with flash/timer slide switches, the live viewfinder print (with the
 * flip button on its corner), last print,
 * readout, frame knob and the zoom/filter dial around the shutter.
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

  const onSelectZoom = useCallback((index: number) => actions.selectZoom(ZOOM_STOPS[index].stop), [actions]);
  const onSelectFilter = useCallback((index: number) => actions.selectFilter(FILM_FILTERS[index]), [actions]);

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
  const filterLabel = filmFilters[vm.filter].label;

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
          <CameraTopBar
            flashMode={vm.flashMode}
            timerSeconds={vm.timerSeconds}
            onChangeFlash={actions.setFlashMode}
            onChangeTimer={actions.setTimerSeconds}
            switchWidth={topSwitchWidth(
              size.width - TOP_ROW_LEFT - TOP_ROW_RIGHT - insets.left - insets.right,
            )}
            style={[
              styles.topBar,
              { top: cameraLayout.topRowTop, left: TOP_ROW_LEFT + insets.left, right: TOP_ROW_RIGHT + insets.right },
            ]}
          />

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
              countdown={vm.countdown}
              status={status}
              camera={camera}
              onFlip={actions.toggleFacing}
              flipDisabled={vm.isCapturing || vm.countdown !== null}
            />
          </View>

          <BodyCluster
            layout={cameraLayout}
            vm={vm}
            zoomLabel={zoom.label}
            filterLabel={filterLabel}
            onSelectZoom={onSelectZoom}
            onSelectFilter={onSelectFilter}
          />

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

interface BodyClusterProps {
  layout: CameraLayout;
  vm: CameraViewModel;
  zoomLabel: string;
  filterLabel: string;
  onSelectZoom: (index: number) => void;
  onSelectFilter: (index: number) => void;
}

/** Bottom of the body, laid out in design coordinates × scale: last print, readout, knob, pointer, dial. */
function BodyCluster({ layout: box, vm, zoomLabel, filterLabel, onSelectZoom, onSelectFilter }: BodyClusterProps) {
  const { scale } = box;
  const u = (value: number) => value * scale;
  const { actions } = vm;
  return (
    <View
      pointerEvents="box-none"
      style={[styles.cluster, { left: box.clusterLeft, top: box.clusterTop, width: u(DESIGN_WIDTH) }]}
    >
      <LastPrintButton scale={scale} photo={vm.lastPhoto} onPress={actions.openDiary} />

      <View
        style={[styles.readout, { left: u(cluster.readout.left), top: u(cluster.readout.top), width: u(cluster.readout.width) }]}
        accessible
        accessibilityLabel={`Zoom ${zoomLabel}, lọc ${filterLabel}`}
      >
        <AppText style={styles.readoutText} numberOfLines={1}>
          {'ZOOM '}
          <AppText style={styles.readoutValue}>{zoomLabel}</AppText>
        </AppText>
        <AppText style={styles.readoutText} numberOfLines={1}>
          {'LỌC '}
          <AppText style={styles.readoutValue}>{filterLabel}</AppText>
        </AppText>
      </View>

      <FrameKnob
        scale={scale}
        frameType={vm.frameType}
        onSelect={actions.selectFrameType}
        onCycle={actions.cycleFrameType}
      />

      <Triangle
        left={u(cluster.pointer.left)}
        top={u(cluster.pointer.top)}
        halfWidth={u(cluster.pointer.halfWidth)}
        height={u(cluster.pointer.height)}
        color={colors.accent}
      />

      <View style={[styles.dial, { left: u(cluster.dial.left), top: u(cluster.dial.top) }]}>
        <CameraDial
          scale={scale}
          zoomIndex={zoomIndexOf(vm.zoom)}
          filterIndex={filterIndexOf(vm.filter)}
          onSelectZoom={onSelectZoom}
          onSelectFilter={onSelectFilter}
          onShutter={actions.pressShutter}
          isCountingDown={vm.countdown !== null}
          shutterDisabled={!vm.isCameraReady || vm.developing !== null}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cameraBody,
  },
  topBar: {
    position: 'absolute',
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
    bottom: 0,
  },
  readout: {
    position: 'absolute',
    alignItems: 'center',
  },
  readoutText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    lineHeight: READOUT_LINE_HEIGHT,
    letterSpacing: READOUT_LETTER_SPACING,
    color: colors.cameraLabel,
  },
  readoutValue: {
    fontFamily: fontFamilies.bold,
    letterSpacing: 0,
    color: colors.onInk,
  },
  dial: {
    position: 'absolute',
    // Dial (top 640 in the design) runs off the bottom of the pane; the pane clips it.
    zIndex: 1,
  },
  messages: {
    position: 'absolute',
    gap: spacing.sm,
  },
});
