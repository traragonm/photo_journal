import { createContext, useContext, type ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type { DayKey } from '@/utils/date';

/**
 * Spatial layout of the home screen (from the design's gesture map):
 *
 *                 [ Settings ]   ↓ pull down from the top edge
 *   [ Map ]  ←→   [  Diary   ]  ←→  [ Camera ]
 *                 [ Calendar ]   ↑ pull up from the day strip
 */
export type Pane = 'map' | 'diary' | 'camera';
export type Sheet = 'settings' | 'calendar';

export const PANES: readonly Pane[] = ['map', 'diary', 'camera'];

export interface HomeNav {
  pane: Pane;
  sheet: Sheet | null;
  goTo: (pane: Pane) => void;
  openSheet: (sheet: Sheet) => void;
  closeSheet: () => void;
  /** Day shown on the diary (and highlighted on the calendar). */
  selectedDay: DayKey;
  selectDay: (day: DayKey) => void;
  /** Photo the map should centre on and select (from "Xem trên bản đồ"); null once handled. */
  mapFocusId: string | null;
  clearMapFocus: () => void;
  /** True when the pane is on screen, no sheet covers it and no route is pushed on top. */
  isPaneActive: (pane: Pane) => boolean;
  /** 0 = closed … 1 = open; driven by drags and by open/close calls. */
  sheetProgress: Record<Sheet, SharedValue<number>>;
  /** Height in px a sheet travels; used to convert drag distance to progress. */
  sheetTravel: SharedValue<number>;
}

const HomeNavContext = createContext<HomeNav | null>(null);

export function HomeNavProvider({ value, children }: { value: HomeNav; children: ReactNode }) {
  return <HomeNavContext.Provider value={value}>{children}</HomeNavContext.Provider>;
}

/** Navigation for panes and sheets on the home screen. */
export function useHomeNav(): HomeNav {
  const nav = useContext(HomeNavContext);
  if (!nav) throw new Error('useHomeNav must be used inside the home screen.');
  return nav;
}
