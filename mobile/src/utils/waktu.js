// "8 mnt lalu", "2 jam lalu", "Kemarin"
export function relatif(iso, sekarang = new Date()) {
  if (!iso) return '';
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '';
  const menit = Math.max(0, Math.floor((sekarang - t) / 60000));
  if (menit < 1) return 'Baru saja';
  if (menit < 60) return `${menit} mnt lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  return jam < 48 ? 'Kemarin' : `${Math.floor(jam / 24)} hari lalu`;
}

// ISO -> "06.02" waktu lokal
export function jamDari(iso) {
  if (!iso) return '';
  const t = new Date(iso);
  return `${String(t.getHours()).padStart(2, '0')}.${String(t.getMinutes()).padStart(2, '0')}`;
}

// Umur dalam menit dari ISO
export function umurMenit(iso, sekarang = new Date()) {
  if (!iso) return Infinity;
  return Math.max(0, (sekarang - new Date(iso)) / 60000);
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export function bulanTahun(iso) {
  if (!iso) return '';
  const t = new Date(iso);
  return `${BULAN[t.getMonth()]} ${t.getFullYear()}`;
}

// Sapaan sesuai jam lokal.
export function sapaan(sekarang = new Date()) {
  const j = sekarang.getHours();
  if (j >= 4 && j < 11) return 'Selamat pagi';
  if (j >= 11 && j < 15) return 'Selamat siang';
  if (j >= 15 && j < 18) return 'Selamat sore';
  return 'Selamat malam';
}
