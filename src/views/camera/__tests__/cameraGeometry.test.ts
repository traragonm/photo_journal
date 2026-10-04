import {
  CLUSTER_HEIGHT,
  STRIP_OVERDRAG,
  ZOOM_STOPS,
  clampStripDrag,
  computeCameraLayout,
  drumOverlayLeft,
  filterIndexOf,
  fitPrint,
  previewCoverBox,
  snapStripIndex,
  switchWidth,
  zoomIndexOf,
  zoomSpec,
} from '../cameraGeometry';

describe('fitPrint (design k = min(356/w, 430/h))', () => {
  it('matches the artboard for each format', () => {
    expect(fitPrint('square', 356, 430)).toEqual({ width: 356, height: 425, pad: 25, imageWidth: 307, imageHeight: 307 });
    expect(fitPrint('mini', 356, 430)).toEqual({ width: 270, height: 430, pad: 20, imageWidth: 230, imageHeight: 310 });
    expect(fitPrint('wide', 356, 430)).toEqual({ width: 356, height: 283, pad: 15, imageWidth: 326, imageHeight: 204 });
  });

  it('never returns negative sizes', () => {
    expect(fitPrint('square', -10, 0).width).toBe(0);
  });

  it('preview box covers every window', () => {
    expect(previewCoverBox(356, 430)).toEqual({ width: 326, height: 310 });
  });
});

describe('computeCameraLayout', () => {
  it('uses the full design scale on a 390×844 phone', () => {
    const layout = computeCameraLayout({ width: 390, height: 844, insetTop: 47, insetBottom: 34 });
    expect(layout.scale).toBe(1);
    expect(layout.clusterTop + CLUSTER_HEIGHT).toBe(844 - 34);
    expect(layout.printMaxWidth).toBe(356);
    expect(layout.printMaxHeight).toBeGreaterThan(300);
  });

  it('shrinks on a 360×740 phone and keeps the cluster above the safe area', () => {
    const layout = computeCameraLayout({ width: 360, height: 740, insetTop: 24, insetBottom: 16 });
    expect(layout.scale).toBeLessThan(1);
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

describe('snapping strips', () => {
  it('snaps to the nearest item after a drag', () => {
    // Dragging left (negative) moves towards later items.
    expect(snapStripIndex(1, -72, 7, 72)).toBe(2);
    expect(snapStripIndex(1, -100, 7, 72)).toBe(2);
    expect(snapStripIndex(1, -110, 7, 72)).toBe(3);
    expect(snapStripIndex(3, 72, 7, 72)).toBe(2);
  });

  it('clamps to the ends', () => {
    expect(snapStripIndex(0, 500, 7, 72)).toBe(0);
    expect(snapStripIndex(6, -500, 7, 72)).toBe(6);
  });

  it('lets the strip overshoot its ends only a little', () => {
    expect(clampStripDrag(0, 500, 7, 72)).toBe(STRIP_OVERDRAG);
    expect(clampStripDrag(6, -500, 7, 72)).toBe(-STRIP_OVERDRAG);
    expect(clampStripDrag(3, -40, 7, 72)).toBe(-40);
  });
});

describe('drums and switches', () => {
  it('keeps the pop-out strips inside the artboard (design olLeft)', () => {
    expect(drumOverlayLeft(20)).toBe(-6); // weather drum
    expect(drumOverlayLeft(270)).toBe(-130); // mood drum
  });

  it('fits the switches beside the frame drum', () => {
    expect(switchWidth(1)).toBe(110);
    expect(switchWidth(0.85)).toBeLessThan(110);
    expect(switchWidth(0.5)).toBe(80);
  });
});

describe('zoom and filter lookups', () => {
  it('has the design stops in order', () => {
    expect(ZOOM_STOPS.map((spec) => spec.rulerLabel)).toEqual(['.5×', '1×', '1.5×', '2×', '3×', '4×', '5×']);
    expect(zoomIndexOf(1.5)).toBe(2);
    expect(zoomSpec(4).label).toBe('4×');
  });

  it('camera zoom grows with the stop', () => {
    const zooms = ZOOM_STOPS.map((spec) => spec.cameraZoom);
    expect([...zooms].sort((a, b) => a - b)).toEqual(zooms);
  });

  it('finds filters', () => {
    expect(filterIndexOf('mono')).toBe(3);
  });
});
