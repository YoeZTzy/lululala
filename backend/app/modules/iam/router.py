import sqlite3
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from fastapi import APIRouter, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from pydantic import BaseModel, EmailStr, Field
from app.config import (
    DATA_DIR,
    JWT_SECRET,
    JWT_ALGORITHM,
    JWT_EXPIRE_MINUTES,
    PARTNER_API_KEYS,
    INTERNAL_INGEST_KEY,
)

router = APIRouter(prefix="/api", tags=["Identitas & Akses"])
DB_PATH = DATA_DIR / "iam.db"

bearer_scheme = HTTPBearer(auto_error=False, scheme_name="BearerJWT")
api_key_scheme = APIKeyHeader(name="X-API-Key", auto_error=False, scheme_name="PartnerApiKey")
internal_key_scheme = APIKeyHeader(name="X-Internal-Key", auto_error=False, scheme_name="InternalIngestKey")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def hash_password(password: str, salt: Optional[bytes] = None) -> str:
    salt = salt or os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
    return f"{salt.hex()}:{dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, dk_hex = stored.split(":")
    except ValueError:
        return False
    check = hash_password(password, bytes.fromhex(salt_hex)).split(":")[1]
    return hmac.compare_digest(check, dk_hex)


def init_iam_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        seed_users = [
            ("Komuter Demo", "demo@lululala.id", "Demo1234!"),
            ("Warga Bandung", "warga@lululala.id", "Warga1234!"),
        ]
        now_iso = datetime.now(timezone.utc).isoformat()
        for name, email, raw_pw in seed_users:
            cur = conn.execute("SELECT id FROM users WHERE email = ?", (email,))
            if not cur.fetchone():
                conn.execute(
                    "INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
                    (name, email, hash_password(raw_pw), now_iso),
                )


class RegisterReq(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginReq(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


def create_token(user_id: int, email: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(user_id), "email": email, "exp": exp}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
) -> dict:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Token JWT tidak ditemukan")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"user_id": int(payload["sub"]), "email": payload["email"]}
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Token JWT tidak valid atau kedaluwarsa")


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
) -> Optional[dict]:
    """JWT opsional: None bila tidak ada token; token yang dikirim tetap harus valid."""
    if not credentials:
        return None
    return get_current_user(credentials)


def require_api_key(x_api_key: Optional[str] = Security(api_key_scheme)) -> str:
    if not x_api_key or x_api_key not in PARTNER_API_KEYS:
        raise HTTPException(status_code=401, detail="API key mitra tidak valid")
    return x_api_key


def optional_api_key(x_api_key: Optional[str] = Security(api_key_scheme)) -> Optional[str]:
    if x_api_key and x_api_key not in PARTNER_API_KEYS:
        raise HTTPException(status_code=401, detail="API key mitra tidak valid")
    return x_api_key


def require_internal_key(x_internal_key: Optional[str] = Security(internal_key_scheme)) -> str:
    if not x_internal_key or not hmac.compare_digest(x_internal_key, INTERNAL_INGEST_KEY):
        raise HTTPException(status_code=401, detail="Internal key tidak valid")
    return x_internal_key


@router.post("/auth/register", status_code=201, summary="Registrasi akun komuter baru")
def register(body: RegisterReq):
    clean_name = body.name.strip()
    clean_email = body.email.strip().lower()
    if len(clean_name) < 2:
        raise HTTPException(status_code=400, detail="Nama minimal 2 karakter")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password minimal 6 karakter")
    with get_db() as conn:
        try:
            cur = conn.execute(
                "INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
                (clean_name, clean_email, hash_password(body.password), datetime.now(timezone.utc).isoformat()),
            )
            user_id = cur.lastrowid
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=409, detail="Email sudah terdaftar")
    return {
        "access_token": create_token(user_id, clean_email),
        "token_type": "bearer",
        "user": {"id": user_id, "name": clean_name, "email": clean_email},
    }


@router.post("/auth/login", summary="Login komuter untuk memperoleh JWT")
def login(body: LoginReq):
    clean_email = body.email.strip().lower()
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, name, email, password_hash FROM users WHERE email = ?",
            (clean_email,),
        ).fetchone()
    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    return {
        "access_token": create_token(row["id"], row["email"]),
        "token_type": "bearer",
        "user": {"id": row["id"], "name": row["name"], "email": row["email"]},
    }


@router.get("/auth/me", summary="Profil pengguna yang sedang login")
def get_me(user: dict = Depends(get_current_user)):
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, name, email, created_at FROM users WHERE id = ?",
            (user["user_id"],),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan")
    return dict(row)
