import asyncio
import json
import os
import shutil
import tempfile
from pathlib import Path
from urllib.parse import urlsplit

# Isolasi DB uji ke folder sementara agar DB lokal tidak tercemar
TEST_DATA_DIR = Path(tempfile.mkdtemp(prefix="lululala_test_"))
os.environ["DATA_DIR"] = str(TEST_DATA_DIR)
os.environ["JWT_SECRET"] = "test-secret-lululala-2026-minimal-32-chars"
os.environ["PARTNER_API_KEYS"] = "lululala-mitra-01,lululala-mitra-02"
os.environ["INTERNAL_INGEST_KEY"] = "test-internal-key"

from app.main import app  # noqa: E402


async def asgi_req(method: str, path: str, body=None, headers=None):
    split = urlsplit(path)
    raw_headers = [(b"accept", b"application/json")]
    body_bytes = b""
    if body is not None:
        body_bytes = json.dumps(body).encode("utf-8")
        raw_headers.append((b"content-type", b"application/json"))
        raw_headers.append((b"content-length", str(len(body_bytes)).encode("ascii")))
    if headers:
        for k, v in headers.items():
            raw_headers.append((k.lower().encode("ascii"), v.encode("utf-8")))

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method.upper(),
        "scheme": "http",
        "path": split.path,
        "raw_path": split.path.encode("ascii"),
        "query_string": split.query.encode("ascii"),
        "headers": raw_headers,
        "client": ("127.0.0.1", 50000),
        "server": ("127.0.0.1", 8000),
    }

    sent_body = False

    async def receive():
        nonlocal sent_body
        if not sent_body:
            sent_body = True
            return {"type": "http.request", "body": body_bytes, "more_body": False}
        return {"type": "http.disconnect"}

    status_code = 500
    chunks = []

    async def send(message):
        nonlocal status_code
        if message["type"] == "http.response.start":
            status_code = message["status"]
        elif message["type"] == "http.response.body":
            chunks.append(message.get("body", b""))

    await app(scope, receive, send)
    raw = b"".join(chunks).decode("utf-8")
    try:
        parsed = json.loads(raw) if raw else None
    except json.JSONDecodeError:
        parsed = raw
    return status_code, parsed


async def run_all_tests():
    try:
        async with app.router.lifespan_context(app):
            # 1. Health, Docs & OpenAPI SecuritySchemes
            st, body = await asgi_req("GET", "/api/health")
            assert st == 200 and body["status"] == "ok", (st, body)
            st_docs, _ = await asgi_req("GET", "/api/docs")
            assert st_docs == 200
            st_oa, oa = await asgi_req("GET", "/api/openapi.json")
            assert st_oa == 200
            assert "BearerJWT" in oa["components"]["securitySchemes"]
            assert "PartnerApiKey" in oa["components"]["securitySchemes"]
            print("[OK] 1. Health, Swagger /api/docs, & OpenAPI SecuritySchemes")

            # 2. Login akun demo, /api/auth/me, Register & duplicate 409
            st, body = await asgi_req(
                "POST", "/api/auth/login", {"email": "demo@lululala.id", "password": "Demo1234!"}
            )
            assert st == 200, (st, body)
            demo_hdr = {"Authorization": f"Bearer {body['access_token']}"}

            st, me = await asgi_req("GET", "/api/auth/me", headers=demo_hdr)
            assert st == 200 and me["email"] == "demo@lululala.id"

            st, reg = await asgi_req(
                "POST",
                "/api/auth/register",
                {"name": "Penguji Baru", "email": "penguji@lululala.id", "password": "Password123!"},
            )
            assert st == 201, (st, reg)
            user2_hdr = {"Authorization": f"Bearer {reg['access_token']}"}

            st_dup, _ = await asgi_req(
                "POST",
                "/api/auth/register",
                {"name": "Duplikat", "email": "penguji@lululala.id", "password": "Password123!"},
            )
            assert st_dup == 409
            print("[OK] 2. Auth login demo, /api/auth/me, register, duplicate 409")

            # 3. Seed hazards Bandung, /api/summary, /api/cities/bandung/summary, validasi bbox
            st, hz = await asgi_req("GET", "/api/hazards")
            assert st == 200 and hz["total"] >= 2, (st, hz)
            for item in hz["hazards"]:
                assert "reporter_id" not in item
            assert (await asgi_req("GET", "/api/summary"))[0] == 200
            assert (await asgi_req("GET", "/api/cities/bandung/summary"))[0] == 200
            assert (await asgi_req("GET", "/api/cities/jakarta/summary"))[0] == 404
            assert (await asgi_req("GET", "/api/hazards?bbox=abc,1,2,3"))[0] == 400
            print("[OK] 3. Seed hazards Bandung, /api/summary, /api/cities/bandung/summary, validasi bbox")

            # 4. Reports lifecycle, self-vote 400, double-vote 409, Hazard Aktif/Mereda & EventBus -> Alert
            st, reps = await asgi_req("GET", "/api/reports", headers=demo_hdr)
            assert st == 200 and reps["total"] >= 4

            st, new_rep = await asgi_req(
                "POST",
                "/api/reports",
                {
                    "incident_type": "genangan",
                    "severity": 3,
                    "lat": -6.8850,
                    "lon": 107.6186,
                    "description": "Genangan Dago dekat Simpang",
                },
                headers=demo_hdr,
            )
            assert st == 201 and new_rep["confidence_score"] == 0.45, (st, new_rep)
            rep_id = new_rep["id"]

            assert (await asgi_req("POST", f"/api/reports/{rep_id}/confirmations", headers=demo_hdr))[0] == 400

            st, conf = await asgi_req("POST", f"/api/reports/{rep_id}/confirmations", headers=user2_hdr)
            assert st == 200 and conf["confidence_score"] == 0.65, (st, conf)
            assert "TitikRawanAktif" in conf["emitted_events"]

            assert (await asgi_req("POST", f"/api/reports/{rep_id}/confirmations", headers=user2_hdr))[0] == 409

            # Verifikasi event bus memicu alert otomatis pada rute Dago -> Gedung Sate
            st, alerts = await asgi_req("GET", "/api/alerts", headers=demo_hdr)
            assert st == 200 and any("Dago -> Gedung Sate" in a["message"] for a in alerts["items"]), alerts

            # Dispute oleh warga@lululala.id -> 0.40 -> Mereda
            _, warga_login = await asgi_req(
                "POST", "/api/auth/login", {"email": "warga@lululala.id", "password": "Warga1234!"}
            )
            warga_hdr = {"Authorization": f"Bearer {warga_login['access_token']}"}
            st, disp = await asgi_req("POST", f"/api/reports/{rep_id}/disputes", headers=warga_hdr)
            assert st == 200 and disp["confidence_score"] == 0.4, (st, disp)
            assert "TitikRawanMereda" in disp["emitted_events"]
            print("[OK] 4. Report lifecycle, self-vote 400, double-vote 409, Hazard Aktif/Mereda & EventBus -> Alert")

            # 5. Rate limit 5 laporan/jam/user
            for i in range(4):
                st_i, b_i = await asgi_req(
                    "POST",
                    "/api/reports",
                    {
                        "incident_type": "jalan_rusak",
                        "severity": 2,
                        "lat": -6.90 + i * 0.01,
                        "lon": 107.60,
                        "description": f"Lubang {i}",
                    },
                    headers=demo_hdr,
                )
                assert st_i == 201, (st_i, b_i)
            st_6th, _ = await asgi_req(
                "POST",
                "/api/reports",
                {"incident_type": "jalan_rusak", "severity": 2, "lat": -6.95, "lon": 107.60, "description": "Ke-6"},
                headers=demo_hdr,
            )
            assert st_6th == 429
            print("[OK] 5. Rate limit 5 laporan/jam/user (HTTP 429)")

            # 6. Internal ingest
            int_hdr = {"X-Internal-Key": "test-internal-key"}
            assert (await asgi_req("POST", "/api/internal/weather", {"rain_mm": 12.0}))[0] == 401
            st, rw = await asgi_req("POST", "/api/internal/weather", {"rain_mm": 10.0}, headers=int_hdr)
            assert st == 201 and rw["weather_factor"] == 1.0
            st, ro = await asgi_req(
                "POST",
                "/api/internal/official-reports",
                {
                    "incident_type": "banjir",
                    "severity": 5,
                    "lat": -6.9050,
                    "lon": 107.6300,
                    "description": "Banjir Jl. Supratman",
                },
                headers=int_hdr,
            )
            assert st == 201 and ro["confidence_score"] == 0.85
            print("[OK] 6. Internal ingest /api/internal/weather & /api/internal/official-reports")

            # 7. Commutes CRUD + Ownership + Risk
            st, commutes = await asgi_req("GET", "/api/commutes", headers=demo_hdr)
            assert st == 200 and commutes["total"] >= 2
            st, created_c = await asgi_req(
                "POST",
                "/api/commutes",
                {
                    "name": "Cicaheum -> ITB",
                    "origin_lat": -6.9022,
                    "origin_lon": 107.6562,
                    "dest_lat": -6.8915,
                    "dest_lon": 107.6107,
                    "days": "Senin-Jumat",
                    "departure_time": "07:00",
                },
                headers=demo_hdr,
            )
            assert st == 201
            cid = created_c["id"]
            assert (await asgi_req("GET", f"/api/commutes/{cid}/risk", headers=user2_hdr))[0] == 404
            assert (await asgi_req("DELETE", f"/api/commutes/{cid}", headers=user2_hdr))[0] == 404

            st, upd = await asgi_req(
                "PUT",
                f"/api/commutes/{cid}",
                {
                    "name": "Cicaheum -> ITB (Updated)",
                    "origin_lat": -6.9022,
                    "origin_lon": 107.6562,
                    "dest_lat": -6.8915,
                    "dest_lon": 107.6107,
                    "days": "Senin-Sabtu",
                    "departure_time": "06:30",
                },
                headers=demo_hdr,
            )
            assert st == 200 and "Updated" in upd["name"]

            st, risk_res = await asgi_req("GET", f"/api/commutes/{cid}/risk", headers=demo_hdr)
            assert st == 200 and risk_res["risk_level"] in ("Aman", "Waspada", "Hindari")
            assert (await asgi_req("DELETE", f"/api/commutes/{cid}", headers=demo_hdr))[0] == 200
            print("[OK] 7. Commutes CRUD, isolasi kepemilikan (404), dan evaluasi risiko")

            # 8. Partner API /api/route-risk (GET corridor fallback & POST segments)
            api_hdr = {"X-API-Key": "lululala-mitra-01"}
            assert (await asgi_req("GET", "/api/route-risk?from=-6.9158,107.6611&to=-6.8915,107.6107"))[0] == 401
            st, rr_get = await asgi_req(
                "GET", "/api/route-risk?from=-6.9158,107.6611&to=-6.8915,107.6107", headers=api_hdr
            )
            assert st == 200 and rr_get["matching_mode"] == "corridor_fallback" and rr_get["risk_level"] == "Hindari", (
                st,
                rr_get,
            )

            st, rr_post = await asgi_req(
                "POST",
                "/api/route-risk",
                {
                    "from_lat": -6.9158,
                    "from_lon": 107.6611,
                    "to_lat": -6.8915,
                    "to_lon": 107.6107,
                    "segments": [
                        {"lat": -6.9158, "lon": 107.6611},
                        {"lat": -6.9110, "lon": 107.6480},
                        {"lat": -6.8915, "lon": 107.6107},
                    ],
                },
                headers=api_hdr,
            )
            assert st == 200 and rr_post["matching_mode"] == "segments" and len(rr_post["causes"]) >= 1, (
                st,
                rr_post,
            )
            print("[OK] 8. Partner API /api/route-risk (GET corridor fallback & POST segments)")

            # 9. Endpoint aplikasi Hi-Fi: detail hazard, peluruhan, /api/me, reports?mine, days array, reporters_today
            st, hz = await asgi_req("GET", "/api/hazards")
            assert st == 200 and all("last_report_at" in h for h in hz["hazards"]), hz

            st, rep9 = await asgi_req(
                "POST",
                "/api/reports",
                {"incident_type": "kecelakaan", "severity": 4, "lat": -6.9300, "lon": 107.6700, "description": "Tabrakan"},
                headers=user2_hdr,
            )
            assert st == 201 and rep9["hazard_id"] is None, (st, rep9)
            st, conf9 = await asgi_req("POST", f"/api/reports/{rep9['id']}/confirmations", headers=demo_hdr)
            assert st == 200 and "TitikRawanAktif" in conf9["emitted_events"], conf9

            st, hz = await asgi_req("GET", "/api/hazards")
            hz9 = next(h for h in hz["hazards"] if h["incident_type"] == "kecelakaan")
            hid = hz9["id"]

            st, det = await asgi_req("GET", f"/api/hazards/{hid}", headers=demo_hdr)
            assert st == 200 and det["status"] == "Aktif" and det["reports"][0]["id"] == rep9["id"], det
            assert det["target_report_id"] == rep9["id"] and det["reports"][0]["my_vote"] == "confirmation", det
            assert det["reports"][0]["is_mine"] is False and "reporter_id" not in det["reports"][0]
            st, det_owner = await asgi_req("GET", f"/api/hazards/{hid}", headers=user2_hdr)
            assert det_owner["reports"][0]["is_mine"] is True and det_owner["target_report_id"] is None, det_owner
            st, det_anon = await asgi_req("GET", f"/api/hazards/{hid}")
            assert st == 200 and det_anon["reports"][0]["is_mine"] is False
            assert (await asgi_req("GET", "/api/hazards/999999"))[0] == 404

            # Peluruhan saat dibaca: mundurkan waktu laporan 2,5 jam -> 0.65 - 0.20 = 0.45 -> Mereda
            import sqlite3
            from datetime import datetime, timedelta, timezone
            db = sqlite3.connect(TEST_DATA_DIR / "monitoring.db")
            old = (datetime.now(timezone.utc) - timedelta(hours=2.5)).isoformat()
            db.execute("UPDATE reports SET created_at = ? WHERE id = ?", (old, rep9["id"]))
            db.commit()
            st, det = await asgi_req("GET", f"/api/hazards/{hid}")
            assert det["status"] == "Mereda" and det["confidence_score"] == 0.45, det
            past = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
            db.execute("UPDATE reports SET expires_at = ? WHERE id = ?", (past, rep9["id"]))
            db.commit()
            db.close()
            st, hz = await asgi_req("GET", "/api/hazards")
            assert all(h["id"] != hid for h in hz["hazards"]), hz
            st, det = await asgi_req("GET", f"/api/hazards/{hid}")
            assert det["status"] == "Selesai" and det["target_report_id"] is None, det

            st, me = await asgi_req("GET", "/api/me", headers=demo_hdr)
            assert st == 200 and me["email"] == "demo@lululala.id", me
            assert me["stats"]["reports"] >= 5 and me["stats"]["votes"] >= 1 and me["stats"]["commutes"] >= 2, me
            assert (await asgi_req("GET", "/api/me"))[0] == 401

            st, mine = await asgi_req("GET", "/api/reports?mine=true", headers=demo_hdr)
            assert st == 200 and mine["total"] >= 1 and all(r["is_mine"] for r in mine["items"]), mine

            st, c9 = await asgi_req(
                "POST",
                "/api/commutes",
                {"name": "Pagi", "origin_lat": -6.90, "origin_lon": 107.60, "dest_lat": -6.89, "dest_lon": 107.61,
                 "days": ["jum", "sen", "rab"], "departure_time": "07:15",
                 "origin_label": "Rumah · Antapani", "dest_label": "Kampus ITB"},
                headers=demo_hdr,
            )
            assert st == 201 and c9["days"] == "sen,rab,jum" and c9["days_list"] == ["sen", "rab", "jum"], c9
            assert c9["origin_label"] == "Rumah · Antapani" and c9["dest_label"] == "Kampus ITB", c9
            st_empty, _ = await asgi_req(
                "POST",
                "/api/commutes",
                {"name": "Kosong", "origin_lat": -6.90, "origin_lon": 107.60, "dest_lat": -6.89, "dest_lon": 107.61, "days": []},
                headers=demo_hdr,
            )
            assert st_empty == 422
            st, lst = await asgi_req("GET", "/api/commutes?include_risk=true", headers=demo_hdr)
            assert st == 200 and all(i["risk"]["risk_level"] in ("Aman", "Waspada", "Hindari") for i in lst["items"]), lst
            legacy = next(i for i in lst["items"] if i["days"] == "Senin-Jumat")
            assert legacy["days_list"] == ["sen", "sel", "rab", "kam", "jum"], legacy
            st, plain = await asgi_req("GET", "/api/commutes", headers=demo_hdr)
            assert all("risk" not in i for i in plain["items"])

            st, sm = await asgi_req("GET", "/api/summary")
            assert st == 200 and sm["reporters_today"] >= 2, sm
            print("[OK] 9. Hi-Fi: /api/hazards/{id}, peluruhan hazard, /api/me stats, reports?mine, days array, reporters_today")

            # 10. Payload persis dari layar Tambah Rute (days array + label + jam), POST dan PUT
            app_body = {
                "name": "Ke kampus",
                "origin_lat": -6.9147, "origin_lon": 107.6098,
                "dest_lat": -6.8915, "dest_lon": 107.6107,
                "origin_label": ("Lokasi saya · Jl. Terusan Jakarta · Antapani Kidul " * 2)[:80],
                "dest_label": "Jl. Ganesa · Coblong",
                "days": ["sen", "sel", "rab", "kam", "jum"],
                "departure_time": "06:45",
            }
            st, c10 = await asgi_req("POST", "/api/commutes", app_body, headers=demo_hdr)
            assert st == 201 and c10["days"] == "sen,sel,rab,kam,jum" and c10["departure_time"] == "06:45", c10
            assert c10["origin_label"] == app_body["origin_label"] and c10["dest_label"] == "Jl. Ganesa · Coblong", c10
            # Bentuk teks kode hari (dikirim app agar juga diterima backend lama): disimpan apa adanya, days_list terbaca.
            st, c10s = await asgi_req("POST", "/api/commutes", {**app_body, "days": "sen,rab,sab"}, headers=demo_hdr)
            assert st == 201 and c10s["days"] == "sen,rab,sab" and c10s["days_list"] == ["sen", "rab", "sab"], c10s
            st, u10 = await asgi_req(
                "PUT", f"/api/commutes/{c10['id']}", {**app_body, "days": ["min", "sab"], "departure_time": "17:30"}, headers=demo_hdr
            )
            assert st == 200 and u10["days"] == "sab,min" and u10["departure_time"] == "17:30", u10
            # 422 memakai loc ["body", <field>, ...]; app memetakan field ini ke pesan Indonesia.
            st, bad = await asgi_req("POST", "/api/commutes", {**app_body, "days": ["senin"]}, headers=demo_hdr)
            assert st == 422 and all(d["loc"][:2] == ["body", "days"] for d in bad["detail"]), bad
            st, bad = await asgi_req("POST", "/api/commutes", {**app_body, "dest_label": "x" * 81}, headers=demo_hdr)
            assert st == 422 and bad["detail"][0]["loc"][:2] == ["body", "dest_label"], bad
            for cid10 in (c10["id"], c10s["id"]):
                assert (await asgi_req("DELETE", f"/api/commutes/{cid10}", headers=demo_hdr))[0] == 200
            print("[OK] 10. Payload Tambah Rute: days array/teks + label + jam di POST & PUT, loc 422 per field")
            print("\n=== SEMUA 10 SUITE PENGUJIAN KONTRAK API LULULALA LOLOS 100% ===")
    finally:
        shutil.rmtree(TEST_DATA_DIR, ignore_errors=True)


if __name__ == "__main__":
    asyncio.run(run_all_tests())
