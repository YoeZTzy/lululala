import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import ApiService from '../services/ApiService';
import {
  INCIDENT_MAP,
  RISK_STYLES,
  formatRelativeTime,
} from '../constants/bandungPresets';

export default function HomeScreen() {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [hazards, setHazards] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offlineNote, setOfflineNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setErrorMsg('');
      setOfflineNote('');

      try {
        const [sumRes, hazRes, alertRes] = await Promise.all([
          ApiService.getSummary(),
          ApiService.getHazards(),
          ApiService.getAlerts(token),
        ]);

        setSummary(sumRes.data);
        setHazards(hazRes.data?.hazards || []);
        setAlerts(alertRes.data?.items || []);

        if (sumRes.fromCache || hazRes.fromCache || alertRes.fromCache) {
          const ts = sumRes.cachedAt || hazRes.cachedAt || alertRes.cachedAt;
          setOfflineNote(
            `Mode offline: menampilkan data terakhir (${formatRelativeTime(ts)}).`
          );
        }
      } catch (err) {
        setErrorMsg(err.message || 'Gagal memuat kondisi jalan Kota Bandung.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0284C7" />
        <Text style={styles.loadingText}>Memuat kondisi jalan Kota Bandung...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />
      }
    >
      <View style={styles.headerBanner}>
        <Text style={styles.greeting}>Halo, {user?.name || 'Komuter'} 👋</Text>
        <Text style={styles.headerSub}>Ringkasan Kondisi Jalan Kota Bandung</Text>
      </View>

      {offlineNote ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>📡 {offlineNote}</Text>
        </View>
      ) : null}

      {errorMsg ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Koneksi Bermasalah</Text>
          <Text style={styles.errorDesc}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadData(false)}>
            <Text style={styles.retryBtnText}>Coba Muat Ulang</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {summary ? (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{summary.active_hazards ?? 0}</Text>
            <Text style={styles.statLabel}>Titik Rawan Aktif</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {summary.weather?.rain_mm ?? 0} mm
            </Text>
            <Text style={styles.statLabel}>Curah Hujan</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {summary.weather?.weather_factor ?? 0}
            </Text>
            <Text style={styles.statLabel}>Faktor Cuaca</Text>
          </View>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Peringatan Rute Terbaru ({alerts.length})</Text>
      {alerts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Belum ada peringatan risiko tinggi pada rute rutin Anda.
          </Text>
        </View>
      ) : (
        alerts.slice(0, 5).map((alert) => {
          const rs = RISK_STYLES[alert.risk_level] || RISK_STYLES.Waspada;
          return (
            <View
              key={alert.id}
              style={[
                styles.alertCard,
                { backgroundColor: rs.bg, borderColor: rs.border },
              ]}
            >
              <View style={styles.rowBetween}>
                <Text style={[styles.alertBadge, { color: rs.color }]}>
                  ⚠️ {alert.risk_level}
                </Text>
                <Text style={styles.timeText}>{formatRelativeTime(alert.created_at)}</Text>
              </View>
              <Text style={styles.alertMsg}>{alert.message}</Text>
            </View>
          );
        })
      )}

      <Text style={styles.sectionTitle}>Titik Rawan Terverifikasi ({hazards.length})</Text>
      {hazards.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Tidak ada titik rawan aktif saat ini. Jalanan Bandung relatif kondusif.
          </Text>
        </View>
      ) : (
        hazards.map((hz) => {
          const meta = INCIDENT_MAP[hz.incident_type] || {
            label: hz.incident_type,
            icon: '🚧',
            color: '#334155',
            bg: '#F1F5F9',
          };
          const isAktif = hz.status === 'Aktif';
          return (
            <View key={hz.id} style={styles.hazardCard}>
              <View style={styles.rowBetween}>
                <View style={[styles.typeChip, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.typeChipText, { color: meta.color }]}>
                    {meta.icon} {meta.label}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: isAktif ? '#FEE2E2' : '#FEF3C7' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: isAktif ? '#B91C1C' : '#B45309' },
                    ]}
                  >
                    {hz.status}
                  </Text>
                </View>
              </View>

              <View style={styles.metaGrid}>
                <Text style={styles.metaItem}>Keparahan: {hz.severity}/5</Text>
                <Text style={styles.metaItem}>
                  Skor Keyakinan: {Math.round(hz.confidence_score * 100)}%
                </Text>
                <Text style={styles.metaItem}>Laporan: {hz.report_count}</Text>
              </View>

              <View style={styles.rowBetween}>
                <Text style={styles.coordText}>
                  📍 {Number(hz.lat).toFixed(4)}, {Number(hz.lon).toFixed(4)}
                </Text>
                <Text style={styles.timeText}>{formatRelativeTime(hz.updated_at)}</Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
  loadingText: { marginTop: 12, color: '#475569', fontSize: 14 },
  headerBanner: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  greeting: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  headerSub: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  offlineText: { color: '#92400E', fontSize: 12, fontWeight: '600' },
  errorCard: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  errorTitle: { color: '#991B1B', fontWeight: '700', fontSize: 15 },
  errorDesc: { color: '#7F1D1D', fontSize: 13, marginTop: 4 },
  retryBtn: {
    backgroundColor: '#DC2626',
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 10,
  },
  retryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0284C7' },
  statLabel: { fontSize: 11, color: '#64748B', marginTop: 4, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 10, marginTop: 4 },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  emptyText: { color: '#64748B', fontSize: 13, textAlign: 'center' },
  alertCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  alertBadge: { fontWeight: '800', fontSize: 13 },
  alertMsg: { color: '#1E293B', fontSize: 13, marginTop: 6, lineHeight: 19 },
  hazardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  typeChipText: { fontWeight: '700', fontSize: 13 },
  statusPill: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontWeight: '700', fontSize: 12 },
  metaGrid: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
  metaItem: { fontSize: 12, color: '#334155', fontWeight: '600' },
  coordText: { fontSize: 12, color: '#64748B' },
  timeText: { fontSize: 11, color: '#64748B' },
});
