import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../services/ApiService';

const STORAGE_TOKEN_KEY = '@lululala_token';
const STORAGE_USER_KEY = '@lululala_user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function restoreSession() {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem(STORAGE_TOKEN_KEY),
          AsyncStorage.getItem(STORAGE_USER_KEY),
        ]);
        if (mounted && savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch {
        // Biarkan kembali ke layar login jika storage rusak
      } finally {
        if (mounted) setInitializing(false);
      }
    }
    restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  async function persistSession(nextToken, nextUser) {
    setToken(nextToken);
    setUser(nextUser);
    await Promise.all([
      AsyncStorage.setItem(STORAGE_TOKEN_KEY, nextToken),
      AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(nextUser)),
    ]);
  }

  async function signIn(email, password) {
    const res = await ApiService.login(email, password);
    await persistSession(res.access_token, res.user);
    return res;
  }

  async function signUp(name, email, password) {
    const res = await ApiService.register(name, email, password);
    await persistSession(res.access_token, res.user);
    return res;
  }

  async function signInDemo() {
    return signIn('demo@lululala.id', 'Demo1234!');
  }

  async function signOut() {
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([STORAGE_TOKEN_KEY, STORAGE_USER_KEY]);
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        initializing,
        isAuthenticated: Boolean(token),
        signIn,
        signUp,
        signInDemo,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus dipakai di dalam AuthProvider');
  }
  return ctx;
}
