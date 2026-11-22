export const INCIDENT_TYPES = [
  { key: 'genangan', label: 'Genangan', shortLabel: 'Genangan', icon: '💧', color: '#0284C7', bg: '#E0F2FE' },
  { key: 'banjir', label: 'Banjir', shortLabel: 'Banjir', icon: '🌊', color: '#1D4ED8', bg: '#DBEAFE' },
  { key: 'macet_parah', label: 'Macet Parah', shortLabel: 'Macet', icon: '🚗', color: '#D97706', bg: '#FEF3C7' },
  { key: 'jalan_rusak', label: 'Jalan Rusak', shortLabel: 'Rusak', icon: '⚠️', color: '#7C3AED', bg: '#EDE9FE' },
  { key: 'kecelakaan', label: 'Kecelakaan', shortLabel: 'Kecelakaan', icon: '🚨', color: '#DC2626', bg: '#FEE2E2' },
];

export const INCIDENT_MAP = INCIDENT_TYPES.reduce((acc, item) => {
  acc[item.key] = item;
  return acc;
}, {});

export const BANDUNG_LOCATIONS = [
  { label: 'ITB Ganesha', lat: -6.8915, lon: 107.6107 },
  { label: 'Antapani', lat: -6.9158, lon: 107.6611 },
  { label: 'Pasteur (Djunjunan)', lat: -6.8935, lon: 107.5906 },
  { label: 'Jl. Pagarsih', lat: -6.9219, lon: 107.5955 },
  { label: 'Dago Atas', lat: -6.8780, lon: 107.6185 },
  { label: 'Gedung Sate', lat: -6.9025, lon: 107.6187 },
  { label: 'Buah Batu / Soetta', lat: -6.9482, lon: 107.6335 },
  { label: 'Alun-Alun Bandung', lat: -6.9218, lon: 107.6071 },
  { label: 'Cicaheum', lat: -6.9022, lon: 107.6562 },
];

export const RISK_STYLES = {
  Aman: { color: '#15803D', bg: '#DCFCE7', border: '#86EFAC', desc: 'Kondisi rute relatif lancar dan aman ditempuh.' },
  Waspada: { color: '#B45309', bg: '#FEF3C7', border: '#FCD34D', desc: 'Ada potensi hambatan/hujan. Pertimbangkan berangkat lebih awal.' },
  Hindari: { color: '#B91C1C', bg: '#FEE2E2', border: '#FCA5A5', desc: 'Risiko tinggi di sepanjang rute. Disarankan memakai jalur alternatif.' },
};

export function formatRelativeTime(isoString) {
  if (!isoString) return 'Waktu tidak tersedia';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} hari lalu`;
}
