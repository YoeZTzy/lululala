import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import MapView, { Marker } from 'react-native-maps';
import { Bell, ChevronRight, CloudRain, Plus, Route, Sun } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { berandaHujan, berandaTekstur, loncengTitik } from '../assets/svg';
import { AvatarWarga, BarisRute, KartuRute, KeadaanError, KeadaanKosong, Penanda, Skeleton } from '../components';
import BilahStatus from '../components/BilahStatus';
import { titikGradien } from '../components/gradien';
import { useAuth } from '../context/AuthContext';
import useMuat from '../hooks/useMuat';
import ApiService from '../services/ApiService';
import { colors, radius, t } from '../theme';
import { labelHujan } from '../utils/cuaca';
import { regionUntuk } from '../utils/geo';
import { formatJam, labelHari, labelSisa } from '../utils/jadwal';
import { namaRute, ringkasPenyebab, titikGarisMini, ujungRute, urutkanJadwal } from '../utils/rute';
import { sapaan } from '../utils/waktu';

// Header cuaca Figma: tinggi 252 (32 status bar + 220), gradien 132.75deg.
const GRADIEN_CUACA = { sudut: 132.75, warna: ['#0C447C', '#378ADD'], lokasi: [0.0714, 0.7857] };
const TINGGI_HEADER = 220;
const ATAS_KARTU = 108; // posisi Kartu Rute dari bawah status bar

async function muatBeranda(token) {
  const [ringkasan, rute, peringatan] = await Promise.all([
    ApiService.getSummary().catch(() => null),
    ApiService.getCommutes(token, { includeRisk: true }),
    ApiService.getAlerts(token).catch(() => null),
  ]);
  return {
    ringkasan: ringkasan?.data || null,
    rute: rute.data?.items || [],
    adaPeringatan: (peringatan?.data?.items || []).length > 0,
    dariCache: Boolean(rute.fromCache),
  };
}

export default function BerandaScreen({ navigation }) {
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data, memuat, menyegarkan, galat, muatUlang, segarkan } = useMuat(() => muatBeranda(token));

  const tinggiHeader = insets.top + TINGGI_HEADER;
  const g = titikGradien(GRADIEN_CUACA.sudut, width, tinggiHeader);
  const namaDepan = (user?.name || '').split(' ')[0];
  const cuaca = labelHujan(data?.ringkasan?.weather?.rain_mm);
  const IkonCuaca = cuaca.hujan ? CloudRain : Sun;

  const terjadwal = urutkanJadwal(data?.rute || []);
  const berikut = terjadwal[0];
  const lainnya = terjadwal.slice(1);

  const semuaTitik = new Map();
  (data?.rute || []).forEach((r) => (r.risk?.causes || []).forEach((c) => semuaTitik.set(c.id, c)));
  const titikSekitar = [...semuaTitik.values()];

  const keDetail = (rute) => navigation.navigate('DetailRute', { id: rute.id });
  const keTambah = () => navigation.navigate('TambahRute');

  return (
    <View style={styles.layar}>
      <BilahStatus gaya="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={menyegarkan} onRefresh={segarkan} progressViewOffset={insets.top} />}
      >
        <LinearGradient
          colors={GRADIEN_CUACA.warna}
          locations={GRADIEN_CUACA.lokasi}
          start={g.start}
          end={g.end}
          style={[styles.header, { height: tinggiHeader }]}
        >
          <View style={[styles.lapisan, { left: 2.8, top: insets.top - 32 + 5.4 }]} pointerEvents="none">
            <SvgXml xml={berandaHujan} width={344.1} height={259.1} />
          </View>
          <View style={[styles.lapisan, { left: -17, top: insets.top - 32 - 17 }]} pointerEvents="none">
            <SvgXml xml={berandaTekstur} width={394} height={286} />
          </View>
          <View style={[styles.sapaan, { marginTop: insets.top + 14 }]}>
            <View style={styles.sapaanTeks}>
              <Text style={t('extrabold', 20, colors.teks.terbalik)} numberOfLines={1}>
                {sapaan()}
                {namaDepan ? `, ${namaDepan}` : ''}
              </Text>
              <View style={styles.cuaca}>
                <IkonCuaca size={15} color={colors.teks.terbalik} strokeWidth={2} />
                <Text style={t('semibold', 12, colors.teks.terbalik)}>
                  {data?.ringkasan ? `${cuaca.label} · Bandung` : 'Bandung'}
                </Text>
              </View>
            </View>
            <View
              style={styles.lonceng}
              accessibilityLabel={data?.adaPeringatan ? 'Ada peringatan rute' : 'Tidak ada peringatan'}
            >
              <Bell size={20} color={colors.teks.terbalik} strokeWidth={2} />
              {data?.adaPeringatan ? (
                <View style={styles.titikLonceng}>
                  <SvgXml xml={loncengTitik} width={9} height={9} />
                </View>
              ) : null}
            </View>
          </View>
          <Text style={[styles.labelBerikut, { top: insets.top + ATAS_KARTU - 22 }]}>RUTE BERIKUTNYA</Text>
        </LinearGradient>

        <View style={[styles.isi, { marginTop: ATAS_KARTU - TINGGI_HEADER }]}>
          {memuat ? (
            <View style={[styles.kartuPutih, styles.bayanganKartu, { gap: 12, padding: 18 }]}>
              <Skeleton tinggi={30} lebar={100} />
              <Skeleton tinggi={22} />
              <Skeleton tinggi={14} lebar="80%" />
            </View>
          ) : galat && !data ? (
            <View style={[styles.kartuPutih, styles.bayanganKartu]}>
              <KeadaanError pesan={galat.message} onCobaLagi={muatUlang} />
            </View>
          ) : !berikut ? (
            <View style={[styles.kartuPutih, styles.bayanganKartu]}>
              <KeadaanKosong
                Ikon={Route}
                judul="Belum ada rute rutin"
                pesan="Tambahkan rute harianmu, kami pantau kondisinya setiap pagi."
                labelAksi="Tambah rute"
                onAksi={keTambah}
              />
            </View>
          ) : (
            <KartuRute
              style={styles.bayanganKartu}
              jam={formatJam(berikut.rute.departure_time)}
              hari={berikut.waktu ? `Berangkat · ${labelSisa(berikut.waktu)}` : `Berangkat · ${labelHari(berikut.rute.days_list)}`}
              tingkat={berikut.rute.risk?.risk_level || 'Aman'}
              {...ujungRute(berikut.rute)}
              titik={titikGarisMini(berikut.rute, berikut.rute.risk?.causes)}
              penyebab={ringkasPenyebab(berikut.rute.risk)}
              onPress={() => keDetail(berikut.rute)}
            />
          )}

          {!memuat && data && data.rute.length > 0 ? (
            <>
              <View style={styles.judulDaftar}>
                <Text style={[t('extrabold', 16, colors.teks.utama), { flex: 1 }]}>Rute lainnya</Text>
                <Pressable onPress={keTambah} style={styles.tambah} accessibilityRole="button" hitSlop={8}>
                  <Plus size={16} color={colors.brand.biru} strokeWidth={2} />
                  <Text style={t('extrabold', 13, colors.brand.biru)}>Tambah</Text>
                </Pressable>
              </View>
              {lainnya.length ? (
                <View style={[styles.kartuPutih, styles.daftar]}>
                  {lainnya.map(({ rute }, i) => (
                    <BarisRute
                      key={rute.id}
                      jam={formatJam(rute.departure_time)}
                      hari={labelHari(rute.days_list)}
                      rute={namaRute(rute)}
                      tingkat={rute.risk?.risk_level}
                      onPress={() => keDetail(rute)}
                      terakhir={i === lainnya.length - 1}
                    />
                  ))}
                </View>
              ) : (
                <View style={[styles.kartuPutih, styles.daftar]}>
                  <Text style={[t('medium', 13, colors.teks.sekunder), { paddingVertical: 16 }]}>
                    Baru satu rute. Tambah rute pulang atau akhir pekan.
                  </Text>
                </View>
              )}

              <Pressable
                style={[styles.kartuPutih, styles.sekitar]}
                onPress={() => navigation.navigate('PetaTab', { screen: 'Peta' })}
                accessibilityRole="button"
                accessibilityLabel="Lihat titik rawan di peta"
              >
                <View style={styles.petaMini} pointerEvents="none">
                  <MapView
                    style={StyleSheet.absoluteFill}
                    initialRegion={regionUntuk(
                      titikSekitar.length
                        ? titikSekitar.map((c) => ({ lat: c.lat, lon: c.lon }))
                        : [
                            { lat: berikut.rute.origin_lat, lon: berikut.rute.origin_lon },
                            { lat: berikut.rute.dest_lat, lon: berikut.rute.dest_lon },
                          ]
                    )}
                    liteMode={Platform.OS === 'android'}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    toolbarEnabled={false}
                  >
                    {titikSekitar.map((c) => (
                      <Marker key={c.id} coordinate={{ latitude: c.lat, longitude: c.lon }} anchor={{ x: 0.5, y: 0.5 }}>
                        <Penanda status={c.status === 'Mereda' ? 'Mereda' : 'Aktif'} jenis={c.incident_type} ukuran={37.2} />
                      </Marker>
                    ))}
                  </MapView>
                </View>
                <View style={styles.warga}>
                  <AvatarWarga jumlah={data.ringkasan?.reporters_today} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={t('extrabold', 13, colors.teks.utama)}>
                      {data.ringkasan?.reporters_today
                        ? `${data.ringkasan.reporters_today} warga melapor hari ini`
                        : 'Belum ada laporan hari ini'}
                    </Text>
                    <Text style={t('medium', 12, colors.teks.sekunder)}>
                      {titikSekitar.length
                        ? `${titikSekitar.length} titik rawan di sekitar rutemu`
                        : 'Tidak ada titik rawan di sekitar rutemu'}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.teks.samar} strokeWidth={2} />
                </View>
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  layar: { flex: 1, backgroundColor: colors.permukaan.latar },
  header: {
    overflow: 'hidden',
    borderBottomLeftRadius: radius.header,
    borderBottomRightRadius: radius.header,
    paddingHorizontal: 16,
  },
  lapisan: { position: 'absolute' },
  sapaan: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sapaanTeks: { flex: 1, gap: 4 },
  cuaca: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lonceng: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titikLonceng: { position: 'absolute', left: 24, top: 9 },
  labelBerikut: { position: 'absolute', left: 20, ...t('extrabold', 11, colors.teks.terbalik), letterSpacing: 0.88 },
  isi: { paddingHorizontal: 16 },
  kartuPutih: {
    backgroundColor: colors.permukaan.kartu,
    borderWidth: 1,
    borderColor: colors.garis.halus,
    borderRadius: radius.kartu,
  },
  // drop-shadow 0 12 14 rgba(8,36,74,0.14)
  bayanganKartu: {
    shadowColor: '#08244A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 8,
  },
  judulDaftar: { height: 24, flexDirection: 'row', alignItems: 'center', marginTop: 22 },
  tambah: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  daftar: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 2 },
  sekitar: { marginTop: 14, overflow: 'hidden' },
  petaMini: { height: 96, backgroundColor: colors.permukaan.latar },
  warga: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
});
