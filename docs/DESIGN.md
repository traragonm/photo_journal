# Nhật ký ảnh Polaroid — design brief

Source: the "Nhật ký ảnh Polaroid" design canvas. Artboard sources (390×844 phone, HTML) are in
[`docs/design/`](design/): `Main`, `Camera`, `Calendar`, `Map`, `Settings`. **Read the artboard for the
screen you build** — positions, sizes and copy below come from it. Copy is Vietnamese.

## Mood

Calm, tactile, warm paper table with real prints scattered on it. Not Y2K, not a social feed. One accent
(brick red `colors.accent`), everything else ink on paper. Prints are physical: tilt, warm brown shadow,
thicker bottom border, handwritten caption (Patrick Hand) + time.

## Tokens (all in `src/theme`; never hard-code)

- Colors: `paper #ECE6DB` (page), `sheet #F7F3EC` (sheets), `card #FFFFFF` (setting groups, calendar day
  card), `chip #EFE9DF` (segmented bg, round buttons), `ink #26221E`, `inkSoft #4A433C`, `muted #6B6258`,
  `faint #A0968A` (future days), `handle #B9AFA2`, `hairline #CFC6BA`, `accent #C2402A`,
  `accentText #A8361F` (links, AA contrast), `onInk #F4EFE6`. Print borders: `frameColors.white|cream|black`.
  Camera body: `cameraBody #171513` + `camera*` tokens. Map: `map*` tokens, `userLocation`.
- Type (`typography`): `display` 32/600 ("Hôm nay"), `title` 30/600 ("Cài đặt"), `heading` 24/600
  ("Tháng 10, 2026"), `subheading` 20/600, `cardTitle` 16/600, `body` 15, `label` 13/600, `caption` 12,
  `eyebrow` 12 uppercase tracking, `tab` 10/600, `hand` 19, `handLarge` 22, `handSmall` 14.
  Captions use `useFrameStyle().captionVariant` (handwritten unless the user turned it off).
- Radii: `print 3`, `lg 14` (day buttons, edge tabs), `card 16`, `cardLarge 20`, `sheet 28`, `pill`.
- Shadows: `soft`, `print`, `printLifted`, `float`, `sheet`, `sheetFromTop`, `viewfinder`.
- Print formats: `printFormats.mini|square|wide` (print + window proportions); use `PolaroidFrame` /
  `printGeometry(width, frameType)`. Tilts: `printRotations`, `rotationFor(id)`.
- Film looks: `filmFilters` (label, swatch, `filter` string, `tint`), dial order
  original · warm · fade · mono · cool · vintage (Gốc · Ấm · Phai · Đen trắng · Lạnh · Hoài cổ).
- Motion: `durations.frameMorph` 350, `durations.dial` 480, `easings.dial` = cubic-bezier(.3,.7,.2,1), `springs`.

## Navigation (built: `src/views/home`)

No tab bar. One home route with three panes side by side and two sheets:

```
                 [ Settings ]   pull down from the top handle ("Cài đặt")
 [ Map ]  ←→     [  Diary   ]   ←→  [ Camera ]
                 [ Calendar ]   pull up from the day strip ("Kéo lên · Lịch ảnh")
```

`useHomeNav()` → `pane`, `sheet`, `goTo(pane)`, `openSheet('settings'|'calendar')`, `closeSheet()`,
`selectedDay` / `selectDay(dayKey)`, `mapFocusId` / `clearMapFocus()`, `isPaneActive(pane)` (use it to
start/stop the camera, GPS polling, etc.). Edge tabs, the sheet containers, their close handles and the
paper backdrop are rendered by `HomeScreen` — panes/sheets render only their content.
Wrap an "open sheet" handle in `<SheetPullZone sheet="…" intent="open">` so it can be dragged.
Photo detail is a separate route: `router.push({ pathname: '/photo/[id]', params: { id } })`.
"Xem trên bản đồ": `router.navigate({ pathname: '/', params: { pane: 'map', focus: id } })`.

## Shared components (`src/components`)

`AppText`, `Button` (primary ink / accent / secondary chip / ghost link / danger), `IconButton`
(round 44, tones paper/camera/plain), `EdgeTab`, `Handle`, `SegmentedControl` (floating / inset, compact),
`Toggle` (ink track), `PhotoImage` (applies film filter, damaged-file fallback), `PolaroidFrame`,
`PolaroidCard` (tap / long-press), `PhotoThumbnail` (mini print), `LocationBadge`, `EmptyState`,
`AnimatedEntry`, `PressableScale`. Utils: `utils/date` (Vietnamese formats, day keys),
`utils/days` (groupPhotosByDay, buildWeekStrip, buildMonthGrid, monthStats, photosInRange),
`utils/geo`, `utils/rotation`, `utils/clustering`.

## Screens

- **Diary (Main)**: top handle "Cài đặt" (gear icon) opens Settings; eyebrow date "THỨ SÁU, 2 THÁNG 10";
  `display` title (Hôm nay / Hôm qua / weekday date); right: handwritten count "3 tấm ảnh"; a scattered,
  overlapping pile of prints for the selected day (big, tilted −9°/7°/−2°…, last one on top, lifted
  shadow); hint "Chạm để xem ảnh · Giữ để viết ghi chú"; Monday-first week strip (44×66 buttons,
  radius 14, today/selected = ink pill with onInk text, dot = accent when the day has photos, future
  days faint); bottom handle "Kéo lên · Lịch ảnh" opens Calendar.
- **Camera**: dark body. Top row: flash, timer, flip (round translucent). Viewfinder = the live camera
  inside a print whose proportions follow the frame knob (Mini/Square/Wide), with white corner brackets
  and a "1× · Gốc" badge; strip under the window reads "Viết vài chữ sau khi chụp…". Bottom-left: last
  print (opens the diary). Center readout "ZOOM 1× / LỌC Gốc". Right: knurled frame knob with
  MINI/SQ/WIDE labels. Big dial: outer cream ring with zoom stops .5× 1× 2× 3× 5× (rotates to bring the
  choice under the accent pointer), inner dark ring with 6 film swatches (rotates likewise), shutter in
  the middle (84, white ring, accent core).
- **Map**: paper-toned map; top floating segmented "Hôm nay · Tuần này · Tất cả"; pins = tilted mini
  prints on a stick with an ink dot (selected: accent ring/stick/dot); user location blue dot with halo;
  bottom sheet (white, radius 24): "Hôm nay đã đi qua" + "3 nơi", rows = mini print + handwritten caption
  + "place · time".
- **Calendar sheet**: month title with prev/next round buttons, stats "2 ngày có ảnh · 4 tấm · chuỗi 3
  ngày", T2…CN header, grid of 66-high cells: days with photos show a mini print (stacked if several),
  today highlighted with accent ring; bottom white card for the selected day with up to 3 prints and
  "Mở nhật ký".
- **Settings curtain**: "Cài đặt"; groups on white cards radius 16: KHUNG ẢNH (Kiểu khung segmented
  Mini/Square/Wide, Màu viền swatches), NHẬT KÝ (toggles: Ghi vị trí vào ảnh, Hiệu ứng ảnh hiện dần,
  Ghi chú kiểu chữ viết tay; Nhắc chụp mỗi ngày 20:00 ›), DỮ LIỆU (Sao lưu ›, Xuất album (PDF / in ảnh) ›,
  Quyền riêng tư & khoá app ›).

## Accessibility

Touch targets ≥ 44. Icon-only buttons need `accessibilityLabel` (Vietnamese). Text contrast ≥ 4.5:1:
use `muted` for secondary text, `accentText` for accent-coloured text on paper.
