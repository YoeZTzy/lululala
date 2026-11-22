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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ navigation }) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const errs = {};
    if (name.trim().length < 2) {
      errs.name = 'Nama lengkap minimal 2 karakter.';
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      errs.email = 'Masukkan alamat email yang valid.';
    }
    if (password.length < 6) {
      errs.password = 'Password minimal 6 karakter.';
    }
    if (confirmPassword !== password) {
      errs.confirmPassword = 'Konfirmasi password tidak cocok.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleRegister() {
    setErrorMsg('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      await signUp(name, email, password);
    } catch (err) {
      setErrorMsg(err.message || 'Registrasi gagal.');
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
        <View style={styles.card}>
          <Text style={styles.title}>Daftar Akun Komuter</Text>
          <Text style={styles.subtitle}>
            Buat akun untuk melapor kondisi jalan dan memantau rute rutin Anda di Kota Bandung.
          </Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{errorMsg}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Nama Lengkap</Text>
          <TextInput
            style={[styles.input, fieldErrors.name && styles.inputError]}
            placeholder="Contoh: Budi Santoso"
            placeholderTextColor="#94A3B8"
            value={name}
            onChangeText={setName}
            editable={!submitting}
          />
          {fieldErrors.name ? <Text style={styles.fieldError}>{fieldErrors.name}</Text> : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, fieldErrors.email && styles.inputError]}
            placeholder="budi@itb.ac.id"
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

          <Text style={styles.label}>Konfirmasi Password</Text>
          <TextInput
            style={[styles.input, fieldErrors.confirmPassword && styles.inputError]}
            placeholder="Ulangi password"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!submitting}
          />
          {fieldErrors.confirmPassword ? (
            <Text style={styles.fieldError}>{fieldErrors.confirmPassword}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, submitting && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Daftar & Masuk</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.goBack()}
            disabled={submitting}
          >
            <Text style={styles.linkText}>
              Sudah punya akun? <Text style={styles.linkBold}>Kembali ke Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0F172A' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 4,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 14, lineHeight: 19 },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  errorBoxText: { color: '#991B1B', fontSize: 13 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 10 },
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
    marginTop: 20,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.65 },
  linkRow: { marginTop: 18, alignItems: 'center' },
  linkText: { color: '#475569', fontSize: 14 },
  linkBold: { color: '#0284C7', fontWeight: '700' },
});
