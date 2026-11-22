import { View } from 'react-native';
import { HeaderRingkas, KeadaanKosong } from '../components';
import { colors } from '../theme';

// Penampung sementara selama fase pembangunan; dihapus saat layar asli selesai.
export default function LayarSementara({ judul, navigation }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.permukaan.latar }}>
      <HeaderRingkas judul={judul} sub="Sedang dibangun" onKembali={navigation?.canGoBack() ? navigation.goBack : undefined} />
      <KeadaanKosong judul="Segera hadir" pesan="Layar ini sedang dibangun." />
    </View>
  );
}
