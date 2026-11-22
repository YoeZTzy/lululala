// Aturan mengikuti backend: RegisterReq (backend/app/modules/iam/router.py) name 2-100, password 6-128.
export const NAMA_MIN = 2;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAKS = 128;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cekEmail(email) {
  if (!email.trim()) return 'Email wajib diisi';
  if (!EMAIL_REGEX.test(email.trim())) return 'Format email belum benar';
  return null;
}

export function cekPassword(password) {
  if (!password) return 'Password wajib diisi';
  if (password.length < PASSWORD_MIN) {
    return `Minimal ${PASSWORD_MIN} karakter, kurang ${PASSWORD_MIN - password.length} lagi`;
  }
  if (password.length > PASSWORD_MAKS) return `Maksimal ${PASSWORD_MAKS} karakter`;
  return null;
}

export function cekNama(nama) {
  if (nama.trim().length < NAMA_MIN) return `Nama minimal ${NAMA_MIN} karakter`;
  return null;
}
