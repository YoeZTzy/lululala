import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

// Pemuat data layar: keadaan memuat/galat/data + muat ulang saat layar kembali fokus.
// `pemuat` mengembalikan Promise data; `opsi.saatFokus` = muat ulang diam-diam tiap fokus.
export default function useMuat(pemuat, { saatFokus = true } = {}) {
  const [data, setData] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [menyegarkan, setMenyegarkan] = useState(false);
  const [galat, setGalat] = useState(null);
  const refPemuat = useRef(pemuat);
  refPemuat.current = pemuat;
  const pertama = useRef(true);

  const jalankan = useCallback(async (mode) => {
    if (mode === 'segar') setMenyegarkan(true);
    if (mode === 'awal') setMemuat(true);
    try {
      const hasil = await refPemuat.current();
      setData(hasil);
      setGalat(null);
    } catch (err) {
      setGalat(err);
    } finally {
      setMemuat(false);
      setMenyegarkan(false);
    }
  }, []);

  useEffect(() => {
    jalankan('awal');
  }, [jalankan]);

  useFocusEffect(
    useCallback(() => {
      if (pertama.current) {
        pertama.current = false;
        return;
      }
      if (saatFokus) jalankan('diam');
    }, [jalankan, saatFokus])
  );

  return {
    data,
    memuat,
    menyegarkan,
    galat,
    muatUlang: () => jalankan('awal'),
    segarkan: () => jalankan('segar'),
    setData,
  };
}
