import { Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme';

// Tombol bulat 42 putih di atas peta (tombol kembali / lokasi saya), bayangan 0 8 24 -6 rgba(8,36,74,0.12).
export default function TombolBulat({ Ikon, onPress, label, style, warnaIkon = colors.teks.utama }) {
  return (
    <Pressable onPress={onPress} style={[styles.tombol, style]} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
      <Ikon size={20} color={warnaIkon} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tombol: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.permukaan.kartu,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#08244A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
});
