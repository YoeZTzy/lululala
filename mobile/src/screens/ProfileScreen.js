import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import ApiService from '../services/ApiService';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(false);
  const [healthError, setHealthError] = useState('');

  async function checkApi() {
    setChecking(true);
    setHealthError('');
    try {
      const res = await ApiService.healthCheck();
      setHealth(res);
    } catch (err) {
      setHealth(null);
      setHealthError(err.message || 'Server tidak dapat dijangkau.');
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    checkApi();
  }, []);

  async function handleClearCache() {
    await ApiService.clearOfflineCache();
    Alert.alert('Cache Dibersihkan', 'Data cache offline berhasil dihapus.');
  }

  function handleLogout() {
    Alert.alert('Keluar Akun', 'Apakah Anda yakin ingin keluar dari Lululala?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name || 'K').slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name || 'Komuter Bandung'}</Text>
        <Text style={styles.email}>{user?.email || '-'}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>Komuter Kota Bandung · Akun Terverifikasi JWT</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status Koneksi Microservice STB</Text>
        <Text style={styles.endpointText}>{ApiService.baseUrl}/health</Text>

        {checking ? (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color="#0284C7" />
            <Text style={styles.statusMuted}>Memeriksa koneksi...</Text>
          </View>
        ) : health ? (
          <View style={styles.okBox}>
            <Text style={styles.okTitle}>● Terhubung (200 OK · {health.latencyMs} ms)</Text>
            <Text style={styles.okSub}>
              Service: {health.service} · Context: {(health.bounded_contexts || []).join(', ')}
            </Text>
          </View>
        ) : (
          <View style={styles.errBox}>
            <Text style={styles.errTitle}>● Tidak Terjangkau</Text>
            <Text style={styles.errSub}>{healthError || 'Belum diuji.'}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.testBtn} onPress={checkApi} disabled={checking}>
          <Text style={styles.testBtnText}>Uji Koneksi API Sekarang</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Informasi Proyek</Text>
        <Text style={styles.infoLine}>Aplikasi: Lululala (LintasSiaga)</Text>
        <Text style={styles.infoLine}>Kelas / Subdomain: K01 · lululala.stei.fun</Text>
        <Text style={styles.infoLine}>Mata Kuliah: II3160 TST × II3140 PWAM, STEI ITB</Text>
        <Text style={styles.infoLine}>
          Tim: Abdullah Ahmad Yusuf (18224073) & Sirojul Firdaus (18224095)
        </Text>
      </View>

      <TouchableOpacity style={styles.secondaryBtn} onPress={handleClearCache}>
        <Text style={styles.secondaryBtnText}>Bersihkan Cache Offline</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Keluar (Logout)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { padding: 16, paddingBottom: 36 },
  profileCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  name: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  email: { color: '#94A3B8', fontSize: 13, marginTop: 3 },
  rolePill: {
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 10,
  },
  roleText: { color: '#38BDF8', fontSize: 12, fontWeight: '600' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 1,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  endpointText: { fontSize: 12, color: '#0284C7', marginBottom: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 },
  statusMuted: { color: '#64748B', fontSize: 13 },
  okBox: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  okTitle: { color: '#15803D', fontWeight: '800', fontSize: 13 },
  okSub: { color: '#166534', fontSize: 12, marginTop: 4 },
  errBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  errTitle: { color: '#B91C1C', fontWeight: '800', fontSize: 13 },
  errSub: { color: '#991B1B', fontSize: 12, marginTop: 4 },
  testBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  testBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  infoLine: { fontSize: 13, color: '#334155', marginTop: 4, lineHeight: 19 },
  secondaryBtn: {
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryBtnText: { color: '#334155', fontWeight: '700', fontSize: 14 },
  logoutBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});
