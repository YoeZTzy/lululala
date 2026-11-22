import { StyleSheet, Text, View } from 'react-native';
import { colors, t } from '../theme';

// Avatar Warga versi anonim: hanya gelembung jumlah (gaya bubble "lainnya" di Figma).
// Identitas pelapor sengaja tidak ditampilkan (keputusan privasi).
export default function AvatarWarga({ jumlah }) {
  if (!jumlah) return null;
  return (
    <View style={styles.bubble} accessibilityLabel={`${jumlah} warga`}>
      <Text style={t('extrabold', 10, colors.teks.terbalik)}>{jumlah > 99 ? '99+' : jumlah}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.permukaan.kartu,
    backgroundColor: colors.brand.biru,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
