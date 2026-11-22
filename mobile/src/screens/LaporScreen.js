import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { Info, MapPin, Megaphone } from 'lucide-react-native';
import { Chip, DAFTAR_JENIS, HeaderRingkas, Input, JENIS, Penanda, Tombol } from '../components';
import BilahStatus from '../components/BilahStatus';
import PesanGalat from '../components/PesanGalat';
import { useAuth } from '../context/AuthContext';
import ApiService from '../services/ApiService';
import { colors, radius, t } from '../theme';
import { BANDUNG } from '../utils/geo';
import { namaTempat, posisiSaya } from '../utils/lokasi';

// Pemetaan segmen keparahan -> severity backend (1-5).
const KEPARAHAN = [
  { label: 'Ringan', severity: 2 },
  { label: 'Sedang', severity: 3 },
  { label: 'Berat', severity: 5 },
];
const KETERANGAN_MAKS = 300; // ReportCreateReq.description max_length

export default function LaporScreen({ navigation }) {
  const { token } = useAuth();
  const refPeta = useRef(null);
  const refJeda = useRef(null);

  const [jenis, setJenis] = useState('genangan');
  const [keparahan, setKeparahan] = useState(1);
  const [titik, setTitik] = useState({ lat: BANDUNG.latitude, lon: BANDUNG.longitude });
  const [akurasi, setAkurasi] = useState(null);
  const [tempat, setTempat] = useState(null);
  const [keterangan, setKeterangan] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState('');
  const [infoLokasi, setInfoLokasi] = useState('');

  useEffect(() => {
    posisiSaya()
      .then((p) => {
        setAkurasi(p.akurasi);
        refPeta.current?.animateToRegion({ latitude: p.lat, longitude: p.lon, latitudeDelta: 0.004, longitudeDelta: 0.004 }, 400);
      })
      .catch((err) => setInfoLokasi(`${err.message} Geser peta ke lokasi kejadian.`));
    return () => clearTimeout(refJeda.current);
  }, []);

  function petaBerubah(r) {
    const p = { lat: r.latitude, lon: r.longitude };
    setTitik(p);
    clearTimeout(refJeda.current);
    refJeda.current = setTimeout(() => namaTempat(p).then(setTempat), 500);
  }

  async function kirim() {
    setGalat('');
    setMengirim(true);
    try {
      const res = await ApiService.createReport(token, {
        incident_type: jenis,
        severity: KEPARAHAN[keparahan].severity,
        lat: titik.lat,
        lon: titik.lon,
        description: keterangan.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setKeterangan('');
      navigation.navigate('LaporanTerkirim', { jenis, lat: titik.lat, lon: titik.lon, hazardId: res.hazard_id });
    } catch (err) {
      setGalat(
        err.status === 429
          ? 'Kamu sudah mengirim 5 laporan dalam satu jam terakhir. Coba lagi sebentar lagi, ya.'
          : err.message
      );
    } finally {
      setMengirim(false);
    }
  }

  const alamat = [tempat, akurasi != null ? `akurasi ${Math.round(akurasi)} m` : null].filter(Boolean).join(' · ');

  return (
    <View style={styles.layar}>
      <BilahStatus gaya="light" />
      <HeaderRingkas judul="Lapor kondisi jalan" sub="Laporanmu membantu komuter lain" />
      <KeyboardAvoidingView style={styles.layar} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <View style={styles.bagian}>
            <Text style={t('semibold', 12, colors.teks.sekunder)}>Apa yang terjadi?</Text>
            <View style={styles.pilihanJenis}>
              {DAFTAR_JENIS.map((k) => (
                <Chip key={k} label={JENIS[k].label} Ikon={JENIS[k].Ikon} terpilih={jenis === k} onPress={() => setJenis(k)} />
              ))}
            </View>
          </View>

          <View style={styles.bagian}>
            <Text style={t('semibold', 12, colors.teks.sekunder)}>Seberapa parah?</Text>
            <View style={styles.segmen} accessibilityRole="radiogroup">
              {KEPARAHAN.map((k, i) => {
                const pilih = keparahan === i;
                return (
                  <Pressable
                    key={k.label}
                    onPress={() => setKeparahan(i)}
                    style={[styles.opsi, pilih && styles.opsiPilih]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: pilih }}
                  >
                    <Text style={pilih ? t('extrabold', 13, colors.brand.biruTua) : t('semibold', 13, colors.teks.sekunder)}>
                      {k.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.bagian}>
            <Text style={t('semibold', 12, colors.teks.sekunder)}>Lokasi</Text>
            <View style={styles.peta}>
              <MapView
                ref={refPeta}
                style={StyleSheet.absoluteFill}
                initialRegion={BANDUNG}
                onRegionChangeComplete={petaBerubah}
                toolbarEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
              />
              <View style={styles.tengah} pointerEvents="none">
                <Penanda status="Baru" jenis={jenis} ukuran={54} />
              </View>
              <View style={styles.petunjuk} pointerEvents="none">
                <Text style={t('semibold', 11, colors.teks.sekunder)}>Geser peta untuk menyesuaikan</Text>
              </View>
            </View>
            {alamat ? (
              <View style={styles.alamat}>
                <MapPin size={13} color={colors.brand.biru} strokeWidth={2} />
                <Text style={[t('medium', 12, colors.teks.sekunder), { flexShrink: 1 }]} numberOfLines={1}>
                  {alamat}
                </Text>
              </View>
            ) : null}
            {infoLokasi ? <Text style={t('medium', 12, colors.teks.sekunder)}>{infoLokasi}</Text> : null}
          </View>

          <Input
            label="Keterangan (opsional)"
            Ikon={Info}
            placeholder="Contoh: air setinggi mata kaki"
            value={keterangan}
            onChangeText={setKeterangan}
            maxLength={KETERANGAN_MAKS}
            returnKeyType="done"
          />
          <PesanGalat>{galat}</PesanGalat>
          <Tombol label="Kirim laporan" Ikon={Megaphone} onPress={kirim} memuat={mengirim} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  layar: { flex: 1, backgroundColor: colors.permukaan.latar },
  form: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 16, gap: 18 },
  bagian: { gap: 8 },
  pilihanJenis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segmen: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: radius.tombol,
    backgroundColor: colors.permukaan.isian,
  },
  opsi: { flex: 1, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  // shadow 0 2 6 rgba(8,36,74,0.1)
  opsiPilih: {
    backgroundColor: colors.permukaan.kartu,
    shadowColor: '#08244A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  peta: { height: 120, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.permukaan.latar },
  tengah: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  petunjuk: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.badgeStatus,
    backgroundColor: colors.permukaan.kartu,
  },
  alamat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
