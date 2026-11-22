import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Keyboard, StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import { setStatusBarStyle } from 'expo-status-bar';
import { ArrowLeft, MapPin, Navigation } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, t } from '../theme';
import { BANDUNG, JARAK_MIN_ASAL_TUJUAN_M, jarakMeter } from '../utils/geo';
import { namaTempat, posisiSaya } from '../utils/lokasi';
import Tombol from './Tombol';
import TombolBulat from './TombolBulat';

const UKURAN_PIN = 44;
// Ujung lancip ikon MapPin lucide ada di y≈22/24; geser ke atas agar ujungnya tepat di tengah peta.
const GESER_PIN = UKURAN_PIN * (22 / 24 - 0.5);

// Pemilih lokasi layar penuh: pin tetap di tengah; geser peta atau ketuk untuk memindahkan titik.
// Overlay biasa (bukan <Modal>) di atas layar induk, supaya peta menerima gesture seperti layar Peta.
// Tidak ada di Figma; disusun dari komponen yang ada (TombolBulat, Tombol, kartu).
export default function PemilihLokasi({ visible, ...props }) {
  return visible ? <IsiPemilih {...props} /> : null;
}

function IsiPemilih({ jenis = 'asal', awal, pembanding, onPilih, onTutup }) {
  const insets = useSafeAreaInsets();
  const refPeta = useRef(null);
  const refTutup = useRef(onTutup);
  refTutup.current = onTutup;
  const [regionAwal] = useState(() =>
    awal ? { latitude: awal.lat, longitude: awal.lon, latitudeDelta: 0.01, longitudeDelta: 0.01 } : BANDUNG
  );
  const [pusat, setPusat] = useState({ lat: regionAwal.latitude, lon: regionAwal.longitude });
  const [alamat, setAlamat] = useState(null);
  const [mencari, setMencari] = useState(true);
  const [mencariGps, setMencariGps] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [pesanGps, setPesanGps] = useState('');

  const namaJenis = jenis === 'asal' ? 'asal' : 'tujuan';
  const namaLain = jenis === 'asal' ? 'tujuan' : 'asal';
  const terlaluDekat = !!pembanding && jarakMeter(pusat, pembanding) < JARAK_MIN_ASAL_TUJUAN_M;

  useEffect(() => {
    Keyboard.dismiss();
    setStatusBarStyle('dark');
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      refTutup.current?.();
      return true;
    });
    return () => {
      sub.remove();
      setStatusBarStyle('light'); // layar induk (Tambah Rute) ber-header biru
    };
  }, []);

  // Alamat titik tengah: tunggu peta diam 400 ms, abaikan hasil permintaan yang sudah usang.
  useEffect(() => {
    let batal = false;
    setMencari(true);
    const id = setTimeout(async () => {
      const label = await namaTempat(pusat);
      if (!batal) {
        setAlamat(label);
        setMencari(false);
      }
    }, 400);
    return () => {
      batal = true;
      clearTimeout(id);
    };
  }, [pusat]);

  function saatPetaDiam(r) {
    const baru = { lat: r.latitude, lon: r.longitude };
    setPusat((lama) => (jarakMeter(lama, baru) < 1 ? lama : baru));
  }

  function saatPetaDiketuk(e) {
    const c = e.nativeEvent?.coordinate;
    if (c) refPeta.current?.animateCamera({ center: c }, { duration: 300 });
  }

  async function keLokasiSaya() {
    setPesanGps('');
    setMencariGps(true);
    try {
      const p = await posisiSaya();
      refPeta.current?.animateToRegion(
        { latitude: p.lat, longitude: p.lon, latitudeDelta: 0.005, longitudeDelta: 0.005 },
        400
      );
    } catch (err) {
      setPesanGps(err.message);
    } finally {
      setMencariGps(false);
    }
  }

  async function pakai() {
    if (terlaluDekat) return;
    let label = alamat;
    if (mencari) {
      setMemuat(true);
      label = await namaTempat(pusat);
      setMemuat(false);
    }
    onPilih({ ...pusat, label: label || `${pusat.lat.toFixed(5)}, ${pusat.lon.toFixed(5)}` });
  }

  const pesanGalat = terlaluDekat
    ? `Terlalu dekat dengan titik ${namaLain} (kurang dari ${JARAK_MIN_ASAL_TUJUAN_M} m). Geser ke titik lain.`
    : pesanGps;

  return (
    <View style={styles.layar}>
      <MapView
        ref={refPeta}
        style={StyleSheet.absoluteFill}
        initialRegion={regionAwal}
        onRegionChange={() => setMencari(true)}
        onRegionChangeComplete={saatPetaDiam}
        onPress={saatPetaDiketuk}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      />

      <View style={styles.tengah} pointerEvents="none">
        <View style={styles.bayanganPin} />
        <View style={styles.pin}>
          <MapPin size={UKURAN_PIN} color={colors.teks.terbalik} fill={colors.brand.biru} strokeWidth={1.5} />
        </View>
      </View>

      <View style={[styles.atas, { top: insets.top + 12 }]} pointerEvents="box-none">
        <TombolBulat Ikon={ArrowLeft} onPress={onTutup} label="Tutup pemilih lokasi" />
        <View style={styles.petunjuk}>
          <Text style={t('semibold', 11, colors.teks.sekunder)}>Geser peta atau ketuk untuk memilih {namaJenis}</Text>
        </View>
      </View>

      <View style={[styles.kartu, { paddingBottom: 16 + insets.bottom }]}>
        <View style={styles.alamat}>
          <MapPin size={20} color={colors.brand.biru} strokeWidth={2} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={t('semibold', 11, colors.teks.samar)}>{jenis === 'asal' ? 'Asal' : 'Tujuan'}</Text>
            {mencari ? (
              <View style={styles.mencari} accessibilityLiveRegion="polite">
                <ActivityIndicator size="small" color={colors.brand.biru} />
                <Text style={t('semibold', 14, colors.teks.samar)}>Mencari alamat…</Text>
              </View>
            ) : (
              <Text style={t('bold', 14, colors.teks.utama)} numberOfLines={2} accessibilityLiveRegion="polite">
                {alamat || `${pusat.lat.toFixed(5)}, ${pusat.lon.toFixed(5)}`}
              </Text>
            )}
          </View>
        </View>
        {pesanGalat ? <Text style={[t('semibold', 12, colors.risiko.hindariTeks), styles.pesan]}>{pesanGalat}</Text> : null}
        <Tombol label="Gunakan titik ini" onPress={pakai} memuat={memuat} disabled={terlaluDekat} />
        <Tombol gaya="Sekunder" label="Lokasi saya" Ikon={Navigation} onPress={keLokasiSaya} memuat={mencariGps} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // elevation tinggi: di Android urutan tumpukan mengikuti elevation, jadi overlay harus di atas tombol layar induk.
  layar: { ...StyleSheet.absoluteFillObject, zIndex: 20, elevation: 20, backgroundColor: colors.permukaan.latar },
  tengah: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  pin: { position: 'absolute', transform: [{ translateY: -GESER_PIN }] },
  bayanganPin: { width: 8, height: 4, borderRadius: 4, backgroundColor: 'rgba(20,33,61,0.35)' },
  atas: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  petunjuk: {
    flexShrink: 1,
    backgroundColor: colors.permukaan.kartu,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.badgeStatus,
  },
  kartu: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 12,
    paddingTop: 18,
    paddingHorizontal: 16,
    backgroundColor: colors.permukaan.kartu,
    borderTopLeftRadius: radius.kartu,
    borderTopRightRadius: radius.kartu,
  },
  alamat: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mencari: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pesan: { backgroundColor: colors.risiko.hindariBg, padding: 10, borderRadius: radius.input },
});
