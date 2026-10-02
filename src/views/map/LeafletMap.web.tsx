import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PhotoEntry } from '@/models';
import { LocationService } from '@/services/LocationService';
import { borderRadius, borderWidth, colors, filmFilters, fontFamilies, fontSizes, shadows, spacing } from '@/theme';
import { formatClock } from '@/utils/date';
import { rotationFor } from '@/utils/rotation';
import type { MapItem, ViewportRegion } from '@/utils/clustering';
import type { MapController } from '@/viewmodels/useMapViewModel';
import {
  CLUSTER_BACK_ROTATION,
  CLUSTER_BADGE_MIN_SIZE,
  CLUSTER_BADGE_OFFSET,
  CLUSTER_BOX,
  CLUSTER_FRAME_PADDING,
  CLUSTER_FRONT_ROTATION,
  CLUSTER_ICON_SIZE,
  CLUSTER_MIDDLE_ROTATION,
  CLUSTER_PADDING,
  CLUSTER_PRINT_SIZE,
  CLUSTER_STACK_OFFSET,
  ICON_PATH,
  ICON_VIEWBOX,
  PIN_BITMAP_MARGIN,
  PIN_BOTTOM_PADDING,
  PIN_BOTTOM_PADDING_SELECTED,
  PIN_BOX_HEIGHT,
  PIN_BOX_WIDTH,
  PIN_DOT_RING,
  PIN_DOT_SIZE,
  PIN_HEIGHT,
  PIN_HEIGHT_SELECTED,
  PIN_RING_WIDTH,
  PIN_SIDE_PADDING,
  PIN_STICK_HEIGHT,
  PIN_STICK_WIDTH,
  PIN_WIDTH,
  PIN_WIDTH_SELECTED,
  SEGMENT_TOP_GAP,
  TILE_FILTER,
  USER_DOT_BORDER,
  USER_DOT_RADIUS,
  USER_HALO_RADIUS,
} from './mapConstants';

type ClusterItem = Extract<MapItem, { kind: 'cluster' }>;

export interface LeafletMapProps {
  /** Read once, when the map is created. */
  initialRegion: ViewportRegion;
  items: readonly MapItem[];
  photosById: ReadonlyMap<string, PhotoEntry>;
  selectedIds: ReadonlySet<string>;
  showsUserLocation: boolean;
  /** Border colour of the prints (Settings › Màu viền). */
  frameFill: string;
  /** Height of the bottom sheet covering the map; the camera centres in the visible part. */
  bottomPadding: number;
  onMapReady: () => void;
  onRegionChangeComplete: (region: ViewportRegion) => void;
  onPhotoPress: (id: string) => void;
  onClusterPress: (item: ClusterItem) => void;
  onMapPress: () => void;
}

// --- Map behaviour -----------------------------------------------------------------------------
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const MAX_ZOOM = 19;
const MIN_ZOOM = 2;
const ZOOM_SNAP = 0.5;
const TILE_SIZE_PX = 256;
const FULL_CIRCLE_DEGREES = 360;
const MS_PER_SECOND = 1000;
const FALLBACK_VIEW_WIDTH_PX = TILE_SIZE_PX;
const SELECTED_Z_OFFSET = 1000;
/** Leaflet's own controls start below the floating range switch. */
const CONTROLS_TOP_PX = SEGMENT_TOP_GAP + 44 + spacing.sm;

const SHADOW_COLOR_MIX = `color-mix(in srgb, ${colors.shadow} ${shadows.soft.shadowOpacity * 100}%, transparent)`;
const PRINT_SHADOW = `0 ${shadows.soft.shadowOffset.height}px ${shadows.soft.shadowRadius}px ${SHADOW_COLOR_MIX}`;

const STYLE_ELEMENT_ID = 'photo-diary-leaflet-style';
const MARKER_CLASS = 'pd-marker';

const MAP_CSS = `
.${MARKER_CLASS} { background: none; border: none; cursor: pointer; }
.${MARKER_CLASS}:focus-visible > div { outline: ${borderWidth.regular}px solid ${colors.accent}; outline-offset: ${spacing.xxs}px; }
.photo-diary-map { background: ${colors.mapLand}; font-family: ${fontFamilies.regular}, sans-serif; }
.photo-diary-map .leaflet-tile-pane { filter: ${TILE_FILTER}; }
.photo-diary-map .leaflet-top { top: ${CONTROLS_TOP_PX}px; }
.photo-diary-map .leaflet-control-attribution { background: ${colors.frameWhite}; color: ${colors.muted}; font-size: ${fontSizes.xs}px; }
.photo-diary-map .leaflet-control-attribution a { color: ${colors.ink}; }
.photo-diary-map .leaflet-bar a { background: ${colors.frameWhite}; color: ${colors.ink}; border-color: ${colors.hairline}; }
`;

function ensureStyles(): void {
  if (document.getElementById(STYLE_ELEMENT_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = MAP_CSS;
  document.head.appendChild(style);
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

// --- Region <-> Leaflet ----------------------------------------------------------------------------
function boundsForRegion(region: ViewportRegion): L.LatLngBounds {
  const halfLat = region.latitudeDelta / 2;
  const halfLng = region.longitudeDelta / 2;
  return L.latLngBounds(
    [region.latitude - halfLat, region.longitude - halfLng],
    [region.latitude + halfLat, region.longitude + halfLng],
  );
}

function regionForMap(map: L.Map): ViewportRegion {
  const bounds = map.getBounds();
  const center = map.getCenter().wrap();
  return {
    latitude: center.lat,
    longitude: center.lng,
    latitudeDelta: bounds.getNorth() - bounds.getSouth(),
    longitudeDelta: Math.min(bounds.getEast() - bounds.getWest(), FULL_CIRCLE_DEGREES),
  };
}

/**
 * Leaflet zoom that shows `longitudeDelta` degrees across the map's width. Longitude is linear in
 * web-mercator, so unlike a latitude-based fit this is exact at any latitude. Snapped to the map's
 * zoom step so repeated round trips (region -> zoom -> region) are stable.
 */
function zoomForLongitudeDelta(map: L.Map, longitudeDelta: number): number {
  const width = map.getSize().x || FALLBACK_VIEW_WIDTH_PX;
  const delta = Math.max(longitudeDelta, Number.EPSILON);
  const raw = Math.log2((width * FULL_CIRCLE_DEGREES) / (TILE_SIZE_PX * delta));
  const snapped = Math.round(raw / ZOOM_SNAP) * ZOOM_SNAP;
  return Math.min(map.getMaxZoom(), Math.max(map.getMinZoom(), snapped));
}

/** Centre that puts `target` in the middle of the part of the map not covered by the bottom sheet. */
function centerAbovePadding(map: L.Map, target: L.LatLng, zoom: number, bottomPadding: number): L.LatLng {
  const point = map.project(target, zoom);
  return map.unproject(L.point(point.x, point.y + bottomPadding / 2), zoom);
}

// --- Marker HTML -----------------------------------------------------------------------------------
function photoMarkerHtml(photo: PhotoEntry, selected: boolean, label: string, frameFill: string): string {
  const look = filmFilters[photo.filter];
  const rotation = rotationFor(photo.id);
  const width = selected ? PIN_WIDTH_SELECTED : PIN_WIDTH;
  const height = selected ? PIN_HEIGHT_SELECTED : PIN_HEIGHT;
  const bottom = selected ? PIN_BOTTOM_PADDING_SELECTED : PIN_BOTTOM_PADDING;
  const tone = selected ? colors.accent : colors.ink;
  const ring = selected ? `0 0 0 ${PIN_RING_WIDTH}px ${colors.accent}, ` : '';
  const filter = look.filter ? `filter:${look.filter};` : '';
  const tint = look.tint
    ? `<div style="position:absolute;inset:0;background:${look.tint.color};opacity:${look.tint.opacity};"></div>`
    : '';
  const picture = pictureHtml(photo, filter);
  const dotTotal = PIN_DOT_SIZE + PIN_DOT_RING * 2;
  return (
    `<div role="button" aria-label="${escapeHtml(label)}" style="width:${PIN_BOX_WIDTH}px;height:${PIN_BOX_HEIGHT}px;` +
    `padding:${PIN_BITMAP_MARGIN}px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;">` +
    `<div style="width:${width}px;height:${height}px;box-sizing:border-box;padding:${PIN_SIDE_PADDING}px ${PIN_SIDE_PADDING}px ${bottom}px;` +
    `background:${frameFill};border-radius:${borderRadius.xs}px;box-shadow:${ring}${PRINT_SHADOW};` +
    `transform:rotate(${rotation}deg);"><div style="position:relative;width:100%;height:100%;overflow:hidden;background:${colors.chip};">${picture}${tint}</div></div>` +
    `<div style="width:${PIN_STICK_WIDTH}px;height:${PIN_STICK_HEIGHT}px;background:${tone};"></div>` +
    `<div style="width:${dotTotal}px;height:${dotTotal}px;box-sizing:border-box;border-radius:50%;background:${tone};` +
    `border:${PIN_DOT_RING}px solid ${colors.frameWhite};"></div>` +
    `</div>`
  );
}

function pictureHtml(photo: PhotoEntry, filter: string): string {
  return photo.isImageAvailable
    ? `<img src="${escapeHtml(photo.imageUri)}" alt="" draggable="false" style="display:block;width:100%;height:100%;object-fit:cover;${filter}" />`
    : '';
}

/** Newest photo of a cluster, with its film look, filling the top print. */
function coverHtml(cover: PhotoEntry): string {
  const look = filmFilters[cover.filter];
  const tint = look.tint
    ? `<div style="position:absolute;inset:0;background:${look.tint.color};opacity:${look.tint.opacity};"></div>`
    : '';
  return (
    `<div style="position:relative;width:100%;height:100%;overflow:hidden;background:${colors.chip};">` +
    `${pictureHtml(cover, look.filter ? `filter:${look.filter};` : '')}${tint}</div>`
  );
}

function clusterPrint(rotationDeg: number, offsetPx: number, frameFill: string, content: string): string {
  return (
    `<div style="position:absolute;left:${CLUSTER_PADDING}px;top:${CLUSTER_PADDING}px;width:${CLUSTER_PRINT_SIZE}px;height:${CLUSTER_PRINT_SIZE}px;` +
    `box-sizing:border-box;padding:${CLUSTER_FRAME_PADDING}px;background:${frameFill};border-radius:${borderRadius.xs}px;` +
    `border:${borderWidth.hairline}px solid ${colors.hairline};box-shadow:${PRINT_SHADOW};` +
    `transform:rotate(${rotationDeg}deg) translateX(${offsetPx}px);">${content}</div>`
  );
}

function clusterMarkerHtml(count: number, frameFill: string, label: string, cover: PhotoEntry | undefined): string {
  const well = cover?.isImageAvailable
    ? coverHtml(cover)
    :
    `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${colors.chip};">` +
    `<svg width="${CLUSTER_ICON_SIZE}" height="${CLUSTER_ICON_SIZE}" viewBox="0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}" fill="none" ` +
    `stroke="${colors.muted}" stroke-width="${borderWidth.regular}" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">` +
    `<path d="${ICON_PATH}"/></svg></div>`;
  const badgeInset = CLUSTER_PADDING - CLUSTER_BADGE_OFFSET;
  return (
    `<div role="button" aria-label="${escapeHtml(label)}" style="position:relative;width:${CLUSTER_BOX}px;height:${CLUSTER_BOX}px;">` +
    clusterPrint(CLUSTER_BACK_ROTATION, -CLUSTER_STACK_OFFSET, frameFill, '') +
    clusterPrint(CLUSTER_MIDDLE_ROTATION, CLUSTER_STACK_OFFSET, frameFill, '') +
    clusterPrint(CLUSTER_FRONT_ROTATION, 0, frameFill, well) +
    `<div style="position:absolute;top:${badgeInset}px;right:${badgeInset}px;` +
    `min-width:${CLUSTER_BADGE_MIN_SIZE}px;height:${CLUSTER_BADGE_MIN_SIZE}px;box-sizing:border-box;padding:0 ${spacing.sm}px;` +
    `display:flex;align-items:center;justify-content:center;border-radius:${borderRadius.pill}px;` +
    `background:${colors.ink};color:${colors.onInk};` +
    `font-family:'${fontFamilies.semibold}',sans-serif;font-size:${fontSizes.md}px;line-height:1;">${count}</div>` +
    `</div>`
  );
}

// --- Component -------------------------------------------------------------------------------------
interface MarkerEntry {
  marker: L.Marker;
  signature: string;
}

/**
 * Imperative Leaflet map. React only supplies data; markers are diffed by `item.key` so panning
 * and zooming do not rebuild every thumbnail. Exposes a `MapController` for the ViewModel.
 */
export const LeafletMap = forwardRef<MapController, LeafletMapProps>(function LeafletMap(props, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const propsRef = useRef(props);
  const initialRegionRef = useRef(props.initialRegion);

  useEffect(() => {
    propsRef.current = props;
  });

  useImperativeHandle(
    ref,
    () => ({
      animateToRegion(region, durationMs) {
        const map = mapRef.current;
        if (!map) return;
        const zoom = zoomForLongitudeDelta(map, region.longitudeDelta);
        const center = centerAbovePadding(
          map,
          L.latLng(region.latitude, region.longitude),
          zoom,
          propsRef.current.bottomPadding,
        );
        if (durationMs && durationMs > 0) {
          map.flyTo(center, zoom, { duration: durationMs / MS_PER_SECOND });
        } else {
          map.setView(center, zoom, { animate: false });
        }
      },
    }),
    [],
  );

  // Create / destroy the map.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    ensureStyles();

    const map = L.map(host, {
      zoomSnap: ZOOM_SNAP,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      worldCopyJump: true,
      zoomControl: true,
      attributionControl: false,
    });
    // Attribution at the top right, so the bottom sheet never hides it.
    L.control.attribution({ position: 'topright', prefix: false }).addTo(map);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: MAX_ZOOM }).addTo(map);
    map.fitBounds(boundsForRegion(initialRegionRef.current), { animate: false });
    mapRef.current = map;

    const emitRegion = () => propsRef.current.onRegionChangeComplete(regionForMap(map));
    map.on('moveend', emitRegion);
    map.on('zoomend', emitRegion);
    map.on('click', () => propsRef.current.onMapPress());
    map.whenReady(() => {
      emitRegion();
      propsRef.current.onMapReady();
    });

    // Keep the map sized inside flex layouts.
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(host);
    map.invalidateSize();

    const markers = markersRef.current;
    return () => {
      observer.disconnect();
      markers.clear();
      userLayerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  // Diff markers by key.
  const { items, photosById, selectedIds, frameFill } = props;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const entries = markersRef.current;
    const seen = new Set<string>();

    for (const item of items) {
      let signature: string;
      let html: string;
      let size: L.PointExpression;
      let anchor: L.PointExpression;
      let label: string;
      let selected = false;

      if (item.kind === 'cluster') {
        label = `${item.count} ảnh gần nhau. Chạm để phóng to.`;
        const cover = photosById.get(item.coverId);
        signature = `c|${item.count}|${frameFill}|${cover?.imageUri ?? ''}|${cover?.filter ?? ''}`;
        html = clusterMarkerHtml(item.count, frameFill, label, cover);
        size = [CLUSTER_BOX, CLUSTER_BOX];
        anchor = [CLUSTER_BOX / 2, CLUSTER_BOX / 2];
      } else {
        const photo = photosById.get(item.id);
        if (!photo) continue;
        selected = selectedIds.has(item.id);
        label = `${photo.caption ?? 'Ảnh'}, ${formatClock(photo.createdAt)}`;
        signature = `p|${selected}|${photo.imageUri}|${photo.isImageAvailable}|${photo.filter}|${frameFill}`;
        html = photoMarkerHtml(photo, selected, label, frameFill);
        size = [PIN_BOX_WIDTH, PIN_BOX_HEIGHT];
        anchor = [PIN_BOX_WIDTH / 2, PIN_BOX_HEIGHT - PIN_BITMAP_MARGIN - (PIN_DOT_SIZE + PIN_DOT_RING * 2) / 2];
      }

      seen.add(item.key);
      const latLng = L.latLng(item.latitude, item.longitude);
      const existing = entries.get(item.key);
      const icon = (): L.DivIcon => L.divIcon({ className: MARKER_CLASS, html, iconSize: size, iconAnchor: anchor });

      if (existing) {
        if (!existing.marker.getLatLng().equals(latLng)) existing.marker.setLatLng(latLng);
        if (existing.signature !== signature) {
          existing.marker.setIcon(icon());
          existing.marker.setZIndexOffset(selected ? SELECTED_Z_OFFSET : 0);
          existing.signature = signature;
        }
        continue;
      }

      const marker = L.marker(latLng, {
        icon: icon(),
        keyboard: true,
        title: label,
        zIndexOffset: selected ? SELECTED_Z_OFFSET : 0,
        bubblingMouseEvents: false,
      });
      marker.on('click', (event: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(event);
        if (item.kind === 'cluster') propsRef.current.onClusterPress(item);
        else propsRef.current.onPhotoPress(item.id);
      });
      marker.addTo(map);
      marker.getElement()?.setAttribute('role', 'button');
      entries.set(item.key, { marker, signature });
    }

    for (const [key, entry] of entries) {
      if (seen.has(key)) continue;
      entry.marker.remove();
      entries.delete(key);
    }
  }, [items, photosById, selectedIds, frameFill]);

  // Optional "you are here" dot with halo; only fetched while the pane is active (showsUserLocation).
  const { showsUserLocation } = props;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let active = true;
    if (!showsUserLocation) {
      userLayerRef.current?.remove();
      userLayerRef.current = null;
      return;
    }
    LocationService.getCaptureCoordinates()
      .then((coords) => {
        if (!active || !coords || mapRef.current !== map) return;
        const latLng = L.latLng(coords.latitude, coords.longitude);
        userLayerRef.current?.remove();
        const halo = L.circleMarker(latLng, {
          radius: USER_HALO_RADIUS,
          stroke: false,
          fillColor: colors.userLocation,
          fillOpacity: 0.18,
          interactive: false,
        });
        const dot = L.circleMarker(latLng, {
          radius: USER_DOT_RADIUS,
          color: colors.white,
          weight: USER_DOT_BORDER,
          fillColor: colors.userLocation,
          fillOpacity: 1,
          interactive: false,
        });
        userLayerRef.current = L.layerGroup([halo, dot]).addTo(map);
        dot.getElement()?.setAttribute('aria-label', 'Vị trí của bạn');
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [showsUserLocation]);

  return (
    <div
      ref={hostRef}
      className="photo-diary-map"
      role="application"
      aria-label="Bản đồ ảnh của bạn"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 0,
      }}
    />
  );
});
