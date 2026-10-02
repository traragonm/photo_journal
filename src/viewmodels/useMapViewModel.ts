import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { router } from 'expo-router';
import type { PhotoEntry } from '@/models';
import { hasLocation } from '@/models';
import { LocationService, type LocationPermission } from '@/services/LocationService';
import {
  MAX_CLUSTER_ZOOM,
  createClusterIndex,
  fitRegion,
  getClusterLeafIds,
  getClusters,
  getExpansionZoom,
  regionForZoom,
  zoomForRegion,
  type MapItem,
  type ViewportRegion,
} from '@/utils/clustering';
import { useHomeNav } from '@/views/home/HomeNavigator';
import {
  CITY_ZOOM,
  EXPANSION_ZOOM_MARGIN,
  FALLBACK_REGION,
  FIT_PADDING,
  FOCUS_ZOOM,
  MAX_PREVIEW_PHOTOS,
  NOTICE_DURATION_MS,
  REGION_ANIMATION_MS,
  VIEWPORT_QUERY_PADDING,
} from '@/views/map/mapConstants';
import { usePhotoStore } from './shared';

export type LocatedPhoto = PhotoEntry & { latitude: number; longitude: number };
type ClusterItem = Extract<MapItem, { kind: 'cluster' }>;

export interface MapViewModel {
  isLoaded: boolean;
  /** No located photo at all: the view shows the empty state instead of a map. */
  isEmpty: boolean;
  /** Null until the first region is known (map is not rendered before that). */
  initialRegion: ViewportRegion | null;
  items: MapItem[];
  /** Photo lookup for markers. */
  photosById: ReadonlyMap<string, LocatedPhoto>;
  selectedIds: ReadonlySet<string>;
  showsUserLocation: boolean;
  isLocating: boolean;
  /** Gentle one-line message (permission denied, no fixâ€¦). */
  notice: string | null;
  onMapReady: () => void;
  onRegionChangeComplete: (region: ViewportRegion) => void;
  onPhotoPress: (id: string) => void;
  onClusterPress: (item: ClusterItem) => void;
  onMapPress: () => void;
  onLocatePress: () => void;
  onTakePhoto: () => void;
}

const NOTICE_DENIED = 'Vá»‹ trÃ­ Ä‘ang táº¯t. Báº¡n cÃ³ thá»ƒ báº­t láº¡i trong cÃ i Ä‘áº·t.';
const NOTICE_NO_FIX = 'ChÆ°a tÃ¬m tháº¥y vá»‹ trÃ­ cá»§a báº¡n. Thá»­ láº¡i sau nhÃ©.';

/**
 * Minimal imperative map API the ViewModel needs. react-native-maps' MapView satisfies it
 * on iOS/Android; the web view passes a small Leaflet adapter.
 */
export interface MapController {
  animateToRegion(region: ViewportRegion, durationMs?: number): void;
}

function openPhoto(id: string): void {
  router.push({ pathname: '/photo/[id]', params: { id } });
}

/**
 * @param mapRef owned by the View (it renders the map); the ViewModel only
 *   uses it imperatively to animate the camera.
 */
export function useMapViewModel(mapRef: RefObject<MapController | null>): MapViewModel {
  const { photos, isLoaded } = usePhotoStore();
  const nav = useHomeNav();
  const { mapFocusId, clearMapFocus, goTo } = nav;
  const paneActive = nav.isPaneActive('map');

  const [isMapReady, setIsMapReady] = useState(false);
  const [initialRegion, setInitialRegion] = useState<ViewportRegion | null>(null);
  const [region, setRegion] = useState<ViewportRegion | null>(null);
  const regionRef = useRef<ViewportRegion>(FALLBACK_REGION);
  const [selectedIdList, setSelectedIdList] = useState<string[]>([]);
  const [permission, setPermission] = useState<LocationPermission>('undetermined');
  const [isLocating, setIsLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const located = useMemo(() => photos.filter(hasLocation) as LocatedPhoto[], [photos]);
  const photosById = useMemo(() => new Map(located.map((photo) => [photo.id, photo])), [located]);

  // All located photos, newest first, like the diary.
  const rangePhotos = useMemo(
    () => [...located].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [located],
  );
  const index = useMemo(
    () => createClusterIndex(
        rangePhotos.map((p) => ({ id: p.id, latitude: p.latitude, longitude: p.longitude, sortKey: p.createdAt })),
      ),
    [rangePhotos],
  );

  // Permission: re-read whenever the pane becomes active (user may have changed it in system settings).
  useEffect(() => {
    if (!paneActive) return;
    let active = true;
    LocationService.getPermission().then((result) => {
      if (active) setPermission(result);
    });
    return () => {
      active = false;
    };
  }, [paneActive]);

  const showNotice = useCallback((message: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_DURATION_MS);
  }, []);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  // Initial region: fit the photos of the starting range, else the user's location, else a wide fallback.
  const hasInitialised = useRef(false);
  useEffect(() => {
    if (!isLoaded || hasInitialised.current) return;
    hasInitialised.current = true;
    const apply = (next: ViewportRegion) => {
      regionRef.current = next;
      setInitialRegion(next);
      setRegion(next);
    };
    const fitted = fitRegion(rangePhotos.length > 0 ? rangePhotos : located, FIT_PADDING);
    if (fitted) {
      apply(fitted);
      return;
    }
    (async () => {
      const current = (await LocationService.getPermission()) === 'granted'
        ? await LocationService.getCaptureCoordinates()
        : null;
      apply(current ? regionForZoom(current, CITY_ZOOM, FALLBACK_REGION) : FALLBACK_REGION);
    })().catch(() => apply(FALLBACK_REGION));
  }, [isLoaded, located, rangePhotos]);

  const animateTo = useCallback(
    (next: ViewportRegion) => {
      mapRef.current?.animateToRegion(next, REGION_ANIMATION_MS);
    },
    [mapRef],
  );

  /** Centre on a photo, keeping the current zoom unless it is too far out to recognise the place. */
  const centerOn = useCallback(
    (photo: LocatedPhoto) => {
      const current = regionRef.current;
      const zoom = Math.max(zoomForRegion(current), CITY_ZOOM);
      animateTo(regionForZoom(photo, zoom, current));
    },
    [animateTo],
  );

  // Focus from the photo detail ("Xem trÃªn báº£n Ä‘á»“"): show everything, centre + select, then clear.
  useEffect(() => {
    if (!mapFocusId || !isLoaded || !isMapReady || !initialRegion) return;
    const target = photosById.get(mapFocusId);
    if (target) {
      animateTo(regionForZoom(target, FOCUS_ZOOM, regionRef.current));
      // Syncing with an external event (navigation request), not derived state.
      /* eslint-disable react-hooks/set-state-in-effect */
      setSelectedIdList([target.id]);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
    clearMapFocus();
  }, [mapFocusId, isLoaded, isMapReady, initialRegion, photosById, animateTo, clearMapFocus]);

  // Drop selected ids whose photo no longer exists / left the range.
  const rangeIds = useMemo(() => new Set(rangePhotos.map((p) => p.id)), [rangePhotos]);
  const selectedPhotos = useMemo(
    () =>
      selectedIdList
        .filter((id) => rangeIds.has(id))
        .map((id) => photosById.get(id))
        .filter((p): p is LocatedPhoto => p !== undefined),
    [selectedIdList, rangeIds, photosById],
  );
  const selectedIds = useMemo(() => new Set(selectedPhotos.map((p) => p.id)), [selectedPhotos]);

  const items = useMemo(() => {
    if (!region) return [];
    const padded: ViewportRegion = {
      ...region,
      latitudeDelta: region.latitudeDelta * VIEWPORT_QUERY_PADDING,
      longitudeDelta: region.longitudeDelta * VIEWPORT_QUERY_PADDING,
    };
    return getClusters(index, padded);
  }, [index, region]);

  const onRegionChangeComplete = useCallback((next: ViewportRegion) => {
    regionRef.current = next;
    setRegion(next);
  }, []);

  /** First press selects + centres; pressing the selected place again opens the photo. */
  const onPhotoPress = useCallback(
    (id: string) => {
      const photo = photosById.get(id);
      if (!photo) return;
      if (selectedIds.size === 1 && selectedIds.has(id)) {
        openPhoto(id);
        return;
      }
      setSelectedIdList([id]);
      centerOn(photo);
    },
    [photosById, selectedIds, centerOn],
  );

  const onClusterPress = useCallback(
    (item: ClusterItem) => {
      const current = regionRef.current;
      const expansion = getExpansionZoom(index, item.clusterId);
      const cannotSplit =
        expansion === null || expansion > MAX_CLUSTER_ZOOM || expansion <= zoomForRegion(current);
      if (cannotSplit) {
        setSelectedIdList(getClusterLeafIds(index, item.clusterId, MAX_PREVIEW_PHOTOS));
        return;
      }
      setSelectedIdList([]);
      animateTo(regionForZoom(item, expansion + EXPANSION_ZOOM_MARGIN, current));
    },
    [animateTo, index],
  );

  const onMapPress = useCallback(() => {
    setSelectedIdList((previous) => (previous.length > 0 ? [] : previous));
    setNotice(null);
  }, []);

  const onLocatePress = useCallback(async () => {
    if (isLocating) return;
    setIsLocating(true);
    try {
      let current = await LocationService.getPermission();
      if (current === 'undetermined') current = await LocationService.requestPermission();
      setPermission(current);
      if (current !== 'granted') {
        showNotice(NOTICE_DENIED);
        return;
      }
      const coords = await LocationService.getCaptureCoordinates();
      if (!coords) {
        showNotice(NOTICE_NO_FIX);
        return;
      }
      animateTo(regionForZoom(coords, CITY_ZOOM, regionRef.current));
    } catch {
      showNotice(NOTICE_NO_FIX);
    } finally {
      setIsLocating(false);
    }
  }, [animateTo, isLocating, showNotice]);

  const onTakePhoto = useCallback(() => goTo('camera'), [goTo]);
  const onMapReady = useCallback(() => setIsMapReady(true), []);

  return {
    isLoaded,
    isEmpty: isLoaded && located.length === 0,
    initialRegion,
    items,
    photosById,
    selectedIds,
    showsUserLocation: permission === 'granted' && paneActive,
    isLocating,
    notice,
    onMapReady,
    onRegionChangeComplete,
    onPhotoPress,
    onClusterPress,
    onMapPress,
    onLocatePress,
    onTakePhoto,
  };
}
