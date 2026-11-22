import { StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { logoTanda } from '../assets/svg';
import { colors, t } from '../theme';

export function LogoTanda({ size = 64 }) {
  return <SvgXml xml={logoTanda} width={size} height={size} />;
}

// Logo/Lengkap: tanda 44 + "LintasSiaga" 26 ExtraBold. `terbalik` untuk latar gelap.
export function LogoLengkap({ ukuranTanda = 44, ukuranTeks = 26, jarak = 12, terbalik = false }) {
  return (
    <View style={[styles.baris, { gap: jarak }]}>
      <LogoTanda size={ukuranTanda} />
      <Text
        style={[
          t('extrabold', ukuranTeks, terbalik ? colors.teks.terbalik : colors.brand.biruTua),
          { letterSpacing: -0.02 * ukuranTeks },
        ]}
      >
        Lintas
        <Text style={{ color: terbalik ? colors.teks.terbalik : colors.brand.biruCerah }}>Siaga</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  baris: { flexDirection: 'row', alignItems: 'center' },
});
