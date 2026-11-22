import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, t } from '../theme';

// Chip: tinggi 34, radius 17. Terpilih = biru-tua penuh, selain itu kartu + garis halus.
export default function Chip({ label, Ikon, terpilih = false, onPress, style }) {
  const warna = terpilih ? colors.teks.terbalik : colors.teks.utama;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: terpilih }}
      style={[styles.dasar, terpilih ? styles.ya : styles.tidak, Ikon ? styles.denganIkon : styles.tanpaIkon, style]}
    >
      {Ikon ? <Ikon size={16} color={terpilih ? colors.teks.terbalik : colors.brand.biru} strokeWidth={2} /> : null}
      <Text style={t('semibold', 13, warna)}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dasar: {
    height: 34,
    borderRadius: radius.chip,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 14,
    borderWidth: 1.5,
  },
  denganIkon: { paddingLeft: 12 },
  tanpaIkon: { paddingLeft: 14 },
  ya: { backgroundColor: colors.brand.biruTua, borderColor: colors.brand.biruTua },
  tidak: { backgroundColor: colors.permukaan.kartu, borderColor: colors.garis.halus },
});
