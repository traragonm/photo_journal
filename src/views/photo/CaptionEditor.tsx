import { StyleSheet, TextInput, View } from 'react-native';
import { AppText, Button } from '@/components';
import { borderRadius, colors, fontFamilies, fontSizes, spacing, inputReset } from '@/theme';

export interface CaptionEditorProps {
  value: string;
  maxLength: number;
  isSaving: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const MIN_INPUT_HEIGHT = 84;
const INPUT_LINE_HEIGHT = 26;

/** Inline handwritten note editor with a character counter. */
export function CaptionEditor({ value, maxLength, isSaving, onChange, onSave, onCancel }: CaptionEditorProps) {
  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={onChange}
        maxLength={maxLength}
        multiline
        autoFocus
        editable={!isSaving}
        placeholder="Viết vài chữ…"
        placeholderTextColor={colors.muted}
        accessibilityLabel="Ghi chú"
        style={[styles.input, inputReset]}
      />
      <AppText variant="caption" color="textMuted" align="right">
        {value.length}/{maxLength}
      </AppText>
      <View style={styles.buttons}>
        <Button label="Huỷ" variant="secondary" onPress={onCancel} disabled={isSaving} />
        <Button label="Lưu" icon="checkmark" onPress={onSave} loading={isSaving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  input: {
    minHeight: MIN_INPUT_HEIGHT,
    backgroundColor: colors.chip,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontFamily: fontFamilies.hand,
    fontSize: fontSizes.xl,
    lineHeight: INPUT_LINE_HEIGHT,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
});