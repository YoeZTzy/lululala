import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("DATA_DIR", BASE_DIR / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-lululala-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))

PARTNER_API_KEYS = {
    k.strip() for k in os.getenv("PARTNER_API_KEYS", "lululala-mitra-01,lululala-mitra-02").split(",") if k.strip()
}
INTERNAL_INGEST_KEY = os.getenv("INTERNAL_INGEST_KEY", "lululala-internal-secret")