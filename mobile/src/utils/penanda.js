import { umurMenit } from './waktu';

const BARU_MENIT = 30;
const PUDAR_MULAI = 60; // menit: opasitas penuh sampai umur ini
const PUDAR_HABIS = 180; // menit: opasitas minimum dicapai di umur ini (laporan warga kedaluwarsa 3 jam)
const OPASITAS_MIN = 0.4;

// Status penanda peta dari titik rawan: Baru bila laporan terakhir < 30 menit.
export function statusPenanda(titik, sekarang = new Date()) {
  if (titik.status === 'Mereda') return 'Mereda';
  return umurMenit(titik.last_report_at || titik.updated_at, sekarang) < BARU_MENIT ? 'Baru' : 'Aktif';
}

// Makin lama dilaporkan, makin pudar (legenda Figma). Mereda dikali 0.55 seperti varian Figma.
export function opasitasPenanda(titik, sekarang = new Date()) {
  const umur = umurMenit(titik.last_report_at || titik.updated_at, sekarang);
  const f = umur <= PUDAR_MULAI ? 1 : Math.max(OPASITAS_MIN, 1 - ((umur - PUDAR_MULAI) / (PUDAR_HABIS - PUDAR_MULAI)) * (1 - OPASITAS_MIN));
  return titik.status === 'Mereda' ? f * 0.55 : f;
}

// Ukuran penanda 42..60 mengikuti skor keyakinan (rentang ukuran penanda di Figma Peta).
export function ukuranPenanda(titik) {
  return Math.round(42 + 18 * Math.max(0, Math.min(1, titik.confidence_score)));
}
