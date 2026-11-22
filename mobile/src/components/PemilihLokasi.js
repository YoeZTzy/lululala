import { useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import { SvgXml } from 'react-native-svg';
import { ArrowLeft, Navigation } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ruteAsal, ruteTujuan } from '../assets/svg';
import { colors, radius, t } from '../theme';
import { BANDUNG } from '../utils/geo';
import { namaTempat, posisiSaya } from '../utils/lokasi';
import Tombol from './Tombol';
import TombolBulat from './TombolBulat';

// Pemilih lokasi layar penuh: geser peta, titik di tengah = lokasi terpilih.
// Tidak ada di Figma; disusun dari komponen yang ada (TombolBulat, Tombol, petunjuk peta Lapor).
export default function PemilihLokasi({ visible, jenis = 'asal', awal, onPilih, onTutup }) {
  const insets = useSafeAreaInsets();
  const refPeta = useRef(null);
  const [pusat, setPusat] = useState(null);
  const [memuat, setMemuat] = useState(false);
  const [pesan, setPesan] = useState('');
  const region = awal ? { latitude: awal.lat, longitude: awal.lon, latitudeDelta: 0.01, longitudeDelta: 0.01 } : BANDUNG;

  async function keLokasiSaya() {
    setPesan('');
    try {
      const p = await posisiSaya();
      refPeta.current?.animateToRegion({ latitude: p.lat, longitude: p.lon, latitudeDelta: 0.008, longitudeDelta: 0.008 });
    } catch (err) {
      setPesan(err.message);
    }
  }

  async function pakai() {
    const titik = pusat || { lat: region.latitude, lon: region.longitude };
    setMemuat(true);
    const label = await namaTempat(titik);
    setMemuat(false);
    onPilih({ ...titik, label: label || `${titik.lat.toFixed(4)}, ${titik.lon.toFixed(4)}` });
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onTutup} statusBarTranslucent>
      <View style={styles.layar}>
        <MapView
          ref={refPeta}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          onRegionChangeComplete={(r) => setPusat({ lat: r.latitude, lon: r.longitude })}
          showsUserLocation
          showsMyLocationButton={false}
          toolbarEnabled={false}
        />
        <View style={styles.tengah} pointerEvents="none">
          <SvgXml xml={jenis === 'asal' ? ruteAsal : ruteTujuan} width={24} height={24} />
        </View>
        <View style={[styles.atas, { top: insets.top + 12 }]}>
          <TombolBulat Ikon={ArrowLeft} onPress={onTutup} label="Tutup pemilih lokasi" />
          <View style={styles.petunjuk}>
            <Text style={t('semibold', 11, colors.teks.sekunder)}>
              Geser peta untuk memilih {jenis === 'asal' ? 'asal' : 'tujuan'}
            </Text>
          </View>
        </View>
        <View style={[styles.bawah, { paddingBottom: 20 + insets.bottom }]}>
          <TombolBulat Ikon={Navigation} onPress={keLokasiSaya} label="Pakai lokasi saya" warnaIkon={colors.brand.biru} style={styles.lokasiSaya} />
          {pesan ? <Text style={[t('semibold', 12, colors.risiko.hindariTeks), styles.pesan]}>{pesan}</Text> : null}
          <Tombol label={jenis === 'asal' ? 'Pakai sebagai asal' : 'Pakai sebagai tujuan'} onPress={pakai} memuat={memuat} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  layar: { flex: 1, backgroundColor: colors.permukaan.latar },
  tengah: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  atas: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  petunjuk: {
    backgroundColor: colors.permukaan.kartu,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.badgeStatus,
  },
  bawah: { position: 'absolute', left: 16, right: 16, bottom: 0, gap: 12 },
  lokasiSaya: { alignSelf: 'flex-end' },
  pesan: {
    backgroundColor: colors.permukaan.kartu,
    padding: 10,
    borderRadius: radius.input,
  },
});
