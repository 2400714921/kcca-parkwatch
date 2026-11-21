"""
KCCA ParkWatch — Unified Database Persistence Module
Supports PostgreSQL (via DATABASE_URL on Render / Supabase / Neon)
with automatic fallback to JSON / SQLite for local development.
"""

import json
import logging
import os
import time
from pathlib import Path

logger = logging.getLogger("db")

BASE_DIR = Path(__file__).parent
USERS_FILE = BASE_DIR / "users.json"
AREAS_FILE = BASE_DIR / "areas.json"
PAYMENTS_FILE = BASE_DIR / "payments.json"

DATABASE_URL = os.getenv("DATABASE_URL")

# Permanent seed accounts guaranteed across all deployments
DEFAULT_SEEDS = {
    "admin": {
        "password_hash": "$2b$12$DkD6TZjQnNNgtm0LR/pUJuT3gURjazTK59sbA2F4PE0E.xYxejhrG",
        "created_at": 1794898810,
        "role": "admin",
        "display_name": "System Administrator",
        "email": "admin@kcca.go.ug",
        "phone": "+256 700 112233",
        "is_active": True,
        "active": True,
    },
    "operator": {
        "password_hash": "$2b$12$c2eWXjmUoUJho6IhBKtT2ub8mi0n6ejNM3phB9Dh5jaHwoTdht1Kq",
        "created_at": 1794898810,
        "role": "operator",
        "display_name": "Anthony Lead Operator",
        "email": "anthony.lead@kcca.go.ug",
        "phone": "+256 700 889900",
        "is_active": True,
        "active": True,
    },
    "motorist": {
        "password_hash": "$2b$12$bSCYKBG1skrgFEIPlQAhGuZS3HGW841p/9ji/cvC2jOxtcMwrr.Sq",
        "created_at": 1794898810,
        "role": "motorist",
        "display_name": "Verified Citizen Motorist",
        "email": "motorist@kcca.go.ug",
        "phone": "+256 700 556677",
        "is_active": True,
        "active": True,
    },
    "admin_pw": {
        "password_hash": "$2b$12$DkD6TZjQnNNgtm0LR/pUJuT3gURjazTK59sbA2F4PE0E.xYxejhrG",
        "created_at": 1794898810,
        "role": "admin",
        "roles": ["admin"],
        "display_name": "ParkWatch Admin",
        "email": "admin@parkwatch.ug",
        "phone": "+256 700 112233",
        "is_active": True,
        "active": True,
    },
    "owner_pw": {
        "password_hash": "$2b$12$MzYaAwPPCRvkCx.rzls9BuIX8Dn4KpV4ls7cTHAdfhEQviQrHF1OC",
        "created_at": 1794898810,
        "role": "operator",
        "roles": ["operator"],
        "display_name": "ParkWatch Owner",
        "email": "owner@parkwatch.ug",
        "phone": "+256 700 889900",
        "is_active": True,
        "active": True,
    },
    "attendant_pw": {
        "password_hash": "$2b$12$ydPEID3FjF1cJ0s/tSJvV.2sWHg5kbJHQDxH061uZX7bQWZEQHmeq",
        "created_at": 1794898810,
        "role": "warden",
        "roles": ["warden"],
        "display_name": "ParkWatch Attendant",
        "email": "attendant@parkwatch.ug",
        "phone": "+256 700 445566",
        "assigned_area_id": "1700000000001",
        "assigned_area_name": "City Square Municipal Arcade",
        "is_active": True,
        "active": True,
    },
    "motorist_pw": {
        "password_hash": "$2b$12$bSCYKBG1skrgFEIPlQAhGuZS3HGW841p/9ji/cvC2jOxtcMwrr.Sq",
        "created_at": 1794898810,
        "role": "motorist",
        "roles": ["motorist"],
        "display_name": "ParkWatch Motorist",
        "email": "motorist@parkwatch.ug",
        "phone": "+256 700 556677",
        "is_active": True,
        "active": True,
    },
    "owner_kcca": {
        "password_hash": "$2b$12$MzYaAwPPCRvkCx.rzls9BuIX8Dn4KpV4ls7cTHAdfhEQviQrHF1OC",
        "created_at": 1794898810,
        "role": "operator",
        "roles": ["operator"],
        "display_name": "KCCA Parking Owner",
        "email": "owner@kcca.go.ug",
        "phone": "+256 700 889900",
        "is_active": True,
        "active": True,
    },
    "attendant_kcca": {
        "password_hash": "$2b$12$ydPEID3FjF1cJ0s/tSJvV.2sWHg5kbJHQDxH061uZX7bQWZEQHmeq",
        "created_at": 1794898810,
        "role": "warden",
        "roles": ["warden"],
        "display_name": "KCCA Parking Attendant",
        "email": "attendant@kcca.go.ug",
        "phone": "+256 700 445566",
        "assigned_area_id": "1700000000001",
        "assigned_area_name": "City Square Municipal Arcade",
        "is_active": True,
        "active": True,
    },
}

_pg_conn = None


def _get_pg_connection():
    global _pg_conn
    if not DATABASE_URL:
        return None
    try:
        import psycopg2

        # Fix Render/Heroku postgres:// scheme for psycopg2
        url = DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)

        if _pg_conn is not None and not _pg_conn.closed:
            return _pg_conn

        _pg_conn = psycopg2.connect(url, connect_timeout=5)
        _pg_conn.autocommit = True
        return _pg_conn
    except Exception as e:
        logger.warning("PostgreSQL connection failed (%s); using local JSON storage", e)
        return None


def init_db():
    """Initialize database tables and auto-seed initial data."""
    conn = _get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS users (
                        username VARCHAR(64) PRIMARY KEY,
                        password_hash VARCHAR(128) NOT NULL,
                        role VARCHAR(32) NOT NULL,
                        roles JSONB,
                        display_name VARCHAR(128),
                        email VARCHAR(128),
                        phone VARCHAR(64),
                        is_active BOOLEAN DEFAULT TRUE,
                        assigned_area_id VARCHAR(64),
                        assigned_area_name VARCHAR(128),
                        created_at BIGINT,
                        updated_at BIGINT,
                        created_by VARCHAR(64),
                        updated_by VARCHAR(64)
                    );
                    """
                )
                # Idempotent column upgrades for existing Render PostgreSQL databases
                cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS roles JSONB;")
                cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_area_id VARCHAR(64);")
                cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_area_name VARCHAR(128);")
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS areas (
                        id VARCHAR(64) PRIMARY KEY,
                        data JSONB NOT NULL,
                        updated_at BIGINT
                    );
                    """
                )
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS payments (
                        tx_ref VARCHAR(128) PRIMARY KEY,
                        data JSONB NOT NULL,
                        updated_at BIGINT
                    );
                    """
                )
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS facility_videos (
                        area_id VARCHAR(64) PRIMARY KEY,
                        filename VARCHAR(255),
                        content_type VARCHAR(128),
                        data BYTEA NOT NULL,
                        updated_at BIGINT
                    );
                    """
                )

                # Seed users into Postgres if empty
                cur.execute("SELECT COUNT(*) FROM users;")
                count = cur.fetchone()[0]
                if count == 0:
                    logger.info("Database empty; migrating initial users to PostgreSQL...")
                    initial_users = _read_local_users()
                    for uname, data in initial_users.items():
                        _pg_upsert_user(cur, uname, data)

                # Seed areas into Postgres if empty
                cur.execute("SELECT COUNT(*) FROM areas;")
                area_count = cur.fetchone()[0]
                if area_count == 0 and AREAS_FILE.exists():
                    logger.info("Migrating initial parking facilities to PostgreSQL...")
                    try:
                        areas = json.loads(AREAS_FILE.read_text(encoding="utf-8"))
                        for a in areas:
                            cur.execute(
                                """
                                INSERT INTO areas (id, data, updated_at)
                                VALUES (%s, %s, %s)
                                ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;
                                """,
                                (str(a.get("id")), json.dumps(a), int(time.time())),
                            )
                    except Exception as err:
                        logger.error("Failed to migrate initial areas: %s", err)

                # Seed payments into Postgres if empty
                cur.execute("SELECT COUNT(*) FROM payments;")
                pay_count = cur.fetchone()[0]
                if pay_count == 0 and PAYMENTS_FILE.exists():
                    logger.info("Migrating initial payments to PostgreSQL...")
                    try:
                        payments = json.loads(PAYMENTS_FILE.read_text(encoding="utf-8"))
                        if isinstance(payments, list):
                            for p in payments:
                                tx_ref = str(p.get("tx_ref") or p.get("id") or "")
                                if not tx_ref:
                                    continue
                                cur.execute(
                                    """
                                    INSERT INTO payments (tx_ref, data, updated_at)
                                    VALUES (%s, %s, %s)
                                    ON CONFLICT (tx_ref) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;
                                    """,
                                    (tx_ref, json.dumps(p), int(time.time())),
                                )
                    except Exception as err:
                        logger.error("Failed to migrate initial payments: %s", err)

            logger.info("PostgreSQL database initialized and verified successfully!")
        except Exception as e:
            logger.error("Error setting up PostgreSQL tables: %s", e)


def _pg_upsert_user(cur, username: str, data: dict):
    raw_roles = data.get("roles")
    if not isinstance(raw_roles, list) or len(raw_roles) == 0:
        raw_roles = [data.get("role", "motorist")]
    assigned_id = data.get("assigned_area_id")
    cur.execute(
        """
        INSERT INTO users (username, password_hash, role, roles, display_name, email, phone, is_active, assigned_area_id, assigned_area_name, created_at, updated_at, created_by, updated_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (username) DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            roles = EXCLUDED.roles,
            display_name = EXCLUDED.display_name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            is_active = EXCLUDED.is_active,
            assigned_area_id = EXCLUDED.assigned_area_id,
            assigned_area_name = EXCLUDED.assigned_area_name,
            updated_at = EXCLUDED.updated_at,
            updated_by = EXCLUDED.updated_by;
        """,
        (
            username.lower().strip(),
            data.get("password_hash"),
            data.get("role", "motorist"),
            json.dumps(raw_roles),
            data.get("display_name", username.capitalize()),
            data.get("email", ""),
            data.get("phone", ""),
            data.get("is_active", data.get("active", True)),
            str(assigned_id) if assigned_id is not None and str(assigned_id).strip() else None,
            data.get("assigned_area_name"),
            data.get("created_at", int(time.time())),
            data.get("updated_at", int(time.time())),
            data.get("created_by"),
            data.get("updated_by"),
        ),
    )


# --- Local JSON Read / Write with Self-Healing Seeds -------------------------
def _read_local_users() -> dict:
    users = {}
    if USERS_FILE.exists():
        try:
            users = json.loads(USERS_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as e:
            logger.error("Could not read users file: %s", e)
            users = {}

    dirty = False
    for seed_uname, seed_data in DEFAULT_SEEDS.items():
        if seed_uname not in users:
            users[seed_uname] = dict(seed_data)
            dirty = True
        else:
            if "is_active" not in users[seed_uname]:
                users[seed_uname]["is_active"] = users[seed_uname].get("active", True)
                dirty = True

    if dirty:
        try:
            _write_local_users(users)
        except OSError:
            pass

    return users


def _write_local_users(users: dict) -> None:
    try:
        USERS_FILE.write_text(json.dumps(users, indent=2), encoding="utf-8")
    except OSError as e:
        logger.warning("Could not write users file to disk: %s", e)


def _read_local_areas() -> list[dict]:
    if not AREAS_FILE.exists():
        return []
    try:
        return json.loads(AREAS_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as e:
        logger.error("Could not read areas file: %s", e)
        return []


def _write_local_areas(areas: list[dict]) -> None:
    try:
        AREAS_FILE.write_text(json.dumps(areas, indent=2), encoding="utf-8")
    except OSError as e:
        logger.warning("Could not write areas file to disk: %s", e)


# --- Public Unified Interface ------------------------------------------------
def read_users() -> dict:
    """Read users from PostgreSQL if available, otherwise from users.json."""
    conn = _get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT username, password_hash, role, roles, display_name, email, phone, is_active, assigned_area_id, assigned_area_name, created_at, updated_at, created_by, updated_by FROM users;"
                )
                rows = cur.fetchall()
                users = {}
                for r in rows:
                    raw_roles = r[3]
                    if isinstance(raw_roles, str):
                        try:
                            raw_roles = json.loads(raw_roles)
                        except json.JSONDecodeError:
                            raw_roles = None
                    roles_list = raw_roles if isinstance(raw_roles, list) and raw_roles else [r[2]]
                    users[r[0]] = {
                        "password_hash": r[1],
                        "role": r[2],
                        "roles": roles_list,
                        "display_name": r[4],
                        "email": r[5],
                        "phone": r[6],
                        "is_active": r[7],
                        "active": r[7],
                        "assigned_area_id": r[8],
                        "assigned_area_name": r[9],
                        "created_at": r[10],
                        "updated_at": r[11],
                        "created_by": r[12],
                        "updated_by": r[13],
                    }

                # Ensure seeds exist in Postgres
                missing_seeds = [s for s in DEFAULT_SEEDS if s not in users]
                if missing_seeds:
                    for s in missing_seeds:
                        _pg_upsert_user(cur, s, DEFAULT_SEEDS[s])
                        users[s] = dict(DEFAULT_SEEDS[s])

                return users
        except Exception as e:
            logger.warning("Error reading users from PostgreSQL (%s); falling back to local file", e)

    return _read_local_users()


def write_users(users: dict) -> None:
    """Write users to PostgreSQL (if available) and sync local users.json."""
    _write_local_users(users)
    conn = _get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                for uname, data in users.items():
                    _pg_upsert_user(cur, uname, data)
        except Exception as e:
            logger.error("Error writing users to PostgreSQL: %s", e)


def delete_user(username: str) -> None:
    """Delete a user from PostgreSQL and local users.json."""
    users = _read_local_users()
    if username in users:
        del users[username]
        _write_local_users(users)

    conn = _get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM users WHERE username = %s;", (username.lower().strip(),))
        except Exception as e:
            logger.error("Error deleting user from PostgreSQL: %s", e)


def read_areas() -> list[dict]:
    """Read parking areas from PostgreSQL (if available) or local areas.json."""
    conn = _get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT data FROM areas ORDER BY id ASC;")
                rows = cur.fetchall()
                if rows:
                    return [r[0] if isinstance(r[0], dict) else json.loads(r[0]) for r in rows]
        except Exception as e:
            logger.warning("Error reading areas from PostgreSQL (%s); falling back to local file", e)

    return _read_local_areas()


def write_areas(areas: list[dict]) -> None:
    """Write parking areas to PostgreSQL (if available) and sync local areas.json."""
    _write_local_areas(areas)
    conn = _get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                # Upsert all areas
                for a in areas:
                    area_id = str(a.get("id"))
                    cur.execute(
                        """
                        INSERT INTO areas (id, data, updated_at)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;
                        """,
                        (area_id, json.dumps(a), int(time.time())),
                    )
        except Exception as e:
            logger.error("Error writing areas to PostgreSQL: %s", e)


def delete_area(area_id: str) -> None:
    """Delete a parking area from PostgreSQL and local areas.json."""
    areas = _read_local_areas()
    filtered = [a for a in areas if str(a.get("id")) != str(area_id)]
    _write_local_areas(filtered)

    conn = _get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM areas WHERE id = %s;", (str(area_id),))
        except Exception as e:
            logger.error("Error deleting area from PostgreSQL: %s", e)


def _read_local_payments() -> list[dict]:
    if not PAYMENTS_FILE.exists():
        return []
    try:
        data = json.loads(PAYMENTS_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception as e:
        logger.warning("Failed to read %s: %s", PAYMENTS_FILE, e)
        return []


def _write_local_payments(payments: list[dict]) -> None:
    PAYMENTS_FILE.write_text(json.dumps(payments, indent=2), encoding="utf-8")


def read_payments() -> list[dict]:
    """Read parking payment transactions from PostgreSQL (if available) or local payments.json."""
    conn = _get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT data FROM payments ORDER BY updated_at ASC;")
                rows = cur.fetchall()
                if rows:
                    return [r[0] if isinstance(r[0], dict) else json.loads(r[0]) for r in rows]
        except Exception as e:
            logger.warning("Error reading payments from PostgreSQL (%s); falling back to local file", e)
    return _read_local_payments()


def write_payments(payments: list[dict]) -> None:
    """Persist parking payment transactions to PostgreSQL (if available) and local payments.json."""
    _write_local_payments(payments)
    conn = _get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                for p in payments:
                    tx_ref = str(p.get("tx_ref") or p.get("id") or "")
                    if not tx_ref:
                        continue
                    cur.execute(
                        """
                        INSERT INTO payments (tx_ref, data, updated_at)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (tx_ref) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;
                        """,
                        (tx_ref, json.dumps(p), int(time.time())),
                    )
        except Exception as e:
            logger.error("Error writing payments to PostgreSQL: %s", e)


UPLOADS_DIR = BASE_DIR / "uploads"


def save_facility_video(area_id: str, filename: str, content_type: str, data_bytes: bytes) -> None:
    """Persist a facility video clip to PostgreSQL (when configured) and local uploads fallback."""
    aid = str(area_id)
    conn = _get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO facility_videos (area_id, filename, content_type, data, updated_at)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (area_id) DO UPDATE SET
                        filename = EXCLUDED.filename,
                        content_type = EXCLUDED.content_type,
                        data = EXCLUDED.data,
                        updated_at = EXCLUDED.updated_at;
                    """,
                    (aid, filename, content_type, bytes(data_bytes), int(time.time())),
                )
            return
        except Exception as e:
            logger.error("Error writing video to PostgreSQL (%s); falling back to local disk", e)

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    meta_path = UPLOADS_DIR / f"{aid}.meta.json"
    blob_path = UPLOADS_DIR / f"{aid}.bin"
    blob_path.write_bytes(data_bytes)
    meta_path.write_text(json.dumps({"filename": filename, "content_type": content_type}), encoding="utf-8")


def get_facility_video(area_id: str) -> dict | None:
    """Retrieve a facility video clip from PostgreSQL or local uploads fallback."""
    aid = str(area_id)
    conn = _get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT filename, content_type, data FROM facility_videos WHERE area_id = %s;",
                    (aid,),
                )
                row = cur.fetchone()
                if row:
                    return {
                        "filename": row[0] or "footage.mp4",
                        "content_type": row[1] or "video/mp4",
                        "data": bytes(row[2]),
                    }
        except Exception as e:
            logger.warning("Error reading video from PostgreSQL (%s); checking local disk", e)

    meta_path = UPLOADS_DIR / f"{aid}.meta.json"
    blob_path = UPLOADS_DIR / f"{aid}.bin"
    if blob_path.exists():
        meta = {}
        if meta_path.exists():
            try:
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
            except Exception:
                meta = {}
        return {
            "filename": meta.get("filename", "footage.mp4"),
            "content_type": meta.get("content_type", "video/mp4"),
            "data": blob_path.read_bytes(),
        }
    return None


def delete_facility_video_blob(area_id: str) -> None:
    """Remove a facility video clip from PostgreSQL and local uploads fallback."""
    aid = str(area_id)
    conn = _get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM facility_videos WHERE area_id = %s;", (aid,))
        except Exception as e:
            logger.error("Error deleting video from PostgreSQL: %s", e)

    for suffix in (".bin", ".meta.json"):
        p = UPLOADS_DIR / f"{aid}{suffix}"
        if p.exists():
            try:
                p.unlink()
            except OSError:
                pass
