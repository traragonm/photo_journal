import { StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText, PressableScale } from '@/components';
import { fontFamilies, layout, skyStyles, type DiaryPalette } from '@/theme';
import { useAmbient } from '@/viewmodels/useAmbient';

const HEIGHT = 30;
const ICON_SIZE = 16;

/** Header chip: today's sky and temperature. Tap to step through the skies (the forecast comes back round). */
export function WeatherChip({ palette }: { palette: DiaryPalette }) {
  const { sky, temperatureC, cycleSky } = useAmbient();
  const style = sky ? skyStyles[sky] : null;
  const temperature = temperatureC === null ? null : `${Math.round(temperatureC)}°`;
  const label = style
    ? `Thời tiết: ${style.label}${temperature ? ` ${temperature}` : ''}. Chạm để đổi`
    : 'Thời tiết: chưa rõ. Chạm để chọn';
  return (
    <PressableScale
      onPress={cycleSky}
      hitSlop={layout.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.chip, { backgroundColor: palette.chipBg, borderColor: palette.chipBorder }]}
    >
      <MaterialCommunityIcons
        name={style ? style.icon : 'weather-partly-cloudy'}
        size={ICON_SIZE}
        color={style ? palette.ink : palette.muted}
      />
      {temperature ? <AppText style={[styles.text, { color: palette.ink }]}>{temperature}</AppText> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: HEIGHT,
    marginVertical: -7,
    paddingLeft: 8,
    paddingRight: 10,
    borderRadius: HEIGHT / 2,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  text: {
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    lineHeight: 16,
  },
});
