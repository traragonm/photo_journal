import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BackHandler, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { EdgeTab, Handle } from '@/components';
import { borderRadius, colors, shadows, springs } from '@/theme';
import { dayKeyOf, type DayKey } from '@/utils/date';
import { CalendarSheet } from '@/views/calendar/CalendarSheet';
import { CameraScreen } from '@/views/camera/CameraScreen';
import { DiaryScreen } from '@/views/diary/DiaryScreen';
import { MapScreen } from '@/views/map/MapScreen';
import { SettingsSheet } from '@/views/settings/SettingsSheet';
import { HomeNavProvider, PANES, type HomeNav, type Pane, type Sheet } from './HomeNavigator';
import { SheetPullZone } from './SheetPullZone';

/** Edge tabs sit at the same height on every pane (372 / 844 in the design). */
const EDGE_TAB_TOP_RATIO = 372 / 844;
/** Settings curtain leaves this much paper below it for the "Kéo lên để đóng" handle. */
const SETTINGS_BOTTOM_GAP = 68;
/** Calendar sheet starts this far below the safe area. */
const CALENDAR_TOP_GAP = 24;
/** Width of the swipe-back strip on the inner edge of the map and camera panes. */
const EDGE_SWIPE_WIDTH = 28;
const PANE_COMMIT_FRACTION = 0.25;
const PANE_FLICK_VELOCITY = 500;
const PANE_ACTIVATE_OFFSET = 20;
const PANE_FAIL_OFFSET = 15;
/** Extra distance so a closed sheet's shadow is off screen too. */
const shadowAllowance = 40;

const paneIndex = (pane: Pane) => PANES.indexOf(pane);

function isPane(value: unknown): value is Pane {
  return typeof value === 'string' && (PANES as readonly string[]).includes(value);
}

/**
 * The app's single home route: three side-by-side panes (Map · Diary · Camera)
 * plus two sheets (Settings from the top, Calendar from the bottom), navigated by
 * swipes, edge tabs and handles exactly as laid out in the design's gesture map.
 */
export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ pane?: string; focus?: string; day?: string }>();

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pane, setPane] = useState<Pane>('diary');
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [mounted, setMounted] = useState<ReadonlySet<Pane>>(() => new Set<Pane>(['diary', 'camera']));
  const [selectedDay, setSelectedDay] = useState<DayKey>(() => dayKeyOf(new Date()));
  const [mapFocusId, setMapFocusId] = useState<string | null>(null);

  const paneWidth = useSharedValue(0);
  const trackX = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const settingsProgress = useSharedValue(0);
  const calendarProgress = useSharedValue(0);
  const sheetTravel = useSharedValue(1);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setSize({ width, height });
      paneWidth.set(width);
      sheetTravel.set(height);
    },
    [paneWidth, sheetTravel],
  );

  const goTo = useCallback((next: Pane) => {
    setMounted((current) => (current.has(next) ? current : new Set([...current, next])));
    setPane(next);
  }, []);
  const openSheet = useCallback((next: Sheet) => setSheet(next), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  // Pane / sheet state → animation targets (also corrects any drag that didn't commit).
  useEffect(() => {
    trackX.set(withSpring(-paneIndex(pane) * size.width, springs.gentle));
  }, [pane, size.width, trackX]);
  useEffect(() => {
    settingsProgress.set(withSpring(sheet === 'settings' ? 1 : 0, springs.gentle));
    calendarProgress.set(withSpring(sheet === 'calendar' ? 1 : 0, springs.gentle));
  }, [sheet, settingsProgress, calendarProgress]);

  // Deep links: "/?pane=map&focus=<id>" (Xem trên bản đồ), "/?day=YYYY-MM-DD".
  useEffect(() => {
    if (!params.pane && !params.focus && !params.day) return;
    // Applying an external event (a deep link / router params), then clearing it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (params.focus) setMapFocusId(params.focus);
    if (params.day) setSelectedDay(params.day);
    if (isPane(params.pane)) goTo(params.pane);
    setSheet(null);
    router.setParams({ pane: undefined, focus: undefined, day: undefined });
  }, [params.pane, params.focus, params.day, goTo]);

  // Android back: close a sheet, else return to the diary.
  useEffect(() => {
    if (!isFocused) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sheet) {
        setSheet(null);
        return true;
      }
      if (pane !== 'diary') {
        goTo('diary');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [isFocused, sheet, pane, goTo]);

  const nav: HomeNav = useMemo(
    () => ({
      pane,
      sheet,
      goTo,
      openSheet,
      closeSheet,
      selectedDay,
      selectDay: setSelectedDay,
      mapFocusId,
      clearMapFocus: () => setMapFocusId(null),
      isPaneActive: (candidate: Pane) => isFocused && pane === candidate && sheet === null,
      sheetProgress: { settings: settingsProgress, calendar: calendarProgress },
      sheetTravel,
    }),
    [pane, sheet, goTo, openSheet, closeSheet, selectedDay, mapFocusId, isFocused, settingsProgress, calendarProgress, sheetTravel],
  );

  // Horizontal swipes between panes.
  const settlePane = useCallback((index: number) => goTo(PANES[index]), [goTo]);
  const panePan = Gesture.Pan()
    .activeOffsetX([-PANE_ACTIVATE_OFFSET, PANE_ACTIVATE_OFFSET])
    .failOffsetY([-PANE_FAIL_OFFSET, PANE_FAIL_OFFSET])
    .onStart(() => {
      dragStartX.set(trackX.get());
    })
    .onUpdate((event) => {
      const min = -(PANES.length - 1) * paneWidth.get();
      trackX.set(Math.min(0, Math.max(min, dragStartX.get() + event.translationX)));
    })
    .onEnd((event) => {
      const width = Math.max(paneWidth.get(), 1);
      const from = Math.round(-dragStartX.get() / width);
      const moved = -event.translationX / width;
      let target = from;
      if (moved > PANE_COMMIT_FRACTION || event.velocityX < -PANE_FLICK_VELOCITY) target = from + 1;
      if (moved < -PANE_COMMIT_FRACTION || event.velocityX > PANE_FLICK_VELOCITY) target = from - 1;
      target = Math.min(PANES.length - 1, Math.max(0, target));
      trackX.set(withSpring(-target * width, springs.gentle));
      scheduleOnRN(settlePane, target);
    });

  const trackStyle = useAnimatedStyle(() => ({ transform: [{ translateX: trackX.get() }] }));
  const edgeTabTop = size.height * EDGE_TAB_TOP_RATIO;
  const ready = size.width > 0;

  return (
    <HomeNavProvider value={nav}>
      {isFocused ? <StatusBar style={pane === 'camera' ? 'light' : 'dark'} /> : null}
      <View style={styles.root} onLayout={onLayout}>
        {ready ? (
          <>
            <Animated.View style={[styles.track, { width: size.width * PANES.length }, trackStyle]}>
              {/* MAP — back to the diary via the right edge */}
              <View style={[styles.pane, { width: size.width }]}>
                {mounted.has('map') ? <MapScreen /> : null}
                <EdgeSwipe gesture={panePan} side="right" />
                <EdgeTab
                  side="right"
                  icon="polaroid"
                  top={edgeTabTop}
                  onPress={() => goTo('diary')}
                  accessibilityLabel="Quay lại nhật ký"
                />
              </View>

              {/* DIARY — swipe anywhere; tabs to map (left) and camera (right) */}
              <GestureDetector gesture={panePan}>
                <View style={[styles.pane, { width: size.width }]}>
                  <DiaryScreen />
                  <EdgeTab
                    side="left"
                    icon="map-outline"
                    top={edgeTabTop}
                    onPress={() => goTo('map')}
                    accessibilityLabel="Mở bản đồ"
                  />
                  <EdgeTab
                    side="right"
                    icon="camera-outline"
                    tone="accent"
                    top={edgeTabTop}
                    onPress={() => goTo('camera')}
                    accessibilityLabel="Mở camera"
                  />
                </View>
              </GestureDetector>

              {/* CAMERA — back to the diary via the left edge */}
              <View style={[styles.pane, styles.cameraPane, { width: size.width }]}>
                {mounted.has('camera') ? <CameraScreen /> : null}
                <EdgeSwipe gesture={panePan} side="left" />
                <EdgeTab
                  side="left"
                  icon="polaroid"
                  tone="light"
                  top={edgeTabTop}
                  onPress={() => goTo('diary')}
                  accessibilityLabel="Quay lại nhật ký"
                />
              </View>
            </Animated.View>

            <SheetLayer progress={calendarProgress} active={sheet === 'calendar'} onClose={closeSheet}>
              <SheetContainer
                progress={calendarProgress}
                height={size.height - insets.top - CALENDAR_TOP_GAP}
                from="bottom"
                style={[styles.calendarSheet, { top: insets.top + CALENDAR_TOP_GAP }]}
              >
                <SheetPullZone sheet="calendar" intent="close">
                  <Handle label="Kéo xuống để đóng" onPress={closeSheet} accessibilityLabel="Đóng lịch ảnh" />
                </SheetPullZone>
                <CalendarSheet />
              </SheetContainer>
            </SheetLayer>

            <SheetLayer progress={settingsProgress} active={sheet === 'settings'} onClose={closeSheet}>
              <SheetContainer
                progress={settingsProgress}
                height={size.height - SETTINGS_BOTTOM_GAP}
                from="top"
                style={[styles.settingsSheet, { height: size.height - SETTINGS_BOTTOM_GAP, paddingTop: insets.top }]}
              >
                <SettingsSheet />
              </SheetContainer>
              <SheetPullZone
                sheet="settings"
                intent="close"
                style={[styles.settingsCloseZone, { height: SETTINGS_BOTTOM_GAP, paddingBottom: insets.bottom }]}
              >
                <Handle
                  label="Kéo lên để đóng"
                  barPosition="top"
                  onPress={closeSheet}
                  accessibilityLabel="Đóng cài đặt"
                />
              </SheetPullZone>
            </SheetLayer>
          </>
        ) : null}
      </View>
    </HomeNavProvider>
  );
}

/** Transparent strip on a pane's inner edge that starts a swipe back to the diary. */
function EdgeSwipe({ gesture, side }: { gesture: ReturnType<typeof Gesture.Pan>; side: 'left' | 'right' }) {
  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.edgeSwipe, side === 'left' ? styles.edgeLeft : styles.edgeRight]} />
    </GestureDetector>
  );
}

/** Full-screen layer for one sheet: paper backdrop that fades in; tap it to close. */
function SheetLayer({
  progress,
  active,
  onClose,
  children,
}: {
  progress: SharedValue<number>;
  active: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const layerStyle = useAnimatedStyle(() => ({ display: progress.get() > 0.001 ? 'flex' : 'none' }));
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, layerStyle]}
      pointerEvents={active ? 'auto' : 'box-none'}
      accessibilityViewIsModal={active}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <View style={StyleSheet.absoluteFill} onTouchEnd={onClose} accessible={false} />
      </Animated.View>
      {children}
    </Animated.View>
  );
}

function SheetContainer({
  progress,
  height,
  from,
  style,
  children,
}: {
  progress: SharedValue<number>;
  height: number;
  from: 'top' | 'bottom';
  style: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const sheetStyle = useAnimatedStyle(() => {
    const hidden = (from === 'top' ? -1 : 1) * (height + shadowAllowance);
    return { transform: [{ translateY: interpolate(progress.get(), [0, 1], [hidden, 0]) }] };
  });
  return <Animated.View style={[style, sheetStyle]}>{children}</Animated.View>;
}


const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.paper,
  },
  track: {
    flex: 1,
    flexDirection: 'row',
  },
  pane: {
    height: '100%',
    overflow: 'hidden',
    backgroundColor: colors.paper,
  },
  cameraPane: {
    backgroundColor: colors.cameraBody,
  },
  // Middle band only, so it never overlaps the camera's top row or bottom controls.
  edgeSwipe: {
    position: 'absolute',
    top: '15%',
    bottom: '35%',
    width: EDGE_SWIPE_WIDTH,
    zIndex: 4,
  },
  edgeLeft: { left: 0 },
  edgeRight: { right: 0 },
  backdrop: {
    backgroundColor: colors.paper,
  },
  calendarSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.sheet,
    borderTopLeftRadius: borderRadius.sheet,
    borderTopRightRadius: borderRadius.sheet,
    ...shadows.sheet,
  },
  settingsSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: colors.sheet,
    borderBottomLeftRadius: borderRadius.sheet,
    borderBottomRightRadius: borderRadius.sheet,
    overflow: 'hidden',
    ...shadows.sheetFromTop,
  },
  settingsCloseZone: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
