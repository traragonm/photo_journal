import type { AlbumPrint } from '../albumHtml';
import { buildAlbumHtml, escapeHtml, printWidthPercent, toDataUrl, windowPaddingPercent } from '../albumHtml';
import {
  formatReminderTime,
  parseReminderTime,
  REMINDER_MINUTE_STEP,
  shiftHour,
  shiftMinute,
} from '../reminderTime';

const OPTIONS = { frameColor: 'cream', title: 'Nhật ký ảnh', emptyMessage: 'Trống' } as const;

function print(overrides: Partial<AlbumPrint> = {}): AlbumPrint {
  return {
    id: 'a',
    imageSrc: toDataUrl('QUJD'),
    caption: 'Cà phê sáng',
    createdAt: '2026-10-02T11:30:00.000Z',
    place: 'Hoàn Kiếm, Hà Nội',
    frameType: 'square',
    filter: 'original',
    ...overrides,
  };
}

describe('escapeHtml', () => {
  it('escapes markup characters', () => {
    expect(escapeHtml(`<b a="1">&'`)).toBe('&lt;b a=&quot;1&quot;&gt;&amp;&#39;');
  });
});

describe('buildAlbumHtml', () => {
  it('embeds the image, caption, place and counts', () => {
    const html = buildAlbumHtml([print()], OPTIONS);
    expect(html).toContain('src="data:image/jpeg;base64,QUJD"');
    expect(html).toContain('Cà phê sáng');
    expect(html).toContain('Hoàn Kiếm, Hà Nội');
    expect(html).toContain('1 tấm ảnh');
    expect(html).toContain('lang="vi"');
  });

  it('escapes user text so captions cannot inject markup', () => {
    const html = buildAlbumHtml([print({ caption: '<script>alert(1)</script>', place: 'A & B' })], OPTIONS);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B');
  });

  it('omits caption and place blocks when empty', () => {
    const html = buildAlbumHtml([print({ caption: '  ', place: null })], OPTIONS);
    expect(html).not.toContain('<p class="caption">');
    expect(html).not.toContain('<p class="place">');
  });

  it('orders prints oldest first', () => {
    const html = buildAlbumHtml(
      [print({ id: 'new', caption: 'MOI', createdAt: '2026-10-03T08:00:00.000Z' }), print({ id: 'old', caption: 'CU' })],
      OPTIONS,
    );
    expect(html.indexOf('CU')).toBeLessThan(html.indexOf('MOI'));
  });

  it('applies the chosen frame colour and film filter', () => {
    const html = buildAlbumHtml([print({ filter: 'mono' })], { ...OPTIONS, frameColor: 'black' });
    expect(html).toContain('grayscale(1)');
    expect(html).toContain('background: #1E1C1A');
  });

  it('shows the empty message with no prints', () => {
    expect(buildAlbumHtml([], OPTIONS)).toContain('Trống');
  });

  it('scales print geometry per format', () => {
    expect(printWidthPercent('wide')).toBe(100);
    expect(printWidthPercent('mini')).toBeLessThan(printWidthPercent('square'));
    expect(windowPaddingPercent('square')).toBe(100);
  });
});

describe('reminder time math', () => {
  it('parses and formats HH:MM', () => {
    expect(parseReminderTime('20:05')).toEqual({ hour: 20, minute: 5 });
    expect(formatReminderTime({ hour: 7, minute: 0 })).toBe('07:00');
  });

  it('rejects malformed times', () => {
    expect(parseReminderTime('24:00')).toBeNull();
    expect(parseReminderTime('7:30')).toBeNull();
    expect(parseReminderTime('')).toBeNull();
  });

  it('wraps hours and minutes without carrying', () => {
    expect(shiftHour({ hour: 23, minute: 30 }, 1)).toEqual({ hour: 0, minute: 30 });
    expect(shiftHour({ hour: 0, minute: 30 }, -1)).toEqual({ hour: 23, minute: 30 });
    expect(shiftMinute({ hour: 8, minute: 55 }, REMINDER_MINUTE_STEP)).toEqual({ hour: 8, minute: 0 });
    expect(shiftMinute({ hour: 8, minute: 0 }, -REMINDER_MINUTE_STEP)).toEqual({ hour: 8, minute: 55 });
  });
});
