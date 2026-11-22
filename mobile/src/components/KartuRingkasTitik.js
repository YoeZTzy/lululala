import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, radius, t } from '../theme';
import { formatJarak } from '../utils/geo';
import { relatif } from '../utils/waktu';
import AvatarWarga from './AvatarWarga';
import { BadgeStatus } from './Badge';
import { JENIS } from './IkonJenis';
import Penanda from './Penanda';

// Kartu ringkasan titik rawan terpilih di layar Peta.
export default function KartuRingkasTitik({ titik, jarak, onPress, style }) {
  const mereda = titik.status === 'Mereda';
  const persen = Math.round(titik.confidence_score * 100);
  const waktu = relatif(titik.last_report_at || titik.updated_at);
  return (
    <Pressable onPress={onPress} style={[styles.kartu, style]} accessibilityRole="button" accessibilityHint="Buka detail titik rawan">
      <View style={styles.kepala}>
        <Penanda status={mereda ? 'Mereda' : 'Baru'} jenis={titik.incident_type} ukuran={42} />
        <View style={{ flex: 1, gap: 4 }}>
          <BadgeStatus status={mereda ? 'Mereda' : 'Aktif'} />
          <Text style={t('extrabold', 16, colors.teks.utama)} numberOfLines={1}>
            {(JENIS[titik.incident_type] || JENIS.genangan).label}
          </Text>
          <Text style={t('medium', 12, colors.teks.sekunder)} numberOfLines={1}>
            Dilaporkan {waktu}
            {jarak != null ? ` · ${formatJarak(jarak)} darimu` : ''}
          </Text>
        </View>
      </View>
      <View style={styles.keyakinan}>
        <Text style={t('semibold', 12, colors.teks.sekunder)}>Keyakinan</Text>
        <View style={styles.bar}>
          <View
            style={[styles.isi, { width: `${persen}%`, backgroundColor: mereda ? colors.risiko.waspada : colors.risiko.hindari }]}
          />
        </View>
        <Text style={t('extrabold', 13, colors.teks.utama)}>{persen}%</Text>
      </View>
      <View style={styles.warga}>
        <AvatarWarga jumlah={titik.report_count} />
        <Text style={[t('bold', 12, colors.teks.utama), { flex: 1 }]}>Dilaporkan {titik.report_count} warga</Text>
        <View style={styles.detail}>
          <Text style={t('extrabold', 12, colors.brand.biru)}>Detail</Text>
          <ChevronRight size={16} color={colors.brand.biru} strokeWidth={2} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kartu: {
    backgroundColor: colors.permukaan.kartu,
    borderRadius: radius.tabBar,
    padding: 16,
    gap: 12,
    shadowColor: '#08244A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  kepala: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  keyakinan: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.garis.halus, overflow: 'hidden' },
  isi: { height: 6, borderRadius: 3 },
  warga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.garis.halus,
  },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
