import * as Location from 'expo-location';

// Minta izin lalu ambil posisi sekarang. Melempar Error berpesan ramah bila gagal.
export async function posisiSaya() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Izin lokasi ditolak. Aktifkan di pengaturan HP untuk memakai lokasimu.');
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lon: pos.coords.longitude, akurasi: pos.coords.accuracy };
}

// Nama tempat singkat dari koordinat, mis. "Jl. Ganesha · Coblong". Null bila tidak tersedia.
export async function namaTempat({ lat, lon }) {
  try {
    const [a] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    if (!a) return null;
    const jalan = a.street || a.name;
    const daerah = a.district || a.subregion || a.city;
    return [jalan, daerah].filter(Boolean).join(' · ') || null;
  } catch {
    return null;
  }
}
