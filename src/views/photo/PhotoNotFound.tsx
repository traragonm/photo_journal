import { StyleSheet, View } from 'react-native';
import { Button, EmptyState } from '@/components';
import { spacing } from '@/theme';

export interface PhotoNotFoundProps {
  onBack: () => void;
}

/** Shown when the photo was deleted or the id is unknown. */
export function PhotoNotFound({ onBack }: PhotoNotFoundProps) {
  return (
    <View style={styles.container}>
      <EmptyState
        title="Không tìm thấy ảnh này."
        message="Có thể ảnh đã được xoá khỏi máy."
        icon="image-outline"
        note="không thấy…"
      />
      <Button label="Về nhật ký" variant="primary" onPress={onBack} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
});