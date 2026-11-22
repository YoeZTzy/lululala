from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.modules.iam.router import router as iam_router, init_iam_db, get_current_user, get_me
from app.modules.monitoring.router import router as monitoring_router, init_monitoring_db, user_activity_counts
from app.modules.risk.router import router as risk_router, init_risk_db, count_user_commutes


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_iam_db()
    init_monitoring_db()
    init_risk_db()
    yield


app = FastAPI(
    title="Lululala Core Microservice API",
    version="1.0.0",
    description=(
        "Open Host Service LintasSiaga (Kelompok Lululala - K01) untuk pemantauan "
        "kondisi jalan dan penilaian risiko perjalanan rutin komuter Kota Bandung.\n\n"
        "**Autentikasi:**\n"
        "- Pengguna aplikasi: `Authorization: Bearer <JWT>`\n"
        "- Klien mitra (kelompok lain): header `X-API-Key`\n"
        "- Layanan ingest internal (Tugas 3): header `X-Internal-Key`\n\n"
        "**Akun Demo:** `demo@lululala.id` / `Demo1234!`"
    ),
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["System"], summary="Health check microservice")
def health_check():
    return {
        "status": "ok",
        "service": "lululala-core",
        "version": "1.0.0",
        "city": "Bandung",
        "bounded_contexts": ["iam", "monitoring", "risk"],
    }


@app.get("/api/me", tags=["Identitas & Akses"], summary="Profil pengguna login + statistik aktivitas")
def me_with_stats(user: dict = Depends(get_current_user)):
    # Alias /api/auth/me ditambah stats dari context Pemantauan & Risiko (komposisi di root aplikasi).
    profile = get_me(user)
    return {**profile, "stats": {**user_activity_counts(user["user_id"]), "commutes": count_user_commutes(user["user_id"])}}


app.include_router(iam_router)
app.include_router(monitoring_router)
app.include_router(risk_router)
