import sqlite3
import math
from datetime import datetime, timedelta, timezone
from typing import Optional, Literal, List, Tuple
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from app.config import DATA_DIR
from app.shared.event_bus import event_bus
from app.modules.iam.router import get_current_user, get_optional_user, require_internal_key, optional_api_key

router = APIRouter(prefix="/api", tags=["Pemantauan Kondisi Jalan"])
DB_PATH = DATA_DIR / "monitoring.db"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def compute_effective_score(row) -> float:
    created = datetime.fromisoformat(row["created_at"])
    age_hours = max(0.0, (datetime.now(timezone.utc) - created).total_seconds() / 3600.0)
    # Peluruhan seiring waktu (-0.08 per jam)
    return round(max(0.0, min(1.0, row["confidence_score"] - 0.08 * age_hours)), 3)


def cluster_score(cluster) -> float:
    """Skor TitikRawan dari laporan anggota: skor efektif tertinggi + bonus kolaboratif."""
    effective_scores = [compute_effective_score(r) for r in cluster]
    max_score = max(effective_scores)
    # Bonus kolaboratif bila >= 2 laporan berbeda di radius <= 300 m
    multi_report_bonus = min(0.20, 0.10 * (len(cluster) - 1)) if len(cluster) > 1 and max_score >= 0.35 else 0.0
    return round(min(1.0, max_score + multi_report_bonus), 3)


def status_for_score(score: float) -> str:
    if score >= 0.60:
        return "Aktif"
    if score >= 0.35:
        return "Mereda"
    return "Selesai"


def anonymize_expired_reports(conn) -> None:
    now_iso = datetime.now(timezone.utc).isoformat()
    conn.execute(
        "UPDATE reports SET reporter_id = NULL WHERE expires_at <= ? AND reporter_id IS NOT NULL",
        (now_iso,),
    )


def sync_hazard_from_report(conn, report_row) -> List[Tuple[str, dict]]:
    """
    Mengelompokkan laporan aktif dalam radius <= 300 m dengan jenis kejadian sama
    menjadi satu TitikRawan (Hazard) dan menghitung ulang skor/statusnya.
    Mengembalikan daftar domain event yang harus di-publish setelah commit SQLite.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    pending_events: List[Tuple[str, dict]] = []

    hazards = conn.execute(
        "SELECT * FROM hazards WHERE incident_type = ? AND status != 'Selesai'",
        (report_row["incident_type"],),
    ).fetchall()

    matched = None
    for h in hazards:
        if haversine_m(h["lat"], h["lon"], report_row["lat"], report_row["lon"]) <= 300:
            matched = h
            break

    center_lat = matched["lat"] if matched else report_row["lat"]
    center_lon = matched["lon"] if matched else report_row["lon"]

    active_reports = conn.execute(
        "SELECT * FROM reports WHERE incident_type = ? AND expires_at > ?",
        (report_row["incident_type"], now_iso),
    ).fetchall()

    cluster = [
        r for r in active_reports
        if haversine_m(center_lat, center_lon, r["lat"], r["lon"]) <= 300
    ]
    if not cluster:
        cluster = [report_row]

    score = cluster_score(cluster)
    max_severity = max(r["severity"] for r in cluster)
    report_count = len(cluster)
    hazard_id = None

    if matched:
        new_status = status_for_score(score)
        hazard_id = matched["id"]

        conn.execute(
            """
            UPDATE hazards
            SET confidence_score = ?, severity = ?, status = ?, report_count = ?, updated_at = ?
            WHERE id = ?
            """,
            (score, max_severity, new_status, report_count, now_iso, matched["id"]),
        )
        pending_events.append((
            f"TitikRawan{new_status}",
            {
                "hazard_id": matched["id"],
                "incident_type": matched["incident_type"],
                "severity": max_severity,
                "lat": matched["lat"],
                "lon": matched["lon"],
                "status": new_status,
                "confidence_score": score,
            },
        ))
    elif score >= 0.60:
        cur = conn.execute(
            """
            INSERT INTO hazards (incident_type, severity, lat, lon, confidence_score, status, report_count, updated_at)
            VALUES (?, ?, ?, ?, ?, 'Aktif', ?, ?)
            """,
            (
                report_row["incident_type"],
                max_severity,
                report_row["lat"],
                report_row["lon"],
                score,
                report_count,
                now_iso,
            ),
        )
        hazard_id = cur.lastrowid
        pending_events.append((
            "TitikRawanAktif",
            {
                "hazard_id": cur.lastrowid,
                "incident_type": report_row["incident_type"],
                "severity": max_severity,
                "lat": report_row["lat"],
                "lon": report_row["lon"],
                "status": "Aktif",
                "confidence_score": score,
            },
        ))

    if hazard_id is not None:
        # Simpan keanggotaan laporan pada TitikRawan (dipakai detail & peluruhan).
        conn.executemany(
            "UPDATE reports SET hazard_id = ? WHERE id = ?",
            [(hazard_id, r["id"]) for r in cluster],
        )

    return pending_events


def hazard_members(conn, hazard, active_only: bool = True) -> list:
    """Laporan anggota TitikRawan, terbaru dulu."""
    now_iso = datetime.now(timezone.utc).isoformat()
    assigned = conn.execute("SELECT COUNT(*) FROM reports WHERE hazard_id = ?", (hazard["id"],)).fetchone()[0]
    if assigned:
        sql = "SELECT * FROM reports WHERE hazard_id = ?"
        params: list = [hazard["id"]]
        if active_only:
            sql += " AND expires_at > ?"
            params.append(now_iso)
        return conn.execute(sql + " ORDER BY created_at DESC", params).fetchall()
    # Data lama (sebelum kolom hazard_id): anggota = laporan aktif sejenis dalam 300 m dari pusat.
    rows = conn.execute(
        "SELECT * FROM reports WHERE incident_type = ? AND expires_at > ? ORDER BY created_at DESC",
        (hazard["incident_type"], now_iso),
    ).fetchall()
    return [r for r in rows if haversine_m(hazard["lat"], hazard["lon"], r["lat"], r["lon"]) <= 300]


def refresh_hazard(conn, hazard) -> dict:
    """Peluruhan saat dibaca: hitung ulang skor/status dari anggota yang belum kedaluwarsa."""
    members = hazard_members(conn, hazard, active_only=True)
    if members:
        score = cluster_score(members)
        severity = max(r["severity"] for r in members)
    else:
        score, severity = 0.0, hazard["severity"]
    status = status_for_score(score)
    count = len(members)
    if (score, status, count, severity) != (
        hazard["confidence_score"], hazard["status"], hazard["report_count"], hazard["severity"]
    ):
        conn.execute(
            "UPDATE hazards SET confidence_score = ?, severity = ?, status = ?, report_count = ? WHERE id = ?",
            (score, severity, status, count, hazard["id"]),
        )
    fresh = dict(hazard)
    fresh.update(
        confidence_score=score,
        severity=severity,
        status=status,
        report_count=count,
        last_report_at=members[0]["created_at"] if members else None,
    )
    return fresh


def refresh_active_hazards(conn) -> List[dict]:
    """Segarkan semua TitikRawan Aktif/Mereda; kembalikan yang masih Aktif/Mereda."""
    rows = conn.execute("SELECT * FROM hazards WHERE status IN ('Aktif', 'Mereda')").fetchall()
    fresh = [refresh_hazard(conn, h) for h in rows]
    return [h for h in fresh if h["status"] in ("Aktif", "Mereda")]


def _publish_events(events: List[Tuple[str, dict]]) -> None:
    for event_name, payload in events:
        event_bus.publish(event_name, payload)


def init_monitoring_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reporter_id INTEGER,
                source TEXT NOT NULL,
                incident_type TEXT NOT NULL,
                severity INTEGER NOT NULL,
                lat REAL NOT NULL,
                lon REAL NOT NULL,
                description TEXT,
                confidence_score REAL NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS report_votes (
                report_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                vote_type TEXT NOT NULL,
                PRIMARY KEY (report_id, user_id)
            );
            CREATE TABLE IF NOT EXISTS hazards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                incident_type TEXT NOT NULL,
                severity INTEGER NOT NULL,
                lat REAL NOT NULL,
                lon REAL NOT NULL,
                confidence_score REAL NOT NULL,
                status TEXT NOT NULL,
                report_count INTEGER NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS weather_factors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rain_mm REAL NOT NULL,
                weather_factor REAL NOT NULL,
                recorded_at TEXT NOT NULL
            );
            -- Jumlah laporan per pengguna; tetap ada walau reporter_id laporan dianonimkan setelah kedaluwarsa.
            CREATE TABLE IF NOT EXISTS reporter_stats (
                user_id INTEGER PRIMARY KEY,
                total INTEGER NOT NULL
            );
        """)
        # Migrasi tanpa merusak data lama: tambah kolom keanggotaan hazard bila belum ada.
        report_cols = {r[1] for r in conn.execute("PRAGMA table_info(reports)")}
        if "hazard_id" not in report_cols:
            conn.execute("ALTER TABLE reports ADD COLUMN hazard_id INTEGER")

        now = datetime.now(timezone.utc)

        # Seed faktor cuaca awal Kota Bandung jika kosong
        w_count = conn.execute("SELECT COUNT(*) FROM weather_factors").fetchone()[0]
        if w_count == 0:
            conn.execute(
                "INSERT INTO weather_factors (rain_mm, weather_factor, recorded_at) VALUES (?, ?, ?)",
                (3.0, 0.30, now.isoformat()),
            )

        # Seed laporan uji Kota Bandung jika belum ada data
        r_count = conn.execute("SELECT COUNT(*) FROM reports").fetchone()[0]
        if r_count == 0:
            seed_reports = [
                # user_id=2 (warga@lululala.id) agar akun demo@lululala.id bisa langsung Konfirmasi/Bantah
                (
                    2,
                    "citizen",
                    "genangan",
                    3,
                    -6.8935,
                    107.5906,
                    "Genangan sekitar 20 cm di Jl. Dr. Djunjunan (Pasteur) arah Gerbang Tol",
                    0.45,
                    (now - timedelta(minutes=12)).isoformat(),
                    (now + timedelta(hours=3)).isoformat(),
                ),
                (
                    2,
                    "citizen",
                    "macet_parah",
                    4,
                    -6.9110,
                    107.6480,
                    "Macet parah di Jl. Terusan Jakarta (Antapani) menuju Jl. Ahmad Yani - ITB",
                    0.75,
                    (now - timedelta(minutes=18)).isoformat(),
                    (now + timedelta(hours=3)).isoformat(),
                ),
                (
                    None,
                    "petabencana",
                    "banjir",
                    4,
                    -6.9219,
                    107.5955,
                    "Laporan resmi PetaBencana.id: banjir setinggi 40 cm di Jl. Pagarsih, Astanaanyar",
                    0.85,
                    (now - timedelta(minutes=25)).isoformat(),
                    (now + timedelta(hours=4)).isoformat(),
                ),
                (
                    2,
                    "citizen",
                    "jalan_rusak",
                    2,
                    -6.9482,
                    107.6335,
                    "Jalan berlubang cukup dalam di Jl. Soekarno-Hatta dekat Simpang Buah Batu",
                    0.50,
                    (now - timedelta(minutes=30)).isoformat(),
                    (now + timedelta(hours=3)).isoformat(),
                ),
            ]
            for item in seed_reports:
                cur = conn.execute(
                    """
                    INSERT INTO reports
                    (reporter_id, source, incident_type, severity, lat, lon, description, confidence_score, created_at, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    item,
                )
                row = conn.execute("SELECT * FROM reports WHERE id = ?", (cur.lastrowid,)).fetchone()
                sync_hazard_from_report(conn, row)

        # Isi awal reporter_stats dari laporan yang pelapornya masih tercatat.
        if conn.execute("SELECT COUNT(*) FROM reporter_stats").fetchone()[0] == 0:
            conn.execute(
                """
                INSERT INTO reporter_stats (user_id, total)
                SELECT reporter_id, COUNT(*) FROM reports WHERE reporter_id IS NOT NULL GROUP BY reporter_id
                """
            )


def user_activity_counts(user_id: int) -> dict:
    """Statistik aktivitas pengguna untuk /api/me."""
    with get_db() as conn:
        row = conn.execute("SELECT total FROM reporter_stats WHERE user_id = ?", (user_id,)).fetchone()
        votes = conn.execute("SELECT COUNT(*) FROM report_votes WHERE user_id = ?", (user_id,)).fetchone()[0]
    return {"reports": row["total"] if row else 0, "votes": votes}


class ReportCreateReq(BaseModel):
    incident_type: Literal["genangan", "banjir", "macet_parah", "jalan_rusak", "kecelakaan"]
    severity: int = Field(ge=1, le=5)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    description: Optional[str] = Field(default="", max_length=300)


class WeatherIngestReq(BaseModel):
    rain_mm: float = Field(ge=0)


class OfficialReportIngestReq(BaseModel):
    incident_type: Literal["genangan", "banjir", "macet_parah", "jalan_rusak", "kecelakaan"] = "banjir"
    severity: int = Field(default=4, ge=1, le=5)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    description: Optional[str] = Field(default="Laporan resmi PetaBencana.id", max_length=300)


def parse_bbox(bbox: Optional[str]):
    if not bbox:
        return None
    try:
        parts = [float(x.strip()) for x in bbox.split(",")]
    except ValueError:
        raise HTTPException(status_code=400, detail="Format bbox harus angka: min_lon,min_lat,max_lon,max_lat")
    if len(parts) != 4:
        raise HTTPException(status_code=400, detail="Format bbox harus min_lon,min_lat,max_lon,max_lat")
    if parts[0] > parts[2] or parts[1] > parts[3]:
        raise HTTPException(status_code=400, detail="Nilai min pada bbox harus <= max")
    return parts  # min_lon, min_lat, max_lon, max_lat


@router.get("/reports", summary="Daftar laporan kondisi jalan aktif")
def list_reports(
    bbox: Optional[str] = Query(None, description="min_lon,min_lat,max_lon,max_lat"),
    mine: bool = Query(False, description="true = hanya laporan aktif milik pengguna login"),
    user: dict = Depends(get_current_user),
):
    box = parse_bbox(bbox)
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        anonymize_expired_reports(conn)
        if mine:
            rows = conn.execute(
                "SELECT * FROM reports WHERE expires_at > ? AND reporter_id = ? ORDER BY id DESC LIMIT 100",
                (now_iso, user["user_id"]),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM reports WHERE expires_at > ? ORDER BY id DESC LIMIT 100",
                (now_iso,),
            ).fetchall()
        votes_rows = conn.execute("SELECT report_id, user_id, vote_type FROM report_votes").fetchall()

    vote_counts = {}
    my_votes = {}
    for v in votes_rows:
        rid = v["report_id"]
        if rid not in vote_counts:
            vote_counts[rid] = {"confirmation": 0, "dispute": 0}
        if v["vote_type"] in vote_counts[rid]:
            vote_counts[rid][v["vote_type"]] += 1
        if v["user_id"] == user["user_id"]:
            my_votes[rid] = v["vote_type"]

    result = []
    for r in rows:
        if box and not (box[0] <= r["lon"] <= box[2] and box[1] <= r["lat"] <= box[3]):
            continue
        vc = vote_counts.get(r["id"], {"confirmation": 0, "dispute": 0})
        result.append({
            "id": r["id"],
            "source": r["source"],
            "incident_type": r["incident_type"],
            "severity": r["severity"],
            "lat": r["lat"],
            "lon": r["lon"],
            "description": r["description"],
            "confidence_score": compute_effective_score(r),
            "confirmations": vc["confirmation"],
            "disputes": vc["dispute"],
            "is_mine": r["reporter_id"] == user["user_id"],
            "my_vote": my_votes.get(r["id"]),
            "created_at": r["created_at"],
            "expires_at": r["expires_at"],
            "hazard_id": r["hazard_id"],
        })
    return {"total": len(result), "items": result}


@router.post("/reports", status_code=201, summary="Ajukan laporan kondisi jalan baru")
def create_report(body: ReportCreateReq, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    one_hour_ago = (now - timedelta(hours=1)).isoformat()
    with get_db() as conn:
        anonymize_expired_reports(conn)
        count = conn.execute(
            "SELECT COUNT(*) FROM reports WHERE reporter_id = ? AND created_at >= ?",
            (user["user_id"], one_hour_ago),
        ).fetchone()[0]
        if count >= 5:
            raise HTTPException(status_code=429, detail="Batas maksimal 5 laporan per jam tercapai")

        w = conn.execute("SELECT weather_factor FROM weather_factors ORDER BY id DESC LIMIT 1").fetchone()
        rain_boost = 0.15 if (w and w["weather_factor"] >= 0.5 and body.incident_type in ("genangan", "banjir")) else 0.0
        init_score = round(min(1.0, 0.45 + rain_boost), 3)

        cur = conn.execute(
            """
            INSERT INTO reports
            (reporter_id, source, incident_type, severity, lat, lon, description, confidence_score, created_at, expires_at)
            VALUES (?, 'citizen', ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user["user_id"],
                body.incident_type,
                body.severity,
                body.lat,
                body.lon,
                (body.description or "").strip(),
                init_score,
                now.isoformat(),
                (now + timedelta(hours=3)).isoformat(),
            ),
        )
        conn.execute(
            """
            INSERT INTO reporter_stats (user_id, total) VALUES (?, 1)
            ON CONFLICT(user_id) DO UPDATE SET total = total + 1
            """,
            (user["user_id"],),
        )
        row = conn.execute("SELECT * FROM reports WHERE id = ?", (cur.lastrowid,)).fetchone()
        events = sync_hazard_from_report(conn, row)
        hazard_id = conn.execute("SELECT hazard_id FROM reports WHERE id = ?", (row["id"],)).fetchone()[0]

    _publish_events(events)
    return {
        "id": row["id"],
        "incident_type": row["incident_type"],
        "severity": row["severity"],
        "confidence_score": init_score,
        "expires_at": row["expires_at"],
        "hazard_id": hazard_id,
    }


def _vote_report(report_id: int, user_id: int, vote_type: str, delta: float):
    with get_db() as conn:
        rep = conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
        if not rep:
            raise HTTPException(status_code=404, detail="Laporan tidak ditemukan")
        if rep["reporter_id"] == user_id:
            raise HTTPException(status_code=400, detail="Pelapor tidak dapat mengonfirmasi atau membantah laporannya sendiri")
        try:
            conn.execute(
                "INSERT INTO report_votes (report_id, user_id, vote_type) VALUES (?, ?, ?)",
                (report_id, user_id, vote_type),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=409, detail="Anda sudah memberikan respon pada laporan ini")

        updated_score = round(max(0.0, min(1.0, rep["confidence_score"] + delta)), 3)
        conn.execute("UPDATE reports SET confidence_score = ? WHERE id = ?", (updated_score, report_id))
        updated_rep = conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
        events = sync_hazard_from_report(conn, updated_rep)

    _publish_events(events)
    return {
        "report_id": report_id,
        "vote_type": vote_type,
        "confidence_score": updated_score,
        "emitted_events": [e[0] for e in events],
    }


@router.post("/reports/{report_id}/confirmations", summary="Konfirmasi laporan warga lain (+0.20)")
def confirm_report(report_id: int, user: dict = Depends(get_current_user)):
    return _vote_report(report_id, user["user_id"], "confirmation", +0.20)


@router.post("/reports/{report_id}/disputes", summary="Bantah laporan warga lain (-0.25)")
def dispute_report(report_id: int, user: dict = Depends(get_current_user)):
    return _vote_report(report_id, user["user_id"], "dispute", -0.25)


@router.get("/hazards", summary="Daftar titik rawan agregat aktif/mereda (tanpa identitas pelapor)")
def list_hazards(
    bbox: Optional[str] = Query(None, description="min_lon,min_lat,max_lon,max_lat"),
    _: Optional[str] = Depends(optional_api_key),
):
    box = parse_bbox(bbox)
    with get_db() as conn:
        rows = refresh_active_hazards(conn)
    rows.sort(key=lambda h: h["updated_at"], reverse=True)
    rows.sort(key=lambda h: h["confidence_score"], reverse=True)
    keys = ("id", "incident_type", "severity", "lat", "lon", "confidence_score", "status", "report_count", "updated_at", "last_report_at")
    items = []
    for r in rows:
        if box and not (box[0] <= r["lon"] <= box[2] and box[1] <= r["lat"] <= box[3]):
            continue
        items.append({k: r[k] for k in keys})
    return {"city": "Bandung", "total": len(items), "hazards": items}


@router.get("/hazards/{hazard_id}", summary="Detail titik rawan + laporan anggota (JWT opsional untuk is_mine/my_vote)")
def hazard_detail(hazard_id: int, user: Optional[dict] = Depends(get_optional_user)):
    with get_db() as conn:
        anonymize_expired_reports(conn)
        hazard = conn.execute("SELECT * FROM hazards WHERE id = ?", (hazard_id,)).fetchone()
        if not hazard:
            raise HTTPException(status_code=404, detail="Titik rawan tidak ditemukan")
        fresh = refresh_hazard(conn, hazard)
        members = hazard_members(conn, hazard, active_only=False)
        ids = [m["id"] for m in members]
        votes = (
            conn.execute(
                f"SELECT report_id, user_id, vote_type FROM report_votes WHERE report_id IN ({','.join('?' * len(ids))})",
                ids,
            ).fetchall()
            if ids
            else []
        )
        w = conn.execute("SELECT rain_mm, weather_factor, recorded_at FROM weather_factors ORDER BY id DESC LIMIT 1").fetchone()

    now_iso = datetime.now(timezone.utc).isoformat()
    uid = user["user_id"] if user else None
    reports = []
    for m in members:
        mv = [v for v in votes if v["report_id"] == m["id"]]
        reports.append({
            "id": m["id"],
            "source": m["source"],
            "incident_type": m["incident_type"],
            "severity": m["severity"],
            "description": m["description"],
            "confidence_score": compute_effective_score(m),
            "confirmations": sum(1 for v in mv if v["vote_type"] == "confirmation"),
            "disputes": sum(1 for v in mv if v["vote_type"] == "dispute"),
            "is_mine": uid is not None and m["reporter_id"] == uid,
            "my_vote": next((v["vote_type"] for v in mv if v["user_id"] == uid), None),
            "active": m["expires_at"] > now_iso,
            "created_at": m["created_at"],
            "expires_at": m["expires_at"],
        })
    # Konfirmasi/bantahan ditujukan ke laporan aktif terbaru yang bukan milik pengguna.
    target = next((r for r in reports if r["active"] and not r["is_mine"]), None)
    keys = ("id", "incident_type", "severity", "lat", "lon", "confidence_score", "status", "report_count", "updated_at", "last_report_at")
    return {
        **{k: fresh[k] for k in keys},
        "weather": dict(w) if w else None,
        "reports": reports,
        "target_report_id": target["id"] if target else None,
    }


WIB = timezone(timedelta(hours=7))


def _build_bandung_summary():
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    start_today = now.astimezone(WIB).replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc).isoformat()
    with get_db() as conn:
        refresh_active_hazards(conn)
        active = conn.execute("SELECT COUNT(*) FROM hazards WHERE status = 'Aktif'").fetchone()[0]
        easing = conn.execute("SELECT COUNT(*) FROM hazards WHERE status = 'Mereda'").fetchone()[0]
        reports = conn.execute("SELECT COUNT(*) FROM reports WHERE expires_at > ?", (now_iso,)).fetchone()[0]
        w = conn.execute("SELECT rain_mm, weather_factor, recorded_at FROM weather_factors ORDER BY id DESC LIMIT 1").fetchone()
        identified = conn.execute(
            "SELECT COUNT(DISTINCT reporter_id) FROM reports WHERE source = 'citizen' AND created_at >= ? AND reporter_id IS NOT NULL",
            (start_today,),
        ).fetchone()[0]
        anonymized = conn.execute(
            "SELECT COUNT(*) FROM reports WHERE source = 'citizen' AND created_at >= ? AND reporter_id IS NULL",
            (start_today,),
        ).fetchone()[0]
    return {
        "city": "Bandung",
        "active_hazards": active,
        "easing_hazards": easing,
        "active_reports": reports,
        # shortcut: laporan teranonimkan dihitung 1 pelapor per laporan (bisa sedikit lebih tinggi dari aslinya);
        # ganti dengan tabel pelapor harian bila perlu angka persis.
        "reporters_today": identified + anonymized,
        "weather": dict(w) if w else {"rain_mm": 0.0, "weather_factor": 0.0, "recorded_at": None},
        "updated_at": now_iso,
    }


@router.get("/summary", summary="Ringkasan kondisi jalan Kota Bandung")
def city_summary(_: Optional[str] = Depends(optional_api_key)):
    return _build_bandung_summary()


@router.get("/cities/{kota}/summary", summary="Ringkasan kondisi jalan berdasarkan kota (Lampiran C)")
def city_summary_by_name(kota: str, _: Optional[str] = Depends(optional_api_key)):
    if kota.strip().lower() != "bandung":
        raise HTTPException(
            status_code=404,
            detail="Saat ini cakupan LintasSiaga (Lululala) Rilis 1 terbatas pada Kota Bandung",
        )
    return _build_bandung_summary()


@router.post("/internal/weather", status_code=201, summary="Ingest faktor cuaca dari layanan integrasi (X-Internal-Key)")
def ingest_weather(body: WeatherIngestReq, _: str = Depends(require_internal_key)):
    factor = round(min(1.2, body.rain_mm / 10.0), 2)
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO weather_factors (rain_mm, weather_factor, recorded_at) VALUES (?, ?, ?)",
            (body.rain_mm, factor, now_iso),
        )
    return {"rain_mm": body.rain_mm, "weather_factor": factor, "recorded_at": now_iso}


@router.post("/internal/official-reports", status_code=201, summary="Ingest laporan resmi PetaBencana.id (X-Internal-Key)")
def ingest_official_report(body: OfficialReportIngestReq, _: str = Depends(require_internal_key)):
    now = datetime.now(timezone.utc)
    with get_db() as conn:
        cur = conn.execute(
            """
            INSERT INTO reports
            (reporter_id, source, incident_type, severity, lat, lon, description, confidence_score, created_at, expires_at)
            VALUES (NULL, 'petabencana', ?, ?, ?, ?, ?, 0.85, ?, ?)
            """,
            (
                body.incident_type,
                body.severity,
                body.lat,
                body.lon,
                (body.description or "Laporan resmi PetaBencana.id").strip(),
                now.isoformat(),
                (now + timedelta(hours=4)).isoformat(),
            ),
        )
        row = conn.execute("SELECT * FROM reports WHERE id = ?", (cur.lastrowid,)).fetchone()
        events = sync_hazard_from_report(conn, row)

    _publish_events(events)
    return {
        "id": row["id"],
        "source": "petabencana",
        "confidence_score": 0.85,
        "emitted_events": [e[0] for e in events],
    }
