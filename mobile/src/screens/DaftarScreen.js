import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CircleUser, Lock, Mail } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderRingkas, Input, Tombol } from '../components';
import BilahStatus from '../components/BilahStatus';
import { useAuth } from '../context/AuthContext';
import { colors, radius, t } from '../theme';
import { cekEmail, cekNama, cekPassword } from '../utils/validasi';

export default function DaftarScreen({ navigation }) {
  const { signUp } = useAuth();
  const insets = useSafeAreaInsets();
  const refEmail = useRef(null);
  const refPassword = useRef(null);
  const refUlang = useRef(null);

  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ulang, setUlang] = useState('');
  const [galat, setGalat] = useState({});
  const [pesan, setPesan] = useState('');
  const [memuat, setMemuat] = useState(false);

  async function daftar() {
    const g = {
      nama: cekNama(nama),
      email: cekEmail(email),
      password: cekPassword(password),
      ulang: ulang !== password ? 'Password belum sama' : null,
    };
    setGalat(g);
    setPesan('');
    if (Object.values(g).some(Boolean)) return;
    setMemuat(true);
    try {
      await signUp(nama, email, password);
    } catch (err) {
      if (err.status === 409) setGalat({ email: 'Email ini sudah terdaftar. Coba masuk.' });
      else setPesan(err.message);
    } finally {
      setMemuat(false);
    }
  }

  return (
    <View style={styles.layar}>
      <BilahStatus gaya="light" />
      <HeaderRingkas judul="Buat akun" sub="Satu akun untuk semua rute harianmu" onKembali={navigation.goBack} />
      <KeyboardAvoidingView style={styles.layar} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Input
            label="Nama"
            Ikon={CircleUser}
            placeholder="Nama lengkap"
            value={nama}
            onChangeText={setNama}
            galat={galat.nama}
            autoComplete="name"
            textContentType="name"
            maxLength={100}
            returnKeyType="next"
            onSubmitEditing={() => refEmail.current?.focus()}
          />
          <Input
            ref={refEmail}
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
            placeholder="Minimal 6 karakter"
            value={password}
            onChangeText={setPassword}
            galat={galat.password}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            maxLength={128}
            returnKeyType="next"
            onSubmitEditing={() => refUlang.current?.focus()}
          />
          <Input
            ref={refUlang}
            label="Konfirmasi password"
            Ikon={Lock}
            placeholder="Ulangi password"
            value={ulang}
            onChangeText={setUlang}
            galat={galat.ulang}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={daftar}
          />
          <View style={styles.privasi}>
            <Lock size={16} color={colors.brand.biru} strokeWidth={2} />
            <Text style={[t('medium', 12, colors.brand.biruTua), styles.privasiTeks]}>
              Rute rumah dan kantormu bersifat privat. Hanya kamu yang bisa melihatnya.
            </Text>
          </View>
          {pesan ? (
            <Text style={t('semibold', 12, colors.risiko.hindariTeks)} accessibilityRole="alert">
              {pesan}
            </Text>
          ) : null}
        </ScrollView>
        <View style={[styles.bawah, { paddingBottom: 28 + insets.bottom }]}>
          <Tombol label="Buat akun" onPress={daftar} memuat={memuat} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  layar: { flex: 1, backgroundColor: colors.permukaan.latar },
  form: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16, gap: 18 },
  privasi: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.tombol,
    backgroundColor: colors.brand.langit50,
  },
  privasiTeks: { flex: 1, lineHeight: 17.4 },
  bawah: { paddingHorizontal: 16, paddingTop: 8 },
});
