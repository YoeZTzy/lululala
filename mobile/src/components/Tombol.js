import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, t } from '../theme';

const GAYA = {
  Utama: { bg: colors.brand.biru, teks: colors.teks.terbalik },
  Sekunder: { bg: colors.permukaan.kartu, teks: colors.teks.utama },
  Lembut: { bg: colors.brand.langit50, teks: colors.brand.biru },
};

// Tombol (Utama/Sekunder/Lembut): tinggi 48, radius 14, label Bold 15.
export default function Tombol({ gaya = 'Utama', label, Ikon, onPress, disabled, memuat, style }) {
  const g = GAYA[gaya];
  const mati = disabled || memuat;
  return (
    <Pressable
      onPress={onPress}
      disabled={mati}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!mati, busy: !!memuat }}
      style={({ pressed }) => [
        styles.dasar,
        { backgroundColor: g.bg },
        gaya === 'Utama' && styles.bayanganUtama,
        gaya === 'Sekunder' && styles.garisSekunder,
        (pressed || mati) && { opacity: mati ? 0.6 : 0.85 },
        style,
      ]}
    >
      {memuat ? (
        <ActivityIndicator color={g.teks} />
      ) : (
        <>
          {Ikon ? <Ikon size={18} color={g.teks} strokeWidth={2} /> : null}
          <Text style={t('bold', 15, g.teks)}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dasar: {
    height: 48,
    borderRadius: radius.tombol,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  // drop-shadow 0 6 7 rgba(24,95,165,0.3)
  bayanganUtama: {
    shadowColor: colors.brand.biru,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 7,
    elevation: 6,
  },
  garisSekunder: { borderWidth: 1.5, borderColor: colors.garis.halus },
});
