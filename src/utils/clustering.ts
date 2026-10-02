import Supercluster from 'supercluster';

/** Pure supercluster wrapper for map markers. No React / native imports. */

export interface GeoPoint {
  id: string;
  latitude: number;
  longitude: number;
  /** Orders points inside a cluster; the greatest (e.g. newest ISO timestamp) becomes its cover. */
  sortKey?: string;
}

export interface ViewportRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export type MapItem =
  | { kind: 'photo'; key: string; id: string; latitude: number; longitude: number }
  | {
      kind: 'cluster';
      key: string;
      clusterId: number;
      count: number;
      /** Point shown on the cluster's top print (greatest sortKey). */
      coverId: string;
      latitude: number;
      longitude: number;
    };

export interface ClusterIndex {
  readonly supercluster: Supercluster<PointProps, ClusterProps>;
  readonly size: number;
}

interface PointProps {
  id: string;
  sortKey: string;
}

/** Aggregated per cluster via supercluster map/reduce. */
interface ClusterProps {
  coverId: string;
  coverKey: string;
}

/** Highest zoom at which points may still be merged; beyond it markers never cluster. */
export const MAX_CLUSTER_ZOOM = 19;
const MIN_ZOOM = 0;
const CLUSTER_RADIUS_PX = 56;
const TILE_EXTENT = 512;
const MIN_POINTS = 2;
const FULL_CIRCLE_DEGREES = 360;
const MAX_LATITUDE = 85;
const MAX_LONGITUDE = 180;
const HALF = 2;
const DEFAULT_LEAF_LIMIT = 50;
/** Smallest span (degrees) used when fitting, so a single photo is not zoomed to infinity. */
const MIN_FIT_DELTA = 0.01;
const DEFAULT_FIT_PADDING = 1.4;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export function createClusterIndex(points: readonly GeoPoint[]): ClusterIndex {
  const supercluster = new Supercluster<PointProps, ClusterProps>({
    minZoom: MIN_ZOOM,
    maxZoom: MAX_CLUSTER_ZOOM,
    radius: CLUSTER_RADIUS_PX,
    extent: TILE_EXTENT,
    minPoints: MIN_POINTS,
    map: (props) => ({ coverId: props.id, coverKey: props.sortKey }),
    reduce: (accumulated, props) => {
      if (props.coverKey > accumulated.coverKey) {
        accumulated.coverId = props.coverId;
        accumulated.coverKey = props.coverKey;
      }
    },
  });
  supercluster.load(
    points.map((point) => ({
      type: 'Feature' as const,
      properties: { id: point.id, sortKey: point.sortKey ?? '' },
      geometry: { type: 'Point' as const, coordinates: [point.longitude, point.latitude] },
    })),
  );
  return { supercluster, size: points.length };
}

/** Web-mercator style zoom level for a region (integer, as supercluster expects). */
export function zoomForRegion(region: Pick<ViewportRegion, 'longitudeDelta'>): number {
  const delta = clamp(Math.abs(region.longitudeDelta), Number.EPSILON, FULL_CIRCLE_DEGREES);
  return clamp(Math.round(Math.log2(FULL_CIRCLE_DEGREES / delta)), MIN_ZOOM, MAX_CLUSTER_ZOOM + 1);
}

/** Region (keeping the aspect ratio of `like`) centred on a point at a zoom level. */
export function regionForZoom(
  center: { latitude: number; longitude: number },
  zoom: number,
  like: Pick<ViewportRegion, 'latitudeDelta' | 'longitudeDelta'>,
): ViewportRegion {
  const longitudeDelta = FULL_CIRCLE_DEGREES / 2 ** zoom;
  const aspect = like.longitudeDelta > 0 ? like.latitudeDelta / like.longitudeDelta : 1;
  return {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta: longitudeDelta * aspect,
    longitudeDelta,
  };
}

/** Clusters + single photos visible in `region`. */
export function getClusters(index: ClusterIndex, region: ViewportRegion): MapItem[] {
  if (index.size === 0) return [];
  const halfLat = region.latitudeDelta / HALF;
  const halfLng = region.longitudeDelta / HALF;
  const south = clamp(region.latitude - halfLat, -MAX_LATITUDE, MAX_LATITUDE);
  const north = clamp(region.latitude + halfLat, -MAX_LATITUDE, MAX_LATITUDE);
  const spansWorld = region.longitudeDelta >= FULL_CIRCLE_DEGREES;
  const west = spansWorld ? -MAX_LONGITUDE : clamp(region.longitude - halfLng, -MAX_LONGITUDE, MAX_LONGITUDE);
  const east = spansWorld ? MAX_LONGITUDE : clamp(region.longitude + halfLng, -MAX_LONGITUDE, MAX_LONGITUDE);

  return index.supercluster.getClusters([west, south, east, north], zoomForRegion(region)).map((feature) => {
    const [longitude, latitude] = feature.geometry.coordinates;
    const props = feature.properties;
    if ('cluster' in props && props.cluster) {
      return {
        kind: 'cluster' as const,
        key: `cluster-${props.cluster_id}`,
        clusterId: props.cluster_id,
        count: props.point_count,
        coverId: props.coverId,
        latitude,
        longitude,
      };
    }
    const id = 'id' in props ? props.id : '';
    return { kind: 'photo' as const, key: `photo-${id}`, id, latitude, longitude };
  });
}

/** Zoom at which the cluster splits; `null` if the id is unknown. May exceed MAX_CLUSTER_ZOOM for co-located points. */
export function getExpansionZoom(index: ClusterIndex, clusterId: number): number | null {
  try {
    return index.supercluster.getClusterExpansionZoom(clusterId);
  } catch {
    return null;
  }
}

/** Ids of the photos inside a cluster (limited to keep the preview strip light). */
export function getClusterLeafIds(
  index: ClusterIndex,
  clusterId: number,
  limit: number = DEFAULT_LEAF_LIMIT,
): string[] {
  try {
    return index.supercluster.getLeaves(clusterId, limit).map((feature) => feature.properties.id);
  } catch {
    return [];
  }
}

/** Region fitting all points with padding (multiplier on the span). `null` when empty. */
export function fitRegion(
  points: readonly { latitude: number; longitude: number }[],
  padding: number = DEFAULT_FIT_PADDING,
): ViewportRegion | null {
  if (points.length === 0) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const { latitude, longitude } of points) {
    minLat = Math.min(minLat, latitude);
    maxLat = Math.max(maxLat, latitude);
    minLng = Math.min(minLng, longitude);
    maxLng = Math.max(maxLng, longitude);
  }
  return {
    latitude: (minLat + maxLat) / HALF,
    longitude: (minLng + maxLng) / HALF,
    latitudeDelta: Math.max((maxLat - minLat) * padding, MIN_FIT_DELTA),
    longitudeDelta: Math.max((maxLng - minLng) * padding, MIN_FIT_DELTA),
  };
}
