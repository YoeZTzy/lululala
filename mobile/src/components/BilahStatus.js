import { useCallback } from 'react';
import { setStatusBarStyle } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';

// Atur warna ikon status bar saat layar fokus: 'light' di atas header biru, 'dark' di atas peta/latar terang.
export default function BilahStatus({ gaya }) {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(gaya);
    }, [gaya])
  );
  return null;
}
