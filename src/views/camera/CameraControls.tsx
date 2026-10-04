import { useCallback, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText, PressableScale, SlideSwitch, type SlideSwitchOption } from '@/components';
import {
  FILM_FILTERS,
  FRAME_TYPES,
  MOODS,
  WEATHERS,
  type FilmFilter,
  type FlashMode,
  type FrameType,
  type TimerSeconds,
} from '@/models';
import {
  borderRadius,
  colors,
  filmFilters,
  fontFamilies,
  moodStyles,
  pressFeedback,
  weatherStyles,
  type NoteStyle,
} from '@/theme';
import type { CameraViewModel } from '@/viewmodels/useCameraViewModel';
import {
  CLUSTER_HEIGHT,
  ZOOM_STOPS,
  cluster,
  drum,
  drumOverlayLeft,
  filterIndexOf,
  frameDrumOverlay,
  switchWidth,
  zoomIndexOf,
} from './cameraGeometry';
import { LcdDrum, type LcdDrumGeometry } from './LcdDrum';
import { SnapStrip } from './SnapStrip';

// ─── Static option tables ──────────────────────────────────────────────────────

const FLASH_OPTIONS: readonly SlideSwitchOption<FlashMode>[] = [
  { value: 'off', label: 'TẮT' },
  { value: 'auto', label: 'AUTO' },
  { value: 'on', label: 'BẬT' },
];
const TIMER_OPTIONS: readonly SlideSwitchOption<TimerSeconds>[] = [
  { value: 0, label: 'TẮT' },
  { value: 3, label: '3s' },
  { value: 10, label: '10s' },
];
const FLASH_LED: Record<FlashMode, string> = {
  on: colors.cameraLedOn,
  auto: colors.cameraLedAuto,
  off: colors.cameraLedOff,
};

/** Frame drum glyphs (design: box bw × bh with a letter, then the name). */
const FRAME_GLYPHS: Record<FrameType, { name: string; letter: string; w: number; h: number; fontSize: number }> = {
  mini: { name: 'Mini', letter: 'M', w: 12, h: 17, fontSize: 8 },
  square: { name: 'Square', letter: 'SQ', w: 16, h: 16, fontSize: 7 },
  wide: { name: 'Wide', letter: 'W', w: 21, h: 14, fontSize: 8 },
};

/** Miniature landscape on the film swatches (design scene, cropped to the swatch). */
const SCENE = { sky: colors.sceneSky, sun: colors.sceneSun, hills: colors.sceneHills, water: colors.sceneWater };
const MONO_SCENE = {
  sky: colors.sceneSkyMono,
  sun: colors.sceneSunMono,
  hills: colors.sceneHillsMono,
  water: colors.sceneWaterMono,
};
/** iOS supports only part of the CSS `filter` style; the colour wash carries the look there. */
const SUPPORTS_FILTER_STYLE = Platform.OS !== 'ios';

const ZOOM_TICK_PITCH = 12;
const ZOOM_TICK_HEIGHT = 9;
const FILM_SWATCH = 52;
const FILM_SWATCH_RADIUS = 12;
const LED_SIZE = 6;
const ICON_SIZE = 18;
const STOP_MARK_RATIO = 0.36;
const DISABLED_OPACITY = 0.5;

const frameDrumGeometry: LcdDrumGeometry = {
  width: cluster.frameDrum.width,
  height: cluster.frameDrum.height,
  item: cluster.frameDrum.item,
  overlay: frameDrumOverlay,
  highlight: { left: 6, top: 68, width: 56, height: 52 },
};

function noteDrumGeometry(left: number): LcdDrumGeometry {
  const overlayLeft = drumOverlayLeft(left);
  const centre = drum.width / 2 - overlayLeft;
  return {
    width: drum.width,
    height: drum.height,
    item: drum.item,
    overlay: { left: overlayLeft, top: drum.overlayTop, width: drum.overlayWidth, height: drum.overlayHeight },
    highlight: { left: centre - drum.item / 2, top: 5, width: drum.item, height: drum.height },
  };
}

const weatherDrumGeometry = noteDrumGeometry(cluster.weatherDrum.left);
const moodDrumGeometry = noteDrumGeometry(cluster.moodDrum.left);

// ─── Cluster ────────────────────────────────────────────────────────────────────

export interface CameraControlsProps {
  vm: CameraViewModel;
  /** Pane width (the strips run edge to edge). */
  width: number;
  scale: number;
  /** Left edge of the centred 390-wide design box. */
  clusterLeft: number;
}

/**
 * Everything below the viewfinder: zoom ruler, film strip, flash / timer switches around the
 * frame drum, the shutter, and the weather / mood drums. Laid out in design units × scale.
 */
export function CameraControls({ vm, width, scale, clusterLeft }: CameraControlsProps) {
  const u = (value: number) => value * scale;
  const x = (designX: number) => clusterLeft + u(designX);
  const { actions } = vm;

  const zoomIndex = zoomIndexOf(vm.zoom);
  const filterIndex = filterIndexOf(vm.filter);
  const frameIndex = FRAME_TYPES.indexOf(vm.frameType);
  const weatherIndex = WEATHERS.indexOf(vm.weather);
  const moodIndex = MOODS.indexOf(vm.mood);

  const onSelectZoom = useCallback((i: number) => actions.selectZoom(ZOOM_STOPS[i].stop), [actions]);
  const onSelectFilter = useCallback((i: number) => actions.selectFilter(FILM_FILTERS[i]), [actions]);
  const onSelectFrame = useCallback((i: number) => actions.selectFrameType(FRAME_TYPES[i]), [actions]);
  const onSelectWeather = useCallback((i: number) => actions.selectWeather(WEATHERS[i]), [actions]);
  const onSelectMood = useCallback((i: number) => actions.selectMood(MOODS[i]), [actions]);

  const isCountingDown = vm.countdown !== null;
  const shutterDisabled = (!vm.isCameraReady || vm.developing !== null) && !isCountingDown;
  const shutterSize = u(cluster.shutter.size);
  const frame = FRAME_GLYPHS[vm.frameType];
  const sw = switchWidth(scale);

  return (
    <View pointerEvents="box-none" style={[styles.root, { height: u(CLUSTER_HEIGHT) }]}>
      <View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.pointer,
          {
            left: width / 2 - u(cluster.pointer.halfWidth),
            top: u(cluster.pointer.top),
            borderLeftWidth: u(cluster.pointer.halfWidth),
            borderRightWidth: u(cluster.pointer.halfWidth),
            borderTopWidth: u(cluster.pointer.height),
          },
        ]}
      />

      <View style={[styles.abs, { left: 0, top: u(cluster.zoomStrip.top) }]}>
        <SnapStrip
          count={ZOOM_STOPS.length}
          index={zoomIndex}
          onSelect={onSelectZoom}
          width={width}
          itemWidth={u(cluster.zoomStrip.item)}
          height={u(cluster.zoomStrip.height)}
          fade={0.22}
          fadeColor={colors.cameraBody}
          accessibilityLabel="Zoom"
          accessibilityValue={ZOOM_STOPS[zoomIndex].label}
          renderItem={(i, active) => <ZoomMark label={ZOOM_STOPS[i].rulerLabel} active={active} scale={scale} />}
        />
      </View>

      <View style={[styles.abs, { left: 0, top: u(cluster.filterStrip.top) }]}>
        <SnapStrip
          count={FILM_FILTERS.length}
          index={filterIndex}
          onSelect={onSelectFilter}
          width={width}
          itemWidth={u(cluster.filterStrip.item)}
          height={u(cluster.filterStrip.height)}
          fade={0.16}
          fadeColor={colors.cameraBody}
          accessibilityLabel="Bộ lọc màu"
          accessibilityValue={filmFilters[vm.filter].label}
          renderItem={(i, active) => <FilmSwatch filter={FILM_FILTERS[i]} active={active} scale={scale} />}
        />
      </View>

      <SwitchGroup
        left={x(cluster.switches.flashLeft)}
        top={u(cluster.switches.top)}
        icon="flash-outline"
        led={FLASH_LED[vm.flashMode]}
        glow={vm.flashMode === 'on'}
      >
        <SlideSwitch
          options={FLASH_OPTIONS}
          value={vm.flashMode}
          onChange={actions.setFlashMode}
          width={sw}
          accessibilityLabel="Đèn flash"
        />
      </SwitchGroup>
      <SwitchGroup
        left={x(cluster.switches.timerLeft)}
        top={u(cluster.switches.top)}
        icon="timer-outline"
        led={vm.timerSeconds > 0 ? colors.cameraLedOn : colors.cameraLedOff}
        glow={vm.timerSeconds > 0}
      >
        <SlideSwitch
          options={TIMER_OPTIONS}
          value={vm.timerSeconds}
          onChange={actions.setTimerSeconds}
          width={sw}
          accessibilityLabel="Hẹn giờ"
        />
      </SwitchGroup>

      <PressableScale
        onPress={actions.pressShutter}
        disabled={shutterDisabled}
        pressedScale={pressFeedback.shutterScale}
        accessibilityRole="button"
        accessibilityLabel={isCountingDown ? 'Huỷ hẹn giờ' : 'Chụp ảnh'}
        accessibilityState={{ disabled: shutterDisabled }}
        style={[
          styles.shutter,
          {
            left: x(cluster.shutter.left),
            top: u(cluster.shutter.top),
            width: shutterSize,
            height: shutterSize,
            borderWidth: u(3),
            padding: u(6),
            boxShadow: `0 0 0 ${u(2)}px ${colors.cameraBezel}, 0 6px 16px ${colors.cameraSwitchThumbShadow}`,
          },
          shutterDisabled ? styles.disabled : null,
        ]}
      >
        <View style={styles.shutterCore}>
          {isCountingDown ? (
            <View
              style={[styles.stopMark, { width: shutterSize * STOP_MARK_RATIO, height: shutterSize * STOP_MARK_RATIO }]}
            />
          ) : null}
        </View>
      </PressableScale>

      {/* Drums last: their pop-out strips draw over everything else. */}
      <View style={[styles.abs, { left: x(cluster.weatherDrum.left), top: u(cluster.weatherDrum.top) }]}>
        <LcdDrum
          orientation="horizontal"
          geometry={weatherDrumGeometry}
          scale={scale}
          count={WEATHERS.length}
          index={weatherIndex}
          onSelect={onSelectWeather}
          accessibilityLabel="Thời tiết"
          accessibilityValue={weatherStyles[vm.weather].label}
          face={<NoteFace note={weatherStyles[vm.weather]} scale={scale} />}
          renderItem={(i, active) => <NoteItem note={weatherStyles[WEATHERS[i]]} active={active} scale={scale} />}
        />
      </View>
      <View style={[styles.abs, { left: x(cluster.moodDrum.left), top: u(cluster.moodDrum.top) }]}>
        <LcdDrum
          orientation="horizontal"
          geometry={moodDrumGeometry}
          scale={scale}
          count={MOODS.length}
          index={moodIndex}
          onSelect={onSelectMood}
          accessibilityLabel="Cảm xúc"
          accessibilityValue={moodStyles[vm.mood].label}
          face={<NoteFace note={moodStyles[vm.mood]} scale={scale} />}
          renderItem={(i, active) => <NoteItem note={moodStyles[MOODS[i]]} active={active} scale={scale} />}
        />
      </View>
      <View style={[styles.abs, { left: x(cluster.frameDrum.left), top: u(cluster.frameDrum.top) }]}>
        <LcdDrum
          orientation="vertical"
          geometry={frameDrumGeometry}
          scale={scale}
          count={FRAME_TYPES.length}
          index={frameIndex}
          onSelect={onSelectFrame}
          accessibilityLabel="Kiểu khung"
          accessibilityValue={frame.name}
          face={<FrameGlyph frameType={vm.frameType} color={colors.cameraLcdText} scale={scale} />}
          renderItem={(i, active) => (
            <FrameGlyph
              frameType={FRAME_TYPES[i]}
              color={active ? colors.cameraLcdText : colors.cameraLcdDim}
              scale={scale}
            />
          )}
        />
      </View>
    </View>
  );
}

// ─── Pieces ─────────────────────────────────────────────────────────────────────

/** One stop on the zoom ruler: fine ticks along the top, a centre tick and the label. */
function ZoomMark({ label, active, scale }: { label: string; active: boolean; scale: number }) {
  const u = (value: number) => value * scale;
  const ticks = Math.round(72 / ZOOM_TICK_PITCH);
  return (
    <View style={styles.zoomMark}>
      <View style={[styles.zoomTicks, { height: u(ZOOM_TICK_HEIGHT) }]}>
        {Array.from({ length: ticks }, (_, i) => (
          <View key={i} style={[styles.zoomTick, { left: u(i * ZOOM_TICK_PITCH) }]} />
        ))}
      </View>
      <View
        style={[
          styles.zoomCentreTick,
          {
            left: u(35),
            width: u(2),
            height: u(16),
            backgroundColor: active ? colors.cameraAmber : colors.cameraRulerTickIdle,
          },
        ]}
      />
      <AppText
        style={[
          styles.zoomLabel,
          {
            fontSize: u(active ? 16 : 13),
            lineHeight: u(active ? 20 : 16),
            paddingBottom: u(2),
            color: active ? colors.cameraAmber : colors.cameraLabel,
          },
          active ? styles.amberGlow : null,
        ]}
      >
        {label}
      </AppText>
    </View>
  );
}

/** Film look preview: a tiny landscape with the look applied, and its name. */
function FilmSwatch({ filter, active, scale }: { filter: FilmFilter; active: boolean; scale: number }) {
  const u = (value: number) => value * scale;
  const look = filmFilters[filter];
  const scene = filter === 'mono' ? MONO_SCENE : SCENE;
  const size = u(FILM_SWATCH);
  const sun = size * 0.27;
  return (
    <View style={[styles.swatchCell, { gap: u(5) }]}>
      <View
        style={[
          styles.swatch,
          {
            width: size,
            height: size,
            borderRadius: u(FILM_SWATCH_RADIUS),
            borderColor: active ? colors.cameraAmber : colors.transparent,
            boxShadow: active ? `0 0 10px ${colors.cameraAmberGlow}` : undefined,
          },
        ]}
      >
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: scene.water },
            SUPPORTS_FILTER_STYLE && look.filter && filter !== 'mono' ? { filter: look.filter } : null,
          ]}
        >
          <View style={[styles.sceneBand, { top: 0, height: '50%', backgroundColor: scene.sky }]} />
          <View
            style={{
              position: 'absolute',
              left: size * 0.68 - sun / 2,
              top: size * 0.26 - sun / 2,
              width: sun,
              height: sun,
              borderRadius: sun / 2,
              backgroundColor: scene.sun,
              opacity: 0.85,
            }}
          />
          <View style={[styles.sceneBand, { top: '48%', height: '13%', backgroundColor: scene.hills }]} />
        </View>
        {look.tint && filter !== 'mono' ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: look.tint.color, opacity: look.tint.opacity }]} />
        ) : null}
      </View>
      <AppText
        numberOfLines={1}
        style={[
          styles.swatchLabel,
          { fontSize: u(10), lineHeight: u(13), color: active ? colors.onInk : colors.cameraLabelIdle },
        ]}
      >
        {look.label}
      </AppText>
    </View>
  );
}

/** Small engraved icon with a status LED below it, then the switch. */
function SwitchGroup({
  left,
  top,
  icon,
  led,
  glow,
  children,
}: {
  left: number;
  top: number;
  icon: keyof typeof Ionicons.glyphMap;
  led: string;
  glow: boolean;
  children: ReactNode;
}) {
  return (
    <View style={[styles.switchGroup, { left, top, height: cluster.switches.height }]}>
      <View style={styles.indicator} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Ionicons name={icon} size={ICON_SIZE} color={colors.cameraSwitchIcon} />
        <View style={[styles.led, { backgroundColor: led }, glow ? { boxShadow: `0 0 6px ${led}` } : null]} />
      </View>
      {children}
    </View>
  );
}

/** Weather / mood drum face: icon + name, lit amber. */
function NoteFace({ note, scale }: { note: NoteStyle; scale: number }) {
  const u = (value: number) => value * scale;
  return (
    <View style={[styles.noteFace, { gap: u(4) }]}>
      <MaterialCommunityIcons name={note.icon} size={u(16)} color={colors.cameraLcdText} style={styles.lcdGlow} />
      <AppText numberOfLines={1} style={[styles.lcdText, styles.lcdGlow, { fontSize: u(11), lineHeight: u(14) }]}>
        {note.label}
      </AppText>
    </View>
  );
}

/** Weather / mood option in the pop-out strip. */
function NoteItem({ note, active, scale }: { note: NoteStyle; active: boolean; scale: number }) {
  const u = (value: number) => value * scale;
  const color = active ? colors.cameraLcdText : colors.cameraLcdDim;
  return (
    <View style={[styles.noteItem, { gap: u(2) }]}>
      <MaterialCommunityIcons name={note.icon} size={u(18)} color={color} />
      <AppText numberOfLines={1} style={[styles.lcdText, { fontSize: u(10), lineHeight: u(12), color }]}>
        {note.label}
      </AppText>
    </View>
  );
}

/** Print-format glyph: an outlined box in the format's proportions with its letter, then its name. */
function FrameGlyph({ frameType, color, scale }: { frameType: FrameType; color: string; scale: number }) {
  const u = (value: number) => value * scale;
  const glyph = FRAME_GLYPHS[frameType];
  const glow = color === colors.cameraLcdText ? styles.lcdGlow : null;
  return (
    <View style={[styles.frameGlyph, { gap: u(3) }]}>
      <View
        style={[
          styles.frameBox,
          { width: u(glyph.w), height: u(glyph.h), borderColor: color, borderWidth: Math.max(1, u(1.5)) },
        ]}
      >
        <AppText style={[styles.frameLetter, glow, { color, fontSize: u(glyph.fontSize), lineHeight: u(glyph.fontSize) }]}>
          {glyph.letter}
        </AppText>
      </View>
      <AppText style={[styles.frameName, glow, { color, fontSize: u(9), lineHeight: u(11) }]}>{glyph.name}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  abs: {
    position: 'absolute',
  },
  pointer: {
    position: 'absolute',
    zIndex: 3,
    width: 0,
    height: 0,
    borderLeftColor: colors.transparent,
    borderRightColor: colors.transparent,
    borderTopColor: colors.cameraAmber,
  },
  amberGlow: {
    textShadowColor: colors.cameraAmberGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  zoomMark: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  zoomTicks: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  zoomTick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.cameraRulerTick,
  },
  zoomCentreTick: {
    position: 'absolute',
    top: 0,
    borderRadius: 1,
  },
  zoomLabel: {
    fontFamily: fontFamilies.bold,
  },
  swatchCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    overflow: 'hidden',
    borderWidth: 2,
    backgroundColor: SCENE.water,
  },
  sceneBand: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  swatchLabel: {
    fontFamily: fontFamilies.semibold,
  },
  switchGroup: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  indicator: {
    alignItems: 'center',
    gap: 4,
  },
  led: {
    width: LED_SIZE,
    height: LED_SIZE,
    borderRadius: LED_SIZE / 2,
  },
  shutter: {
    position: 'absolute',
    borderRadius: borderRadius.pill,
    borderColor: colors.cameraShutterRing,
    backgroundColor: colors.cameraShutterWell,
  },
  shutterCore: {
    flex: 1,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `inset 0 -4px 6px ${colors.cameraShutterShade}, inset 0 6px 6px -2px ${colors.cameraShutterShine}`,
  },
  stopMark: {
    backgroundColor: colors.onInk,
    borderRadius: borderRadius.xs,
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
  lcdText: {
    fontFamily: fontFamilies.semibold,
    color: colors.cameraLcdText,
  },
  lcdGlow: {
    textShadowColor: colors.cameraLcdGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  noteFace: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  noteItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameGlyph: {
    alignItems: 'center',
  },
  frameBox: {
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameLetter: {
    fontFamily: fontFamilies.bold,
  },
  frameName: {
    fontFamily: fontFamilies.bold,
  },
});
