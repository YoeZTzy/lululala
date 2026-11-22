import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { SvgXml } from 'react-native-svg';
import { Bell, MapPin, Navigation, Route } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ruteAsal, ruteTujuan } from '../assets/svg';
import { HeaderRingkas, Input, Sakelar, Tombol } from '../components';
import BilahStatus from '../components/BilahStatus';
import PemilihLokasi from '../components/PemilihLokasi';
import PesanGalat from '../components/PesanGalat';
import { useAuth } from '../context/AuthContext';
import ApiService from '../services/ApiService';
import { colors, fonts, radius, t } from '../theme';
import { JARAK_MIN_ASAL_TUJUAN_M, jarakMeter } from '../utils/geo';
import { HARI, parseJam } from '../utils/jadwal';
import { namaTempat, posisiSaya } from '../utils/lokasi';
import { setPengingatRute } from '../utils/pengingat';
import { cekNama } from '../utils/validasi';

const PESAN_TERLALU_DEKAT = `Asal dan tujuan terlalu dekat (kurang dari ${JARAK_MIN_ASAL_TUJUAN_M} m). Pilih titik yang berbeda.`;

// Field backend -> kunci galat di form ini (untuk 422).
const FIELD_FORM = {
  name: 'nama',
  days: 'hari',
  departure_time: 'jam',
  origin_lat: 'rute',
  origin_lon: 'rute',
  origin_label: 'rute',
  dest_lat: 'rute',
  dest_lon: 'rute',
  dest_label: 'rute',
};

export default function TambahRuteScreen({ navigation }) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const refMenit = useRef(null);

  const [nama, setNama] = useState('');
  const [asal, setAsal] = useState(null);
  const [tujuan, setTujuan] = useState(null);
  const [hari, setHari] = useState(['sen', 'sel', 'rab', 'kam', 'jum']);
  const [jam, setJam] = useState('06');
  const [menit, setMenit] = useState('45');
  const [fokusJam, setFokusJam] = useState(null);
  const [pengingat, setPengingat] = useState(true);
  const [pemilih, setPemilih] = useState(null); // 'asal' | 'tujuan' | null
  const [mencariGps, setMencariGps] = useState(false);
  const [galat, setGalat] = useState({});
  const [menyimpan, setMenyimpan] = useState(false);

  function ubahHari(kode) {
    setHari((h) => (h.includes(kode) ? h.filter((x) => x !== kode) : [...h, kode]));
  }

  async function asalDariGps() {
    setMencariGps(true);
    setGalat((g) => ({ ...g, rute: null }));
    try {
      const p = await posisiSaya();
      const label = await namaTempat(p);
      setAsal({ lat: p.lat, lon: p.lon, label: label ? `Lokasi saya · ${label}` : 'Lokasi saya' });
    } catch (err) {
      setGalat((g) => ({ ...g, rute: err.message }));
    } finally {
      setMencariGps(false);
    }
  }

  async function simpan() {
    const jamBerangkat = `${jam.padStart(2, '0')}:${menit.padStart(2, '0')}`;
    const g = {
      nama: nama.trim() ? cekNama(nama) : 'Nama rute wajib diisi',
      rute: !asal || !tujuan
        ? 'Pilih asal dan tujuan'
        : jarakMeter(asal, tujuan) < JARAK_MIN_ASAL_TUJUAN_M
          ? PESAN_TERLALU_DEKAT
          : null,
      hari: hari.length ? null : 'Pilih minimal satu hari',
      jam: parseJam(jamBerangkat) ? null : 'Jam tidak valid (00–23 : 00–59)',
    };
    setGalat(g);
    if (Object.values(g).some(Boolean)) return;

    setMenyimpan(true);
    try {
      const rute = await ApiService.createCommute(token, {
        name: nama.trim(),
        origin_lat: asal.lat,
        origin_lon: asal.lon,
        dest_lat: tujuan.lat,
        dest_lon: tujuan.lon,
        origin_label: asal.label.slice(0, 80),
        dest_label: tujuan.label.slice(0, 80),
        // Teks kode hari ("sen,sel,rab"): diterima backend baru maupun versi lama (yang hanya menerima string).
        days: HARI.filter((h) => hari.includes(h.kode)).map((h) => h.kode).join(','),
        departure_time: jamBerangkat,
      });
      await setPengingatRute(rute.id, pengingat);
      navigation.replace('DetailRute', { id: rute.id });
    } catch (err) {
      if (err.status === 422 && err.fields) {
        const perField = {};
        for (const [field, pesan] of Object.entries(err.fields)) {
          const kunci = FIELD_FORM[field];
          if (kunci && !perField[kunci]) perField[kunci] = pesan;
        }
        setGalat({ ...perField, simpan: 'Data rute belum valid, cek kembali isianmu.' });
      } else {
        setGalat({ simpan: err.message });
      }
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <View style={styles.layar}>
      <BilahStatus gaya="light" />
      <HeaderRingkas judul="Tambah rute" sub="Kami pantau rute ini setiap pagi" onKembali={navigation.goBack} />
      <KeyboardAvoidingView style={styles.layar} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Input
            label="Nama rute"
            Ikon={Route}
            placeholder="Mis. Ke kampus"
            value={nama}
            onChangeText={setNama}
            galat={galat.nama}
            maxLength={120}
          />

          <View style={styles.bagian}>
            <Text style={t('semibold', 12, colors.teks.sekunder)}>Dari dan ke</Text>
            <View style={styles.pemilihRute}>
              <Pressable style={[styles.baris, styles.garisBawah]} onPress={() => setPemilih('asal')} accessibilityRole="button">
                <SvgXml xml={ruteAsal} width={12} height={12} />
                <View style={styles.barisTeks}>
                  <Text style={t('semibold', 11, colors.teks.samar)}>Asal</Text>
                  <Text style={t('bold', 14, asal ? colors.teks.utama : colors.teks.samar)} numberOfLines={1}>
                    {asal?.label || 'Pilih di peta'}
                  </Text>
                </View>
                <Pressable
                  onPress={asalDariGps}
                  style={[styles.aksi, { backgroundColor: colors.brand.langit50 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Pakai lokasi saya sebagai asal"
                  disabled={mencariGps}
                >
                  <Navigation size={16} color={colors.brand.biru} strokeWidth={2} />
                </Pressable>
              </Pressable>
              <Pressable style={styles.baris} onPress={() => setPemilih('tujuan')} accessibilityRole="button">
                <SvgXml xml={ruteTujuan} width={12} height={12} />
                <View style={styles.barisTeks}>
                  <Text style={t('semibold', 11, colors.teks.samar)}>Tujuan</Text>
                  <Text style={t('bold', 14, tujuan ? colors.teks.utama : colors.teks.samar)} numberOfLines={1}>
                    {tujuan?.label || 'Pilih di peta'}
                  </Text>
                </View>
                <View style={[styles.aksi, { backgroundColor: colors.permukaan.isian }]}>
                  <MapPin size={16} color={colors.teks.sekunder} strokeWidth={2} />
                </View>
              </Pressable>
              <Svg width={2} height={26} style={styles.penghubung} pointerEvents="none">
                <Line x1={1} y1={0} x2={1} y2={26} stroke={colors.teks.samar} strokeWidth={1.5} strokeDasharray="3 3" />
              </Svg>
            </View>
            <PesanGalat>{mencariGps ? null : galat.rute}</PesanGalat>
          </View>

          <View style={[styles.bagian, { gap: 8 }]}>
            <Text style={t('semibold', 12, colors.teks.sekunder)}>Hari berangkat</Text>
            <View style={styles.pilihanHari}>
              {HARI.map((h) => {
                const pilih = hari.includes(h.kode);
                return (
                  <Pressable
                    key={h.kode}
                    onPress={() => ubahHari(h.kode)}
                    style={[styles.hari, pilih ? styles.hariPilih : styles.hariTidak]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: pilih }}
                    accessibilityLabel={h.panjang}
                  >
                    <Text style={t('extrabold', 12, pilih ? colors.teks.terbalik : colors.teks.sekunder)}>{h.pendek}</Text>
                  </Pressable>
                );
              })}
            </View>
            <PesanGalat>{galat.hari}</PesanGalat>
          </View>

          <View style={[styles.bagian, { gap: 8 }]}>
            <Text style={t('semibold', 12, colors.teks.sekunder)}>Jam berangkat</Text>
            <View style={styles.pilihanJam}>
              <TextInput
                value={jam}
                onChangeText={(v) => {
                  const bersih = v.replace(/\D/g, '').slice(0, 2);
                  setJam(bersih);
                  if (bersih.length === 2) refMenit.current?.focus();
                }}
                onFocus={() => setFokusJam('jam')}
                onBlur={() => setFokusJam(null)}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
                style={[styles.kotakJam, fokusJam === 'jam' ? styles.kotakFokus : styles.kotakBiasa]}
                accessibilityLabel="Jam"
              />
              <Text style={t('extrabold', 26, colors.teks.samar)}>:</Text>
              <TextInput
                ref={refMenit}
                value={menit}
                onChangeText={(v) => setMenit(v.replace(/\D/g, '').slice(0, 2))}
                onFocus={() => setFokusJam('menit')}
                onBlur={() => setFokusJam(null)}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
                style={[styles.kotakJam, fokusJam === 'menit' ? styles.kotakFokus : styles.kotakBiasa]}
                accessibilityLabel="Menit"
              />
              <Text style={t('bold', 12, colors.teks.samar)}>WIB</Text>
            </View>
            <PesanGalat>{galat.jam}</PesanGalat>
          </View>

          <View style={styles.pengingat}>
            <Bell size={20} color={colors.brand.biru} strokeWidth={2} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={t('bold', 13, colors.teks.utama)}>Ingatkan 30 menit sebelumnya</Text>
              <Text style={t('medium', 12, colors.teks.sekunder)}>Hanya jika rutemu berisiko</Text>
            </View>
            <Sakelar aktif={pengingat} onUbah={setPengingat} label="Ingatkan 30 menit sebelumnya" />
          </View>
          <PesanGalat>{galat.simpan}</PesanGalat>
        </ScrollView>
        <View style={[styles.bawah, { paddingBottom: 28 + insets.bottom }]}>
          <Tombol label="Simpan rute" onPress={simpan} memuat={menyimpan} />
        </View>
      </KeyboardAvoidingView>

      <PemilihLokasi
        visible={pemilih !== null}
        jenis={pemilih || 'asal'}
        awal={pemilih === 'tujuan' ? tujuan || asal : asal || tujuan}
        pembanding={pemilih === 'tujuan' ? asal : tujuan}
        onTutup={() => setPemilih(null)}
        onPilih={(titik) => {
          if (pemilih === 'asal') setAsal(titik);
          else setTujuan(titik);
          setGalat((g) => ({ ...g, rute: null }));
          setPemilih(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  layar: { flex: 1, backgroundColor: colors.permukaan.latar },
  form: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16, gap: 18 },
  bagian: { gap: 6 },
  pemilihRute: {
    backgroundColor: colors.permukaan.kartu,
    borderWidth: 1,
    borderColor: colors.garis.halus,
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 12,
  },
  baris: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  garisBawah: { borderBottomWidth: 1, borderBottomColor: colors.garis.halus },
  barisTeks: { flex: 1, gap: 1 },
  aksi: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  penghubung: { position: 'absolute', left: 20, top: 37 },
  pilihanHari: { flexDirection: 'row', justifyContent: 'space-between' },
  hari: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  hariPilih: { backgroundColor: colors.brand.biruTua },
  hariTidak: { backgroundColor: colors.permukaan.kartu, borderWidth: 1.5, borderColor: colors.garis.halus },
  pilihanJam: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kotakJam: {
    width: 72,
    height: 54,
    borderRadius: radius.tombol,
    textAlign: 'center',
    fontFamily: fonts.extrabold,
    fontSize: 26,
    color: colors.teks.utama,
    padding: 0,
    borderWidth: 1.5,
  },
  kotakFokus: { backgroundColor: colors.permukaan.kartu, borderColor: colors.brand.biru },
  kotakBiasa: { backgroundColor: colors.permukaan.isian, borderColor: colors.permukaan.isian },
  pengingat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.permukaan.kartu,
    borderWidth: 1,
    borderColor: colors.garis.halus,
    borderRadius: 16,
  },
  bawah: { paddingHorizontal: 16, paddingTop: 8 },
});
