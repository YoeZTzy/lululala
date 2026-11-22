import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import ApiService from '../services/ApiService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }) {
  const { signIn, signInDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const errs = {};
    if (!email.trim()) {
      errs.email = 'Email wajib diisi.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errs.email = 'Format email tidak valid.';
    }
    if (!password) {
      errs.password = 'Password wajib diisi.';
    } else if (password.length < 6) {
      errs.password = 'Password minimal 6 karakter.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleLogin() {
    setErrorMsg('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal masuk ke akun.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDemoLogin() {
    setErrorMsg('');
    setFieldErrors({});
    setSubmitting(true);
    try {
      await signInDemo();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal login akun demo. Cek status server.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.badge}>SMART CITY & MOBILITY · K01</Text>
          <Text style={styles.title}>Lululala</Text>
          <Text style={styles.subtitle}>
            LintasSiaga — Pemantau kondisi jalan & penilaian risiko rute rutin komuter Kota Bandung.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Masuk Akun Komuter</Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{errorMsg}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, fieldErrors.email && styles.inputError]}
            placeholder="nama@email.com"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={!submitting}
          />
          {fieldErrors.email ? <Text style={styles.fieldError}>{fieldErrors.email}</Text> : null}

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={[styles.input, fieldErrors.password && styles.inputError]}
            placeholder="Minimal 6 karakter"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!submitting}
          />
          {fieldErrors.password ? <Text style={styles.fieldError}>{fieldErrors.password}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryBtn, submitting && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Masuk</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>atau uji cepat</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.demoBtn, submitting && styles.btnDisabled]}
            onPress={handleDemoLogin}
            disabled={submitting}
          >
            <Text style={styles.demoBtnText}>Masuk Akun Demo (demo@lululala.id)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('Daftar')}
            disabled={submitting}
          >
            <Text style={styles.linkText}>
              Belum punya akun? <Text style={styles.linkBold}>Daftar di sini</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>API Server: {ApiService.baseUrl}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0F172A' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  hero: { marginBottom: 24 },
  badge: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: { color: '#FFFFFF', fontSize: 34, fontWeight: '800' },
  subtitle: { color: '#CBD5E1', fontSize: 14, marginTop: 6, lineHeight: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: { fontSize: 19, fontWeight: '700', color: '#0F172A', marginBottom: 14 },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorBoxText: { color: '#991B1B', fontSize: 13 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  inputError: { borderColor: '#DC2626' },
  fieldError: { color: '#DC2626', fontSize: 12, marginTop: 4 },
  primaryBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.65 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { marginHorizontal: 10, color: '#64748B', fontSize: 12 },
  demoBtn: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  demoBtnText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  linkRow: { marginTop: 18, alignItems: 'center' },
  linkText: { color: '#475569', fontSize: 14 },
  linkBold: { color: '#0284C7', fontWeight: '700' },
  footerText: { color: '#64748B', fontSize: 11, textAlign: 'center', marginTop: 20 },
});
