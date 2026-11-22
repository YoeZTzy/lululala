import { JENIS } from '../components/IkonJenis';
import { fraksiPadaRute } from './geo';
import { keberangkatanBerikutnya } from './jadwal';

// Label asal/tujuan: dari backend bila ada, selain itu dari nama "A -> B", terakhir generik.
export function ujungRute(rute) {
  if (rute.origin_label || rute.dest_label) {
    return { asal: rute.origin_label || 'Asal', tujuan: rute.dest_label || 'Tujuan' };
  }
  const bagian = (rute.name || '').split(/\s*(?:->|→)\s*/);
  if (bagian.length === 2 && bagian[0] && bagian[1]) return { asal: bagian[0], tujuan: bagian[1] };
  return { asal: 'Asal', tujuan: 'Tujuan' };
}

export function namaRute(rute) {
  return (rute.name || '').replace(/\s*->\s*/g, ' → ');
}

export function asalTujuan(rute) {
  return {
    asal: { lat: rute.origin_lat, lon: rute.origin_lon },
    tujuan: { lat: rute.dest_lat, lon: rute.dest_lon },
  };
}

// Titik rawan dari `causes` diposisikan berurutan di sepanjang garis asal -> tujuan.
export function titikGarisMini(rute, causes = []) {
  const { asal, tujuan } = asalTujuan(rute);
  return causes
    .map((c) => ({ id: c.id, jenis: c.incident_type, fraksi: fraksiPadaRute({ lat: c.lat, lon: c.lon }, asal, tujuan) }))
    .sort((a, b) => a.fraksi - b.fraksi);
}

function beratPenyebab(c) {
  return c.severity * c.confidence_score;
}

// Kalimat penyebab risiko untuk Kartu Rute.
export function ringkasPenyebab(risk) {
  if (!risk) return '';
  const causes = [...(risk.causes || [])].sort((a, b) => beratPenyebab(b) - beratPenyebab(a));
  const saran =
    risk.risk_level === 'Hindari'
      ? ' Pertimbangkan rute lain.'
      : risk.risk_level === 'Waspada'
        ? ' Pertimbangkan berangkat lebih awal.'
        : '';
  if (!causes.length) {
    return risk.risk_level === 'Aman'
      ? 'Belum ada titik rawan di sepanjang rute.'
      : `Hujan terdeteksi di sekitar rute.${saran}`;
  }
  const nama = (JENIS[causes[0].incident_type] || JENIS.genangan).label;
  const inti =
    causes.length > 1
      ? `${nama} dan ${causes.length - 1} titik rawan lain di sepanjang rute.`
      : `${nama} di sepanjang rute, dilaporkan ${causes[0].report_count} warga.`;
  return inti + saran;
}

// Urutkan rute menurut keberangkatan berikutnya (yang tanpa jadwal valid di akhir).
export function urutkanJadwal(daftar, sekarang = new Date()) {
  return daftar
    .map((r) => ({ rute: r, waktu: keberangkatanBerikutnya(r.days_list, r.departure_time, sekarang) }))
    .sort((a, b) => (a.waktu ? a.waktu.getTime() : Infinity) - (b.waktu ? b.waktu.getTime() : Infinity));
}
