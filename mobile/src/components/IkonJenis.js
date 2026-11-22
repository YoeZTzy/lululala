import { Car, Droplets, OctagonExclamationPoint, TriangleExclamationPoint, WavesHorizontal } from 'lucide-react-native';

// Jenis kejadian backend -> ikon & label.
export const JENIS = {
  genangan: { label: 'Genangan', Ikon: Droplets },
  banjir: { label: 'Banjir', Ikon: WavesHorizontal },
  macet_parah: { label: 'Macet parah', Ikon: Car },
  jalan_rusak: { label: 'Jalan rusak', Ikon: TriangleExclamationPoint },
  kecelakaan: { label: 'Kecelakaan', Ikon: OctagonExclamationPoint },
};

export const DAFTAR_JENIS = Object.keys(JENIS);

export function IkonJenis({ jenis, size = 16, color, strokeWidth = 2 }) {
  const Ikon = (JENIS[jenis] || JENIS.genangan).Ikon;
  return <Ikon size={size} color={color} strokeWidth={strokeWidth} />;
}
