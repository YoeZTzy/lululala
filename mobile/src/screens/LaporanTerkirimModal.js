import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Map } from 'lucide-react-native';
import { JENIS, Tombol } from '../components';
import { colors, t } from '../theme';

// Modal "Laporan terkirim" (Figma 10). Latar redup = teks.utama 40%.
export default function LaporanTerkirimModal({ navigation, route }) {
  const { jenis, lat, lon, hazardId } = route.params || {};
  const nama = (JENIS[jenis] || JENIS.genangan).label;
  const subjek = nama.includes(' ') ? `Laporan ${nama.toLowerCase()}mu` : `${nama}mu`;
  const pesan = hazardId
    ? `${subjek} sudah tampil di peta. Skornya naik setiap ada warga yang mengonfirmasi.`
    : 'Laporanmu tercatat. Titik rawan muncul di peta setelah warga lain ikut mengonfirmasi.';

  function lihatDiPeta() {
    navigation.navigate('Main', {
      screen: 'PetaTab',
      params: { screen: 'Peta', params: { fokus: { lat, lon, hazardId, t: Date.now() } } },
    });
  }

  return (
    <View style={styles.latar}>
      <Pressable style={StyleSheet.absoluteFill} onPress={navigation.goBack} accessibilityLabel="Tutup" />
      <View style={styles.kartu} accessibilityViewIsModal>
        <View style={styles.tanda}>
          <Check size={30} color={colors.teks.terbalik} strokeWidth={2} />
        </View>
        <Text style={t('extrabold', 20, colors.teks.utama)}>Laporan terkirim</Text>
        <Text style={[t('medium', 13, colors.teks.sekunder), styles.pesan]}>{pesan}</Text>
        <View style={{ height: 2 }} />
        <Tombol label="Lihat di peta" Ikon={Map} onPress={lihatDiPeta} style={styles.tombol} />
        <Tombol gaya="Lembut" label="Selesai" onPress={navigation.goBack} style={styles.tombol} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  latar: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,33,61,0.4)', padding: 24 },
  kartu: {
    width: '100%',
    maxWidth: 312,
    backgroundColor: colors.permukaan.kartu,
    borderRadius: 28,
    paddingTop: 28,
    paddingHorizontal: 22,
    paddingBottom: 22,
    alignItems: 'center',
    gap: 14,
  },
  tanda: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.risiko.aman,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pesan: { textAlign: 'center', lineHeight: 19.5 },
  tombol: { alignSelf: 'stretch' },
});
