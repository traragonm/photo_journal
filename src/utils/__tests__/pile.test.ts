import { layoutColumn, layoutPile, fitPrintWidth, MAX_PILE_PRINTS } from '../pile';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `photo-${i}`);
const W = 390;
const H = 486;

describe('layoutPile', () => {
  it('is deterministic for the same ids and size', () => {
    expect(layoutPile(ids(4), W, H)).toEqual(layoutPile(ids(4), W, H));
  });

  it('returns nothing for an empty day', () => {
    expect(layoutPile([], W, H).items).toEqual([]);
  });

  it('keeps every print on screen for 1..6 prints at several sizes', () => {
    for (const [w, h] of [
      [390, 486],
      [360, 400],
      [480, 560],
    ]) {
      for (let n = 1; n <= MAX_PILE_PRINTS; n++) {
        const layout = layoutPile(ids(n), w, h);
        expect(layout.items).toHaveLength(n);
        for (const item of layout.items) {
          expect(item.left).toBeGreaterThanOrEqual(0);
          expect(item.top).toBeGreaterThanOrEqual(0);
          expect(item.left + layout.slotWidth).toBeLessThanOrEqual(w);
          expect(item.top + layout.slotHeight).toBeLessThanOrEqual(h);
        }
      }
    }
  });

  it('centres and enlarges a single print', () => {
    const single = layoutPile(ids(1), W, H);
    const several = layoutPile(ids(3), W, H);
    expect(single.slotWidth).toBeGreaterThan(several.slotWidth);
    const item = single.items[0];
    expect(item.left + single.slotWidth / 2).toBeCloseTo(W / 2, 0);
  });

  it('only lays out the newest prints and paints the newest on top', () => {
    const layout = layoutPile(ids(9), W, H);
    expect(layout.items).toHaveLength(MAX_PILE_PRINTS);
    expect(layout.items[0].index).toBe(9 - MAX_PILE_PRINTS);
    expect(layout.items[layout.items.length - 1].index).toBe(8);
    const z = layout.items.map((item) => item.zIndex);
    expect(z).toEqual([...z].sort((a, b) => a - b));
  });

  it('does not tilt neighbours the same way', () => {
    const { items } = layoutPile(ids(6), W, H);
    for (let i = 1; i < items.length; i++) expect(items[i].rotation).not.toBe(items[i - 1].rotation);
  });
});

describe('fitPrintWidth', () => {
  it('fits every format inside its slot height', () => {
    expect(fitPrintWidth(200, 'square')).toBe(200);
    expect(fitPrintWidth(200, 'mini')).toBeLessThan(200);
    expect(fitPrintWidth(200, 'wide')).toBeLessThanOrEqual(240);
  });
});

describe('layoutColumn', () => {
  it('stacks prints top to bottom inside the width and reports the content height', () => {
    const column = layoutColumn(ids(8), W);
    expect(column.items).toHaveLength(8);
    column.items.forEach((item, i) => {
      expect(item.left).toBeGreaterThanOrEqual(0);
      expect(item.left + column.slotWidth).toBeLessThanOrEqual(W);
      if (i > 0) expect(item.top).toBeGreaterThan(column.items[i - 1].top);
    });
    const last = column.items[7];
    expect(column.contentHeight).toBeGreaterThanOrEqual(last.top + column.slotHeight);
    expect(layoutColumn([], W).contentHeight).toBe(0);
  });
});
