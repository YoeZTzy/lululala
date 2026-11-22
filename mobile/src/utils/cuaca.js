// Intensitas hujan dari backend (rain_mm, data observasi ingest Open-Meteo) -> label & tingkat 0..1.
// Ambang mengikuti kategori umum intensitas hujan per jam.
export function labelHujan(rainMm) {
  const mm = Number(rainMm) || 0;
  if (mm <= 0) return { label: 'Cerah', singkat: 'Cerah', hujan: false, fraksi: 0 };
  if (mm < 2.5) return { label: 'Hujan ringan', singkat: 'Ringan', hujan: true, fraksi: 0.3 };
  if (mm < 10) return { label: 'Hujan sedang', singkat: 'Sedang', hujan: true, fraksi: 0.55 };
  return { label: 'Hujan lebat', singkat: 'Lebat', hujan: true, fraksi: 0.7 };
}
