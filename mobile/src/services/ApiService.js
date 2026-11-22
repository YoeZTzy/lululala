import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://lululala.stei.fun/api';

const REQUEST_TIMEOUT_MS = 10000;

export class ApiError extends Error {
  constructor(message, status = 0, isNetworkError = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

// Dipanggil saat server menolak token (401) pada permintaan yang membawa token: AuthContext memasang signOut di sini.
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function request(path, { method = 'GET', body, token, headers = {} } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const reqHeaders = {
    Accept: 'application/json',
    ...headers,
  };
  if (body !== undefined) {
    reqHeaders['Content-Type'] = 'application/json';
  }
  if (token) {
    reqHeaders.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: reqHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    if (!response.ok) {
      if (response.status === 401 && token && onUnauthorized) {
        onUnauthorized();
        throw new ApiError('Sesi berakhir. Silakan masuk lagi.', 401, false);
      }
      const detail =
        (data && (data.detail || data.message)) ||
        (response.status === 404
          ? 'Endpoint tidak ditemukan (404). Pastikan microservice STB aktif.'
          : response.status === 429
            ? 'Terlalu banyak permintaan. Coba beberapa saat lagi.'
            : `Permintaan gagal (HTTP ${response.status}).`);
      const readableDetail = Array.isArray(detail)
        ? detail.map((d) => d.msg || String(d)).join(', ')
        : String(detail);
      throw new ApiError(readableDetail, response.status, false);
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (err && err.name === 'AbortError') {
      throw new ApiError(
        'Koneksi ke server Lululala melewati batas waktu (10 detik).',
        0,
        true
      );
    }
    throw new ApiError(
      'Tidak dapat terhubung ke server Lululala. Periksa koneksi internet atau status STB.',
      0,
      true
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

async function saveCache(cacheKey, data) {
  try {
    const payload = JSON.stringify({ data, cachedAt: new Date().toISOString() });
    await AsyncStorage.setItem(`@lululala_cache_${cacheKey}`, payload);
  } catch {
    // Abaikan kegagalan penulisan cache agar aplikasi tidak crash
  }
}

async function loadCache(cacheKey) {
  try {
    const raw = await AsyncStorage.getItem(`@lululala_cache_${cacheKey}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function fetchWithCache(cacheKey, fetcher) {
  try {
    const data = await fetcher();
    await saveCache(cacheKey, data);
    return { data, fromCache: false, cachedAt: null, error: null };
  } catch (err) {
    const cached = await loadCache(cacheKey);
    if (cached && cached.data !== undefined) {
      return {
        data: cached.data,
        fromCache: true,
        cachedAt: cached.cachedAt,
        error: err.message || 'Menampilkan data terakhir (mode offline).',
      };
    }
    throw err;
  }
}

const ApiService = {
  baseUrl: API_BASE_URL,

  async healthCheck() {
    const started = Date.now();
    const data = await request('/health');
    return { ...data, latencyMs: Date.now() - started };
  },

  // IAM / Auth
  login(email, password) {
    return request('/auth/login', {
      method: 'POST',
      body: { email: email.trim().toLowerCase(), password },
    });
  },

  register(name, email, password) {
    return request('/auth/register', {
      method: 'POST',
      body: { name: name.trim(), email: email.trim().toLowerCase(), password },
    });
  },

  getMe(token) {
    return request('/auth/me', { token });
  },

  // Monitoring
  getSummary() {
    return fetchWithCache('summary', () => request('/summary'));
  },

  getHazards(bbox) {
    const qs = bbox ? `?bbox=${encodeURIComponent(bbox)}` : '';
    return fetchWithCache('hazards', () => request(`/hazards${qs}`));
  },

  getReports(token, bbox) {
    const qs = bbox ? `?bbox=${encodeURIComponent(bbox)}` : '';
    return fetchWithCache('reports', () => request(`/reports${qs}`, { token }));
  },

  createReport(token, payload) {
    return request('/reports', { method: 'POST', token, body: payload });
  },

  confirmReport(token, reportId) {
    return request(`/reports/${reportId}/confirmations`, { method: 'POST', token });
  },

  disputeReport(token, reportId) {
    return request(`/reports/${reportId}/disputes`, { method: 'POST', token });
  },

  // Risk & Commutes
  getCommutes(token) {
    return fetchWithCache('commutes', () => request('/commutes', { token }));
  },

  createCommute(token, payload) {
    return request('/commutes', { method: 'POST', token, body: payload });
  },

  updateCommute(token, commuteId, payload) {
    return request(`/commutes/${commuteId}`, { method: 'PUT', token, body: payload });
  },

  deleteCommute(token, commuteId) {
    return request(`/commutes/${commuteId}`, { method: 'DELETE', token });
  },

  getCommuteRisk(token, commuteId) {
    return request(`/commutes/${commuteId}/risk`, { token });
  },

  getAlerts(token) {
    return fetchWithCache('alerts', () => request('/alerts', { token }));
  },

  async clearOfflineCache() {
    const keys = ['summary', 'hazards', 'reports', 'commutes', 'alerts'];
    await AsyncStorage.multiRemove(keys.map((k) => `@lululala_cache_${k}`));
  },
};

export default ApiService;
