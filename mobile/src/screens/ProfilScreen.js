import { useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import { Bell, ChevronRight, Lock, LogOut, Megaphone, Route, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { profilTekstur } from '../assets/svg';
import { GalatBagian, IkonJenis, ItemTitikRawan, JENIS, KeadaanKosong, Sakelar, Skeleton } from '../components';
import BilahStatus from '../components/BilahStatus';
import { titikGradien } from '../components/gradien';
import { useAuth } from '../context/AuthContext';
import useMuat from '../hooks/useMuat';
import ApiService from '../services/ApiService';
import { colors, radius, t } from '../theme';
import { pengingatGlobal, setPengingatGlobal } from '../utils/pengingat';
import { bulanTahun, hariJam } from '../utils/waktu';

// Header profil Figma: tinggi 206 (32 status bar + 174), gradien 138.51deg.
const GRADIEN_PROFIL = { sudut: 138.51, warna: ['#0C447C', '#378ADD'], lokasi: [0.0714, 0.7857] };
const TINGGI_HEADER = 174;
const ATAS_STATISTIK = 114; // 146 - 32

function inisial(nama) {
  const kata = (nama || '').trim().split(/\s+/).filter(Boolean);
  return ((kata[0]?.[0] || '') + (kata[1]?.[0] || '')).toUpperCase() || '?';
}

// Profil dan laporan dimuat terpisah: gagal satu tidak mengosongkan bagian lain.
async function muatProfil(token) {
  const [me, laporan] = await Promise.allSettled([ApiService.getMe(token), ApiService.getMyReports(token)]);
  return {
    me: me.status === 'fulfilled' ? me.value : null,
    galatMe: me.status === 'rejected' ? me.reason : null,
    laporan: laporan.status === 'fulfilled' ? laporan.value.data?.items || [] : [],
    galatLaporan: laporan.status === 'rejected' ? laporan.reason : null,
  };
}

export default function ProfilScreen({ navigation }) {
  const { token, user, signOut, perbaruiUser } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data, memuat, menyegarkan, muatUlang, segarkan } = useMuat(() => muatProfil(token));
  const [pengingat, setPengingat] = useState(true);

  useEffect(() => {
    pengingatGlobal().then(setPengingat);
  }, []);

  const me = data?.me;
  useEffect(() => {
    if (me && (me.name !== user?.name || me.email !== user?.email)) {
      perbaruiUser({ id: me.id, name: me.name, email: me.email });
    }
  }, [me, user, perbaruiUser]);

  const tinggiHeader = insets.top + TINGGI_HEADER;
  const g = titikGradien(GRADIEN_PROFIL.sudut, width, tinggiHeader);
  const nama = me?.name || user?.name || '';
  const email = me?.email || user?.email || '';
  const stats = me?.stats;

  function ubahPengingat(aktif) {
    setPengingat(aktif);
    setPengingatGlobal(aktif);
  }

  function privasi() {
    Alert.alert(
      'Privasi lokasi',
      'Rute rutinmu hanya bisa dilihat olehmu. Laporan tidak menampilkan namamu ke warga lain, dan identitas pelapor dihapus setelah laporan kedaluwarsa (3 jam).'
    );
  }

  function keluar() {
    Alert.alert('Keluar dari akun?', 'Kamu perlu masuk lagi untuk melihat rutemu.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: signOut },
    ]);
  }

  const memuatAwal = memuat && !data;
  // "–" bila stats tidak ada (gagal dimuat / server lama), jangan pernah 0 palsu.
  const angka = (n) => (stats ? String(n ?? 0) : '–');

  return (
    <View style={styles.layar}>
      <BilahStatus gaya="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={menyegarkan} onRefresh={segarkan} progressViewOffset={insets.top} />}
      >
        <LinearGradient
          colors={GRADIEN_PROFIL.warna}
          locations={GRADIEN_PROFIL.lokasi}
          start={g.start}
          end={g.end}
          style={[styles.header, { height: tinggiHeader }]}
        >
          <View style={[styles.tekstur, { top: insets.top - 32 }]} pointerEvents="none">
            <SvgXml xml={profilTekstur} width={360} height={206} />
          </View>
          <View style={[styles.identitas, { marginTop: insets.top + 20 }]}>
            <View style={styles.avatar}>
              <Text style={t('extrabold', 22, colors.brand.biruTua)}>{inisial(nama)}</Text>
            </View>
            <View style={styles.nama}>
              <Text style={t('extrabold', 20, colors.teks.terbalik)} numberOfLines={1}>
                {nama}
              </Text>
              <Text style={t('medium', 12, colors.teks.terbalik)} numberOfLines={1}>
                {email}
                {me?.created_at ? ` · sejak ${bulanTahun(me.created_at)}` : ''}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.isi, { marginTop: ATAS_STATISTIK - TINGGI_HEADER }]}>
          <View style={styles.statistik}>
            <View style={styles.barisStat}>
              {[
                [angka(stats?.reports), 'laporan'],
                [angka(stats?.votes), 'konfirmasi'],
                [angka(stats?.commutes), 'rute rutin'],
              ].map(([nilai, label], i) => (
                <View key={label} style={styles.kolomStat}>
                  {i > 0 ? <View style={styles.pemisah} /> : null}
                  <View style={styles.stat}>
                    {memuatAwal ? (
                      <Skeleton tinggi={24} lebar={28} style={{ marginBottom: 3 }} />
                    ) : (
                      <Text style={t('extrabold', 22, colors.teks.utama)}>{nilai}</Text>
                    )}
                    <Text style={t('semibold', 11, colors.teks.sekunder)}>{label}</Text>
                  </View>
                </View>
              ))}
            </View>
            {data?.galatMe ? (
              <GalatBagian
                pesan="Data profil belum bisa dimuat."
                galat={data.galatMe}
                onCobaLagi={muatUlang}
                style={styles.galatStat}
              />
            ) : data?.me && !stats ? (
              <GalatBagian pesan="Statistik belum tersedia di server." style={styles.galatStat} />
            ) : null}
          </View>

          <View style={[styles.kartu, { marginTop: 22 }]}>
            <Pressable
              style={[styles.baris, styles.garisBawah]}
              onPress={() => navigation.navigate('BerandaTab', { screen: 'Beranda' })}
              accessibilityRole="button"
            >
              <Route size={20} color={colors.brand.biru} strokeWidth={2} />
              <Text style={[t('semibold', 14, colors.teks.utama), { flex: 1 }]}>Rute rutin saya</Text>
              <Text style={t('bold', 13, colors.teks.samar)}>{stats?.commutes ?? ''}</Text>
              <ChevronRight size={18} color={colors.teks.samar} strokeWidth={2} />
            </Pressable>
            <View style={[styles.baris, styles.garisBawah]}>
              <Bell size={20} color={colors.brand.biru} strokeWidth={2} />
              <Text style={[t('semibold', 14, colors.teks.utama), { flex: 1 }]}>Pengingat sebelum berangkat</Text>
              <Sakelar aktif={pengingat} onUbah={ubahPengingat} label="Pengingat sebelum berangkat" />
            </View>
            <Pressable style={[styles.baris, styles.garisBawah]} onPress={privasi} accessibilityRole="button">
              <Lock size={20} color={colors.brand.biru} strokeWidth={2} />
              <Text style={[t('semibold', 14, colors.teks.utama), { flex: 1 }]}>Privasi lokasi</Text>
              <ChevronRight size={18} color={colors.teks.samar} strokeWidth={2} />
            </Pressable>
            <Pressable style={styles.baris} onPress={keluar} accessibilityRole="button">
              <LogOut size={18} color={colors.risiko.hindari} strokeWidth={2} />
              <Text style={t('extrabold', 14, colors.risiko.hindari)}>Keluar</Text>
            </Pressable>
          </View>

          <Text style={[t('extrabold', 11, colors.teks.samar), styles.label]}>LAPORAN TERAKHIRMU</Text>
          <View style={[styles.kartu, { paddingVertical: memuatAwal ? 12 : 0 }]}>
            {memuatAwal ? (
              <View style={{ gap: 12 }}>
                <Skeleton tinggi={36} />
                <Skeleton tinggi={36} />
              </View>
            ) : data?.galatLaporan ? (
              <GalatBagian pesan="Laporanmu belum bisa dimuat." galat={data.galatLaporan} onCobaLagi={muatUlang} />
            ) : data?.laporan.length ? (
              data.laporan.slice(0, 5).map((r, i, arr) => (
                <ItemTitikRawan
                  key={r.id}
                  jenis={r.confidence_score >= 0.6 ? 'Aktif' : 'Mereda'}
                  ikon={<IkonJenis jenis={r.incident_type} size={16} color={colors.teks.terbalik} strokeWidth={1.75} />}
                  judul={(JENIS[r.incident_type] || JENIS.genangan).label}
                  keterangan={`${hariJam(r.created_at)} · ${r.confirmations} warga setuju`}
                  nilai={`${Math.round(r.confidence_score * 100)}%`}
                  fraksi={r.confidence_score}
                  onPress={
                    r.hazard_id
                      ? () => navigation.navigate('PetaTab', { screen: 'DetailTitikRawan', params: { id: r.hazard_id }, initial: false })
                      : undefined
                  }
                  terakhir={i === arr.length - 1}
                />
              ))
            ) : (
              <KeadaanKosong
                Ikon={Megaphone}
                judul="Belum ada laporan aktif"
                pesan="Laporanmu tampil di sini selama masih aktif (3 jam)."
                labelAksi="Lapor kondisi jalan"
                onAksi={() => navigation.navigate('LaporTab')}
              />
            )}
          </View>

          <View style={styles.reputasi}>
            <Sparkles size={16} color={colors.teks.samar} strokeWidth={2} />
            <Text style={[t('semibold', 13, colors.teks.sekunder), { flex: 1 }]}>Reputasi pelapor</Text>
            <Text style={t('bold', 11, colors.teks.samar)}>Segera hadir</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  layar: { flex: 1, backgroundColor: colors.permukaan.latar },
  header: { overflow: 'hidden', borderBottomLeftRadius: radius.header, borderBottomRightRadius: radius.header },
  tekstur: { position: 'absolute', left: 0 },
  identitas: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, gap: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: colors.permukaan.kartu,
    backgroundColor: colors.brand.langit100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nama: { flex: 1, gap: 3, paddingTop: 6 },
  isi: { paddingHorizontal: 16 },
  statistik: {
    borderRadius: radius.kartu,
    backgroundColor: colors.permukaan.kartu,
    shadowColor: '#08244A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  barisStat: { height: 76, flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  galatStat: { marginHorizontal: 16, borderTopWidth: 1, borderTopColor: colors.garis.halus },
  kolomStat: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  pemisah: { width: 1, height: 32, backgroundColor: colors.garis.halus },
  stat: { flex: 1, alignItems: 'center', gap: 1 },
  kartu: {
    backgroundColor: colors.permukaan.kartu,
    borderWidth: 1,
    borderColor: colors.garis.halus,
    borderRadius: radius.kartu,
    paddingHorizontal: 16,
  },
  baris: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 },
  garisBawah: { borderBottomWidth: 1, borderBottomColor: colors.garis.halus },
  label: { letterSpacing: 0.66, marginTop: 20, marginBottom: 8, marginLeft: 4 },
  reputasi: {
    marginTop: 14,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.garis.halus,
  },
});
