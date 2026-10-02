import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '@/components';
import { colors, shadows } from '@/theme';
import { ACTION_GAP, ACTION_SIZE } from './detailConstants';

export interface PhotoActionsProps {
  hasCaption: boolean;
  canViewOnMap: boolean;
  onEditCaption: () => void;
  onViewOnMap: () => void;
  onShare: () => void;
  onDelete: () => void;
}

const ICON_SIZE = 20;

interface ActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  onPress: () => void;
}

function ActionButton({ icon, label, color = colors.ink, onPress }: ActionProps) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.button}>
      <Ionicons name={icon} size={ICON_SIZE} color={color} />
    </PressableScale>
  );
}

/** Four round actions: edit note, view on map (only with a location), share, delete. */
export function PhotoActions({
  hasCaption,
  canViewOnMap,
  onEditCaption,
  onViewOnMap,
  onShare,
  onDelete,
}: PhotoActionsProps) {
  return (
    <View style={styles.row}>
      <ActionButton icon="create-outline" label={hasCaption ? 'Sửa ghi chú' : 'Viết ghi chú'} onPress={onEditCaption} />
      {canViewOnMap ? <ActionButton icon="map-outline" label="Xem trên bản đồ" onPress={onViewOnMap} /> : null}
      <ActionButton icon="share-outline" label="Chia sẻ" onPress={onShare} />
      <ActionButton icon="trash-outline" label="Xoá ảnh" color={colors.accentText} onPress={onDelete} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: ACTION_GAP },
  button: {
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    borderRadius: ACTION_SIZE / 2,
    backgroundColor: colors.frameWhite,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
});
