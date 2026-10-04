# Nhật ký ảnh — Architecture (MVVM, local-first)

Expo SDK 57 · React Native 0.86 · TypeScript strict · Expo Router (routes in `src/app`).
UI design: [DESIGN.md](DESIGN.md) (artboards in `docs/design/`).

> Expo APIs change every SDK. Before using any Expo/RN API, check the installed typings in
> `node_modules/<pkg>/build/*.d.ts` or https://docs.expo.dev/versions/v57.0.0/ — never rely on memory.

## Layers

```
View (src/views/**, src/components/**)        dumb UI, no persistence calls
   │ uses
ViewModel (src/viewmodels/use*ViewModel.ts)    React hooks: state + actions for one screen
   │ uses
Model (src/models, src/data, src/services)     domain types, repositories, device services
```

- **Model**
  - `src/models` — `PhotoEntry` (incl. `frameType` Mini/Square/Wide, film `filter`, `weather` and `mood`), `NewPhotoEntry`,
    `AppSettings` (+ `sanitizeSettings`), `DEFAULT_SETTINGS`, `hasLocation()`.
  - `src/data` — `contracts.ts` (`IPhotoRepository`, `ISettingsRepository`); native: `LocalPhotoRepository`
    (SQLite rows + image files), `LocalSettingsRepository`, `ImageStorage`, `database.ts` (migrations via
    `PRAGMA user_version`); web: `data/web/*` (IndexedDB).
  - `src/services` — `AppServices` (DI container via context), `createRepositories(.web)`, `LocationService`,
    `FeedbackService`, `ExportService(.web)`, `Dialog(.web)`, `openPermissionSettings(.web)`, plus reminder,
    app-lock and album (PDF) services.
- **ViewModel** — `src/viewmodels/shared.ts`: `usePhotoStore()`, `usePhoto(id)`, `useSettings()`,
  `useFrameStyle()`. One `use<Screen>ViewModel.ts` per screen. Views never import from `src/data`.
- **View** — screens in `src/views/<feature>/`; route files in `src/app` only re-export screens.

## Navigation

Two routes:

| Route | File | Screen |
|---|---|---|
| `/` | `src/app/index.tsx` | `views/home/HomeScreen` — spatial navigator |
| `/photo/[id]` | `src/app/photo/[id].tsx` | `views/photo/PhotoDetailScreen({ photoId })` |

`HomeScreen` lays out three panes side by side and two sheets (the design's gesture map):

```
                 [ Settings ]   pull down from the top handle
 [ Map ]  ←→     [  Diary   ]   ←→  [ Camera ]      (swipe, or the vertical edge tabs)
                 [ Calendar ]   pull up from the day strip
```

`useHomeNav()` (views/home/HomeNavigator) exposes `pane`, `goTo`, `sheet`, `openSheet`, `closeSheet`,
`selectedDay`/`selectDay`, `mapFocusId`/`clearMapFocus`, `isPaneActive(pane)`. `SheetPullZone` makes a
handle draggable. Deep links: `/?pane=map&focus=<photoId>` ("Xem trên bản đồ"), `/?day=YYYY-MM-DD`.
Android back closes a sheet, then returns to the diary.

## Design system

`src/theme` — `colors`, `typography`, `spacing`, `borderRadius`, `borderWidth`, `shadows`, `durations`,
`easings`, `springs`, `printFormats`, `printRotations`, `layout`, `frameColors`, `filmFilters`.
**No hex literals or unexplained numbers outside `src/theme`.** Fonts: Be Vietnam Pro (UI) and
Patrick Hand (handwritten captions). Shared components are listed in DESIGN.md.

## Platforms (iOS · Android · Web)

One codebase; Metro picks `*.web.ts(x)` over `*.ts(x)` on web.

| Concern | iOS / Android | Web |
|---|---|---|
| Repositories | SQLite + image files | IndexedDB (image bytes), object URLs |
| Map | react-native-maps | Leaflet + OpenStreetMap tiles, same ViewModel via `MapController` |
| Backup | pick a folder → `diary.json` + images | downloads one self-contained `.json` |
| PDF album | expo-print → share PDF | browser print dialog (Save as PDF) |
| Daily reminder / app lock | expo-notifications / expo-local-authentication | not available (hidden) |
| Dialogs | `Alert` | `window.confirm/alert` |
| Film filters | `filter` style (Android full, iOS partial) + colour tint | CSS filter + tint |

`src/app/_layout.tsx` frames the web app in a phone-width column on wide screens.

## Privacy

Photos, captions and GPS never leave the device; there is no backend and no account. Three optional
network touches exist: reverse geocoding (only when "Tên địa điểm" is on, off by default), local weather
for the camera's weather drum (`WeatherService` → Open-Meteo, coordinates rounded to ~1 km; "Thời tiết tự
động", on by default, needs location) and map tiles (Google/Apple natively, OpenStreetMap on web), which reveal the area being viewed to the
tile provider — never the photos.
