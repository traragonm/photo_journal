import type { MapStyleElement } from 'react-native-maps';
import type { ViewportRegion } from '@/utils/clustering';
import { colors } from '@/theme';

// --- Camera / behaviour ------------------------------------------------------------------------

/** Shown when there are no photos and no user location. Wide view; never a made-up "home". */
export const FALLBACK_REGION: ViewportRegion = {
  latitude: 20,
  longitude: 0,
  latitudeDelta: 100,
  longitudeDelta: 100,
};

/** Zoom used when centring on the user (street level). */
export const CITY_ZOOM = 14;
/** Zoom used when centring on a focused / selected photo. */
export const FOCUS_ZOOM = 16;
/** Added to a cluster's expansion zoom so it reliably splits after the native map adjusts the region. */
export const EXPANSION_ZOOM_MARGIN = 0.5;
/** Fitted initial region padding (multiplier on the photo span). */
export const FIT_PADDING = 1.6;
/** Query a slightly larger viewport than visible so markers do not pop in at the edges. */
export const VIEWPORT_QUERY_PADDING = 1.25;
export const REGION_ANIMATION_MS = 500;
export const NOTICE_DURATION_MS = 3500;
export const MAX_PREVIEW_PHOTOS = 30;
/** Decimals of the short "lat, lng" fallback shown when a photo has no place name. */
export const SHORT_COORDINATE_DECIMALS = 3;

// --- Overlay layout (Map.dc.html) ---------------------------------------------------------------

/** Gap between the locate button / notice and the bottom edge (above the safe area). */
export const FLOATING_GAP = 16;
export const LOCATE_ICON_SIZE = 20;

// --- Pins (mini print on a stick) ----------------------------------------------------------------

export const PIN_WIDTH = 58;
export const PIN_HEIGHT = 72;
export const PIN_WIDTH_SELECTED = 66;
export const PIN_HEIGHT_SELECTED = 82;
export const PIN_SIDE_PADDING = 5;
export const PIN_BOTTOM_PADDING = 16;
export const PIN_BOTTOM_PADDING_SELECTED = 18;
export const PIN_RING_WIDTH = 3;
export const PIN_STICK_WIDTH = 2;
export const PIN_STICK_HEIGHT = 14;
export const PIN_DOT_SIZE = 10;
export const PIN_DOT_RING = 2;
/** Dot diameter including its paper ring. */
export const PIN_DOT_TOTAL = PIN_DOT_SIZE + PIN_DOT_RING * 2;
/** Room around the tilted print so Android does not clip the marker bitmap. */
export const PIN_BITMAP_MARGIN = 6;
export const PIN_BOX_WIDTH = PIN_WIDTH_SELECTED + PIN_BITMAP_MARGIN * 2;
export const PIN_BOX_HEIGHT = PIN_HEIGHT_SELECTED + PIN_STICK_HEIGHT + PIN_DOT_TOTAL + PIN_BITMAP_MARGIN * 2;
/** Anchor: the centre of the dot, in fractions of the marker box. */
export const PIN_ANCHOR = {
  x: 0.5,
  y: 1 - (PIN_BITMAP_MARGIN + PIN_DOT_TOTAL / 2) / PIN_BOX_HEIGHT,
} as const;

// --- Clusters (stacked prints + count badge) -------------------------------------------------------

export const CLUSTER_PRINT_SIZE = 52;
export const CLUSTER_PADDING = 12;
export const CLUSTER_BOX = CLUSTER_PRINT_SIZE + CLUSTER_PADDING * 2;
export const CLUSTER_FRAME_PADDING = 4;
export const CLUSTER_STACK_OFFSET = 4;
export const CLUSTER_BACK_ROTATION = -7;
export const CLUSTER_MIDDLE_ROTATION = 5;
export const CLUSTER_FRONT_ROTATION = -1.5;
export const CLUSTER_BADGE_MIN_SIZE = 24;
export const CLUSTER_BADGE_OFFSET = 6;
export const CLUSTER_ICON_SIZE = 20;
/** Simple "image" glyph on a 24x24 viewBox (frame + mountain + sun). */
export const ICON_VIEWBOX = 24;
export const ICON_PATH = 'M3 5h18v14H3z M3 17l5-6 4 4 3-3 6 5 M16 9h.01';

// --- Native marker bitmap timing -----------------------------------------------------------------

/** Time to keep tracking after a visual change so the final frame is captured. */
export const MARKER_SETTLE_MS = 400;
/** Never track forever if an image never reports load/error. */
export const MARKER_LOAD_TIMEOUT_MS = 4000;

// --- User location -------------------------------------------------------------------------------

export const USER_DOT_RADIUS = 8;
export const USER_HALO_RADIUS = 20;
export const USER_DOT_BORDER = 3;

// --- Derived paper-map tokens (built from `colors`) ------------------------------------------------

/** Leaflet tile filter: pulls OSM's saturated colours toward the paper palette. */
export const TILE_FILTER = 'sepia(0.32) saturate(0.7) hue-rotate(-6deg) brightness(1.03) contrast(0.92)';

/**
 * Paper-tone style for Google Maps (Android). Apple Maps (iOS) ignores it and uses its light style.
 * Built only from theme colour tokens.
 */
export const PAPER_MAP_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: colors.mapLand }] },
  { elementType: 'labels.text.fill', stylers: [{ color: colors.muted }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: colors.mapLand }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: colors.hairline }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: colors.mapLand }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: colors.mapPark }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: colors.mapLabelPark }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: colors.mapRoadMinor }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: colors.mapRoad }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: colors.mapRoad }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: colors.mapWater }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: colors.mapLabelWater }] },
];
