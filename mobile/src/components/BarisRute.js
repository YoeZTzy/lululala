import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, t, warnaRisiko } from '../theme';

// Baris Rute: jam + hari | nama rute + status risiko | chevron.
export default function BarisRute({ jam, hari, rute, tingkat, onPress, terakhir }) {
  const w = tingkat ? warnaRisiko[tingkat] : null;
  return (
    <Pressable onPress={onPress} style={[styles.baris, !terakhir && styles.garisBawah]} accessibilityRole="button">
      <View style={styles.waktu}>
        <Text style={t('extrabold', 16, colors.teks.utama)}>{jam}</Text>
        <Text style={t('medium', 11, colors.teks.samar)} numberOfLines={1}>
          {hari}
        </Text>
      </View>
      <View style={styles.pemisah} />
      <View style={styles.teks}>
        <Text style={t('bold', 14, colors.teks.utama)} numberOfLines={1}>
          {rute}
        </Text>
        {w ? (
          <View style={styles.status}>
            <View style={[styles.titik, { backgroundColor: w.utama }]} />
            <Text style={t('bold', 12, w.teks)}>{tingkat}</Text>
          </View>
        ) : (
          <Text style={t('medium', 12, colors.teks.samar)}>Menilai risiko…</Text>
        )}
      </View>
      <ChevronRight size={18} color={colors.teks.samar} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  baris: { height: 60, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  garisBawah: { borderBottomWidth: 1, borderBottomColor: colors.garis.halus },
  waktu: { width: 52 },
  pemisah: { width: 1, height: 30, backgroundColor: colors.garis.halus },
  teks: { flex: 1, gap: 3 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  titik: { width: 6, height: 6, borderRadius: 3 },
});
