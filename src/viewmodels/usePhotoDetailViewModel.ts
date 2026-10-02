import { useCallback, useState } from 'react';
import { Dialog } from '@/services/Dialog';
import { router } from 'expo-router';
import { CAPTION_MAX_LENGTH, hasLocation, type PhotoEntry } from '@/models';
import { useAppServices } from '@/services/AppServices';
import { sharePhoto } from '@/views/photo/sharePhoto';
import { usePhoto } from './shared';

export interface DetailNotice {
  kind: 'error' | 'info';
  text: string;
}

export interface PhotoDetailViewModel {
  photo: PhotoEntry | undefined;
  canViewOnMap: boolean;
  notice: DetailNotice | null;
  isEditing: boolean;
  draft: string;
  maxCaptionLength: number;
  isSaving: boolean;
  isViewerOpen: boolean;
  goBack: () => void;
  startEditing: () => void;
  cancelEditing: () => void;
  setDraft: (value: string) => void;
  saveCaption: () => Promise<void>;
  confirmDelete: () => void;
  share: () => Promise<void>;
  viewOnMap: () => void;
  openViewer: () => void;
  closeViewer: () => void;
}

const SHARE_UNSUPPORTED = 'Trình duyệt này không hỗ trợ chia sẻ.';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Đã có lỗi xảy ra.';
}

export function usePhotoDetailViewModel(photoId: string | undefined): PhotoDetailViewModel {
  const livePhoto = usePhoto(photoId);
  const { photoRepository } = useAppServices();
  const [notice, setNotice] = useState<DetailNotice | null>(null);
  const [isEditingRaw, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isViewerOpenRaw, setIsViewerOpen] = useState(false);
  // Snapshot kept while the delete transition plays, instead of flashing "not found".
  const [deletingPhoto, setDeletingPhoto] = useState<PhotoEntry | null>(null);
  const photo = livePhoto ?? deletingPhoto ?? undefined;
  const isEditing = isEditingRaw && photo !== undefined;
  const isViewerOpen = isViewerOpenRaw && photo !== undefined;

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);

  const startEditing = useCallback(() => {
    setDraft(photo?.caption ?? '');
    setNotice(null);
    setIsEditing(true);
  }, [photo]);

  const cancelEditing = useCallback(() => setIsEditing(false), []);

  const updateDraft = useCallback(
    (value: string) => setDraft(value.slice(0, CAPTION_MAX_LENGTH)),
    [],
  );

  const saveCaption = useCallback(async () => {
    if (!photo || isSaving) return;
    setIsSaving(true);
    try {
      const trimmed = draft.trim();
      await photoRepository.update(photo.id, { caption: trimmed.length > 0 ? trimmed : null });
      setIsEditing(false);
      setNotice({ kind: 'info', text: 'Đã lưu ghi chú.' });
    } catch (error) {
      console.warn('[photo] save caption failed', error);
      setNotice({ kind: 'error', text: `Không lưu được ghi chú. ${messageOf(error)}` });
    } finally {
      setIsSaving(false);
    }
  }, [photo, draft, isSaving, photoRepository]);

  const confirmDelete = useCallback(() => {
    if (!photo) return;
    const snapshot = photo;
    const id = photo.id;
    Dialog.confirm(
      'Xoá khoảnh khắc này?',
      'Ảnh sẽ bị xoá khỏi máy này. Không thể hoàn tác.',
      { confirmLabel: 'Xoá', cancelLabel: 'Giữ lại', destructive: true },
    ).then((confirmed) => {
      if (!confirmed) return;
      setDeletingPhoto(snapshot);
      photoRepository
        .remove(id)
        .then(goBack)
        .catch((error: unknown) => {
          console.warn('[photo] delete failed', error);
          setDeletingPhoto(null);
          setNotice({ kind: 'error', text: `Không xoá được ảnh. ${messageOf(error)}` });
        });
    });
  }, [photo, photoRepository, goBack]);

  const share = useCallback(async () => {
    if (!photo) return;
    if (!photo.isImageAvailable) {
      setNotice({ kind: 'error', text: 'Tệp ảnh không còn nên không thể chia sẻ.' });
      return;
    }
    try {
      const result = await sharePhoto(photo.imageUri);
      if (result === 'unsupported') {
        setNotice({ kind: 'error', text: SHARE_UNSUPPORTED });
      }
    } catch (error) {
      console.warn('[photo] share failed', error);
      setNotice({ kind: 'error', text: `Không chia sẻ được ảnh. ${messageOf(error)}` });
    }
  }, [photo]);

  const viewOnMap = useCallback(() => {
    if (!photo || !hasLocation(photo)) return;
    router.navigate({ pathname: '/', params: { pane: 'map', focus: photo.id } });
  }, [photo]);

  const openViewer = useCallback(() => {
    if (photo?.isImageAvailable) setIsViewerOpen(true);
  }, [photo]);
  const closeViewer = useCallback(() => setIsViewerOpen(false), []);

  return {
    photo,
    canViewOnMap: photo ? hasLocation(photo) : false,
    notice,
    isEditing,
    draft,
    maxCaptionLength: CAPTION_MAX_LENGTH,
    isSaving,
    isViewerOpen,
    goBack,
    startEditing,
    cancelEditing,
    setDraft: updateDraft,
    saveCaption,
    confirmDelete,
    share,
    viewOnMap,
    openViewer,
    closeViewer,
  };
}
