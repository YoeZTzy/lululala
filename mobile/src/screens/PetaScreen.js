import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Navigation, Search } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, DAFTAR_JENIS, JENIS, KeadaanError, KeadaanKosong, Penanda, PenandaLokasiSaya, Skeleton } from '../components';
import BilahStatus from '../components/BilahStatus';
import KartuRingkasTitik from '../components/KartuRingkasTitik';
import TombolBulat from '../components/TombolBulat';
import ApiService from '../services/ApiService';
import { colors, radius, t } from '../theme';
import { BANDUNG, bboxDariRegion, jarakMeter } from '../utils/geo';
import { posisiSaya } from '../utils/lokasi';
import { opasitasPenanda, statusPenanda, ukuranPenanda } from '../utils/penanda';

const JEDA_MUAT_MS = 400;

export default function PetaScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const refPeta = useRef(null);
  const refJeda = useRef(null);
  const refRegion = useRef(BANDUNG);

  const [titik, setTitik] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(null);
  const [filter, setFilter] = useState(null); // null = Semua
  const [terpilihId, setTerpilihId] = useState(null);
  const [saya, setSaya] = useState(null);
  const [pesanLokasi, setPesanLokasi] = useState('');

  const muat = useCallback(async (region) => {
    setGalat(null);
    try {
      const res = await ApiService.getHazards(bboxDariRegion(region));
      setTitik(res.data?.hazards || []);
    } catch (err) {
      setGalat(err);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    muat(BANDUNG);
    posisiSaya()
      .then(setSaya)
      .catch(() => {});
    return () => clearTimeout(refJeda.current);
  }, [muat]);

  // Dari modal "Laporan terkirim": fokus ke lokasi laporan.
  const fokus = route.params?.fokus;
  useEffect(() => {
    if (!fokus) return;
    const r = { latitude: fokus.lat, longitude: fokus.lon, latitudeDelta: 0.02, longitudeDelta: 0.02 };
    refPeta.current?.animateToRegion(r, 500);
    if (fokus.hazardId) setTerpilihId(fokus.hazardId);
    muat(r);
  }, [fokus, muat]);

  function regionBerubah(r) {
    refRegion.current = r;
    clearTimeout(refJeda.current);
    refJeda.current = setTimeout(() => muat(r), JEDA_MUAT_MS);
  }

  async function keLokasiSaya() {
    setPesanLokasi('');
    try {
      const p = await posisiSaya();
      setSaya(p);
      refPeta.current?.animateToRegion({ latitude: p.lat, longitude: p.lon, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 500);
    } catch (err) {
      setPesanLokasi(err.message);
    }
  }

  const tampil = titik.filter((h) => !filter || h.incident_type === filter);
  const terpilih = tampil.find((h) => h.id === terpilihId) || tampil[0];

  return (
    <View style={styles.layar}>
      <BilahStatus gaya="dark" />
      <MapView
        ref={refPeta}
        style={StyleSheet.absoluteFill}
        initialRegion={BANDUNG}
        onRegionChangeComplete={regionBerubah}
        toolbarEnabled={false}
        showsMyLocationButton={false}
        mapPadding={{ top: insets.top + 150, bottom: 200, left: 0, right: 0 }}
      >
        {tampil.map((h) => (
          <Marker
            key={h.id}
            coordinate={{ latitude: h.lat, longitude: h.lon }}
            anchor={{ x: 0.5, y: 0.5 }}
            onPress={() => setTerpilihId(h.id)}
            accessibilityLabel={`${(JENIS[h.incident_type] || JENIS.genangan).label}, ${h.status}`}
          >
            <Penanda status={statusPenanda(h)} jenis={h.incident_type} ukuran={ukuranPenanda(h)} opasitas={opasitasPenanda(h)} />
          </Marker>
        ))}
        {saya ? (
          <Marker coordinate={{ latitude: saya.lat, longitude: saya.lon }} anchor={{ x: 0.5, y: 0.5 }} accessibilityLabel="Lokasimu">
            <PenandaLokasiSaya />
          </Marker>
        ) : null}
      </MapView>

      <View style={[styles.atas, { paddingTop: insets.top + 12 }]} pointerEvents="box-none">
        <View style={styles.cari} accessibilityRole="search" accessibilityHint="Pencarian segera hadir">
          <Search size={18} color={colors.teks.samar} strokeWidth={2} />
          <Text style={t('medium', 14, colors.teks.samar)}>Cari jalan atau tempat</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filter}>
          <Chip label="Semua" terpilih={!filter} onPress={() => setFilter(null)} />
          {DAFTAR_JENIS.map((k) => (
            <Chip key={k} label={JENIS[k].label} Ikon={JENIS[k].Ikon} terpilih={filter === k} onPress={() => setFilter(k)} />
          ))}
        </ScrollView>
        <View style={styles.legenda}>
          <View style={styles.titikLegenda} />
          <View style={styles.titikLegenda} />
          <View style={styles.titikLegenda} />
          <Text style={t('semibold', 11, colors.teks.sekunder)}>Makin pudar, makin lama dilaporkan</Text>
        </View>
      </View>

      <View style={styles.bawah} pointerEvents="box-none">
        <View style={styles.barisAksi} pointerEvents="box-none">
          {pesanLokasi ? <Text style={[t('semibold', 12, colors.risiko.hindariTeks), styles.pesan]}>{pesanLokasi}</Text> : null}
          <TombolBulat Ikon={Navigation} onPress={keLokasiSaya} label="Ke lokasiku" warnaIkon={colors.brand.biru} />
        </View>
        {memuat ? (
          <View style={[styles.kartuKosong, { gap: 10 }]}>
            <Skeleton tinggi={42} lebar={42} bulat={21} />
            <Skeleton tinggi={14} />
            <Skeleton tinggi={14} lebar="60%" />
          </View>
        ) : galat && !titik.length ? (
          <View style={styles.kartuKosong}>
            <KeadaanError pesan={galat.message} onCobaLagi={() => muat(refRegion.current)} />
          </View>
        ) : terpilih ? (
          <KartuRingkasTitik
            titik={terpilih}
            jarak={saya ? jarakMeter(saya, terpilih) : null}
            onPress={() => navigation.navigate('DetailTitikRawan', { id: terpilih.id })}
          />
        ) : (
          <View style={styles.kartuKosong}>
            <KeadaanKosong
              judul="Tidak ada titik rawan di sini"
              pesan="Geser peta untuk melihat area lain, atau laporkan kejadian di jalanmu."
              labelAksi="Lapor kondisi jalan"
              onAksi={() => navigation.navigate('LaporTab')}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layar: { flex: 1, backgroundColor: colors.permukaan.latar },
  atas: { position: 'absolute', left: 0, right: 0, top: 0, gap: 12 },
  cari: {
    marginHorizontal: 16,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.permukaan.kartu,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    shadowColor: '#08244A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  filter: { paddingHorizontal: 16, gap: 8 },
  legenda: {
    marginLeft: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: radius.input,
    backgroundColor: colors.permukaan.kartu,
  },
  titikLegenda: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.risiko.hindari },
  bawah: { position: 'absolute', left: 12, right: 12, bottom: 12, gap: 12 },
  barisAksi: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingRight: 4 },
  pesan: { flex: 1, backgroundColor: colors.permukaan.kartu, padding: 10, borderRadius: radius.input },
  kartuKosong: {
    backgroundColor: colors.permukaan.kartu,
    borderRadius: radius.tabBar,
    padding: 16,
    shadowColor: '#08244A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
});
