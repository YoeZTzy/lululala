import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ruteAsal, ruteTujuan } from '../assets/svg';
import { colors, radius, t, warnaRisiko } from '../theme';
import { IkonJenis } from './IkonJenis';

const BANTALAN_SEGMEN = 0.1; // segmen rawan melebar 10% panjang jalur di kiri-kanan titik rawan

// Garis rute mini: jalur abu, segmen rawan berwarna, titik rawan 22 di posisi `fraksi` (0..1).
export function GarisRuteMini({ tingkat = 'Aman', titik = [] }) {
  const [lebar, setLebar] = useState(0);
  const jalur = Math.max(0, lebar - 16);
  const w = warnaRisiko[tingkat] || warnaRisiko.Aman;
  const ada = titik.length > 0 && tingkat !== 'Aman';
  const awal = ada ? Math.max(0, Math.min(...titik.map((x) => x.fraksi)) - BANTALAN_SEGMEN) : 0;
  const akhir = ada ? Math.min(1, Math.max(...titik.map((x) => x.fraksi)) + BANTALAN_SEGMEN) : 0;

  return (
    <View style={styles.garis} onLayout={(e) => setLebar(e.nativeEvent.layout.width)}>
      <View style={[styles.jalur, { width: jalur }, tingkat === 'Aman' && { backgroundColor: w.utama }]} />
      {ada ? (
        <View style={[styles.segmen, { left: 8 + awal * jalur, width: (akhir - awal) * jalur, backgroundColor: w.utama }]} />
      ) : null}
      <View style={[styles.ujung, { left: 0 }]}>
        <SvgXml xml={ruteAsal} width={12} height={12} />
      </View>
      <View style={[styles.ujung, { right: 0 }]}>
        <SvgXml xml={ruteTujuan} width={12} height={12} />
      </View>
      {ada
        ? titik.map((x, i) => (
            <View key={x.id ?? i} style={[styles.titik, { left: 8 + x.fraksi * jalur - 11, backgroundColor: w.utama }]}>
              <IkonJenis jenis={x.jenis} size={12} color={colors.teks.terbalik} strokeWidth={1.6} />
            </View>
          ))
        : null}
    </View>
  );
}

// Kartu Rute: jam besar, status risiko (titik + teks), garis rute mini, penyebab.
export default function KartuRute({ jam, hari, tingkat = 'Aman', asal, tujuan, titik, penyebab, onPress, style }) {
  const w = warnaRisiko[tingkat] || warnaRisiko.Aman;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.kartu, style]} accessibilityRole="button">
      <View style={styles.atas}>
        <View style={styles.waktu}>
          <Text style={[t('extrabold', 26, colors.teks.utama), { letterSpacing: -0.78 }]}>{jam}</Text>
          <Text style={t('medium', 12, colors.teks.samar)}>{hari}</Text>
        </View>
        <View style={styles.status}>
          <View style={[styles.titikStatus, { backgroundColor: w.utama }]} />
          <Text style={t('extrabold', 14, w.teks)}>{tingkat}</Text>
        </View>
      </View>
      <View style={styles.rute}>
        <GarisRuteMini tingkat={tingkat} titik={titik} />
        <View style={styles.ujungRute}>
          <Text style={[t('bold', 12, colors.teks.utama), styles.ujungTeks]} numberOfLines={1}>
            {asal}
          </Text>
          <Text style={[t('bold', 12, colors.teks.utama), styles.ujungTeks, { textAlign: 'right' }]} numberOfLines={1}>
            {tujuan}
          </Text>
        </View>
      </View>
      {penyebab ? <Text style={t('medium', 13, colors.teks.sekunder)}>{penyebab}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kartu: {
    backgroundColor: colors.permukaan.kartu,
    borderWidth: 1,
    borderColor: colors.garis.halus,
    borderRadius: radius.kartu,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 14,
  },
  atas: { flexDirection: 'row', alignItems: 'flex-start' },
  waktu: { flex: 1 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 6 },
  titikStatus: { width: 8, height: 8, borderRadius: 4 },
  rute: { gap: 6 },
  garis: { height: 22 },
  jalur: {
    position: 'absolute',
    left: 8,
    top: 9.5,
    height: 3,
    borderRadius: radius.bar,
    backgroundColor: colors.garis.halus,
  },
  segmen: { position: 'absolute', top: 9, height: 4, borderRadius: radius.bar },
  ujung: { position: 'absolute', top: 5 },
  titik: {
    position: 'absolute',
    top: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: colors.permukaan.kartu,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ujungRute: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  ujungTeks: { flexShrink: 1 },
});
