import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { penandaHalo, penandaHaloBesar, penandaLokasiSaya } from '../assets/svg';
import { colors } from '../theme';
import { IkonJenis } from './IkonJenis';

// Penanda (Baru/Aktif/Mereda) pada kotak 60. `ukuran` menskalakan seluruh penanda;
// `opasitas` dipakai untuk efek memudar sesuai umur laporan (Mereda bawaan 0.55).
export default function Penanda({ status = 'Aktif', jenis, ukuran = 60, opasitas }) {
  const s = ukuran / 60;
  const mereda = status === 'Mereda';
  return (
    <View style={{ width: ukuran, height: ukuran, opacity: opasitas ?? (mereda ? 0.55 : 1) }}>
      {status === 'Baru' ? (
        <View style={StyleSheet.absoluteFill}>
          <SvgXml xml={penandaHaloBesar} width={60 * s} height={60 * s} />
        </View>
      ) : null}
      {status !== 'Mereda' ? (
        <View style={{ position: 'absolute', left: 8 * s, top: 8 * s }}>
          <SvgXml xml={penandaHalo} width={44 * s} height={44 * s} />
        </View>
      ) : null}
      <View
        style={[
          styles.inti,
          {
            left: 15 * s,
            top: 15 * s,
            width: 30 * s,
            height: 30 * s,
            borderRadius: 15 * s,
            borderWidth: 3 * s,
            backgroundColor: mereda ? colors.risiko.waspada : colors.risiko.hindari,
          },
        ]}
      >
        <IkonJenis jenis={jenis} size={15 * s} color={colors.teks.terbalik} strokeWidth={2} />
      </View>
    </View>
  );
}

export function PenandaLokasiSaya({ ukuran = 36 }) {
  return <SvgXml xml={penandaLokasiSaya} width={ukuran} height={ukuran} />;
}

const styles = StyleSheet.create({
  inti: {
    position: 'absolute',
    borderColor: colors.permukaan.kartu,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
