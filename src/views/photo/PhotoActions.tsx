import { StyleSheet, View } from 'react-native';
import { Button } from '@/components';
import { spacing } from '@/theme';

export interface PhotoActionsProps {
  hasCaption: boolean;
  canViewOnMap: boolean;
  onEditCaption: () => void;
  onViewOnMap: () => void;
  onDelete: () => void;
}

/** Calm action list: note, map, delete. */
export function PhotoActions({ hasCaption, canViewOnMap, onEditCaption, onViewOnMap, onDelete }: PhotoActionsProps) {
  return (
    <View style={styles.container}>
      <Button
        label={hasCaption ? 'Sửa ghi chú' : 'Viết ghi chú'}
        icon="create-outline"
        variant="secondary"
        onPress={onEditCaption}
      />
      {canViewOnMap ? (
        <Button label="Xem trên bản đồ" icon="map-outline" variant="ghost" onPress={onViewOnMap} />
      ) : null}
      <Button label="Xoá ảnh" icon="trash-outline" variant="danger" onPress={onDelete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.xs },
});