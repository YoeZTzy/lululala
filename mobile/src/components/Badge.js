import { StyleSheet, Text, View } from 'react-native';
import { OctagonExclamationPoint, ShieldCheck, TriangleExclamationPoint } from 'lucide-react-native';
import { colors, radius, t, warnaRisiko } from '../theme';

const IKON_RISIKO = { Aman: ShieldCheck, Waspada: TriangleExclamationPoint, Hindari: OctagonExclamationPoint };

// Badge Risiko: ikon 14 + teks kapital ExtraBold 11 (tracking 0.44).
export function BadgeRisiko({ tingkat = 'Aman' }) {
  const w = warnaRisiko[tingkat] || warnaRisiko.Aman;
  const Ikon = IKON_RISIKO[tingkat] || ShieldCheck;
  return (
    <View style={[styles.risiko, { backgroundColor: w.bg }]}>
      <Ikon size={14} color={w.teks} strokeWidth={2} />
      <Text style={[t('extrabold', 11, w.teks), { letterSpacing: 0.44 }]}>{tingkat.toUpperCase()}</Text>
    </View>
  );
}

const STATUS = {
  Aktif: { bg: colors.risiko.hindariBg, titik: colors.risiko.hindari, teks: colors.risiko.hindariTeks },
  Mereda: { bg: colors.risiko.waspadaBg, titik: colors.risiko.waspada, teks: colors.risiko.waspadaTeks },
};

// Badge Status titik rawan: titik 7 + teks Bold 11.
export function BadgeStatus({ status = 'Aktif' }) {
  const s = STATUS[status] || STATUS.Aktif;
  return (
    <View style={[styles.status, { backgroundColor: s.bg }]}>
      <View style={[styles.titik, { backgroundColor: s.titik }]} />
      <Text style={t('bold', 11, s.teks)}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  risiko: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingLeft: 8,
    paddingRight: 10,
    paddingVertical: 5,
    borderRadius: radius.badgeRisiko,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingLeft: 8,
    paddingRight: 10,
    paddingVertical: 4,
    borderRadius: radius.badgeStatus,
  },
  titik: { width: 7, height: 7, borderRadius: 3.5 },
});
