import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText, Button } from '@/components';
import { borderRadius, borderWidth, colors, fontFamilies, fontSizes, shadows, spacing, inputReset } from '@/theme';
import type { CaptionEditorState } from '@/viewmodels/useDiaryViewModel';

const INPUT_MIN_HEIGHT = 84;

/** Small sheet to write a caption on a print ("Giữ để viết ghi chú"). */
export function CaptionModal({ editor }: { editor: CaptionEditorState }) {
  const visible = editor.photo !== null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={editor.cancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <Pressable
          style={styles.scrim}
          onPress={editor.cancel}
          accessibilityRole="button"
          accessibilityLabel="Đóng ghi chú"
        />
        <View style={styles.sheet}>
          <View style={styles.bar} />
          <AppText variant="cardTitle">Ghi chú</AppText>
          <TextInput
            value={editor.draft}
            onChangeText={editor.setDraft}
            maxLength={editor.maxLength}
            multiline
            autoFocus
            editable={!editor.isSaving}
            placeholder="Viết vài chữ…"
            placeholderTextColor={colors.faint}
            accessibilityLabel="Ghi chú cho tấm ảnh"
            style={[styles.input, inputReset]}
          />
          <View style={styles.metaRow}>
            <AppText variant="caption" color={editor.error ? 'danger' : 'textMuted'} style={styles.error}>
              {editor.error ?? ''}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {editor.draft.length}/{editor.maxLength}
            </AppText>
          </View>
          <View style={styles.buttons}>
            <Button label="Huỷ" variant="secondary" onPress={editor.cancel} disabled={editor.isSaving} />
            <Button label="Lưu" variant="primary" onPress={() => void editor.save()} loading={editor.isSaving} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.scrim,
  },
  sheet: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: borderRadius.sheet,
    borderTopRightRadius: borderRadius.sheet,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    ...shadows.sheet,
  },
  bar: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.handle,
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: INPUT_MIN_HEIGHT,
    backgroundColor: colors.card,
    borderWidth: borderWidth.hairline,
    borderColor: colors.hairline,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    fontFamily: fontFamilies.hand,
    fontSize: fontSizes.xl,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  error: {
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
});
