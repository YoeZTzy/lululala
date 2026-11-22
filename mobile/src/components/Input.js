import { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Info, TriangleExclamationPoint } from 'lucide-react-native';
import { colors, fonts, radius, t } from '../theme';

// Input (Normal/Fokus/Error). `Ikon` = komponen lucide; `galat` = pesan error (memicu keadaan Error).
const Input = forwardRef(function Input(
  { label, Ikon, galat, bantuan, onFocus, onBlur, style, kanan, ...props },
  ref
) {
  const [fokus, setFokus] = useState(false);
  const keadaan = galat ? 'Error' : fokus ? 'Fokus' : 'Normal';
  const warnaIkon =
    keadaan === 'Error' ? colors.risiko.hindari : keadaan === 'Fokus' ? colors.brand.biru : colors.teks.samar;
  const teksBantu = galat || bantuan;
  return (
    <View style={[styles.wadah, style]}>
      {label ? <Text style={t('semibold', 12, colors.teks.sekunder)}>{label}</Text> : null}
      <View style={[styles.cincin, keadaan === 'Fokus' && styles.cincinFokus]}>
        <View style={[styles.kolom, styles[`kolom${keadaan}`]]}>
          {Ikon ? <Ikon size={18} color={warnaIkon} strokeWidth={2} /> : null}
          <TextInput
            ref={ref}
            style={styles.isian}
            placeholderTextColor={colors.teks.samar}
            onFocus={(e) => {
              setFokus(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFokus(false);
              onBlur?.(e);
            }}
            {...props}
          />
          {kanan}
        </View>
      </View>
      {teksBantu ? (
        <View style={styles.bantuan}>
          {galat ? (
            <TriangleExclamationPoint size={13} color={colors.risiko.hindari} strokeWidth={2} />
          ) : (
            <Info size={13} color={colors.teks.samar} strokeWidth={2} />
          )}
          <Text style={[t('medium', 11, galat ? colors.risiko.hindariTeks : colors.teks.samar), styles.teksBantu]}>
            {teksBantu}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

export default Input;

const styles = StyleSheet.create({
  wadah: { gap: 6 },
  // Cincin fokus 4px rgba(24,95,165,0.16) di luar kolom, tanpa menggeser tata letak.
  cincin: { margin: -4, padding: 4, borderRadius: radius.input + 4 },
  cincinFokus: { backgroundColor: 'rgba(24,95,165,0.16)' },
  kolom: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: radius.input,
    borderWidth: 1.5,
  },
  kolomNormal: { backgroundColor: colors.permukaan.isian, borderColor: colors.permukaan.isian },
  kolomFokus: { backgroundColor: colors.permukaan.kartu, borderColor: colors.brand.biru },
  kolomError: { backgroundColor: colors.risiko.hindariBg, borderColor: colors.risiko.hindari },
  isian: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.teks.utama, padding: 0 },
  bantuan: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  teksBantu: { flexShrink: 1 },
});
