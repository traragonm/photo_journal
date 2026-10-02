import { useCallback, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { CAPTION_MAX_LENGTH, type PhotoEntry } from '@/models';
import { useAppServices } from '@/services/AppServices';
import {
  addDays,
  dateOfDayKey,
  dayKeyOf,
  formatDayTitle,
  formatWeekdayDate,
  type DayKey,
} from '@/utils/date';
import { buildWeekStrip, groupPhotosByDay, type WeekDay } from '@/utils/days';
import { MAX_PILE_PRINTS } from '@/utils/pile';
import { useHomeNav } from '@/views/home/HomeNavigator';
import { usePhotoStore } from './shared';

const DAYS_PER_WEEK = 7;

export interface DiaryViewModel {
  /** "Thứ Sáu, 2 tháng 10" (shown uppercase by the eyebrow style). */
  eyebrow: string;
  /** "Hôm nay" / "Hôm qua" / weekday date. */
  title: string;
  /** "3 tấm" for the day; "Thư viện" when the day is empty. */
  countLabel: string;
  isToday: boolean;
  isLoaded: boolean;
  /** Selected day's prints, oldest → newest. */
  photos: readonly PhotoEntry[];
  /** What the scattered pile shows (newest few) when not expanded. */
  pilePhotos: readonly PhotoEntry[];
  /** Prints beyond the pile. */
  hiddenCount: number;
  isExpanded: boolean;
  toggleExpanded: () => void;
  emptyTitle: string;
  week: WeekDay[];
  canGoNextWeek: boolean;
  goPreviousWeek: () => void;
  goNextWeek: () => void;
  selectDay: (day: DayKey) => void;
  openPhoto: (photo: PhotoEntry) => void;
  openSettings: () => void;
  openCalendar: () => void;
  openLibrary: () => void;
  /** Only meaningful for today; past days have no capture shortcut. */
  goToCamera: () => void;
  caption: CaptionEditorState;
}

export interface CaptionEditorState {
  /** Photo being annotated; null when the editor is closed. */
  photo: PhotoEntry | null;
  draft: string;
  maxLength: number;
  isSaving: boolean;
  error: string | null;
  start: (photo: PhotoEntry) => void;
  setDraft: (value: string) => void;
  save: () => Promise<void>;
  cancel: () => void;
}

function pluralLabel(count: number): string {
  return count === 0 ? 'Thư viện' : `${count} tấm`;
}

/** State and actions of the diary pane ("Hôm nay"). */
export function useDiaryViewModel(): DiaryViewModel {
  const { selectedDay, selectDay, openSheet, goTo } = useHomeNav();
  const { photos: allPhotos, isLoaded } = usePhotoStore();
  const { photoRepository } = useAppServices();
  const [expandedDay, setExpandedDay] = useState<DayKey | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const todayKey = dayKeyOf(today);
  const byDay = useMemo(() => groupPhotosByDay(allPhotos), [allPhotos]);
  const photos = byDay.get(selectedDay) ?? [];
  const week = useMemo(() => buildWeekStrip(selectedDay, byDay, new Date()), [selectedDay, byDay]);
  const selectedDate = dateOfDayKey(selectedDay);
  const isToday = selectedDay === todayKey;
  const hiddenCount = Math.max(photos.length - MAX_PILE_PRINTS, 0);
  const isExpanded = expandedDay === selectedDay && hiddenCount > 0;

  const toggleExpanded = useCallback(() => {
    setExpandedDay((current) => (current === selectedDay ? null : selectedDay));
  }, [selectedDay]);

  const goPreviousWeek = useCallback(() => {
    selectDay(dayKeyOf(addDays(dateOfDayKey(selectedDay), -DAYS_PER_WEEK)));
  }, [selectDay, selectedDay]);

  const goNextWeek = useCallback(() => {
    const next = dayKeyOf(addDays(dateOfDayKey(selectedDay), DAYS_PER_WEEK));
    // Never land in the future: a partial last step goes to today.
    selectDay(next > dayKeyOf(new Date()) ? dayKeyOf(new Date()) : next);
  }, [selectDay, selectedDay]);

  const openPhoto = useCallback((photo: PhotoEntry) => {
    router.push({ pathname: '/photo/[id]', params: { id: photo.id } });
  }, []);
  const openSettings = useCallback(() => openSheet('settings'), [openSheet]);
  const openCalendar = useCallback(() => openSheet('calendar'), [openSheet]);
  const openLibrary = useCallback(() => router.push('/library'), []);
  const goToCamera = useCallback(() => goTo('camera'), [goTo]);

  const editingPhoto = editingId ? (allPhotos.find((photo) => photo.id === editingId) ?? null) : null;

  const start = useCallback((photo: PhotoEntry) => {
    setEditingId(photo.id);
    setDraft(photo.caption ?? '');
    setError(null);
  }, []);
  const cancel = useCallback(() => {
    setEditingId(null);
    setError(null);
  }, []);
  const save = useCallback(async () => {
    if (!editingId || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const trimmed = draft.trim();
      await photoRepository.update(editingId, { caption: trimmed.length > 0 ? trimmed : null });
      setEditingId(null);
    } catch {
      setError('Không lưu được ghi chú. Thử lại nhé.');
    } finally {
      setIsSaving(false);
    }
  }, [draft, editingId, isSaving, photoRepository]);

  return {
    eyebrow: formatWeekdayDate(selectedDate),
    title: formatDayTitle(selectedDay, today),
    countLabel: pluralLabel(photos.length),
    isToday,
    isLoaded,
    photos,
    pilePhotos: photos.slice(-MAX_PILE_PRINTS),
    hiddenCount,
    isExpanded,
    toggleExpanded,
    emptyTitle: isToday ? 'Hôm nay chưa có ảnh nào.' : 'Ngày này chưa có ảnh.',
    week,
    canGoNextWeek: !week.some((day) => day.isToday),
    goPreviousWeek,
    goNextWeek,
    selectDay,
    openPhoto,
    openSettings,
    openCalendar,
    openLibrary,
    goToCamera,
    caption: {
      photo: editingPhoto,
      draft,
      maxLength: CAPTION_MAX_LENGTH,
      isSaving,
      error,
      start,
      setDraft,
      save,
      cancel,
    },
  };
}
