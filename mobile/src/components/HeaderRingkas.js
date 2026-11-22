import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { headerAksenRute, headerTekstur } from '../assets/svg';
import { colors, radius, t } from '../theme';
import { GRADIEN_HEADER, titikGradien } from './gradien';

// Header/Ringkas: tinggi 124 di Figma = 32 status bar + 92 isi. Status bar diganti safe area atas.
const TINGGI_ISI = 92;

export default function HeaderRingkas({ judul, sub, onKembali }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tinggi = insets.top + TINGGI_ISI;
  const g = titikGradien(GRADIEN_HEADER.sudut, width, tinggi);
  return (
    <LinearGradient
      colors={GRADIEN_HEADER.warna}
      locations={GRADIEN_HEADER.lokasi}
      start={g.start}
      end={g.end}
      style={[styles.wadah, { height: tinggi, paddingTop: insets.top }]}
    >
      <View style={styles.tekstur} pointerEvents="none">
        <SvgXml xml={headerTekstur} width={392} height={156} />
      </View>
      <View style={[styles.aksen, { top: insets.top - 2 }]} pointerEvents="none">
        <SvgXml xml={headerAksenRute} width={200} height={90} />
      </View>
      <View style={styles.baris}>
        {onKembali ? (
          <Pressable
            onPress={onKembali}
            style={styles.kembali}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            hitSlop={8}
          >
            <ArrowLeft size={20} color={colors.teks.terbalik} strokeWidth={2} />
          </Pressable>
        ) : null}
        <View style={styles.teks}>
          <Text style={t('extrabold', 20, colors.teks.terbalik)} numberOfLines={1}>
            {judul}
          </Text>
          {sub ? (
            <Text style={t('medium', 12, colors.teks.terbalik)} numberOfLines={1}>
              {sub}
            </Text>
          ) : null}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wadah: {
    overflow: 'hidden',
    borderBottomLeftRadius: radius.header,
    borderBottomRightRadius: radius.header,
  },
  tekstur: { position: 'absolute', left: -16, top: -16 },
  aksen: { position: 'absolute', left: 150 },
  baris: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingHorizontal: 16 },
  kembali: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teks: { flex: 1, gap: 2 },
});
