import { StyleSheet, Text, View } from 'react-native';
import { TriangleExclamationPoint } from 'lucide-react-native';
import { colors, t } from '../theme';

// Pesan error kecil di bawah bagian form (gaya "bantuan" Input keadaan Error).
export default function PesanGalat({ children }) {
  if (!children) return null;
  return (
    <View style={styles.baris} accessibilityRole="alert">
      <TriangleExclamationPoint size={13} color={colors.risiko.hindari} strokeWidth={2} />
      <Text style={[t('medium', 11, colors.risiko.hindariTeks), { flexShrink: 1 }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  baris: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
