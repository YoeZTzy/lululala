import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService, { setUnauthorizedHandler } from '../services/ApiService';

// Kunci SecureStore hanya boleh [A-Za-z0-9._-].
const KUNCI_TOKEN = 'lintassiaga.token';
const KUNCI_USER = 'lintassiaga.user';
// Kunci lama (AsyncStorage) dari versi sebelumnya, dimigrasikan sekali lalu dihapus.
const KUNCI_LAMA = ['@lululala_token', '@lululala_user'];

const AuthContext = createContext(null);

async function bacaSesi() {
  const [token, user] = await Promise.all([
    SecureStore.getItemAsync(KUNCI_TOKEN),
    SecureStore.getItemAsync(KUNCI_USER),
  ]);
  if (token && user) return { token, user: JSON.parse(user) };

  const [tokenLama, userLama] = await Promise.all(KUNCI_LAMA.map((k) => AsyncStorage.getItem(k)));
  if (tokenLama && userLama) {
    await Promise.all([
      SecureStore.setItemAsync(KUNCI_TOKEN, tokenLama),
      SecureStore.setItemAsync(KUNCI_USER, userLama),
    ]);
    await AsyncStorage.multiRemove(KUNCI_LAMA);
    return { token: tokenLama, user: JSON.parse(userLama) };
  }
  return null;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Dipakai untuk keluar manual dan otomatis (401). Token/user di memori dikosongkan dulu: navigator
  // langsung pindah ke Login dan membuang state semua layar data; lalu sesi dan cache offline dihapus.
  const signOut = useCallback(async () => {
    setToken(null);
    setUser(null);
    await Promise.all([
      SecureStore.deleteItemAsync(KUNCI_TOKEN).catch(() => {}),
      SecureStore.deleteItemAsync(KUNCI_USER).catch(() => {}),
      ApiService.clearOfflineCache().catch(() => {}),
    ]);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  useEffect(() => {
    let mounted = true;
    bacaSesi()
      .then((sesi) => {
        if (mounted && sesi) {
          setToken(sesi.token);
          setUser(sesi.user);
        }
      })
      .catch(() => {
        // Penyimpanan rusak: kembali ke layar Login.
      })
      .finally(() => {
        if (mounted) setInitializing(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function simpanSesi(nextToken, nextUser) {
    // Jaga-jaga bila keluar sebelumnya terputus (app ditutup): cache akun lain tidak boleh terbawa.
    await ApiService.clearOfflineCache().catch(() => {});
    await Promise.all([
      SecureStore.setItemAsync(KUNCI_TOKEN, nextToken),
      SecureStore.setItemAsync(KUNCI_USER, JSON.stringify(nextUser)),
    ]);
    setToken(nextToken);
    setUser(nextUser);
  }

  async function signIn(email, password) {
    const res = await ApiService.login(email, password);
    await simpanSesi(res.access_token, res.user);
    return res;
  }

  async function signUp(name, email, password) {
    const res = await ApiService.register(name, email, password);
    await simpanSesi(res.access_token, res.user);
    return res;
  }

  // Perbarui data profil (mis. setelah GET /api/me) tanpa mengubah token.
  const perbaruiUser = useCallback(
    async (nextUser) => {
      setUser(nextUser);
      if (token) await SecureStore.setItemAsync(KUNCI_USER, JSON.stringify(nextUser));
    },
    [token]
  );

  return (
    <AuthContext.Provider
      value={{ token, user, initializing, isAuthenticated: Boolean(token), signIn, signUp, signOut, perbaruiUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
