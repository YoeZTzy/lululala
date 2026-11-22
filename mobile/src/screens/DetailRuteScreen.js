import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SvgXml } from 'react-native-svg';
import {
  ArrowLeft,
  Clock,
  CloudRain,
  OctagonExclamationPoint,
  ShieldCheck,
  Sparkles,
  Trash,
  TriangleExclamationPoint,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ruteAsal, ruteTujuan } from '../assets/svg';
import { IkonJenis, ItemTitikRawan, JENIS, KeadaanError, Penanda, Skeleton, Tombol } from '../components';
import BilahStatus from '../components/BilahStatus';
import TombolBulat from '../components/TombolBulat';
import { useAuth } from '../context/AuthContext';
import useMuat from '../hooks/useMuat';
import ApiService from '../services/ApiService';
import { colors, radius, t, warnaRisiko } from '../theme';
import { labelHujan } from '../utils/cuaca';
import { regionUntuk } from '../utils/geo';
import { formatJam, labelHari } from '../utils/jadwal';
import { asalTujuan, titikGarisMini, ujungRute } from '../utils/rute';
import { jamDari, relatif } from '../utils/waktu';

const TINGGI_PETA = 298; // 330 di Figma dikurangi 32 status bar
const TUMPANG = 34; // lembar detail menutupi bagian bawah peta

const KESIMPULAN = {
  Hindari: { judul: 'Sebaiknya hindari rute ini', Ikon: OctagonExclamationPoint },
  Waspada: { judul: 'Waspada di rute ini', Ikon: TriangleExclamationPoint },
  Aman: { judul: 'Rute aman untuk saat ini', Ikon: ShieldCheck },
};

function deskripsi(risk, hujan) {
  const n = risk.causes.length;
  const bagian = [];
  if (n) bagian.push(`${n} titik rawan aktif`);
  if (hujan.hujan) bagian.push(hujan.label.toLowerCase());
  if (!bagian.length) return 'Belum ada titik rawan aktif di sepanjang rute.';
  return `${bagian.join(' dan ')} di sepanjang rute.`;
}

async function muatDetail(token, id) {
  const [daftar, risk, ringkasan] = await Promise.all([
    ApiService.getCommutes(token),
    ApiService.getCommuteRisk(token, id),
    ApiService.getSummary().catch(() => null),
  ]);
  const rute = (daftar.data?.items || []).find((r) => r.id === id);
  if (!rute) throw new Error('Rute tidak ditemukan.');
  return { rute, risk, cuaca: ringkasan?.data?.weather || null, dinilai: new Date().toISOString() };
}

// Titik pada garis lurus asal->tujuan di fraksi f.
function titikDi(asal, tujuan, f) {
  return { latitude: asal.lat + (tujuan.lat - asal.lat) * f, longitude: asal.lon + (tujuan.lon - asal.lon) * f };
}

export default function DetailRuteScreen({ navigation, route }) {
  const { id } = route.params;
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const { data, memuat, galat, muatUlang } = useMuat(() => muatDetail(token, id), { saatFokus: false });

  const tinggiPeta = insets.top + TINGGI_PETA;
  const rute = data?.rute;
  const risk = data?.risk;
  const tingkat = risk?.risk_level || 'Aman';
  const w = warnaRisiko[tingkat];
  const hujan = labelHujan(data?.cuaca?.rain_mm);

  let garis = [];
  let segmenRawan = null;
  if (rute) {
    const { asal, tujuan } = asalTujuan(rute);
    const seg = rute.segments_json ? JSON.parse(rute.segments_json) : null;
    garis = (seg && seg.length >= 2 ? seg : [asal, tujuan]).map((p) => ({ latitude: p.lat, longitude: p.lon }));
    const titik = titikGarisMini(rute, risk?.causes);
    if (titik.length) {
      const a = Math.max(0, titik[0].fraksi - 0.1);
      const b = Math.min(1, titik[titik.length - 1].fraksi + 0.1);
      segmenRawan = [titikDi(asal, tujuan, a), titikDi(asal, tujuan, b)];
    }
  }

  function hapus() {
    Alert.alert('Hapus rute?', `"${rute.name}" akan dihapus dari rute rutinmu.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await ApiService.deleteCommute(token, id);
            navigation.goBack();
          } catch (err) {
            Alert.alert('Gagal menghapus', err.message);
          }
        },
      },
    ]);
  }

  const k = KESIMPULAN[tingkat];
  const ujung = rute ? ujungRute(rute) : null;

  return (
    <View style={styles.layar}>
      <BilahStatus gaya="dark" />
      <View style={{ height: tinggiPeta }}>
        {rute ? (
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={regionUntuk([
              { lat: rute.origin_lat, lon: rute.origin_lon },
              { lat: rute.dest_lat, lon: rute.dest_lon },
              ...(risk?.causes || []).map((c) => ({ lat: c.lat, lon: c.lon })),
            ])}
            mapPadding={{ top: insets.top + 40, bottom: TUMPANG, left: 16, right: 16 }}
            toolbarEnabled={false}
          >
            <Polyline coordinates={garis} strokeColor={colors.permukaan.kartu} strokeWidth={10} lineCap="round" />
            <Polyline coordinates={garis} strokeColor={colors.brand.biru} strokeWidth={5} lineCap="round" />
            {segmenRawan ? (
              <Polyline coordinates={segmenRawan} strokeColor={colors.risiko.hindari} strokeWidth={5} lineCap="round" />
            ) : null}
            <Marker coordinate={garis[0]} anchor={{ x: 0.5, y: 0.5 }}>
              <SvgXml xml={ruteAsal} width={16} height={16} />
            </Marker>
            <Marker coordinate={garis[garis.length - 1]} anchor={{ x: 0.5, y: 0.5 }}>
              <SvgXml xml={ruteTujuan} width={16} height={16} />
            </Marker>
            {(risk?.causes || []).map((c) => (
              <Marker
                key={c.id}
                coordinate={{ latitude: c.lat, longitude: c.lon }}
                anchor={{ x: 0.5, y: 0.5 }}
                onPress={() => navigation.navigate('DetailTitikRawan', { id: c.id })}
              >
                <Penanda status="Aktif" jenis={c.incident_type} ukuran={48} />
              </Marker>
            ))}
          </MapView>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.garis.halus }]} />
        )}
        <TombolBulat Ikon={ArrowLeft} onPress={navigation.goBack} label="Kembali" style={[styles.kembali, { top: insets.top + 12 }]} />
      </View>

      <View style={styles.lembar}>
        <ScrollView contentContainerStyle={[styles.isiLembar, { paddingBottom: 20 + insets.bottom }]}>
          <View style={styles.pegangan} />
          {memuat ? (
            <View style={{ gap: 12 }}>
              <Skeleton tinggi={24} lebar="70%" />
              <Skeleton tinggi={14} lebar="50%" />
              <Skeleton tinggi={82} bulat={16} />
              <Skeleton tinggi={60} />
              <Skeleton tinggi={60} />
            </View>
          ) : galat ? (
            <KeadaanError pesan={galat.message} onCobaLagi={muatUlang} />
          ) : (
            <>
              <View style={{ gap: 3 }}>
                <Text style={t('extrabold', 20, colors.teks.utama)}>
                  {ujung.asal} → {ujung.tujuan}
                </Text>
                <View style={styles.meta}>
                  <Clock size={13} color={colors.teks.samar} strokeWidth={2} />
                  <Text style={t('medium', 12, colors.teks.sekunder)}>
                    Berangkat {formatJam(rute.departure_time)} · {labelHari(rute.days_list)} · dinilai {jamDari(data.dinilai)}
                  </Text>
                </View>
              </View>

              <View style={[styles.kesimpulan, { backgroundColor: w.bg }]}>
                <k.Ikon size={20} color={w.utama} strokeWidth={2} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={t('extrabold', 14, w.teks)}>{k.judul}</Text>
                  <Text style={[t('medium', 12, w.teks), { lineHeight: 17.4 }]}>{deskripsi(risk, hujan)}</Text>
                </View>
              </View>

              <Text style={[t('extrabold', 11, colors.teks.samar), { letterSpacing: 0.66 }]}>YANG MEMENGARUHI RUTE</Text>
              <View>
                {risk.causes.map((c, i) => (
                  <ItemTitikRawan
                    key={c.id}
                    jenis={c.status === 'Mereda' ? 'Mereda' : 'Aktif'}
                    ikon={<IkonJenis jenis={c.incident_type} size={16} color={colors.teks.terbalik} strokeWidth={1.75} />}
                    judul={(JENIS[c.incident_type] || JENIS.genangan).label}
                    keterangan={`${relatif(c.last_report_at || c.updated_at)} · ${c.report_count} warga`}
                    nilai={`${Math.round(c.confidence_score * 100)}%`}
                    fraksi={c.confidence_score}
                    onPress={() => navigation.navigate('DetailTitikRawan', { id: c.id })}
                    terakhir={!hujan.hujan && i === risk.causes.length - 1}
                  />
                ))}
                {hujan.hujan ? (
                  <ItemTitikRawan
                    jenis="Cuaca"
                    ikon={<CloudRain size={16} color={colors.teks.terbalik} strokeWidth={1.75} />}
                    judul={`${hujan.label} saat ini`}
                    keterangan={`Open-Meteo · ${jamDari(data.cuaca.recorded_at)}`}
                    nilai={hujan.singkat}
                    fraksi={hujan.fraksi}
                    terakhir
                  />
                ) : null}
                {!risk.causes.length && !hujan.hujan ? (
                  <Text style={[t('medium', 13, colors.teks.sekunder), { paddingVertical: 12 }]}>
                    Tidak ada titik rawan atau hujan di sepanjang rute.
                  </Text>
                ) : null}
              </View>

              <View style={styles.saran}>
                <Sparkles size={16} color={colors.teks.samar} strokeWidth={2} />
                <Text style={[t('semibold', 13, colors.teks.sekunder), { flex: 1 }]}>Saran jam berangkat terbaik</Text>
                <Text style={t('bold', 11, colors.teks.samar)}>Segera hadir</Text>
              </View>

              <Tombol gaya="Sekunder" label="Hapus rute" Ikon={Trash} onPress={hapus} />
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
    // shadow 0 -6 20 rgba(8,36,74,0.1)
    shadowColor: '#08244A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 12,
  },
  isiLembar: { paddingTop: 12, paddingHorizontal: 20, gap: 16 },
  pegangan: { width: 36, height: 4, borderRadius: radius.bar, backgroundColor: colors.garis.halus },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kesimpulan: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 16 },
  saran: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.tombol,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.garis.halus,
  },
});
