// Hari & jam berangkat rute rutin. Kode hari mengikuti backend: sen..min.
export const HARI = [
  { kode: 'sen', pendek: 'Sen', panjang: 'Senin' },
  { kode: 'sel', pendek: 'Sel', panjang: 'Selasa' },
  { kode: 'rab', pendek: 'Rab', panjang: 'Rabu' },
  { kode: 'kam', pendek: 'Kam', panjang: 'Kamis' },
  { kode: 'jum', pendek: 'Jum', panjang: 'Jumat' },
  { kode: 'sab', pendek: 'Sab', panjang: 'Sabtu' },
  { kode: 'min', pendek: 'Min', panjang: 'Minggu' },
];
const KODE = HARI.map((h) => h.kode);
const KODE_DARI_GETDAY = ['min', 'sen', 'sel', 'rab', 'kam', 'jum', 'sab']; // Date#getDay(): 0 = Minggu

export function parseJam(teks) {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec((teks || '').trim());
  if (!m) return null;
  const jam = Number(m[1]);
  const menit = Number(m[2]);
  if (jam > 23 || menit > 59) return null;
  return { jam, menit };
}

// "06:45" -> "06.45" (format jam di desain)
export function formatJam(teks) {
  const j = parseJam(teks);
  if (!j) return teks || '';
  return `${String(j.jam).padStart(2, '0')}.${String(j.menit).padStart(2, '0')}`;
}

// Waktu keberangkatan berikutnya setelah `sekarang`, atau null bila hari/jam tidak valid.
export function keberangkatanBerikutnya(daftarHari, jamBerangkat, sekarang = new Date()) {
  const j = parseJam(jamBerangkat);
  if (!j || !daftarHari?.length) return null;
  for (let d = 0; d <= 7; d += 1) {
    const t = new Date(sekarang);
    t.setDate(t.getDate() + d);
    t.setHours(j.jam, j.menit, 0, 0);
    if (t > sekarang && daftarHari.includes(KODE_DARI_GETDAY[t.getDay()])) return t;
  }
  return null;
}

function urut(daftar) {
  return KODE.filter((k) => daftar.includes(k));
}

// ["sen".."jum"] -> "Sen–Jum"; ["sab"] -> "Sabtu"; ["sen","rab"] -> "Sen, Rab"
export function labelHari(daftarHari) {
  const d = urut(daftarHari || []);
  if (d.length === 0) return '-';
  if (d.length === 7) return 'Setiap hari';
  if (d.length === 1) return HARI[KODE.indexOf(d[0])].panjang;
  const awal = KODE.indexOf(d[0]);
  const berurutan = d.every((k, i) => KODE.indexOf(k) === awal + i);
  if (berurutan && d.length >= 3) {
    return `${HARI[awal].pendek}–${HARI[KODE.indexOf(d[d.length - 1])].pendek}`;
  }
  return d.map((k) => HARI[KODE.indexOf(k)].pendek).join(', ');
}

// Keterangan kapan berangkat relatif ke sekarang: "30 menit lagi", "Hari ini", "Besok", "Senin".
export function labelSisa(waktu, sekarang = new Date()) {
  if (!waktu) return '';
  const menit = Math.round((waktu - sekarang) / 60000);
  const awalHari = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const selisihHari = Math.round((awalHari(waktu) - awalHari(sekarang)) / 86400000);
  if (selisihHari === 0) return menit < 60 ? `${Math.max(menit, 1)} menit lagi` : 'Hari ini';
  if (selisihHari === 1) return 'Besok';
  return HARI[KODE.indexOf(KODE_DARI_GETDAY[waktu.getDay()])].panjang;
}
