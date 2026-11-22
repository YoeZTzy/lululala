# Lululala (LintasSiaga) — Smart City & Mobility (K01)

Proyek Gabungan **II3160 Teknologi Sistem Terintegrasi (TST) × II3140 Pengembangan Aplikasi Web & Mobile (PWAM)**, STEI ITB.

- **Anggota:**
  - `18224073` — Abdullah Ahmad Yusuf
  - `18224095` — Sirojul Firdaus
- **URL Microservice Live:** `https://lululala.stei.fun/api`
- **Swagger UI / OpenAPI:** `https://lululala.stei.fun/api/docs`
- **Akun Demo Aplikasi:** `demo@lululala.id` / `Demo1234!`

## Struktur Repositori

```text
lululala/
├── backend/                # FastAPI Modular Monolith (IAM, Monitoring, Risk) + Nginx Gateway + Docker
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── shared/event_bus.py
│   │   └── modules/
│   │       ├── iam/router.py
│   │       ├── monitoring/router.py
│   │       └── risk/router.py
│   ├── nginx/nginx.conf
│   ├── tests/test_api.py
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── requirements.txt
│   └── .env.example
└── mobile/                 # React Native (Expo SDK 58) App, desain Hi-Fi Figma "LintasSiaga"
    ├── App.js              # memuat font Plus Jakarta Sans
    ├── app.json
    ├── PLAN_HIFI.md        # rencana & keputusan desain Hi-Fi
    ├── scripts/cek-utils.mjs
    └── src/
        ├── theme/          # token warna Figma, tipografi, spacing, radius
        ├── components/     # komponen Figma: Input, Tombol, Chip, Badge, TabBar, KartuRute, Penanda, ...
        ├── assets/svg/     # aset SVG dari Figma (logo, tekstur header, penanda)
        ├── context/AuthContext.js   # sesi JWT di expo-secure-store, logout otomatis 401
        ├── navigation/AppNavigator.js
        ├── services/ApiService.js   # microservice + API kelompok Health/Tourism
        ├── hooks/useMuat.js
        ├── utils/          # jadwal, geo, cuaca, waktu, lokasi, validasi
        └── screens/        # Login, Daftar, Beranda, TambahRute, DetailRute, Peta,
                            # DetailTitikRawan, Lapor, LaporanTerkirimModal, Profil
```

## Menjalankan Backend

### 1. Dengan Docker (STB Armbian / Server)
```bash
cd backend
cp .env.example .env
# Edit .env dengan JWT_SECRET, PARTNER_API_KEYS, dan INTERNAL_INGEST_KEY
docker compose up -d --build
curl -i http://127.0.0.1:8080/api/health
```

### 2. Pengujian Otomatis Lokal (Windows PowerShell)
```powershell
cd backend
.\.venv\Scripts\python.exe -m tests.test_api
```

## Menjalankan Aplikasi Mobile (Expo Go)
```powershell
cd mobile
npm install
npx expo start
```
Scan QR Code memakai aplikasi **Expo Go** di HP. Secara default, aplikasi terhubung ke `https://lululala.stei.fun/api` (dapat dioverride lewat environment variable `EXPO_PUBLIC_API_URL`).

Variabel lingkungan opsional (buat `mobile/.env.local`, jangan di-commit):

| Variabel | Fungsi |
|---|---|
| `EXPO_PUBLIC_API_URL` | Base URL microservice, mis. `http://192.168.1.10:8080/api` untuk backend lokal |
| `EXPO_PUBLIC_HEALTH_API_URL`, `EXPO_PUBLIC_HEALTH_API_KEY` | API kelompok Health (`getFaskes()`); kosong = data contoh |
| `EXPO_PUBLIC_TOURISM_API_URL`, `EXPO_PUBLIC_TOURISM_API_KEY` | API kelompok Tourism (`getDestinasi()`); kosong = data contoh |

Cek util tanpa perangkat: `node mobile/scripts/cek-utils.mjs`.
