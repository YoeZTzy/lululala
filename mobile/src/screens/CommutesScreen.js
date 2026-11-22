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
  RISK_STYLES,
  formatRelativeTime,
} from '../constants/bandungPresets';

export default function CommutesScreen() {
  const { token } = useAuth();
  const [commutes, setCommutes] = useState([]);
  const [riskResults, setRiskResults] = useState({});
  const [checkingId, setCheckingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offlineNote, setOfflineNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modal Create / Edit
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [originLat, setOriginLat] = useState(String(BANDUNG_LOCATIONS[1].lat));
  const [originLon, setOriginLon] = useState(String(BANDUNG_LOCATIONS[1].lon));
  const [destLat, setDestLat] = useState(String(BANDUNG_LOCATIONS[0].lat));
  const [destLon, setDestLon] = useState(String(BANDUNG_LOCATIONS[0].lon));
  const [days, setDays] = useState('Senin-Jumat');
  const [departureTime, setDepartureTime] = useState('06:45');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCommutes = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setErrorMsg('');
      setOfflineNote('');
      try {
        const res = await ApiService.getCommutes(token);
        setCommutes(res.data?.items || []);
        if (res.fromCache) {
          setOfflineNote(
            `Mode offline: menampilkan rute terakhir (${formatRelativeTime(res.cachedAt)}).`
          );
        }
      } catch (err) {
        setErrorMsg(err.message || 'Gagal memuat daftar rute rutin.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadCommutes(false);
  }, [loadCommutes]);

  function openCreateModal() {
    setEditingId(null);
    setName('Antapani -> ITB Ganesha');
    setOriginLat(String(BANDUNG_LOCATIONS[1].lat));
    setOriginLon(String(BANDUNG_LOCATIONS[1].lon));
    setDestLat(String(BANDUNG_LOCATIONS[0].lat));
    setDestLon(String(BANDUNG_LOCATIONS[0].lon));
    setDays('Senin-Jumat');
    setDepartureTime('06:45');
    setFormError('');
    setModalVisible(true);
  }

  function openEditModal(item) {
    setEditingId(item.id);
    setName(item.name);
    setOriginLat(String(item.origin_lat));
    setOriginLon(String(item.origin_lon));
    setDestLat(String(item.dest_lat));
    setDestLon(String(item.dest_lon));
    setDays(item.days);
    setDepartureTime(item.departure_time);
    setFormError('');
    setModalVisible(true);
  }

  async function handleSave() {
    setFormError('');
    if (name.trim().length < 2) {
      setFormError('Nama rute minimal 2 karakter.');
      return;
    }
    const oLat = parseFloat(originLat);
    const oLon = parseFloat(originLon);
    const dLat = parseFloat(destLat);
    const dLon = parseFloat(destLon);
    if ([oLat, oLon, dLat, dLon].some((n) => Number.isNaN(n))) {
      setFormError('Semua koordinat asal dan tujuan harus berupa angka valid.');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(departureTime.trim())) {
      setFormError('Jam berangkat harus berformat HH:MM (contoh: 06:45).');
      return;
    }

    const payload = {
      name: name.trim(),
      origin_lat: oLat,
      origin_lon: oLon,
      dest_lat: dLat,
      dest_lon: dLon,
      days: days.trim() || 'Senin-Jumat',
      departure_time: departureTime.trim(),
    };

    setSaving(true);
    try {
      if (editingId) {
        await ApiService.updateCommute(token, editingId, payload);
      } else {
        await ApiService.createCommute(token, payload);
      }
      setModalVisible(false);
      await loadCommutes(true);
    } catch (err) {
      setFormError(err.message || 'Gagal menyimpan rute rutin.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(item) {
    Alert.alert('Hapus Rute Rutin', `Yakin ingin menghapus rute "${item.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await ApiService.deleteCommute(token, item.id);
            await loadCommutes(true);
          } catch (err) {
            Alert.alert('Gagal Menghapus', err.message || 'Terjadi kesalahan.');
          }
        },
      },
    ]);
  }

  async function handleCheckRisk(commuteId) {
    setCheckingId(commuteId);
    try {
      const res = await ApiService.getCommuteRisk(token, commuteId);
      setRiskResults((prev) => ({ ...prev, [commuteId]: res }));
    } catch (err) {
      Alert.alert('Gagal Menilai Risiko', err.message || 'Periksa koneksi server.');
    } finally {
      setCheckingId(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0284C7" />
        <Text style={styles.loadingText}>Memuat rute rutin Anda...</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadCommutes(true)} />
        }
      >
        <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
          <Text style={styles.addBtnText}>+ Tambah Rute Rutin Baru</Text>
        </TouchableOpacity>

        {offlineNote ? (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>📡 {offlineNote}</Text>
          </View>
        ) : null}

        {errorMsg ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMsg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadCommutes(false)}>
              <Text style={styles.retryBtnText}>Muat Ulang</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {commutes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Anda belum menyimpan rute rutin. Tambahkan rute rumah ke kampus/kantor Anda.
            </Text>
          </View>
        ) : (
          commutes.map((item) => {
            const risk = riskResults[item.id];
            const rs = risk ? RISK_STYLES[risk.risk_level] || RISK_STYLES.Aman : null;
            const isChecking = checkingId === item.id;

            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.routeName}>{item.name}</Text>
                  <Text style={styles.scheduleBadge}>🕒 {item.departure_time}</Text>
                </View>
                <Text style={styles.daysText}>📅 {item.days}</Text>
                <Text style={styles.coordText}>
                  Asal: {Number(item.origin_lat).toFixed(4)}, {Number(item.origin_lon).toFixed(4)}
                </Text>
                <Text style={styles.coordText}>
                  Tujuan: {Number(item.dest_lat).toFixed(4)}, {Number(item.dest_lon).toFixed(4)}
                </Text>

                {risk && rs ? (
                  <View
                    style={[
                      styles.riskBox,
                      { backgroundColor: rs.bg, borderColor: rs.border },
                    ]}
                  >
                    <View style={styles.rowBetween}>
                      <Text style={[styles.riskTitle, { color: rs.color }]}>
                        Status: {risk.risk_level}
                      </Text>
                      <Text style={[styles.riskScore, { color: rs.color }]}>
                        Skor {risk.risk_score}
                      </Text>
                    </View>
                    <Text style={styles.riskDesc}>{rs.desc}</Text>
                    <Text style={styles.riskMeta}>
                      Faktor cuaca: {risk.weather_factor} · Mode: {risk.matching_mode} · Titik rawan: {risk.causes?.length || 0}
                    </Text>
                    {risk.causes && risk.causes.length > 0 ? (
                      <View style={styles.causesWrap}>
                        {risk.causes.map((c) => {
                          const meta = INCIDENT_MAP[c.incident_type] || {
                            icon: '🚧',
                            label: c.incident_type,
                          };
                          return (
                            <Text key={c.id} style={styles.causeItem}>
                              • {meta.icon} {meta.label} (Lv.{c.severity}, yakin {Math.round(c.confidence_score * 100)}%)
                            </Text>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.riskBtn}
                    onPress={() => handleCheckRisk(item.id)}
                    disabled={isChecking}
                  >
                    {isChecking ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.riskBtnText}>🔍 Cek Risiko</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                    <Text style={styles.delBtnText}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit Rute Rutin' : 'Tambah Rute Rutin'}
              </Text>

              {formError ? <Text style={styles.formError}>{formError}</Text> : null}

              <Text style={styles.label}>Nama Rute</Text>
              <TextInput
                style={styles.input}
                placeholder="Mis. Antapani -> ITB Ganesha"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>Preset Titik Asal</Text>
              <View style={styles.chipWrap}>
                {BANDUNG_LOCATIONS.slice(0, 5).map((loc) => (
                  <TouchableOpacity
                    key={`o-${loc.label}`}
                    style={styles.presetChip}
                    onPress={() => {
                      setOriginLat(String(loc.lat));
                      setOriginLon(String(loc.lon));
                    }}
                  >
                    <Text style={styles.presetChipText}>{loc.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.twoCol}>
                <TextInput
                  style={[styles.input, styles.colInput]}
                  placeholder="Origin Lat"
                  keyboardType="numeric"
                  value={originLat}
                  onChangeText={setOriginLat}
                />
                <TextInput
                  style={[styles.input, styles.colInput]}
                  placeholder="Origin Lon"
                  keyboardType="numeric"
                  value={originLon}
                  onChangeText={setOriginLon}
                />
              </View>

              <Text style={styles.label}>Preset Titik Tujuan</Text>
              <View style={styles.chipWrap}>
                {BANDUNG_LOCATIONS.slice(0, 5).map((loc) => (
                  <TouchableOpacity
                    key={`d-${loc.label}`}
                    style={styles.presetChip}
                    onPress={() => {
                      setDestLat(String(loc.lat));
                      setDestLon(String(loc.lon));
                    }}
                  >
                    <Text style={styles.presetChipText}>{loc.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.twoCol}>
                <TextInput
                  style={[styles.input, styles.colInput]}
                  placeholder="Dest Lat"
                  keyboardType="numeric"
                  value={destLat}
                  onChangeText={setDestLat}
                />
                <TextInput
                  style={[styles.input, styles.colInput]}
                  placeholder="Dest Lon"
                  keyboardType="numeric"
                  value={destLon}
                  onChangeText={setDestLon}
                />
              </View>

              <View style={styles.twoCol}>
                <View style={styles.colWrap}>
                  <Text style={styles.label}>Hari</Text>
                  <TextInput style={styles.input} value={days} onChangeText={setDays} />
                </View>
                <View style={styles.colWrap}>
                  <Text style={styles.label}>Jam Berangkat</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="06:45"
                    value={departureTime}
                    onChangeText={setDepartureTime}
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                  disabled={saving}
                >
                  <Text style={styles.cancelBtnText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Simpan Rute</Text>
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
  addBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  addBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
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
  emptyText: { color: '#64748B', fontSize: 13, textAlign: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routeName: { fontSize: 16, fontWeight: '800', color: '#0F172A', flex: 1, marginRight: 8 },
  scheduleBadge: {
    backgroundColor: '#E0F2FE',
    color: '#0369A1',
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
  },
  daysText: { fontSize: 13, color: '#475569', marginTop: 4 },
  coordText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  riskBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  riskTitle: { fontSize: 15, fontWeight: '800' },
  riskScore: { fontSize: 13, fontWeight: '700' },
  riskDesc: { fontSize: 12, color: '#334155', marginTop: 4 },
  riskMeta: { fontSize: 11, color: '#475569', marginTop: 6 },
  causesWrap: { marginTop: 6 },
  causeItem: { fontSize: 12, color: '#1E293B', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  riskBtn: {
    flex: 2,
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  riskBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  editBtn: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  editBtnText: { color: '#334155', fontWeight: '700', fontSize: 13 },
  delBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  delBtnText: { color: '#B91C1C', fontWeight: '700', fontSize: 13 },
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
    maxHeight: '92%',
  },
  modalTitle: { fontSize: 19, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  formError: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 8,
  },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 10, marginBottom: 6 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  presetChip: {
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  presetChipText: { color: '#0369A1', fontSize: 11, fontWeight: '600' },
  twoCol: { flexDirection: 'row', gap: 8 },
  colWrap: { flex: 1 },
  colInput: { flex: 1 },
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
