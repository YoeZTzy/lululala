import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, t } from '../theme';

const JENIS = {
  Aktif: { bg: colors.risiko.hindari, isi: colors.risiko.hindari, nilai: colors.teks.utama, opasitas: 1 },
  Mereda: { bg: colors.risiko.waspada, isi: colors.risiko.waspada, nilai: colors.teks.utama, opasitas: 0.5 },
  Cuaca: { bg: colors.brand.biru, isi: colors.brand.biru, nilai: colors.brand.biru, opasitas: 1 },
};

// Item Titik Rawan (Aktif/Mereda/Cuaca). `fraksi` 0..1 mengisi bar 48; `nilai` = teks kanan.
export default function ItemTitikRawan({ jenis = 'Aktif', ikon, judul, keterangan, nilai, fraksi = 0, onPress, terakhir }) {
  const j = JENIS[jenis] || JENIS.Aktif;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.baris, !terakhir && styles.garisBawah]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={[styles.penanda, { backgroundColor: j.bg, opacity: j.opasitas }]}>{ikon}</View>
      <View style={styles.teks}>
        <Text style={t('bold', 14, colors.teks.utama)} numberOfLines={1}>
          {judul}
        </Text>
        <Text style={t('medium', 12, colors.teks.sekunder)} numberOfLines={1}>
          {keterangan}
        </Text>
      </View>
      {nilai != null ? (
        <View style={styles.keyakinan}>
          <Text style={t('extrabold', 13, j.nilai)}>{nilai}</Text>
          <View style={styles.bar}>
            <View style={[styles.isi, { width: 48 * Math.max(0, Math.min(1, fraksi)), backgroundColor: j.isi }]} />
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  baris: { height: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  garisBawah: { borderBottomWidth: 1, borderBottomColor: colors.garis.halus },
  penanda: {
    width: 32,
    height: 32,
    borderRadius: radius.ikonBulat,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teks: { flex: 1, gap: 2 },
  keyakinan: { alignItems: 'flex-end', gap: 5 },
  bar: { width: 48, height: 4, borderRadius: radius.bar, backgroundColor: colors.garis.halus, overflow: 'hidden' },
  isi: { height: 4, borderRadius: radius.bar },
});
