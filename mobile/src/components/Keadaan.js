import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { CircleExclamationPoint } from 'lucide-react-native';
import { colors, radius, t } from '../theme';
import Tombol from './Tombol';

// Skeleton sederhana: blok isian berdenyut pelan.
export function Skeleton({ tinggi = 16, lebar = '100%', bulat = radius.input, style }) {
  const denyut = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(denyut, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(denyut, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [denyut]);
  return (
    <Animated.View
      style={[{ height: tinggi, width: lebar, borderRadius: bulat, backgroundColor: colors.garis.halus, opacity: denyut }, style]}
    />
  );
}

export function KeadaanError({ pesan, onCobaLagi }) {
  return (
    <View style={styles.wadah} accessibilityRole="alert">
      <CircleExclamationPoint size={22} color={colors.risiko.hindari} strokeWidth={2} />
      <Text style={[t('bold', 14, colors.teks.utama), styles.tengah]}>Gagal memuat</Text>
      {pesan ? <Text style={[t('medium', 12, colors.teks.sekunder), styles.tengah]}>{pesan}</Text> : null}
      {onCobaLagi ? <Tombol gaya="Lembut" label="Coba lagi" onPress={onCobaLagi} style={styles.tombol} /> : null}
    </View>
  );
}

export function KeadaanKosong({ Ikon, judul, pesan, labelAksi, onAksi }) {
  return (
    <View style={styles.wadah}>
      {Ikon ? <Ikon size={22} color={colors.brand.biru} strokeWidth={2} /> : null}
      <Text style={[t('bold', 14, colors.teks.utama), styles.tengah]}>{judul}</Text>
      {pesan ? <Text style={[t('medium', 12, colors.teks.sekunder), styles.tengah]}>{pesan}</Text> : null}
      {onAksi ? <Tombol gaya="Lembut" label={labelAksi} onPress={onAksi} style={styles.tombol} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wadah: { alignItems: 'center', gap: 6, paddingVertical: 20, paddingHorizontal: 16 },
  tengah: { textAlign: 'center' },
  tombol: { alignSelf: 'stretch', marginTop: 8 },
});
