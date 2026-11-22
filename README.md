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
└── mobile/                 # React Native (Expo) App
    ├── App.js
    ├── app.json
    └── src/
        ├── constants/bandungPresets.js
        ├── context/AuthContext.js
        ├── navigation/AppNavigator.js
        ├── services/ApiService.js
        └── screens/
            ├── LoginScreen.js
            ├── RegisterScreen.js
            ├── HomeScreen.js
            ├── ReportsScreen.js
            ├── CommutesScreen.js
            └── ProfileScreen.js
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
