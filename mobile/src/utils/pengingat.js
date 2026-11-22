import AsyncStorage from '@react-native-async-storage/async-storage';

// shortcut: pengingat hanya disimpan lokal (backend belum punya field/notifikasi); pindah ke backend bila notifikasi push dibuat.
const KUNCI = 'lintassiaga.pengingat';

async function baca() {
  try {
    return JSON.parse((await AsyncStorage.getItem(KUNCI)) || '{}');
  } catch {
    return {};
  }
}

export async function pengingatRute(id) {
  return Boolean((await baca())[id]);
}

export async function setPengingatRute(id, aktif) {
  const semua = await baca();
  semua[id] = aktif;
  await AsyncStorage.setItem(KUNCI, JSON.stringify(semua)).catch(() => {});
}

// Pengaturan global di Profil ("Pengingat sebelum berangkat").
export async function pengingatGlobal() {
  return (await baca()).global !== false;
}

export async function setPengingatGlobal(aktif) {
  await setPengingatRute('global', aktif);
}
