// Pesan Indonesia per field untuk galat validasi 422. Pesan Pydantic (Inggris) tidak pernah ditampilkan.
const PESAN_FIELD = {
  name: 'Nama tidak valid',
  email: 'Email tidak valid',
  password: 'Password tidak valid',
  days: 'Hari berangkat tidak valid',
  departure_time: 'Jam berangkat tidak valid',
  origin_lat: 'Lokasi asal tidak valid',
  origin_lon: 'Lokasi asal tidak valid',
  origin_label: 'Nama lokasi asal tidak valid',
  dest_lat: 'Lokasi tujuan tidak valid',
  dest_lon: 'Lokasi tujuan tidak valid',
  dest_label: 'Nama lokasi tujuan tidak valid',
  segments: 'Jalur rute tidak valid',
  lat: 'Lokasi laporan tidak valid',
  lon: 'Lokasi laporan tidak valid',
  incident_type: 'Jenis kejadian tidak valid',
  severity: 'Tingkat keparahan tidak valid',
  description: 'Keterangan tidak valid',
};
export const PESAN_422_UMUM = 'Data belum valid, cek kembali isianmu.';

// detail 422 FastAPI -> { fields, message }. loc = ["body", field, ...] atau ["query", field].
export function petakanGalat422(detail) {
  const fields = {};
  for (const d of Array.isArray(detail) ? detail : []) {
    const field = Array.isArray(d?.loc) ? d.loc[1] : undefined;
    if (typeof field === 'string' && PESAN_FIELD[field] && !fields[field]) fields[field] = PESAN_FIELD[field];
  }
  const pesan = [...new Set(Object.values(fields))];
  return { fields, message: pesan.length === 1 ? `${pesan[0]}.` : PESAN_422_UMUM };
}
