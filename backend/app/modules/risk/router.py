import sqlite3
import json
import math
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from app.config import DATA_DIR
from app.shared.event_bus import event_bus
from app.modules.iam.router import get_current_user, require_api_key
from app.modules.monitoring.router import get_db as get_monitoring_db

router = APIRouter(prefix="/api", tags=["Risiko Perjalanan"])
DB_PATH = DATA_DIR / "risk.db"

_handlers_registered = False


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def point_to_segment_distance_m(px: float, py: float, ax: float, ay: float, bx: float, by: float) -> float:
    # Aproksimasi planar lokal Bandung (1 deg lat ~111320m, lon ~110574m)
    kx, ky = 111320.0, 110574.0
    pxm, pym = px * kx, py * ky
    axm, aym = ax * kx, ay * ky
    bxm, bym = bx * kx, by * ky
    dx, dy = bxm - axm, bym - aym
    if dx == 0 and dy == 0:
        return math.hypot(pxm - axm, pym - aym)
    t = max(0.0, min(1.0, ((pxm - axm) * dx + (pym - aym) * dy) / (dx * dx + dy * dy)))
    return math.hypot(pxm - (axm + t * dx), pym - (aym + t * dy))


def evaluate_route_risk(
    o_lat: float,
    o_lon: float,
    d_lat: float,
    d_lon: float,
    segments: Optional[list] = None,
) -> dict:
    with get_monitoring_db() as mconn:
        hazards = mconn.execute("SELECT * FROM hazards WHERE status = 'Aktif'").fetchall()
        w = mconn.execute("SELECT weather_factor FROM weather_factors ORDER BY id DESC LIMIT 1").fetchone()
        weather_factor = w["weather_factor"] if w else 0.0

    matched_hazards = []
    mode = "segments" if segments and len(segments) >= 2 else "corridor_fallback"

    for h in hazards:
        near = False
        if mode == "segments":
            for i in range(len(segments) - 1):
                dist = point_to_segment_distance_m(
                    h["lat"],
                    h["lon"],
                    segments[i]["lat"],
                    segments[i]["lon"],
                    segments[i + 1]["lat"],
                    segments[i + 1]["lon"],
                )
                if dist <= 300:
                    near = True
                    break
        else:
            if point_to_segment_distance_m(h["lat"], h["lon"], o_lat, o_lon, d_lat, d_lon) <= 500:
                near = True
        if near:
            matched_hazards.append(dict(h))

    # Rumus risiko sesuai dokumen: sum(bobot_keparahan * confidence_score) + weather_factor
    hazard_score = sum(h["severity"] * 0.5 * h["confidence_score"] for h in matched_hazards)
    total_score = round(hazard_score + weather_factor, 2)

    if total_score >= 2.5:
        level = "Hindari"
    elif total_score >= 1.0 or weather_factor >= 0.8:
        level = "Waspada"
    else:
        level = "Aman"

    return {
        "risk_level": level,
        "risk_score": total_score,
        "weather_factor": weather_factor,
        "matching_mode": mode,
        "causes": matched_hazards,
    }


def _record_alert_if_needed(conn, user_id: int, commute_id: int, route_name: str, result: dict) -> None:
    if result["risk_level"] not in ("Waspada", "Hindari"):
        return
    msg = (
        f"Rute '{route_name}' berstatus {result['risk_level']} "
        f"(skor {result['risk_score']}, {len(result['causes'])} titik rawan aktif)."
    )
    one_min_ago = (datetime.now(timezone.utc) - timedelta(seconds=60)).isoformat()
    recent = conn.execute(
        """
        SELECT id FROM alerts
        WHERE user_id = ? AND commute_id = ? AND risk_level = ? AND message = ? AND created_at >= ?
        """,
        (user_id, commute_id, result["risk_level"], msg, one_min_ago),
    ).fetchone()
    if not recent:
        conn.execute(
            "INSERT INTO alerts (user_id, commute_id, risk_level, message, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, commute_id, result["risk_level"], msg, datetime.now(timezone.utc).isoformat()),
        )


def _handle_hazard_event(payload: dict) -> None:
    """
    Subscriber domain event dari Bounded Context Pemantauan Kondisi Jalan
    (Customer-Supplier pattern): mengevaluasi ulang rute rutin terdampak
    ketika TitikRawanAktif / TitikRawanMereda / TitikRawanSelesai diterbitkan.
    """
    hazard_id = payload.get("hazard_id")
    status = payload.get("status")
    if status != "Aktif":
        return
    with get_db() as conn:
        routes = conn.execute("SELECT * FROM commute_routes").fetchall()
        for route in routes:
            segments = json.loads(route["segments_json"]) if route["segments_json"] else None
            result = evaluate_route_risk(
                route["origin_lat"],
                route["origin_lon"],
                route["dest_lat"],
                route["dest_lon"],
                segments,
            )
            cause_ids = {c["id"] for c in result["causes"]}
            if hazard_id in cause_ids and result["risk_level"] in ("Waspada", "Hindari"):
                _record_alert_if_needed(conn, route["user_id"], route["id"], route["name"], result)


def register_risk_event_handlers() -> None:
    global _handlers_registered
    if _handlers_registered:
        return
    event_bus.subscribe("TitikRawanAktif", _handle_hazard_event)
    event_bus.subscribe("TitikRawanMereda", _handle_hazard_event)
    event_bus.subscribe("TitikRawanSelesai", _handle_hazard_event)
    _handlers_registered = True


def init_risk_db():
    register_risk_event_handlers()
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS commute_routes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                origin_lat REAL NOT NULL,
                origin_lon REAL NOT NULL,
                dest_lat REAL NOT NULL,
                dest_lon REAL NOT NULL,
                days TEXT NOT NULL,
                departure_time TEXT NOT NULL,
                segments_json TEXT
            );
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                commute_id INTEGER NOT NULL,
                risk_level TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)

        # Seed rute rutin contoh untuk akun demo@lululala.id (user_id=1) jika kosong
        r_count = conn.execute("SELECT COUNT(*) FROM commute_routes").fetchone()[0]
        if r_count == 0:
            seed_routes = [
                (
                    1,
                    "Antapani -> ITB Ganesha",
                    -6.9158,
                    107.6611,
                    -6.8915,
                    107.6107,
                    "Senin-Jumat",
                    "06:45",
                    None,
                ),
                (
                    1,
                    "Dago -> Gedung Sate",
                    -6.8780,
                    107.6185,
                    -6.9025,
                    107.6187,
                    "Senin-Jumat",
                    "08:00",
                    None,
                ),
            ]
            for route_data in seed_routes:
                cur = conn.execute(
                    """
                    INSERT INTO commute_routes
                    (user_id, name, origin_lat, origin_lon, dest_lat, dest_lon, days, departure_time, segments_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    route_data,
                )
                rid = cur.lastrowid
                result = evaluate_route_risk(
                    route_data[2], route_data[3], route_data[4], route_data[5], None
                )
                _record_alert_if_needed(conn, route_data[0], rid, route_data[1], result)


class SegmentPoint(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class CommuteReq(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    origin_lat: float = Field(ge=-90, le=90)
    origin_lon: float = Field(ge=-180, le=180)
    dest_lat: float = Field(ge=-90, le=90)
    dest_lon: float = Field(ge=-180, le=180)
    days: str = Field(default="Senin-Jumat", min_length=2, max_length=60)
    departure_time: str = Field(default="06:45", min_length=4, max_length=10)
    segments: Optional[List[SegmentPoint]] = None


class RouteRiskPostReq(BaseModel):
    from_lat: float = Field(ge=-90, le=90)
    from_lon: float = Field(ge=-180, le=180)
    to_lat: float = Field(ge=-90, le=90)
    to_lon: float = Field(ge=-180, le=180)
    segments: Optional[List[SegmentPoint]] = None


@router.get("/commutes", summary="Daftar rute rutin milik pengguna login")
def list_commutes(user: dict = Depends(get_current_user)):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM commute_routes WHERE user_id = ? ORDER BY id DESC",
            (user["user_id"],),
        ).fetchall()
    return {"total": len(rows), "items": [dict(r) for r in rows]}


@router.post("/commutes", status_code=201, summary="Simpan rute rutin baru")
def create_commute(body: CommuteReq, user: dict = Depends(get_current_user)):
    seg_json = json.dumps([s.model_dump() for s in body.segments]) if body.segments else None
    with get_db() as conn:
        cur = conn.execute(
            """
            INSERT INTO commute_routes
            (user_id, name, origin_lat, origin_lon, dest_lat, dest_lon, days, departure_time, segments_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user["user_id"],
                body.name.strip(),
                body.origin_lat,
                body.origin_lon,
                body.dest_lat,
                body.dest_lon,
                body.days.strip(),
                body.departure_time.strip(),
                seg_json,
            ),
        )
        row = conn.execute("SELECT * FROM commute_routes WHERE id = ?", (cur.lastrowid,)).fetchone()
    return dict(row)


@router.put("/commutes/{commute_id}", summary="Perbarui rute rutin milik sendiri")
def update_commute(commute_id: int, body: CommuteReq, user: dict = Depends(get_current_user)):
    seg_json = json.dumps([s.model_dump() for s in body.segments]) if body.segments else None
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM commute_routes WHERE id = ? AND user_id = ?",
            (commute_id, user["user_id"]),
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Rute rutin tidak ditemukan")
        conn.execute(
            """
            UPDATE commute_routes
            SET name=?, origin_lat=?, origin_lon=?, dest_lat=?, dest_lon=?, days=?, departure_time=?, segments_json=?
            WHERE id=?
            """,
            (
                body.name.strip(),
                body.origin_lat,
                body.origin_lon,
                body.dest_lat,
                body.dest_lon,
                body.days.strip(),
                body.departure_time.strip(),
                seg_json,
                commute_id,
            ),
        )
        row = conn.execute("SELECT * FROM commute_routes WHERE id = ?", (commute_id,)).fetchone()
    return dict(row)


@router.delete("/commutes/{commute_id}", summary="Hapus rute rutin milik sendiri")
def delete_commute(commute_id: int, user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cur = conn.execute(
            "DELETE FROM commute_routes WHERE id = ? AND user_id = ?",
            (commute_id, user["user_id"]),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Rute rutin tidak ditemukan")
    return {"deleted": True, "id": commute_id}


@router.get("/commutes/{commute_id}/risk", summary="Nilai risiko rute rutin & buat peringatan bila Waspada/Hindari")
def get_commute_risk(commute_id: int, user: dict = Depends(get_current_user)):
    with get_db() as conn:
        route = conn.execute(
            "SELECT * FROM commute_routes WHERE id = ? AND user_id = ?",
            (commute_id, user["user_id"]),
        ).fetchone()
        if not route:
            raise HTTPException(status_code=404, detail="Rute rutin tidak ditemukan")
        segments = json.loads(route["segments_json"]) if route["segments_json"] else None
        result = evaluate_route_risk(
            route["origin_lat"],
            route["origin_lon"],
            route["dest_lat"],
            route["dest_lon"],
            segments,
        )
        _record_alert_if_needed(conn, user["user_id"], commute_id, route["name"], result)
    return {"commute_id": commute_id, "route_name": route["name"], **result}


@router.get("/alerts", summary="Daftar peringatan perjalanan milik pengguna login")
def list_alerts(user: dict = Depends(get_current_user)):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM alerts WHERE user_id = ? ORDER BY id DESC LIMIT 30",
            (user["user_id"],),
        ).fetchall()
    return {"total": len(rows), "items": [dict(r) for r in rows]}


@router.get("/route-risk", summary="Penilaian risiko rute publik via corridor fallback (X-API-Key)")
def public_route_risk_get(
    from_coord: str = Query(..., alias="from", description="Koordinat asal, format: lat,lon"),
    to_coord: str = Query(..., alias="to", description="Koordinat tujuan, format: lat,lon"),
    _: str = Depends(require_api_key),
):
    try:
        o_lat, o_lon = [float(x.strip()) for x in from_coord.split(",")]
        d_lat, d_lon = [float(x.strip()) for x in to_coord.split(",")]
    except ValueError:
        raise HTTPException(status_code=400, detail="Format koordinat harus lat,lon")
    return evaluate_route_risk(o_lat, o_lon, d_lat, d_lon, None)


@router.post("/route-risk", summary="Penilaian risiko rute publik dengan segmen opsional (X-API-Key)")
def public_route_risk_post(body: RouteRiskPostReq, _: str = Depends(require_api_key)):
    segs = [s.model_dump() for s in body.segments] if body.segments else None
    return evaluate_route_risk(body.from_lat, body.from_lon, body.to_lat, body.to_lon, segs)
