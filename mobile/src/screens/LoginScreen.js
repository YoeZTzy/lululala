import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import { Lock, Mail } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ilustrasiRute } from '../assets/svg';
import { Input, LogoTanda, Tombol } from '../components';
import BilahStatus from '../components/BilahStatus';
import { titikGradien } from '../components/gradien';
import { useAuth } from '../context/AuthContext';
import { colors, radius, t } from '../theme';
import { cekEmail } from '../utils/validasi';

// Gradien layar Login dari Figma: 106.23deg, #0C447C 7.14% -> #378ADD 78.57%.
const GRADIEN_LOGIN = { sudut: 106.23, warna: ['#0C447C', '#378ADD'], lokasi: [0.0714, 0.7857] };

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const g = titikGradien(GRADIEN_LOGIN.sudut, width, height);
  const refPassword = useRef(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [galat, setGalat] = useState({});
  const [pesan, setPesan] = useState('');
  const [memuat, setMemuat] = useState(false);

  async function masuk() {
    const g2 = { email: cekEmail(email), password: password ? null : 'Password wajib diisi' };
    setGalat(g2);
    setPesan('');
    if (g2.email || g2.password) return;
    setMemuat(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setPesan(err.status === 401 ? 'Email atau password salah.' : err.message);
    } finally {
      setMemuat(false);
    }
  }

  return (
    <LinearGradient colors={GRADIEN_LOGIN.warna} locations={GRADIEN_LOGIN.lokasi} start={g.start} end={g.end} style={styles.layar}>
      <BilahStatus gaya="light" />
      <View style={[styles.ilustrasi, { top: insets.top + 60 }]} pointerEvents="none">
        <SvgXml xml={ilustrasiRute} width={306} height={374} />
      </View>
      <KeyboardAvoidingView style={styles.layar} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.gulir} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={[styles.atas, { paddingTop: insets.top + 32 }]}>
            <View style={styles.logo}>
              <LogoTanda size={36} />
              <Text style={t('extrabold', 20, colors.teks.terbalik)}>LintasSiaga</Text>
            </View>
            <Text style={styles.judul}>Tahu rutemu aman{'\n'}sebelum berangkat.</Text>
            <Text style={[t('medium', 13, colors.teks.terbalik), styles.sub]}>
              Kondisi jalan dari warga, diperbarui tiap menit.
            </Text>
          </View>

          <View style={[styles.lembar, { paddingBottom: 24 + insets.bottom }]}>
            <View style={styles.kepala}>
              <Text style={t('extrabold', 22, colors.teks.utama)}>Masuk</Text>
              <Text style={t('medium', 13, colors.teks.sekunder)}>Lihat kondisi rutemu pagi ini.</Text>
            </View>
            <Input
              label="Email"
              Ikon={Mail}
              placeholder="nama@email.com"
              value={email}
              onChangeText={setEmail}
              galat={galat.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => refPassword.current?.focus()}
            />
            <Input
              ref={refPassword}
              label="Password"
              Ikon={Lock}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              galat={galat.password}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={masuk}
            />
            {pesan ? (
              <Text style={t('semibold', 12, colors.risiko.hindariTeks)} accessibilityRole="alert">
                {pesan}
              </Text>
            ) : null}
            <Tombol label="Masuk" onPress={masuk} memuat={memuat} />
            <Pressable onPress={() => navigation.navigate('Daftar')} style={styles.keDaftar} accessibilityRole="link">
              <Text style={t('medium', 13, colors.teks.sekunder)}>Belum punya akun?</Text>
              <Text style={t('extrabold', 13, colors.brand.biru)}>Daftar</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  layar: { flex: 1 },
  ilustrasi: { position: 'absolute', left: 24 },
  gulir: { flexGrow: 1, justifyContent: 'space-between' },
  atas: { paddingHorizontal: 24, minHeight: 300 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  judul: { ...t('extrabold', 28, colors.teks.terbalik), lineHeight: 33, letterSpacing: -0.56, marginTop: 24 },
  sub: { marginTop: 10 },
  lembar: {
    backgroundColor: colors.permukaan.kartu,
    borderTopLeftRadius: radius.header,
    borderTopRightRadius: radius.header,
    paddingTop: 26,
    paddingHorizontal: 24,
    gap: 14,
  },
  kepala: { gap: 4 },
  keDaftar: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
});
