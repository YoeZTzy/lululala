import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import { MapPin, Navigation } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderRingkas, Tombol } from '../components';
import BilahStatus from '../components/BilahStatus';
import { colors, radius, t } from '../theme';
import { BANDUNG, JARAK_MIN_ASAL_TUJUAN_M, jarakMeter } from '../utils/geo';
import { namaTempat, posisiSaya } from '../utils/lokasi';

const TINGGI_HEADER_ISI = 92; // sama dengan HeaderRingkas
const UKURAN_PIN = 44;
const UJUNG_PIN = UKURAN_PIN * (22 / 24); // ujung lancip MapPin lucide di y≈22/24
const KARTU_PERKIRAAN = 230; // sebelum kartu terukur

// Pemilih titik asal/tujuan untuk Tambah Rute (tidak ada di Figma; disusun dari Header/Ringkas, Tombol, kartu).
// Peta memenuhi layar; mapPadding = tinggi header (atas) dan kartu (bawah), sehingga pusat kamera
// (dan pusat region di onRegionChangeComplete) = pusat area peta yang terlihat = ujung pin.
// Param: jenis 'asal' | 'tujuan', awal {lat, lon}, pembanding {lat, lon} (titik lain, cek 50 m).
export default function PilihLokasiScreen({ navigation, route }) {
  const { jenis = 'asal', awal, pembanding } = route.params || {};
  const insets = useSafeAreaInsets();
  const refPeta = useRef(null);
  const [regionAwal] = useState(() =>
    awal ? { latitude: awal.lat, longitude: awal.lon, latitudeDelta: 0.01, longitudeDelta: 0.01 } : BANDUNG
  );
  const [pusat, setPusat] = useState({ lat: regionAwal.latitude, lon: regionAwal.longitude });
  const [alamat, setAlamat] = useState(null);
  const [mencari, setMencari] = useState(true);
  const [digeser, setDigeser] = useState(false); // pesan "terlalu dekat" baru tampil setelah pengguna bertindak
  const [mencariGps, setMencariGps] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [pesanGps, setPesanGps] = useState('');
  const [tinggiLayar, setTinggiLayar] = useState(0);
  const [tinggiKartu, setTinggiKartu] = useState(0);

  const tinggiHeader = insets.top + TINGGI_HEADER_ISI;
  const bawah = tinggiKartu || KARTU_PERKIRAAN;
  const ujungPinY = tinggiHeader + (tinggiLayar - tinggiHeader - bawah) / 2;
  const namaLain = jenis === 'asal' ? 'tujuan' : 'asal';
  const terlaluDekat = !!pembanding && jarakMeter(pusat, pembanding) < JARAK_MIN_ASAL_TUJUAN_M;

  // Alamat titik pin: tunggu peta diam 400 ms, abaikan hasil yang sudah usang.
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
    if (!c) return;
    setDigeser(true);
    refPeta.current?.animateCamera({ center: c }, { duration: 300 });
  }

  async function keLokasiSaya() {
    setPesanGps('');
    setMencariGps(true);
    try {
      const p = await posisiSaya();
      setDigeser(true);
      refPeta.current?.animateCamera({ center: { latitude: p.lat, longitude: p.lon }, zoom: 17 }, { duration: 400 });
    } catch (err) {
      setPesanGps(err.message);
    } finally {
      setMencariGps(false);
    }
  }

  async function pakai() {
    if (terlaluDekat) {
      setDigeser(true);
      return;
    }
    let label = alamat;
    if (mencari) {
      setMemuat(true);
      label = await namaTempat(pusat);
      setMemuat(false);
    }
    const titik = { ...pusat, label: label || `${pusat.lat.toFixed(5)}, ${pusat.lon.toFixed(5)}` };
    // merge: param lain Tambah Rute tetap; isian form (state layar) tidak tersentuh karena layarnya tetap terpasang.
    navigation.popTo('TambahRute', { pilihan: { jenis, titik, t: Date.now() } }, { merge: true });
  }

  const pesanGalat =
    terlaluDekat && digeser
      ? `Terlalu dekat dengan titik ${namaLain} (kurang dari ${JARAK_MIN_ASAL_TUJUAN_M} m). Geser ke titik lain.`
      : pesanGps;

  return (
    <View style={styles.layar} onLayout={(e) => setTinggiLayar(e.nativeEvent.layout.height)}>
      <BilahStatus gaya="light" />
      <MapView
        ref={refPeta}
        style={StyleSheet.absoluteFill}
        initialRegion={regionAwal}
        mapPadding={{ top: tinggiHeader, right: 0, bottom: bawah, left: 0 }}
        onRegionChange={() => setMencari(true)}
        onRegionChangeComplete={saatPetaDiam}
        onPanDrag={() => setDigeser(true)}
        onPress={saatPetaDiketuk}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      />

      {tinggiLayar > 0 ? (
        <View style={[styles.pin, { top: ujungPinY - UJUNG_PIN }]} pointerEvents="none">
          <MapPin size={UKURAN_PIN} color={colors.teks.terbalik} fill={colors.brand.biru} strokeWidth={1.5} />
          <View style={[styles.bayanganPin, { top: UJUNG_PIN - 2 }]} />
        </View>
      ) : null}

      <View style={styles.header} pointerEvents="box-none">
        <HeaderRingkas
          judul={jenis === 'asal' ? 'Pilih asal' : 'Pilih tujuan'}
          sub="Geser peta atau ketuk untuk memindahkan pin"
          onKembali={navigation.goBack}
        />
      </View>

      <View
        style={[styles.kartu, { paddingBottom: 16 + insets.bottom }]}
        onLayout={(e) => setTinggiKartu(e.nativeEvent.layout.height)}
      >
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
        <Tombol label="Gunakan titik ini" onPress={pakai} memuat={memuat} />
        <Tombol gaya="Sekunder" label="Lokasi saya" Ikon={Navigation} onPress={keLokasiSaya} memuat={mencariGps} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layar: { flex: 1, backgroundColor: colors.permukaan.latar },
  header: { position: 'absolute', top: 0, left: 0, right: 0 },
  pin: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bayanganPin: {
    position: 'absolute',
    width: 8,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(20,33,61,0.35)',
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
