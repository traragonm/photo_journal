import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '@/components';
import { borderRadius, colors } from '@/theme';
import {
  CARD_PADDING_X,
  CARD_PADDING_Y,
  CARD_PADDING_Y_TALL,
  GROUP_TITLE_GAP,
} from './settingsConstants';

interface SettingsGroupProps {
  /** Eyebrow title, rendered uppercase ("Khung ảnh"). */
  title: string;
  children: ReactNode;
  /** Taller rows (52) use 6px vertical padding like the "Khung ảnh" card in the artboard. */
  tall?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Eyebrow title + white rounded card (radius 16) holding the rows. */
export function SettingsGroup({ title, children, tall = false, style }: SettingsGroupProps) {
  return (
    <View style={styles.group}>
      <AppText variant="eyebrow" color="textMuted" accessibilityRole="header">
        {title}
      </AppText>
      <View style={[styles.card, tall && styles.cardTall, style]}>{children}</View>
    </View>
  );
}

/** Thin divider between rows inside a card. */
export function Hairline() {
  return <View style={styles.hairline} />;
}

const styles = StyleSheet.create({
  group: { gap: GROUP_TITLE_GAP },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.card,
    paddingHorizontal: CARD_PADDING_X,
    paddingVertical: CARD_PADDING_Y,
  },
  cardTall: { paddingVertical: CARD_PADDING_Y_TALL },
  hairline: { height: 1, backgroundColor: colors.divider },
});
