import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, MapPin, ThumbsUp, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgeStatus, JENIS, KeadaanError, Penanda, Skeleton, Tombol } from '../components';
import BilahStatus from '../components/BilahStatus';
import TombolBulat from '../components/TombolBulat';
import { useAuth } from '../context/AuthContext';
import useMuat from '../hooks/useMuat';
import ApiService from '../services/ApiService';
import { colors, radius, t } from '../theme';
import { labelHujan } from '../utils/cuaca';
import { formatJarak, jarakMeter } from '../utils/geo';
import { namaTempat, posisiSaya } from '../utils/lokasi';
import { statusPenanda } from '../utils/penanda';
import { jamDari } from '../utils/waktu';

const TINGGI_PETA = 248; // 280 di Figma dikurangi 32 status bar
const TUMPANG = 34;
const BARIS_LINIMASA = 28; // tinggi baris + jarak antarbaris linimasa

// Kalimat bantahan per jenis ("Sudah surut" di Figma untuk genangan).
const LABEL_BANTAH = {
  genangan: 'Sudah surut',
  banjir: 'Sudah surut',
  macet_parah: 'Sudah lancar',
  jalan_rusak: 'Sudah diperbaiki',
  kecelakaan: 'Sudah ditangani',
};

function penjelasanSkor(d, hujan) {
  const konfirmasi = d.reports.reduce((s, r) => s + r.confirmations, 0);
  const bantahan = d.reports.reduce((s, r) => s + r.disputes, 0);
  const resmi = d.reports.some((r) => r.source === 'petabencana');
  const naik = [];
  if (konfirmasi) naik.push(`${konfirmasi} warga mengonfirmasi`);
  if (resmi) naik.push('ada laporan resmi PetaBencana.id');
  if (hujan.hujan) naik.push(`${hujan.label.toLowerCase()} terdeteksi`);
  let s = naik.length ? `Naik karena ${naik.join(' dan ')}.` : `Berdasarkan ${d.reports.length} laporan warga.`;
  if (bantahan) s += ` Turun karena ${bantahan} warga membantah.`;
  return `${s} Skor memudar perlahan jika tidak ada laporan baru.`;
}

function linimasa(d, hujan) {
  const kejadian = [...d.reports]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((r) => {
      const asal = r.source === 'petabencana' ? 'Laporan resmi PetaBencana.id' : r.is_mine ? 'Kamu melaporkan' : 'Dilaporkan warga';
      const tanggapan = r.confirmations ? ` · ${r.confirmations} konfirmasi` : '';
      return { waktu: r.created_at, teks: asal + tanggapan, warna: colors.risiko.hindari };
    });
  if (hujan.hujan && d.weather?.recorded_at) {
    kejadian.unshift({ waktu: d.weather.recorded_at, teks: 'Didukung data hujan Open-Meteo', warna: colors.brand.biru });
  }
  return kejadian.slice(-5);
}

export default function DetailTitikRawanScreen({ navigation, route }) {
  const { id } = route.params;
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const { data: d, memuat, galat, muatUlang, setData } = useMuat(() => ApiService.getHazard(token, id), { saatFokus: false });
  const [tempat, setTempat] = useState(null);
  const [jarak, setJarak] = useState(null);
  const [mengirim, setMengirim] = useState(null);
  const [pesan, setPesan] = useState('');

  const lat = d?.lat;
  const lon = d?.lon;
  useEffect(() => {
    if (lat == null) return;
    namaTempat({ lat, lon }).then(setTempat);
    posisiSaya()
      .then((p) => setJarak(jarakMeter(p, { lat, lon })))
      .catch(() => {});
  }, [lat, lon]);

  const hujan = labelHujan(d?.weather?.rain_mm);
  const target = d?.reports.find((r) => r.id === d.target_report_id);
  const sudahMenanggapi = Boolean(target?.my_vote);
  const pelapor = d && !target && d.reports.some((r) => r.is_mine && r.active);

  async function tanggapi(jenis) {
    setPesan('');
    setMengirim(jenis);
    try {
      if (jenis === 'konfirmasi') await ApiService.confirmReport(token, target.id);
      else await ApiService.disputeReport(token, target.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setData(await ApiService.getHazard(token, id));
      setPesan(jenis === 'konfirmasi' ? 'Terima kasih, konfirmasimu tercatat.' : 'Terima kasih, tanggapanmu tercatat.');
    } catch (err) {
      if (err.status === 409) setPesan('Kamu sudah memberi tanggapan untuk laporan ini.');
      else if (err.status === 400) setPesan('Kamu tidak bisa menanggapi laporanmu sendiri.');
      else setPesan(err.message);
    } finally {
      setMengirim(null);
    }
  }

  const nama = d ? (JENIS[d.incident_type] || JENIS.genangan).label : '';
  const persen = d ? Math.round(d.confidence_score * 100) : 0;
  const mereda = d?.status !== 'Aktif';
  const kejadian = d ? linimasa(d, hujan) : [];

  return (
    <View style={styles.layar}>
      <BilahStatus gaya="dark" />
      <View style={{ height: insets.top + TINGGI_PETA }}>
        {d ? (
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={{ latitude: d.lat, longitude: d.lon, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
            mapPadding={{ top: insets.top, bottom: TUMPANG, left: 0, right: 0 }}
            toolbarEnabled={false}
          >
            <Marker coordinate={{ latitude: d.lat, longitude: d.lon }} anchor={{ x: 0.5, y: 0.5 }}>
              <Penanda status={statusPenanda(d)} jenis={d.incident_type} ukuran={78} />
            </Marker>
          </MapView>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.garis.halus }]} />
        )}
        <TombolBulat Ikon={ArrowLeft} onPress={navigation.goBack} label="Kembali" style={[styles.kembali, { top: insets.top + 12 }]} />
      </View>

      <View style={styles.lembar}>
        <ScrollView contentContainerStyle={[styles.isi, { paddingBottom: 20 + insets.bottom }]}>
          <View style={styles.pegangan} />
          {memuat ? (
            <View style={{ gap: 12 }}>
              <Skeleton tinggi={20} lebar={70} />
              <Skeleton tinggi={28} lebar="50%" />
              <Skeleton tinggi={120} bulat={16} />
              <Skeleton tinggi={70} />
            </View>
          ) : galat ? (
            <KeadaanError pesan={galat.status === 404 ? 'Titik rawan ini sudah tidak ada.' : galat.message} onCobaLagi={muatUlang} />
          ) : (
            <>
              <View style={{ gap: 6 }}>
                <BadgeStatus status={d.status} />
                <Text style={[t('extrabold', 24, colors.teks.utama), { letterSpacing: -0.48 }]}>{nama}</Text>
                <View style={styles.baris6}>
                  <MapPin size={13} color={colors.teks.samar} strokeWidth={2} />
                  <Text style={[t('medium', 12, colors.teks.sekunder), { flexShrink: 1 }]} numberOfLines={1}>
                    {[tempat, jarak != null ? `${formatJarak(jarak)} darimu` : null].filter(Boolean).join(' · ') ||
                      `${d.lat.toFixed(4)}, ${d.lon.toFixed(4)}`}
                  </Text>
                </View>
              </View>

              <View style={styles.skor}>
                <View style={styles.baris8}>
                  <Text style={[t('semibold', 12, colors.teks.sekunder), { flex: 1 }]}>Skor keyakinan</Text>
                  <Text style={t('extrabold', 22, colors.teks.utama)}>{persen}%</Text>
                </View>
                <View style={styles.bar}>
                  <View
                    style={[styles.isiBar, { width: `${persen}%`, backgroundColor: mereda ? colors.risiko.waspada : colors.risiko.hindari }]}
                  />
                </View>
                <Text style={[t('medium', 12, colors.teks.sekunder), { lineHeight: 18 }]}>{penjelasanSkor(d, hujan)}</Text>
              </View>

              {kejadian.length ? (
                <View style={{ gap: 10 }}>
                  <Text style={[t('extrabold', 11, colors.teks.samar), { letterSpacing: 0.66 }]}>RIWAYAT</Text>
                  <View style={{ gap: 14 }}>
                    {kejadian.length > 1 ? (
                      <View style={[styles.garisWaktu, { height: (kejadian.length - 1) * BARIS_LINIMASA }]} />
                    ) : null}
                    {kejadian.map((k, i) => (
                      <View key={i} style={styles.kejadian}>
                        <Text style={[t('bold', 12, colors.teks.samar), { width: 40 }]}>{jamDari(k.waktu)}</Text>
                        <View style={[styles.titik, { backgroundColor: k.warna }]} />
                        <Text style={[t('semibold', 13, colors.teks.utama), { flex: 1 }]}>{k.teks}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={{ gap: 10 }}>
                <Text style={t('extrabold', 15, colors.teks.utama)}>Masih ada {nama.toLowerCase()} di sini?</Text>
                {target ? (
                  <>
                    <View style={styles.tombolTanggapan}>
                      <Tombol
                        label="Masih ada"
                        Ikon={ThumbsUp}
                        onPress={() => tanggapi('konfirmasi')}
                        memuat={mengirim === 'konfirmasi'}
                        disabled={sudahMenanggapi || Boolean(mengirim)}
                        style={{ flex: 1 }}
                      />
                      <Tombol
                        gaya="Sekunder"
                        label={LABEL_BANTAH[d.incident_type] || 'Sudah tidak ada'}
                        Ikon={X}
                        onPress={() => tanggapi('bantah')}
                        memuat={mengirim === 'bantah'}
                        disabled={sudahMenanggapi || Boolean(mengirim)}
                        style={{ flex: 1 }}
                      />
                    </View>
                    {sudahMenanggapi ? (
                      <Text style={t('semibold', 12, colors.teks.sekunder)}>Kamu sudah memberi tanggapan</Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={t('medium', 13, colors.teks.sekunder)}>
                    {pelapor
                      ? 'Kamu pelapor titik ini. Tanggapan dari warga lain akan menaikkan skornya.'
                      : 'Belum ada laporan aktif untuk ditanggapi.'}
                  </Text>
                )}
                {pesan ? (
                  <Text style={t('semibold', 12, colors.teks.sekunder)} accessibilityLiveRegion="polite">
                    {pesan}
                  </Text>
                ) : null}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layar: { flex: 1, backgroundColor: colors.permukaan.kartu },
  kembali: { position: 'absolute', left: 16 },
  lembar: {
    flex: 1,
    marginTop: -TUMPANG,
    backgroundColor: colors.permukaan.kartu,
    borderTopLeftRadius: radius.header,
    borderTopRightRadius: radius.header,
  },
  isi: { paddingTop: 12, paddingHorizontal: 20, gap: 16 },
  pegangan: { width: 36, height: 4, borderRadius: radius.bar, backgroundColor: colors.garis.halus },
  baris6: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  baris8: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skor: { backgroundColor: colors.permukaan.latar, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.garis.halus, overflow: 'hidden' },
  isiBar: { height: 8, borderRadius: 4 },
  garisWaktu: { position: 'absolute', left: 57, top: 10, width: 2, backgroundColor: colors.garis.halus },
  kejadian: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titik: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.permukaan.kartu },
  tombolTanggapan: { flexDirection: 'row', gap: 10 },
});
