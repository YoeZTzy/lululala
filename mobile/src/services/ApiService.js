import AsyncStorage from '@react-native-async-storage/async-storage';
import { petakanGalat422 } from '../utils/galatApi';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://lululala.stei.fun/api';

const REQUEST_TIMEOUT_MS = 10000;

export class ApiError extends Error {
  constructor(message, status = 0, isNetworkError = false, fields = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
    this.fields = fields; // 422: { namaField: 'pesan Indonesia' }
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
      if (response.status === 422) {
        const { fields, message } = petakanGalat422(data?.detail);
        throw new ApiError(message, 422, false, fields);
      }
      const detail =
        (data && (data.detail || data.message)) ||
        (response.status === 404
          ? 'Data tidak ditemukan.'
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
        'Server terlalu lama merespons. Coba lagi sebentar lagi.',
        0,
        true
      );
    }
    throw new ApiError(
      'Tidak bisa terhubung. Periksa koneksi internetmu.',
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

  // GET /api/me = profil + stats {reports, votes, commutes}
  getMe(token) {
    return request('/me', { token });
  },

  // Monitoring
  getSummary() {
    return fetchWithCache('summary', () => request('/summary'));
  },

  getHazards(bbox) {
    const qs = bbox ? `?bbox=${encodeURIComponent(bbox)}` : '';
    return fetchWithCache('hazards', () => request(`/hazards${qs}`));
  },

  getHazard(token, hazardId) {
    return request(`/hazards/${hazardId}`, { token });
  },

  getMyReports(token) {
    return fetchWithCache('my_reports', () => request('/reports?mine=true', { token }));
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
  getCommutes(token, { includeRisk = false } = {}) {
    const qs = includeRisk ? '?include_risk=true' : '';
    return fetchWithCache(`commutes${qs ? '_risk' : ''}`, () => request(`/commutes${qs}`, { token }));
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
    const keys = ['summary', 'hazards', 'reports', 'my_reports', 'commutes', 'commutes_risk', 'alerts'];
    await AsyncStorage.multiRemove(keys.map((k) => `@lululala_cache_${k}`));
  },
};

// ---------------------------------------------------------------------------
// API kelompok lain (Health & Tourism). URL & key dari env Expo:
//   EXPO_PUBLIC_HEALTH_API_URL, EXPO_PUBLIC_HEALTH_API_KEY
//   EXPO_PUBLIC_TOURISM_API_URL, EXPO_PUBLIC_TOURISM_API_KEY
// Bila URL kosong, fungsi mengembalikan data contoh (mock) agar UI tetap bisa dikembangkan.
// ---------------------------------------------------------------------------
const HEALTH_API_URL = process.env.EXPO_PUBLIC_HEALTH_API_URL || '';
const HEALTH_API_KEY = process.env.EXPO_PUBLIC_HEALTH_API_KEY || '';
const TOURISM_API_URL = process.env.EXPO_PUBLIC_TOURISM_API_URL || '';
const TOURISM_API_KEY = process.env.EXPO_PUBLIC_TOURISM_API_KEY || '';

const MOCK_FASKES = [
  { id: 'mock-1', nama: 'RS Contoh Bandung', jenis: 'rumah_sakit', lat: -6.8949, lon: 107.6105 },
  { id: 'mock-2', nama: 'Puskesmas Contoh', jenis: 'puskesmas', lat: -6.9175, lon: 107.6191 },
];

const MOCK_DESTINASI = [
  { id: 'mock-1', nama: 'Destinasi Contoh A', kategori: 'taman', lat: -6.9025, lon: 107.6187 },
  { id: 'mock-2', nama: 'Destinasi Contoh B', kategori: 'museum', lat: -6.9218, lon: 107.6071 },
];

async function requestMitra(baseUrl, apiKey, path) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { Accept: 'application/json', ...(apiKey ? { 'X-API-Key': apiKey } : {}) },
      signal: controller.signal,
    });
    if (!res.ok) throw new ApiError(`Layanan mitra gagal (HTTP ${res.status}).`, res.status, false);
    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Layanan mitra tidak bisa dihubungi.', 0, true);
  } finally {
    clearTimeout(timeoutId);
  }
}

// Fasilitas kesehatan dari kelompok Health.
// TODO: sesuaikan path & bentuk respons dengan dokumentasi API kelompok Health setelah tersedia.
export function getFaskes({ lat, lon } = {}) {
  if (!HEALTH_API_URL) return Promise.resolve({ items: MOCK_FASKES, mock: true });
  const qs = lat != null && lon != null ? `?lat=${lat}&lon=${lon}` : '';
  return requestMitra(HEALTH_API_URL, HEALTH_API_KEY, `/faskes${qs}`);
}

// Destinasi wisata dari kelompok Tourism.
// TODO: sesuaikan path & bentuk respons dengan dokumentasi API kelompok Tourism setelah tersedia.
export function getDestinasi({ lat, lon } = {}) {
  if (!TOURISM_API_URL) return Promise.resolve({ items: MOCK_DESTINASI, mock: true });
  const qs = lat != null && lon != null ? `?lat=${lat}&lon=${lon}` : '';
  return requestMitra(TOURISM_API_URL, TOURISM_API_KEY, `/destinasi${qs}`);
}

export default ApiService;
