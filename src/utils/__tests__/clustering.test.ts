import {
  MAX_CLUSTER_ZOOM,
  createClusterIndex,
  fitRegion,
  getClusterLeafIds,
  getClusters,
  getExpansionZoom,
  regionForZoom,
  zoomForRegion,
  type GeoPoint,
  type ViewportRegion,
} from '../clustering';

const WORLD: ViewportRegion = { latitude: 0, longitude: 0, latitudeDelta: 170, longitudeDelta: 360 };

const points: GeoPoint[] = [
  { id: 'a', latitude: 21.0285, longitude: 105.8542 },
  { id: 'b', latitude: 21.0286, longitude: 105.8543 },
  { id: 'c', latitude: 48.8566, longitude: 2.3522 },
];

describe('clustering', () => {
  it('returns nothing for an empty index', () => {
    expect(getClusters(createClusterIndex([]), WORLD)).toEqual([]);
  });

  it('merges nearby points and keeps distant ones single', () => {
    const items = getClusters(createClusterIndex(points), WORLD);
    const clusters = items.filter((item) => item.kind === 'cluster');
    const singles = items.filter((item) => item.kind === 'photo');
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toMatchObject({ count: 2 });
    expect(singles).toEqual([expect.objectContaining({ id: 'c' })]);
  });

  it('splits a cluster at its expansion zoom', () => {
    const index = createClusterIndex(points);
    const cluster = getClusters(index, WORLD).find((item) => item.kind === 'cluster');
    if (cluster?.kind !== 'cluster') throw new Error('expected cluster');
    const zoom = getExpansionZoom(index, cluster.clusterId);
    expect(zoom).not.toBeNull();
    const region = regionForZoom(cluster, zoom as number, WORLD);
    const items = getClusters(index, region);
    expect(items.filter((item) => item.kind === 'photo')).toHaveLength(2);
  });

  it('never splits co-located photos and exposes their leaves', () => {
    const same: GeoPoint[] = [1, 2, 3].map((n) => ({ id: `p${n}`, latitude: 10, longitude: 20 }));
    const index = createClusterIndex(same);
    const tight = regionForZoom({ latitude: 10, longitude: 20 }, MAX_CLUSTER_ZOOM, WORLD);
    const items = getClusters(index, tight);
    expect(items).toHaveLength(1);
    const cluster = items[0];
    if (cluster.kind !== 'cluster') throw new Error('expected cluster');
    expect(cluster.count).toBe(3);
    expect(getExpansionZoom(index, cluster.clusterId)).toBeGreaterThan(MAX_CLUSTER_ZOOM);
    expect(getClusterLeafIds(index, cluster.clusterId).sort()).toEqual(['p1', 'p2', 'p3']);
  });

  it('returns no leaves for unknown cluster ids', () => {
    const index = createClusterIndex(points);
    expect(getClusterLeafIds(index, 999999)).toEqual([]);
  });

  it('round-trips zoom and region', () => {
    const region = regionForZoom({ latitude: 1, longitude: 2 }, 10, WORLD);
    expect(zoomForRegion(region)).toBe(10);
  });

  it('fits points with padding and a minimum span', () => {
    expect(fitRegion([])).toBeNull();
    const single = fitRegion([{ latitude: 5, longitude: 6 }]);
    expect(single).toMatchObject({ latitude: 5, longitude: 6 });
    expect(single?.latitudeDelta).toBeGreaterThan(0);
    const fit = fitRegion(points, 1.5);
    expect(fit?.longitudeDelta).toBeCloseTo((105.8543 - 2.3522) * 1.5);
  });
});

