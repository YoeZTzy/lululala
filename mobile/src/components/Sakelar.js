import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

// Sakelar 44x26: aktif = biru, mati = garis halus; kenop putih r10 dengan bayangan 0 1 3 rgba(0,0,0,0.15).
export default function Sakelar({ aktif, onUbah, label }) {
  return (
    <Pressable
      onPress={() => onUbah?.(!aktif)}
      accessibilityRole="switch"
      accessibilityState={{ checked: !!aktif }}
      accessibilityLabel={label}
      hitSlop={8}
      style={[styles.jalur, { backgroundColor: aktif ? colors.brand.biru : colors.garis.halus }]}
    >
      <View style={[styles.kenop, { left: aktif ? 21 : 3 }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  jalur: { width: 44, height: 26, borderRadius: 13 },
  kenop: {
    position: 'absolute',
    top: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.permukaan.kartu,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
    elevation: 2,
  },
});
