import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import ApiService from '../services/ApiService';
import {
  BANDUNG_LOCATIONS,
  INCIDENT_MAP,
  INCIDENT_TYPES,
  formatRelativeTime,
} from '../constants/bandungPresets';

export default function ReportsScreen() {
  const { token } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offlineNote, setOfflineNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [votingId, setVotingId] = useState(null);

  // State modal Lapor Cepat (< 30 detik)
  const [modalVisible, setModalVisible] = useState(false);
  const [incidentType, setIncidentType] = useState('genangan');
  const [severity, setSeverity] = useState(3);
  const [latStr, setLatStr] = useState(String(BANDUNG_LOCATIONS[2].lat));
  const [lonStr, setLonStr] = useState(String(BANDUNG_LOCATIONS[2].lon));
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadReports = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setErrorMsg('');
      setOfflineNote('');
      try {
        const res = await ApiService.getReports(token);
        setReports(res.data?.items || []);
        if (res.fromCache) {
          setOfflineNote(
            `Mode offline: menampilkan laporan terakhir (${formatRelativeTime(res.cachedAt)}).`
          );
        }
      } catch (err) {
        setErrorMsg(err.message || 'Gagal memuat daftar laporan.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadReports(false);
  }, [loadReports]);

  async function handleVote(reportId, type) {
    setVotingId(reportId);
    try {
      const res =
        type === 'confirm'
          ? await ApiService.confirmReport(token, reportId)
          : await ApiService.disputeReport(token, reportId);
      Alert.alert(
        type === 'confirm' ? 'Konfirmasi Tercatat' : 'Bantahan Tercatat',
        `Skor keyakinan laporan kini ${Math.round(res.confidence_score * 100)}%.`
      );
      await loadReports(true);
    } catch (err) {
      Alert.alert('Tidak Dapat Memproses', err.message || 'Terjadi kesalahan.');
    } finally {
      setVotingId(null);
    }
  }

  function applyPreset(loc) {
    setLatStr(String(loc.lat));
    setLonStr(String(loc.lon));
    if (!description.trim()) {
      setDescription(`Kejadian di sekitar ${loc.label}`);
    }
  }

  async function handleCreateReport() {
    setFormError('');
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setFormError('Koordinat latitude/longitude tidak valid.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await ApiService.createReport(token, {
        incident_type: incidentType,
        severity,
        lat,
        lon,
        description: description.trim(),
      });
      setModalVisible(false);
      setDescription('');
      Alert.alert(
        'Laporan Terkirim',
        `Laporan #${res.id} tercatat dengan skor keyakinan awal ${Math.round(res.confidence_score * 100)}%.`
      );
      await loadReports(true);
    } catch (err) {
      setFormError(err.message || 'Gagal mengirim laporan.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0284C7" />
        <Text style={styles.loadingText}>Memuat laporan warga sekitar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadReports(true)} />
        }
      >
        <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.createBtnText}>+ Lapor Kondisi Jalan (&lt; 30 Detik)</Text>
        </TouchableOpacity>

        {offlineNote ? (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>📡 {offlineNote}</Text>
          </View>
        ) : null}

        {errorMsg ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMsg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadReports(false)}>
              <Text style={styles.retryBtnText}>Muat Ulang</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {reports.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Belum ada laporan aktif dalam 3 jam terakhir.</Text>
          </View>
        ) : (
          reports.map((rep) => {
            const meta = INCIDENT_MAP[rep.incident_type] || {
              label: rep.incident_type,
              icon: '🚧',
              color: '#334155',
              bg: '#F1F5F9',
            };
            const scorePct = Math.round((rep.confidence_score || 0) * 100);
            const isBusy = votingId === rep.id;
            const disabledVote = rep.is_mine || Boolean(rep.my_vote) || isBusy;

            return (
              <View key={rep.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={[styles.typeChip, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.typeChipText, { color: meta.color }]}>
                      {meta.icon} {meta.label} · Lv.{rep.severity}
                    </Text>
                  </View>
                  <Text style={styles.sourceTag}>
                    {rep.source === 'petabencana' ? 'Resmi PetaBencana' : 'Warga'}
                  </Text>
                </View>

                <Text style={styles.desc}>
                  {rep.description || 'Laporan kondisi jalan tanpa keterangan tambahan.'}
                </Text>

                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Skor Keyakinan: {scorePct}%</Text>
                  <Text style={styles.timeText}>{formatRelativeTime(rep.created_at)}</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, scorePct)}%`,
                        backgroundColor: scorePct >= 60 ? '#16A34A' : '#0284C7',
                      },
                    ]}
                  />
                </View>

                <Text style={styles.coordText}>
                  📍 {Number(rep.lat).toFixed(4)}, {Number(rep.lon).toFixed(4)} · 👍 {rep.confirmations ?? 0} · 👎 {rep.disputes ?? 0}
                </Text>

                {rep.is_mine ? (
                  <Text style={styles.noteText}>Laporan Anda sendiri (tidak dapat diverifikasi sendiri)</Text>
                ) : rep.my_vote ? (
                  <Text style={styles.noteText}>
                    Anda sudah memberikan {rep.my_vote === 'confirmation' ? 'Konfirmasi' : 'Bantahan'}
                  </Text>
                ) : (
                  <View style={styles.voteRow}>
                    <TouchableOpacity
                      style={[styles.confirmBtn, disabledVote && styles.btnDisabled]}
                      onPress={() => handleVote(rep.id, 'confirm')}
                      disabled={disabledVote}
                    >
                      <Text style={styles.confirmBtnText}>
                        {isBusy ? '...' : '✓ Konfirmasi (+0.20)'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.disputeBtn, disabledVote && styles.btnDisabled]}
                      onPress={() => handleVote(rep.id, 'dispute')}
                      disabled={disabledVote}
                    >
                      <Text style={styles.disputeBtnText}>
                        {isBusy ? '...' : '✕ Bantah (-0.25)'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Lapor Kondisi Jalan</Text>
              <Text style={styles.modalSub}>
                Maksimal 5 laporan/jam. Skor awal 45% dan masa berlaku 3 jam.
              </Text>

              {formError ? <Text style={styles.formError}>{formError}</Text> : null}

              <Text style={styles.label}>Jenis Kejadian</Text>
              <View style={styles.chipWrap}>
                {INCIDENT_TYPES.map((item) => {
                  const active = incidentType === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.selectChip,
                        active && { backgroundColor: item.color, borderColor: item.color },
                      ]}
                      onPress={() => setIncidentType(item.key)}
                    >
                      <Text style={[styles.selectChipText, active && { color: '#FFFFFF' }]}>
                        {item.icon} {item.shortLabel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Tingkat Keparahan (1 = Ringan, 5 = Parah)</Text>
              <View style={styles.sevRow}>
                {[1, 2, 3, 4, 5].map((lv) => (
                  <TouchableOpacity
                    key={lv}
                    style={[styles.sevBtn, severity === lv && styles.sevBtnActive]}
                    onPress={() => setSeverity(lv)}
                  >
                    <Text style={[styles.sevBtnText, severity === lv && styles.sevBtnTextActive]}>
                      {lv}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Pilih Cepat Lokasi Bandung</Text>
              <View style={styles.chipWrap}>
                {BANDUNG_LOCATIONS.slice(0, 6).map((loc) => (
                  <TouchableOpacity
                    key={loc.label}
                    style={styles.presetChip}
                    onPress={() => applyPreset(loc)}
                  >
                    <Text style={styles.presetChipText}>{loc.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.coordRow}>
                <View style={styles.coordCol}>
                  <Text style={styles.label}>Latitude</Text>
                  <TextInput
                    style={styles.input}
                    value={latStr}
                    onChangeText={setLatStr}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.coordCol}>
                  <Text style={styles.label}>Longitude</Text>
                  <TextInput
                    style={styles.input}
                    value={lonStr}
                    onChangeText={setLonStr}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.label}>Keterangan Singkat (Opsional)</Text>
              <TextInput
                style={[styles.input, { minHeight: 68, textAlignVertical: 'top' }]}
                placeholder="Mis. Genangan setinggi betis depan gerbang tol Pasteur"
                placeholderTextColor="#94A3B8"
                multiline
                value={description}
                onChangeText={setDescription}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                  disabled={submitting}
                >
                  <Text style={styles.cancelBtnText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, submitting && styles.btnDisabled]}
                  onPress={handleCreateReport}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Kirim Laporan</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
  loadingText: { marginTop: 12, color: '#475569' },
  createBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
    elevation: 2,
  },
  createBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
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
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: '#991B1B', fontSize: 13 },
  retryBtn: {
    backgroundColor: '#DC2626',
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 8,
  },
  retryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, alignItems: 'center' },
  emptyText: { color: '#64748B', fontSize: 13 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  typeChipText: { fontWeight: '700', fontSize: 12 },
  sourceTag: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  desc: { fontSize: 14, color: '#0F172A', marginTop: 10, lineHeight: 20 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  scoreLabel: { fontSize: 12, fontWeight: '700', color: '#334155' },
  timeText: { fontSize: 11, color: '#64748B' },
  progressTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: 5,
  },
  progressFill: { height: 6, borderRadius: 99 },
  coordText: { fontSize: 12, color: '#64748B', marginTop: 8 },
  noteText: { fontSize: 12, color: '#475569', fontStyle: 'italic', marginTop: 10 },
  voteRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#15803D', fontWeight: '700', fontSize: 13 },
  disputeBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  disputeBtnText: { color: '#B91C1C', fontWeight: '700', fontSize: 13 },
  btnDisabled: { opacity: 0.6 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 19, fontWeight: '800', color: '#0F172A' },
  modalSub: { fontSize: 12, color: '#64748B', marginTop: 4, marginBottom: 10 },
  formError: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 8,
  },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 10, marginBottom: 6 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectChip: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  selectChipText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  sevRow: { flexDirection: 'row', gap: 8 },
  sevBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  sevBtnActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  sevBtnText: { fontWeight: '700', color: '#334155' },
  sevBtnTextActive: { color: '#FFFFFF' },
  presetChip: {
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  presetChipText: { color: '#0369A1', fontSize: 12, fontWeight: '600' },
  coordRow: { flexDirection: 'row', gap: 10 },
  coordCol: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18, marginBottom: 10 },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#334155', fontWeight: '700' },
  submitBtn: {
    flex: 2,
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700' },
});
