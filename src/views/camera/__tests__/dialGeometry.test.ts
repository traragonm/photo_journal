import {
  CLUSTER_HEIGHT,
  FRAME_KNOB,
  ZOOM_STOPS,
  angleOfPoint,
  clampZoomRotation,
  computeCameraLayout,
  filterAngle,
  filterIndexOf,
  filterRingRotation,
  fitPrint,
  innerTickAngles,
  nearestEquivalentAngle,
  nextFrameType,
  outerTicks,
  polarBox,
  previewCoverBox,
  ringAt,
  snapFilter,
  snapZoomIndex,
  wrapDelta,
  zoomIndexOf,
  zoomRingRotation,
  zoomSpec,
} from '../dialGeometry';

describe('fitPrint (design k = min(340/w, 400/h))', () => {
  it('matches the artboard for each format', () => {
    expect(fitPrint('square', 340, 400)).toEqual({ width: 335, height: 400, pad: 23, imageWidth: 288, imageHeight: 288 });
    expect(fitPrint('mini', 340, 400)).toEqual({ width: 251, height: 400, pad: 19, imageWidth: 214, imageHeight: 288 });
    expect(fitPrint('wide', 340, 400)).toEqual({ width: 340, height: 271, pad: 14, imageWidth: 312, imageHeight: 195 });
  });

  it('never returns negative sizes', () => {
    expect(fitPrint('square', -10, 0).width).toBe(0);
  });

  it('preview box covers every window', () => {
    expect(previewCoverBox(340, 400)).toEqual({ width: 312, height: 288 });
  });
});

describe('computeCameraLayout', () => {
  it('uses the full design scale on a 390×844 phone', () => {
    const layout = computeCameraLayout({ width: 390, height: 844, insetTop: 47, insetBottom: 34 });
    expect(layout.scale).toBe(1);
    expect(layout.clusterTop + CLUSTER_HEIGHT).toBe(844 - 34);
    expect(layout.printMaxWidth).toBe(340);
    expect(layout.printMaxHeight).toBeGreaterThan(300);
  });

  it('shrinks on a 360×740 phone and keeps the cluster above the safe area', () => {
    const layout = computeCameraLayout({ width: 360, height: 740, insetTop: 24, insetBottom: 16 });
    expect(layout.scale).toBeLessThan(1);
    expect(layout.scale).toBeCloseTo(360 / 390);
    expect(layout.clusterTop + CLUSTER_HEIGHT * layout.scale).toBeCloseTo(740 - 16);
    expect(layout.viewfinderHeight).toBeGreaterThan(250);
  });

  it('shrinks on short panes too', () => {
    const layout = computeCameraLayout({ width: 390, height: 600, insetTop: 20, insetBottom: 0 });
    expect(layout.scale).toBeLessThan(1);
    expect(layout.viewfinderTop).toBeLessThan(layout.clusterTop);
  });

  it('centres the cluster in wide columns', () => {
    const layout = computeCameraLayout({ width: 480, height: 900, insetTop: 0, insetBottom: 0 });
    expect(layout.clusterLeft).toBe(45);
  });
});

describe('polar helpers', () => {
  it('places boxes like the design', () => {
    // Design: 2× label at angle 0, r=118 → left 128, top 16.
    expect(polarBox(150, 118, 0, 44, 32)).toEqual({ left: 128, top: 16 });
    const right = polarBox(150, 100, 90, 0, 0);
    expect(right.left).toBeCloseTo(250);
    expect(right.top).toBeCloseTo(150);
  });

  it('measures angles clockwise from up', () => {
    expect(angleOfPoint(150, 0, 150, 150)).toBeCloseTo(0);
    expect(angleOfPoint(300, 150, 150, 150)).toBeCloseTo(90);
    expect(angleOfPoint(0, 150, 150, 150)).toBeCloseTo(-90);
  });

  it('wraps deltas and takes the shortest spin', () => {
    expect(wrapDelta(350)).toBe(-10);
    expect(wrapDelta(-190)).toBe(170);
    expect(nearestEquivalentAngle(-300, 0)).toBe(-360);
    expect(nearestEquivalentAngle(0, -60)).toBe(-60);
  });
});

describe('zoom ring', () => {
  it('rotates the chosen stop under the pointer', () => {
    expect(zoomRingRotation(zoomIndexOf(1))).toBe(25);
    expect(zoomRingRotation(zoomIndexOf(5))).toBe(-50);
  });

  it('snaps to the nearest stop and clamps drags', () => {
    expect(snapZoomIndex(20)).toBe(1);
    expect(snapZoomIndex(-40)).toBe(4);
    expect(snapZoomIndex(200)).toBe(0);
    expect(clampZoomRotation(200)).toBeLessThan(70);
  });

  it('maps stops to increasing camera zoom within 0…1', () => {
    const values = ZOOM_STOPS.map((spec) => spec.cameraZoom);
    values.forEach((value, i) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
      if (i > 0) expect(value).toBeGreaterThanOrEqual(values[i - 1]);
    });
    expect(zoomSpec(0.5).label).toBe('0.5×');
  });

  it('has major ticks exactly at the stops', () => {
    const ticks = outerTicks();
    expect(ticks).toHaveLength(72);
    expect(ticks.filter((tick) => tick.major).map((tick) => tick.angle)).toEqual([0, 25, 50, 310, 335]);
  });
});

describe('filter ring', () => {
  it('places swatches 60° apart and rotates the chosen one to the top', () => {
    expect(filterAngle(3)).toBe(180);
    expect(filterRingRotation(filterIndexOf('cool'))).toBe(-240);
    expect(innerTickAngles()).toEqual([30, 90, 150, 210, 270, 330]);
  });

  it('snaps unwrapped rotations to a swatch', () => {
    expect(snapFilter(-70)).toEqual({ index: 1, rotation: -60 });
    expect(snapFilter(65)).toEqual({ index: 5, rotation: 60 });
    expect(snapFilter(-400)).toEqual({ index: 1, rotation: -420 });
  });
});

describe('dial hit-testing and knob', () => {
  it('finds the ring under a touch', () => {
    expect(ringAt(20)).toBe('none');
    expect(ringAt(80)).toBe('inner');
    expect(ringAt(130)).toBe('outer');
    expect(ringAt(160)).toBe('none');
  });

  it('cycles frame types with knob angles from the design', () => {
    expect(nextFrameType('mini')).toBe('square');
    expect(nextFrameType('wide')).toBe('mini');
    expect(FRAME_KNOB.mini.angle).toBe(-55);
    expect(FRAME_KNOB.wide.angle).toBe(55);
  });
});
