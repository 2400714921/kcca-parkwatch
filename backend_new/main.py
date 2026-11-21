from fastapi import FastAPI, HTTPException, Header, Request, Depends, UploadFile, File, Response
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field
from PIL import Image
import numpy as np
import base64
import io
import logging
import sys
import os
import secrets
import json
import time
from pathlib import Path

# Load .env from backend_new/.env if present
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    for _line in _env_path.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))

import jwt
import bcrypt

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model instance and active engine identifier
detector = None
DETECTION_ENGINE = "none"  # "onnx", "rtdetr", or "none"

# COCO vehicle classes for YOLOv8 ONNX
COCO_VEHICLE_CLASSES = {
    2: 'car',
    3: 'motorcycle',
    5: 'bus',
    7: 'truck',
}


def _nms(boxes: np.ndarray, scores: np.ndarray, iou_threshold: float = 0.45) -> list[int]:
    """Non-Maximum Suppression for bounding boxes."""
    if len(boxes) == 0:
        return []
    x1, y1, x2, y2 = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
    areas = (x2 - x1) * (y2 - y1)
    order = scores.argsort()[::-1]
    keep = []
    while order.size > 0:
        i = order[0]
        keep.append(i)
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        w = np.maximum(0.0, xx2 - xx1)
        h = np.maximum(0.0, yy2 - yy1)
        inter = w * h
        ovr = inter / (areas[i] + areas[order[1:]] - inter + 1e-6)
        inds = np.where(ovr <= iou_threshold)[0]
        order = order[inds + 1]
    return keep


def _detect_onnx(session, image: Image.Image, conf_threshold: float = 0.25) -> list[dict]:
    """Fast, memory-efficient (~70MB RAM) vehicle detection using YOLOv8n ONNX."""
    orig_w, orig_h = image.size
    img_resized = image.resize((640, 640))
    img_data = np.array(img_resized, dtype=np.float32) / 255.0
    img_data = np.transpose(img_data, (2, 0, 1))
    img_data = np.expand_dims(img_data, axis=0)

    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: img_data})

    # Output shape: [1, 84, 8400] -> transpose to [8400, 84]
    preds = np.transpose(outputs[0][0], (1, 0))
    boxes = preds[:, :4]
    class_probs = preds[:, 4:]

    class_ids = np.argmax(class_probs, axis=1)
    scores = np.max(class_probs, axis=1)

    mask = np.isin(class_ids, list(COCO_VEHICLE_CLASSES.keys())) & (scores >= conf_threshold)
    filtered_boxes = boxes[mask]
    filtered_scores = scores[mask]
    filtered_class_ids = class_ids[mask]

    if len(filtered_boxes) == 0:
        return []

    scale_x = orig_w / 640.0
    scale_y = orig_h / 640.0
    cx, cy, w, h = filtered_boxes[:, 0], filtered_boxes[:, 1], filtered_boxes[:, 2], filtered_boxes[:, 3]

    x1 = (cx - w / 2.0) * scale_x
    y1 = (cy - h / 2.0) * scale_y
    x2 = (cx + w / 2.0) * scale_x
    y2 = (cy + h / 2.0) * scale_y

    xyxy = np.column_stack([
        np.clip(x1, 0, orig_w),
        np.clip(y1, 0, orig_h),
        np.clip(x2, 0, orig_w),
        np.clip(y2, 0, orig_h)
    ])

    keep_indices = _nms(xyxy, filtered_scores, iou_threshold=0.45)
    results = []
    for idx in keep_indices:
        cid = int(filtered_class_ids[idx])
        cls_name = COCO_VEHICLE_CLASSES.get(cid, "car")
        results.append({
            "class_name": cls_name,
            "confidence": float(filtered_scores[idx]),
            "x1": int(xyxy[idx, 0]),
            "y1": int(xyxy[idx, 1]),
            "x2": int(xyxy[idx, 2]),
            "y2": int(xyxy[idx, 3]),
            "bbox": {
                "x1": int(xyxy[idx, 0]),
                "y1": int(xyxy[idx, 1]),
                "x2": int(xyxy[idx, 2]),
                "y2": int(xyxy[idx, 3]),
            }
        })
    return results


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load lightweight model on startup and initialize persistent database"""
    global detector, DETECTION_ENGINE

    # 0. Initialize persistent database tables and seed guaranteed municipal accounts
    try:
        init_db()
    except Exception as e:
        logger.warning("Database init warning: %s", e)

    # 1. Prefer lightweight ONNX model (~72MB RAM)
    onnx_path = Path(__file__).parent / "models" / "yolov8n.onnx"
    if not onnx_path.exists():
        alt_path = Path(__file__).parent.parent / "frontend" / "public" / "models" / "yolov8n.onnx"
        if alt_path.exists():
            onnx_path = alt_path

    if onnx_path.exists():
        try:
            import onnxruntime as ort
            logger.info("Loading lightweight YOLOv8n ONNX model from %s...", onnx_path)
            opts = ort.SessionOptions()
            opts.intra_op_num_threads = 1
            detector = ort.InferenceSession(str(onnx_path), sess_options=opts, providers=['CPUExecutionProvider'])
            DETECTION_ENGINE = "onnx"
            logger.info("YOLOv8n ONNX model loaded successfully (active memory ~72MB)!")
        except Exception as e:
            logger.warning("Could not initialize ONNX runtime: %s", e)
            detector = None

    # 2. If ONNX not loaded and RT-DETR explicitly requested via env var
    if not detector and os.environ.get("DETECTION_ENGINE") == "rtdetr":
        try:
            logger.info("Loading RT-DETR model...")
            from transformers import pipeline
            detector = pipeline("object-detection", model="PekingU/rtdetr_r101vd_coco_o365")
            DETECTION_ENGINE = "rtdetr"
            logger.info("RT-DETR model loaded successfully!")
        except Exception as e:
            logger.error("Failed to load RT-DETR model: %s", e)
            detector = None

    if not detector:
        logger.info("No ML detector loaded; auth and management endpoints are fully active.")

    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Parking Detection API",
    description="AI-powered vehicle detection for parking spot analysis",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration (Safari-safe: never combine wildcard '*' with allow_credentials=True)
FRONTEND_URL = os.environ.get("FRONTEND_URL", "").strip()
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://localhost:5175",
]
if FRONTEND_URL and FRONTEND_URL != "*":
    allowed_origins.append(FRONTEND_URL.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https?://.*" if (not FRONTEND_URL or FRONTEND_URL == "*") else r"https://.*\.vercel\.app|https://.*\.netlify\.app|https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "X-Active-Role", "Accept", "Origin"],
    expose_headers=["Content-Range", "Accept-Ranges", "Content-Length"],
)

# Vehicle classes from COCO dataset
VEHICLE_CLASSES = {'car', 'truck', 'bus', 'motorcycle', 'bicycle'}


# ---------------------------------------------------------------- Auth ----
# Secret is persisted so tokens survive restarts; override with JWT_SECRET env var.
def _load_secret() -> str:
    env = os.environ.get("JWT_SECRET")
    if env:
        return env

    secret_file = Path(__file__).with_name(".jwt_secret")
    if secret_file.exists():
        return secret_file.read_text(encoding="utf-8").strip()

    secret = secrets.token_urlsafe(48)
    secret_file.write_text(secret, encoding="utf-8")
    logger.info("Generated new JWT secret at %s", secret_file)
    return secret


JWT_SECRET = _load_secret()
JWT_ALGORITHM = "HS256"
TOKEN_TTL_SECONDS = 60 * 60 * 12  # 12 hours

# Unified Database Persistence (PostgreSQL with local JSON auto-healing fallback)
from db import (
    init_db,
    read_users as _read_users,
    write_users as _write_users,
    delete_user as _delete_user,
    read_areas as _read_areas,
    write_areas as _write_areas,
    delete_area as _delete_area,
    read_payments as _read_payments,
    write_payments as _write_payments,
    save_facility_video as _save_facility_video,
    get_facility_video as _get_facility_video,
    delete_facility_video_blob as _delete_facility_video_blob,
)


class LoginRequest(BaseModel):
    email: str | None = None
    username: str | None = None
    password: str = Field(..., min_length=6, max_length=72)


class SignupRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=128)
    password: str = Field(..., min_length=6, max_length=72)
    username: str | None = None
    display_name: str | None = None
    phone: str | None = None


def hash_password(password: str) -> str:
    # bcrypt reads at most 72 bytes; the model's max_length keeps this a no-op.
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("ascii")


def check_password(password: str, stored_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("ascii"))
    except ValueError:
        logger.error("Stored hash is malformed")
        return False


class LoginResponse(BaseModel):
    token: str
    username: str
    expires_at: int
    role: str = "operator"
    roles: list[str] = ["operator"]
    display_name: str = ""
    is_active: bool = True
    assigned_area_id: str | int | None = None
    assigned_area_name: str | None = None


VALID_ROLES = ("admin", "operator", "warden", "motorist")


def _normalize_roles(record: dict) -> list[str]:
    raw = record.get("roles")
    if isinstance(raw, list) and len(raw) > 0:
        cleaned = []
        for r in raw:
            rs = str(r).strip().lower()
            if rs in VALID_ROLES and rs not in cleaned:
                cleaned.append(rs)
        if cleaned:
            return cleaned
    primary = str(record.get("role", "motorist")).strip().lower()
    return [primary if primary in VALID_ROLES else "motorist"]


def make_token(username: str) -> tuple[str, int]:
    issued = int(time.time())
    expires = issued + TOKEN_TTL_SECONDS
    payload = {"sub": username, "iat": issued, "exp": expires}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM), expires


def verify_token(token: str) -> str | None:
    """Return the username if the token is valid, else None."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        logger.info("Expired token rejected")
        return None
    except jwt.InvalidTokenError:
        logger.info("Invalid token rejected")
        return None
    return payload.get("sub")


@app.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Authenticate an account by email (or username) and issue an access token."""
    identifier = (request.email or request.username or "").strip().lower()
    if not identifier:
        raise HTTPException(status_code=400, detail="Email address is required")

    users = _read_users()
    record = None
    matched_username = None

    # 1. Match by email address (case-insensitive)
    for u_name, u_data in users.items():
        if (u_data.get("email") or "").strip().lower() == identifier:
            record = u_data
            matched_username = u_name
            break

    # 2. Fallback: match by username key
    if not record and identifier in users:
        record = users[identifier]
        matched_username = identifier

    # 3. Fallback: match known municipal aliases
    if not record and identifier in ("anthony.lead@kcca.go.ug", "operator@kcca.go.ug", "operator@gmail.com"):
        record = users.get("operator")
        matched_username = "operator"
    if not record and identifier in ("motorist@gmail.com", "citizen@kcca.go.ug"):
        record = users.get("motorist")
        matched_username = "motorist"

    # Same response for unknown user and wrong password — don't leak which accounts exist
    if not record:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not check_password(request.password, record["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    is_active = record.get("is_active", record.get("active", True))
    if not is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated. Please contact support.")

    token, expires = make_token(matched_username)
    logger.info("Issued token for %s (via identifier %s)", matched_username, identifier)
    roles = _normalize_roles(record)
    return LoginResponse(
        token=token,
        username=matched_username,
        expires_at=expires,
        role=roles[0],
        roles=roles,
        display_name=record.get("display_name", matched_username.capitalize()),
        is_active=is_active,
        assigned_area_id=record.get("assigned_area_id"),
        assigned_area_name=record.get("assigned_area_name"),
    )


@app.post("/auth/signup", response_model=LoginResponse)
async def signup(request: SignupRequest):
    """Register a new public motorist account and issue an access token."""
    clean_email = request.email.strip().lower()
    if "@" not in clean_email or "." not in clean_email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Please enter a valid email address")

    users = _read_users()

    # 1. Check duplicate email
    for u_name, u_data in users.items():
        if (u_data.get("email") or "").strip().lower() == clean_email:
            raise HTTPException(status_code=400, detail=f"Email '{clean_email}' is already registered")

    # 2. Handle username: use provided or derive from email prefix
    if request.username and request.username.strip():
        clean_username = request.username.strip().lower()
        if not clean_username.replace("_", "").replace(".", "").isalnum():
            raise HTTPException(
                status_code=400,
                detail="Username may only contain letters, numbers, underscores and dots",
            )
        if clean_username in users:
            raise HTTPException(status_code=400, detail=f"Username '{clean_username}' is already registered")
    else:
        base_username = clean_email.split("@")[0].replace(".", "_").replace("-", "_")
        clean_username = base_username
        suffix = 1
        while clean_username in users:
            clean_username = f"{base_username}_{suffix}"
            suffix += 1

    now = int(time.time())
    display_name = (request.display_name or "").strip() or clean_username.capitalize()
    users[clean_username] = {
        "password_hash": hash_password(request.password),
        "role": "motorist",
        "display_name": display_name,
        "email": clean_email,
        "phone": (request.phone or "").strip(),
        "created_at": now,
        "updated_at": now,
    }
    _write_users(users)
    logger.info("New motorist account created: %s (%s)", clean_username, clean_email)

    token, expires = make_token(clean_username)
    return LoginResponse(
        token=token,
        username=clean_username,
        expires_at=expires,
        role="motorist",
        display_name=display_name,
    )


@app.get("/auth/me")
async def me(authorization: str | None = Header(default=None)):
    """Verify a token; used by the frontend to restore a session on reload."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    username = verify_token(authorization.removeprefix("Bearer ").strip())
    if not username:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    users = _read_users()
    record = users.get(username.lower())
    if not record:
        raise HTTPException(status_code=404, detail="User record not found")

    is_active = record.get("is_active", record.get("active", True))
    if not is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated. Please contact support.")

    roles = _normalize_roles(record)
    return {
        "username": username,
        "role": roles[0],
        "roles": roles,
        "display_name": record.get("display_name", username.capitalize()),
        "email": record.get("email", ""),
        "phone": record.get("phone", ""),
        "is_active": is_active,
        "created_at": record.get("created_at"),
        "assigned_area_id": record.get("assigned_area_id"),
        "assigned_area_name": record.get("assigned_area_name"),
    }


class UpdateProfileRequest(BaseModel):
    display_name: str | None = None
    email: str | None = None
    phone: str | None = None
    current_password: str | None = None
    new_password: str | None = None


@app.get("/auth/profile")
async def get_profile(authorization: str | None = Header(default=None)):
    """Retrieve full profile metadata for the authenticated user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    username = verify_token(authorization.removeprefix("Bearer ").strip())
    if not username:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    users = _read_users()
    record = users.get(username.lower())
    if not record:
        raise HTTPException(status_code=404, detail="User record not found")

    return {
        "username": username,
        "display_name": record.get("display_name", username.capitalize()),
        "email": record.get("email", ""),
        "phone": record.get("phone", ""),
        "role": record.get("role", "operator"),
        "created_at": record.get("created_at"),
    }


@app.post("/auth/update-profile")
async def update_profile(request: UpdateProfileRequest, authorization: str | None = Header(default=None)):
    """Update display name, contact info, or password for authenticated operator."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    username = verify_token(authorization.removeprefix("Bearer ").strip())
    if not username:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    users = _read_users()
    record = users.get(username.lower())
    if not record:
        raise HTTPException(status_code=404, detail="User not found")

    if request.new_password:
        if len(request.new_password.strip()) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
        if request.current_password and not check_password(request.current_password, record["password_hash"]):
            raise HTTPException(status_code=400, detail="Incorrect current password")
        record["password_hash"] = hash_password(request.new_password.strip())

    if request.display_name is not None:
        record["display_name"] = request.display_name.strip()
    if request.email is not None:
        record["email"] = request.email.strip()
    if request.phone is not None:
        record["phone"] = request.phone.strip()
    if request.assigned_area_id is not None:
        aid = request.assigned_area_id if str(request.assigned_area_id).strip() else None
        record["assigned_area_id"] = aid
        record["assigned_area_name"] = _resolve_area_name(aid)

    record["updated_at"] = int(time.time())
    users[username.lower()] = record
    _write_users(users)
    logger.info("Updated profile for user: %s", username)

    return {
        "status": "success",
        "message": "Profile updated successfully",
        "user": {
            "username": username,
            "display_name": record.get("display_name", username.capitalize()),
            "email": record.get("email", ""),
            "phone": record.get("phone", ""),
            "role": record.get("role", "operator"),
        }
    }


# --------------------------------------------- Admin User Management Endpoints ----
def require_admin(authorization: str | None = Header(default=None)) -> str:
    """Validate that the request carries a valid bearer token belonging to an administrator."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    username = verify_token(authorization.removeprefix("Bearer ").strip())
    if not username:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    users = _read_users()
    record = users.get(username.lower())
    if not record or record.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Administrator privileges required")

    if not record.get("is_active", record.get("active", True)):
        raise HTTPException(status_code=403, detail="Account is deactivated. Please contact support.")

    return username.lower()


class CreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=6, max_length=72)
    role: str = Field(default="operator")
    roles: list[str] | None = None
    display_name: str | None = None
    email: str | None = None
    phone: str | None = None
    is_active: bool | None = True
    assigned_area_id: str | int | None = None


class AdminUpdateUserRequest(BaseModel):
    role: str | None = None
    roles: list[str] | None = None
    display_name: str | None = None
    email: str | None = None
    phone: str | None = None
    new_password: str | None = None
    password: str | None = None
    is_active: bool | None = None
    assigned_area_id: str | int | None = None


def _resolve_area_name(area_id: str | int | None) -> str | None:
    if area_id is None or str(area_id).strip() == "":
        return None
    for a in _read_areas():
        if str(a.get("id")) == str(area_id):
            return a.get("name")
    return None


@app.get("/auth/users")
async def list_users(admin_user: str = Depends(require_admin)):
    """List all registered users (admin, operator, motorist) excluding passwords."""
    users = _read_users()
    user_list = []
    for uname, data in users.items():
        u_roles = _normalize_roles(data)
        user_list.append({
            "username": uname,
            "role": u_roles[0],
            "roles": u_roles,
            "display_name": data.get("display_name", uname.capitalize()),
            "email": data.get("email", ""),
            "phone": data.get("phone", ""),
            "is_active": data.get("is_active", data.get("active", True)),
            "created_at": data.get("created_at"),
            "updated_at": data.get("updated_at"),
            "created_by": data.get("created_by"),
            "assigned_area_id": data.get("assigned_area_id"),
            "assigned_area_name": data.get("assigned_area_name"),
        })

    def role_priority(role: str) -> int:
        if role == "admin":
            return 0
        if role == "operator":
            return 1
        if role == "warden":
            return 2
        return 3

    return sorted(user_list, key=lambda u: (role_priority(u["role"]), u["username"]))


@app.post("/auth/users")
async def create_user_by_admin(request: CreateUserRequest, admin_user: str = Depends(require_admin)):
    """Create a new user account (admin, operator, or motorist)."""
    users = _read_users()
    uname = request.username.lower().strip()

    if uname in users:
        raise HTTPException(status_code=409, detail=f"Username '{uname}' is already registered")

    if request.roles and len(request.roles) > 0:
        roles = []
        for r in request.roles:
            rs = r.lower().strip()
            if rs not in VALID_ROLES:
                raise HTTPException(status_code=400, detail="Roles must be from 'admin', 'operator', 'warden', or 'motorist'")
            if rs not in roles:
                roles.append(rs)
        role = roles[0]
    else:
        role = request.role.lower().strip() if request.role else "operator"
        if role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail="Role must be 'admin', 'operator', 'warden', or 'motorist'")
        roles = [role]

    is_active = True if request.is_active is None else bool(request.is_active)
    assigned_area_id = request.assigned_area_id if str(request.assigned_area_id or "").strip() else None
    assigned_area_name = _resolve_area_name(assigned_area_id)

    users[uname] = {
        "password_hash": hash_password(request.password),
        "role": role,
        "roles": roles,
        "display_name": (request.display_name or uname.capitalize()).strip(),
        "email": (request.email or "").strip(),
        "phone": (request.phone or "").strip(),
        "is_active": is_active,
        "assigned_area_id": assigned_area_id,
        "assigned_area_name": assigned_area_name,
        "created_at": int(time.time()),
        "created_by": admin_user,
    }
    _write_users(users)
    logger.info("Admin '%s' created user '%s' (roles=%s, active=%s)", admin_user, uname, roles, is_active)
    return {
        "status": "created",
        "user": {
            "username": uname,
            "role": role,
            "roles": roles,
            "display_name": users[uname]["display_name"],
            "email": users[uname]["email"],
            "phone": users[uname]["phone"],
            "is_active": is_active,
            "created_at": users[uname]["created_at"],
        }
    }


@app.put("/auth/users/{username}")
async def update_user_by_admin(username: str, request: AdminUpdateUserRequest, admin_user: str = Depends(require_admin)):
    """Update user role, profile metadata, active status, or reset password."""
    users = _read_users()
    uname = username.lower().strip()

    if uname not in users:
        raise HTTPException(status_code=404, detail="User record not found")

    record = users[uname]

    if request.roles is not None and len(request.roles) > 0:
        new_roles = []
        for r in request.roles:
            rs = r.lower().strip()
            if rs not in VALID_ROLES:
                raise HTTPException(status_code=400, detail="Roles must be from 'admin', 'operator', 'warden', or 'motorist'")
            if rs not in new_roles:
                new_roles.append(rs)
        if "admin" in _normalize_roles(record) and "admin" not in new_roles:
            admin_count = sum(1 for u in users.values() if "admin" in _normalize_roles(u))
            if admin_count <= 1:
                raise HTTPException(status_code=400, detail="Cannot demote the last administrator account")
        record["roles"] = new_roles
        record["role"] = new_roles[0]
    elif request.role is not None:
        new_role = request.role.lower().strip()
        if new_role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail="Role must be 'admin', 'operator', 'warden', or 'motorist'")
        if "admin" in _normalize_roles(record) and new_role != "admin":
            admin_count = sum(1 for u in users.values() if "admin" in _normalize_roles(u))
            if admin_count <= 1:
                raise HTTPException(status_code=400, detail="Cannot demote the last administrator account")
        record["role"] = new_role
        record["roles"] = [new_role]

    if request.is_active is not None:
        # Prevent deactivating the last active admin
        if not request.is_active and record.get("role") == "admin":
            active_admins = sum(
                1 for u_name, u in users.items()
                if u.get("role") == "admin" and u.get("is_active", u.get("active", True)) and u_name != uname
            )
            if active_admins == 0:
                raise HTTPException(status_code=400, detail="Cannot deactivate the last active administrator account")
        record["is_active"] = bool(request.is_active)
        record["active"] = bool(request.is_active)

    if request.display_name is not None:
        record["display_name"] = request.display_name.strip()
    if request.email is not None:
        record["email"] = request.email.strip()
    if request.phone is not None:
        record["phone"] = request.phone.strip()
    if request.assigned_area_id is not None:
        aid = request.assigned_area_id if str(request.assigned_area_id).strip() else None
        record["assigned_area_id"] = aid
        record["assigned_area_name"] = _resolve_area_name(aid)

    pwd_to_set = request.new_password or request.password
    if pwd_to_set:
        if len(pwd_to_set.strip()) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
        record["password_hash"] = hash_password(pwd_to_set.strip())

    record["updated_at"] = int(time.time())
    record["updated_by"] = admin_user
    users[uname] = record
    _write_users(users)
    logger.info("Admin '%s' updated user '%s' (active=%s)", admin_user, uname, record.get("is_active", True))

    u_roles = _normalize_roles(record)
    return {
        "status": "updated",
        "user": {
            "username": uname,
            "role": u_roles[0],
            "roles": u_roles,
            "display_name": record.get("display_name", uname.capitalize()),
            "email": record.get("email", ""),
            "phone": record.get("phone", ""),
            "is_active": record.get("is_active", record.get("active", True)),
            "created_at": record.get("created_at"),
            "updated_at": record.get("updated_at"),
        }
    }


@app.delete("/auth/users/{username}")
async def delete_user_by_admin(username: str, admin_user: str = Depends(require_admin)):
    """Delete an operator or admin account."""
    users = _read_users()
    uname = username.lower().strip()

    if uname not in users:
        raise HTTPException(status_code=404, detail="User record not found")

    if uname == admin_user:
        raise HTTPException(status_code=400, detail="You cannot delete your own logged-in account")

    if users[uname].get("role") == "admin":
        admin_count = sum(1 for u in users.values() if u.get("role") == "admin")
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last administrator account")

    _delete_user(uname)
    logger.info("Admin '%s' deleted user '%s'", admin_user, uname)

    return {"status": "deleted", "username": uname}


@app.post("/auth/create-user")
async def create_user(request: LoginRequest):
    """
    Bootstrap an operator account.

    The first account created becomes an admin. Subsequent calls require an
    admin bearer token, so this cannot be used to mint unauthorised logins.
    """
    users = _read_users()
    username = request.username.lower().strip()

    if users:
        # Already bootstrapped — require an existing admin to authorise
        raise HTTPException(
            status_code=403,
            detail=(
                "Accounts already exist. Create users with the User Management Console or API instead."
            ),
        )

    if username in users:
        raise HTTPException(status_code=409, detail="Username already taken")

    users[username] = {
        "password_hash": hash_password(request.password),
        "created_at": int(time.time()),
        "role": "admin",
    }
    _write_users(users)
    logger.info("Bootstrapped first admin account: %s", username)

    return {"status": "created", "username": username, "role": "admin"}


# ---------------------------------------------------- Parking Areas Database ----
def _is_owned_by_operator(area: dict, username: str, user: dict) -> bool:
    if (area.get("owner_username") or "").lower() == username.lower():
        return True
    assigned_id = user.get("assigned_area_id")
    if assigned_id is not None and str(area.get("id")) == str(assigned_id):
        return True
    return False


@app.get("/areas")
async def get_areas(
    authorization: str | None = Header(default=None),
    x_active_role: str | None = Header(default=None),
):
    """Retrieve parking areas. Admins & drivers see all; ParkingArea Owners see only owned areas; Attendants see assigned area."""
    areas = _read_areas()
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        uname = verify_token(token)
        if uname:
            user = _read_users().get(uname)
            if user:
                u_roles = _normalize_roles(user)
                active_role = x_active_role.lower().strip() if x_active_role and x_active_role.lower().strip() in u_roles else u_roles[0]
                assigned_id = user.get("assigned_area_id")
                if active_role == "warden":
                    return [a for a in areas if assigned_id is not None and str(a.get("id")) == str(assigned_id)]
                if active_role == "operator":
                    return [a for a in areas if _is_owned_by_operator(a, uname, user)]
    return areas


@app.get("/attendants")
async def list_attendants(area_id: str | None = None, authorization: str | None = Header(default=None)):
    """List Parking Attendants (scoped to owned facilities for ParkingArea Owners)."""
    username, user = _require_auth_user(authorization)
    u_roles = _normalize_roles(user)
    if "admin" not in u_roles and "operator" not in u_roles:
        raise HTTPException(status_code=403, detail="ParkingArea Owner or Admin privileges required")

    is_admin_user = "admin" in u_roles
    owned_ids = {str(a.get("id")) for a in _read_areas() if _is_owned_by_operator(a, username, user)}

    users = _read_users()
    attendants = []
    for uname, data in users.items():
        if "warden" not in _normalize_roles(data):
            continue
        aid = str(data.get("assigned_area_id") or "")
        if not is_admin_user and aid not in owned_ids:
            continue
        if area_id and aid != str(area_id):
            continue
        attendants.append({
            "username": uname,
            "display_name": data.get("display_name", uname.capitalize()),
            "email": data.get("email", ""),
            "phone": data.get("phone", ""),
            "is_active": data.get("is_active", True),
            "assigned_area_id": data.get("assigned_area_id"),
            "assigned_area_name": data.get("assigned_area_name"),
        })
    return attendants


def _validate_attendant_email(email: str | None, users: dict, exclude_username: str | None = None) -> str:
    """Validate, normalize, and check uniqueness for an attendant's email address."""
    clean_email = (email or "").strip().lower()
    if "@" not in clean_email or "." not in clean_email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Please enter a valid email address for the attendant")
    for other_uname, u_data in users.items():
        if exclude_username and other_uname == exclude_username:
            continue
        if (u_data.get("email") or "").strip().lower() == clean_email:
            raise HTTPException(status_code=409, detail=f"Email '{clean_email}' is already registered")
    return clean_email


class AttendantCreateRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=64)
    password: str = Field(..., min_length=6, max_length=72)
    display_name: str | None = None
    email: str = Field(..., min_length=5, max_length=128)
    phone: str | None = None
    assigned_area_id: str | int


class AttendantUpdateRequest(BaseModel):
    display_name: str | None = None
    email: str | None = None
    phone: str | None = None
    is_active: bool | None = None
    assigned_area_id: str | int | None = None
    password: str | None = None


@app.post("/attendants")
async def create_attendant(req: AttendantCreateRequest, authorization: str | None = Header(default=None)):
    """Assign and create a Parking Attendant for a parking area (by ParkingArea Owner or Admin)."""
    username, user = _require_auth_user(authorization)
    u_roles = _normalize_roles(user)
    if "admin" not in u_roles and "operator" not in u_roles:
        raise HTTPException(status_code=403, detail="ParkingArea Owner or Admin privileges required")

    if "admin" not in u_roles:
        owned_ids = {str(a.get("id")) for a in _read_areas() if _is_owned_by_operator(a, username, user)}
        if str(req.assigned_area_id) not in owned_ids:
            raise HTTPException(status_code=403, detail="You can only assign attendants to parking facilities you own")

    area_name = _resolve_area_name(req.assigned_area_id)
    if not area_name:
        raise HTTPException(status_code=404, detail="Assigned parking area not found")

    users = _read_users()
    uname = req.username.lower().strip()
    if uname in users:
        raise HTTPException(status_code=409, detail=f"Username '{uname}' is already registered")
    clean_email = _validate_attendant_email(req.email, users)

    users[uname] = {
        "password_hash": hash_password(req.password),
        "role": "warden",
        "roles": ["warden"],
        "display_name": (req.display_name or uname.capitalize()).strip(),
        "email": clean_email,
        "phone": (req.phone or "").strip(),
        "is_active": True,
        "assigned_area_id": req.assigned_area_id,
        "assigned_area_name": area_name,
        "created_at": int(time.time()),
        "created_by": username,
    }
    _write_users(users)
    return {
        "status": "created",
        "attendant": {
            "username": uname,
            "role": "warden",
            "display_name": users[uname]["display_name"],
            "email": users[uname]["email"],
            "phone": users[uname]["phone"],
            "is_active": True,
            "assigned_area_id": req.assigned_area_id,
            "assigned_area_name": area_name,
        },
    }


@app.put("/attendants/{target_username}")
async def update_attendant(
    target_username: str,
    req: AttendantUpdateRequest,
    authorization: str | None = Header(default=None),
):
    """Update a Parking Attendant (scoped to owned facilities for ParkingArea Owners)."""
    username, user = _require_auth_user(authorization)
    u_roles = _normalize_roles(user)
    if "admin" not in u_roles and "operator" not in u_roles:
        raise HTTPException(status_code=403, detail="ParkingArea Owner or Admin privileges required")

    users = _read_users()
    uname = target_username.lower().strip()
    target = users.get(uname)
    if not target or "warden" not in _normalize_roles(target):
        raise HTTPException(status_code=404, detail="Parking Attendant not found")

    if "admin" not in u_roles:
        owned_ids = {str(a.get("id")) for a in _read_areas() if _is_owned_by_operator(a, username, user)}
        if str(target.get("assigned_area_id") or "") not in owned_ids:
            raise HTTPException(status_code=403, detail="You can only manage attendants assigned to your own facilities")
        if req.assigned_area_id is not None and str(req.assigned_area_id) not in owned_ids:
            raise HTTPException(status_code=403, detail="You can only assign attendants to your own facilities")

    if req.display_name is not None:
        target["display_name"] = req.display_name.strip()
    if req.email is not None:
        target["email"] = _validate_attendant_email(req.email, users, exclude_username=uname)
    if req.phone is not None:
        target["phone"] = req.phone.strip()
    if req.is_active is not None:
        target["is_active"] = bool(req.is_active)
        target["active"] = bool(req.is_active)
    if req.assigned_area_id is not None:
        target["assigned_area_id"] = req.assigned_area_id
        target["assigned_area_name"] = _resolve_area_name(req.assigned_area_id)
    if req.password and req.password.strip():
        if len(req.password.strip()) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        target["password_hash"] = hash_password(req.password.strip())

    target["updated_at"] = int(time.time())
    target["updated_by"] = username
    users[uname] = target
    _write_users(users)
    return {
        "status": "updated",
        "attendant": {
            "username": uname,
            "display_name": target.get("display_name", uname),
            "email": target.get("email", ""),
            "phone": target.get("phone", ""),
            "is_active": target.get("is_active", True),
            "assigned_area_id": target.get("assigned_area_id"),
            "assigned_area_name": target.get("assigned_area_name"),
        },
    }


@app.delete("/attendants/{target_username}")
async def delete_attendant(target_username: str, authorization: str | None = Header(default=None)):
    """Remove a Parking Attendant (scoped to owned facilities for ParkingArea Owners)."""
    username, user = _require_auth_user(authorization)
    u_roles = _normalize_roles(user)
    if "admin" not in u_roles and "operator" not in u_roles:
        raise HTTPException(status_code=403, detail="ParkingArea Owner or Admin privileges required")

    users = _read_users()
    uname = target_username.lower().strip()
    target = users.get(uname)
    if not target or "warden" not in _normalize_roles(target):
        raise HTTPException(status_code=404, detail="Parking Attendant not found")

    if "admin" not in u_roles:
        owned_ids = {str(a.get("id")) for a in _read_areas() if _is_owned_by_operator(a, username, user)}
        if str(target.get("assigned_area_id") or "") not in owned_ids:
            raise HTTPException(status_code=403, detail="You can only remove attendants assigned to your own facilities")

    _delete_user(uname)
    return {"status": "deleted", "username": uname}


@app.post("/areas")
async def create_area(area_data: dict, authorization: str | None = Header(default=None)):
    """Register and persist a new parking area (including photo and initial spots)."""
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        uname = verify_token(token)
        if uname and not area_data.get("owner_username"):
            area_data["owner_username"] = uname
    areas = _read_areas()
    new_id = area_data.get("id") or int(time.time() * 1000)
    area_data["id"] = new_id
    if not area_data.get("createdAt"):
        area_data["createdAt"] = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    
    # Check if area exists to avoid duplicate
    areas = [a for a in areas if str(a.get("id")) != str(new_id)]
    areas.append(area_data)
    _write_areas(areas)
    logger.info("Saved new parking area to backend: %s (id: %s)", area_data.get("name"), new_id)
    return area_data


@app.put("/areas/{area_id}")
async def update_area(area_id: str, updated_data: dict):
    """Update details, spots, photo, or analytics history for an existing area."""
    areas = _read_areas()
    found = False
    for i, a in enumerate(areas):
        if str(a.get("id")) == str(area_id):
            areas[i] = {**a, **updated_data, "id": a.get("id")}
            found = True
            break
    if not found:
        # If not found, add it
        updated_data["id"] = int(area_id) if area_id.isdigit() else area_id
        areas.append(updated_data)

    _write_areas(areas)
    logger.info("Updated parking area %s in backend", area_id)
    return {"status": "success", "id": area_id}


@app.post("/areas/{area_id}/telemetry")
async def post_area_telemetry(area_id: str, snapshot: dict):
    """Append a live occupancy telemetry snapshot for an area without overwriting its configuration."""
    areas = _read_areas()
    for i, a in enumerate(areas):
        if str(a.get("id")) == str(area_id):
            history = list(a.get("analytics") or [])
            entry = {
                "time": snapshot.get("time", "00:00"),
                "timeSeconds": int(snapshot.get("timeSeconds", 0)),
                "recordedAt": snapshot.get("recordedAt") or time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
                "total": int(snapshot.get("total", 0)),
                "occupied": int(snapshot.get("occupied", 0)),
                "available": int(snapshot.get("available", 0)),
                "occupancyRate": int(snapshot.get("occupancyRate", 0)),
            }
            history = (history + [entry])[-40:]
            areas[i] = {**a, "analytics": history}
            _write_areas(areas)
            return {"status": "ok", "id": area_id, "latest": entry}
    raise HTTPException(status_code=404, detail="Parking area not found")


MAX_VIDEO_BYTES = 50 * 1024 * 1024  # 50 MB cap for shared PostgreSQL persistence


@app.post("/areas/{area_id}/video")
async def upload_area_video(area_id: str, file: UploadFile = File(...)):
    """Upload a parking monitor video clip (<= 50 MB) and bind its shared videoUrl to the area."""
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded video file is empty")
    if len(data) > MAX_VIDEO_BYTES:
        raise HTTPException(status_code=413, detail="Video exceeds 50 MB limit for shared storage")

    areas = _read_areas()
    idx = next((i for i, a in enumerate(areas) if str(a.get("id")) == str(area_id)), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Parking area not found")

    content_type = (file.content_type or "video/mp4").strip()
    filename = (file.filename or "footage.mp4").strip()
    _save_facility_video(area_id, filename, content_type, data)

    video_url = f"/areas/{area_id}/video?v={int(time.time())}"
    areas[idx] = {**areas[idx], "videoUrl": video_url}
    _write_areas(areas)
    logger.info("Uploaded shared monitor video for area %s (%d bytes)", area_id, len(data))
    return {"status": "uploaded", "videoUrl": video_url, "size": len(data)}


@app.get("/areas/{area_id}/video")
async def stream_area_video(area_id: str, request: Request):
    """Stream a shared facility monitor video clip with HTTP Range support."""
    record = _get_facility_video(area_id)
    if not record:
        raise HTTPException(status_code=404, detail="No shared video found for this facility")

    data: bytes = record["data"]
    total = len(data)
    content_type = record.get("content_type") or "video/mp4"
    common_headers = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges, Content-Length",
    }

    range_header = request.headers.get("range")
    if range_header and range_header.startswith("bytes="):
        spec = range_header.replace("bytes=", "", 1).split(",")[0].strip()
        start_str, _, end_str = spec.partition("-")
        try:
            start = int(start_str) if start_str else 0
            end = int(end_str) if end_str else total - 1
        except ValueError:
            raise HTTPException(status_code=416, detail="Invalid Range header")
        if start >= total or end < start:
            raise HTTPException(status_code=416, detail="Requested range not satisfiable")
        end = min(end, total - 1)
        chunk = data[start : end + 1]
        return Response(
            content=chunk,
            status_code=206,
            media_type=content_type,
            headers={
                **common_headers,
                "Content-Range": f"bytes {start}-{end}/{total}",
                "Content-Length": str(len(chunk)),
            },
        )

    return Response(
        content=data,
        status_code=200,
        media_type=content_type,
        headers={**common_headers, "Content-Length": str(total)},
    )


@app.delete("/areas/{area_id}/video")
async def remove_area_video(area_id: str):
    """Delete a shared facility monitor video clip."""
    _delete_facility_video_blob(area_id)
    areas = _read_areas()
    for i, a in enumerate(areas):
        if str(a.get("id")) == str(area_id):
            areas[i] = {**a, "videoUrl": ""}
            _write_areas(areas)
            break
    return {"status": "deleted", "id": area_id}


@app.delete("/areas/{area_id}")
async def delete_area(area_id: str):
    """Remove a parking area from the backend database."""
    _delete_area(area_id)
    logger.info("Deleted parking area %s from backend", area_id)
    return {"status": "deleted", "id": area_id}


# ---------------------------------------------------- Test Payments & Enforcement ----
class PaymentInitiateRequest(BaseModel):
    area_id: str | int
    plate_number: str = Field(..., min_length=3, max_length=20)
    hours: int = Field(default=1, ge=1, le=24)
    payer_name: str | None = Field(default=None, max_length=128)
    phone_number: str | None = None
    network: str = "MTN"
    redirect_url: str | None = None


class PaymentVerifyRequest(BaseModel):
    transaction_id: str | None = None
    sandbox_outcome: str = "successful"


def _require_auth_user(authorization: str | None) -> tuple[str, dict]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    token = authorization.split(" ", 1)[1].strip()
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    users = _read_users()
    user = users.get(username)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return username, user


def _parse_hourly_rate_ugx(rate_str: str | None) -> int:
    if not rate_str:
        return 2000
    digits = "".join(ch for ch in str(rate_str) if ch.isdigit())
    return int(digits) if digits else 2000


@app.post("/payments/initiate")
async def initiate_payment(req: PaymentInitiateRequest, authorization: str | None = Header(default=None)):
    """Initiate a test parking pass payment (Flutterwave v3 Test Mode or local sandbox)."""
    import urllib.request
    import urllib.error

    username, user = _require_auth_user(authorization)
    areas = _read_areas()
    area = next((a for a in areas if str(a.get("id")) == str(req.area_id)), None)
    if not area:
        raise HTTPException(status_code=404, detail="Parking facility not found")

    rate_ugx = _parse_hourly_rate_ugx(area.get("hourlyRate"))
    amount_ugx = rate_ugx * req.hours
    plate = req.plate_number.strip().upper()
    tx_ref = f"KCCA-{int(time.time())}-{secrets.token_hex(3).upper()}"
    now = int(time.time())

    payer_display = (req.payer_name or "").strip() or (user.get("display_name") or username)
    tx_record = {
        "tx_ref": tx_ref,
        "username": username,
        "display_name": payer_display,
        "area_id": area.get("id"),
        "area_name": area.get("name"),
        "plate_number": plate,
        "hours": req.hours,
        "hourly_rate_ugx": rate_ugx,
        "amount_ugx": amount_ugx,
        "currency": "UGX",
        "network": req.network,
        "phone_number": (req.phone_number or user.get("phone") or "+256700000000").strip(),
        "status": "PENDING",
        "mode": "sandbox",
        "created_at": now,
        "paid_at": None,
        "expires_at": None,
        "receipt_no": None,
        "flw_transaction_id": None,
    }

    flw_secret = os.getenv("FLW_SECRET_KEY", "").strip()
    checkout_url = None
    if flw_secret:
        redirect_url = req.redirect_url or "http://localhost:5173/dashboard/payments"
        flw_payload = {
            "tx_ref": tx_ref,
            "amount": amount_ugx,
            "currency": "UGX",
            "redirect_url": redirect_url,
            "payment_options": "card,mobilemoneyuganda",
            "customer": {
                "email": user.get("email") or f"{username}@kcca.go.ug",
                "phonenumber": tx_record["phone_number"],
                "name": tx_record["display_name"],
            },
            "customizations": {
                "title": "KCCA ParkWatch",
                "description": f"{req.hours}h Parking Pass - {area.get('name')} ({plate})",
            },
        }
        try:
            http_req = urllib.request.Request(
                "https://api.flutterwave.com/v3/payments",
                data=json.dumps(flw_payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {flw_secret}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(http_req, timeout=10) as resp:
                flw_resp = json.loads(resp.read().decode("utf-8"))
                link = (flw_resp.get("data") or {}).get("link")
                if link:
                    checkout_url = link
                    tx_record["mode"] = "flutterwave"
        except Exception as e:
            logger.warning("Flutterwave initiate failed (%s); falling back to local sandbox", e)

    payments = _read_payments()
    payments.insert(0, tx_record)
    _write_payments(payments)

    return {
        "mode": tx_record["mode"],
        "checkout_url": checkout_url,
        "tx_ref": tx_ref,
        "amount_ugx": amount_ugx,
        "payment": tx_record,
    }


@app.post("/payments/{tx_ref}/verify")
async def verify_payment(
    tx_ref: str,
    req: PaymentVerifyRequest,
    authorization: str | None = Header(default=None),
):
    """Verify a test payment via Flutterwave v3 verify endpoint or local sandbox outcome."""
    import urllib.request
    import math

    username, user = _require_auth_user(authorization)
    payments = _read_payments()
    idx = next((i for i, p in enumerate(payments) if p.get("tx_ref") == tx_ref), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Payment transaction not found")

    tx = payments[idx]
    if tx.get("username") != username and user.get("role") not in ("admin", "operator"):
        raise HTTPException(status_code=403, detail="Not authorized for this transaction")

    if tx.get("status") == "PAID":
        return {"status": "PAID", "payment": tx}

    verified = False
    flw_secret = os.getenv("FLW_SECRET_KEY", "").strip()
    if flw_secret and req.transaction_id:
        try:
            verify_req = urllib.request.Request(
                f"https://api.flutterwave.com/v3/transactions/{req.transaction_id}/verify",
                headers={"Authorization": f"Bearer {flw_secret}"},
                method="GET",
            )
            with urllib.request.urlopen(verify_req, timeout=10) as resp:
                flw_data = json.loads(resp.read().decode("utf-8")).get("data") or {}
                if (
                    flw_data.get("status") == "successful"
                    and flw_data.get("currency") == "UGX"
                    and float(flw_data.get("amount", 0)) >= float(tx.get("amount_ugx", 0))
                ):
                    verified = True
                    tx["flw_transaction_id"] = str(req.transaction_id)
        except Exception as e:
            logger.warning("Flutterwave verify error: %s", e)
            raise HTTPException(status_code=502, detail="Failed to verify transaction with Flutterwave")
    else:
        verified = req.sandbox_outcome == "successful"

    now = int(time.time())
    if verified:
        tx["status"] = "PAID"
        tx["paid_at"] = now
        tx["expires_at"] = now + int(tx.get("hours", 1)) * 3600
        tx["receipt_no"] = f"KCCA-RCP-{secrets.token_hex(4).upper()}"
    else:
        tx["status"] = "FAILED"

    payments[idx] = tx
    _write_payments(payments)
    return {"status": tx["status"], "payment": tx}


@app.get("/payments")
async def list_payments(
    plate: str | None = None,
    authorization: str | None = Header(default=None),
    x_active_role: str | None = Header(default=None),
):
    """List parking payments and optionally check plate transaction profile (scoped by role/area)."""
    import math

    username, user = _require_auth_user(authorization)
    u_roles = _normalize_roles(user)
    role = x_active_role.lower().strip() if x_active_role and x_active_role.lower().strip() in u_roles else u_roles[0]
    assigned_area_id = user.get("assigned_area_id")
    all_payments = _read_payments()

    if role == "motorist":
        visible = [p for p in all_payments if p.get("username") == username]
    elif role == "warden":
        visible = [p for p in all_payments if str(p.get("area_id")) == str(assigned_area_id)]
    elif role == "operator":
        owned_ids = {str(a.get("id")) for a in _read_areas() if _is_owned_by_operator(a, username, user)}
        visible = [p for p in all_payments if str(p.get("area_id")) in owned_ids]
    else:
        visible = all_payments

    now = int(time.time())
    total_collected_ugx = sum(p.get("amount_ugx", 0) for p in visible if p.get("status") == "PAID")
    active_passes = sum(
        1 for p in visible if p.get("status") == "PAID" and (p.get("expires_at") or 0) > now
    )

    plate_check = None
    plate_transactions = []
    if plate and plate.strip():
        q_plate = plate.strip().upper()
        plate_transactions = [
            p for p in visible
            if p.get("plate_number", "").upper() == q_plate
        ]
        paid_matches = [p for p in plate_transactions if p.get("status") == "PAID"]
        if not paid_matches:
            plate_check = {
                "plate_number": q_plate,
                "enforcement_status": "UNPAID",
                "overstay_minutes": 0,
                "overstay_fee_ugx": 0,
                "latest_pass": None,
                "area_name": user.get("assigned_area_name"),
            }
        else:
            latest = paid_matches[0]
            exp = latest.get("expires_at") or 0
            if exp > now:
                plate_check = {
                    "plate_number": q_plate,
                    "enforcement_status": "VALID",
                    "remaining_minutes": math.ceil((exp - now) / 60),
                    "overstay_minutes": 0,
                    "overstay_fee_ugx": 0,
                    "latest_pass": latest,
                    "area_name": latest.get("area_name"),
                }
            else:
                overstay_secs = now - exp
                overstay_mins = math.ceil(overstay_secs / 60)
                overstay_hrs = math.ceil(overstay_secs / 3600)
                fee = overstay_hrs * int(latest.get("hourly_rate_ugx", 2000))
                plate_check = {
                    "plate_number": q_plate,
                    "enforcement_status": "OVERSTAY",
                    "remaining_minutes": 0,
                    "overstay_minutes": overstay_mins,
                    "overstay_fee_ugx": fee,
                    "latest_pass": latest,
                    "area_name": latest.get("area_name"),
                }

    return {
        "payments": visible,
        "summary": {
            "total_collected_ugx": total_collected_ugx,
            "active_passes": active_passes,
            "total_transactions": len(visible),
        },
        "plate_check": plate_check,
        "plate_transactions": plate_transactions,
    }


@app.get("/payments/{tx_ref}")
async def get_payment_detail(
    tx_ref: str,
    authorization: str | None = Header(default=None),
):
    """Retrieve a single payment record for receipt viewing & printing."""
    username, user = _require_auth_user(authorization)
    role = user.get("role", "motorist")
    assigned_area_id = user.get("assigned_area_id")

    payments = _read_payments()
    tx = next((p for p in payments if p.get("tx_ref") == tx_ref), None)
    if not tx:
        raise HTTPException(status_code=404, detail="Payment record not found")

    if role == "motorist" and tx.get("username") != username:
        raise HTTPException(status_code=403, detail="Not authorized to view this receipt")
    if role == "warden" and str(tx.get("area_id")) != str(assigned_area_id):
        raise HTTPException(status_code=403, detail="Receipt belongs to another parking area")
    if role == "operator" and assigned_area_id is not None and str(tx.get("area_id")) != str(assigned_area_id):
        raise HTTPException(status_code=403, detail="Receipt belongs to another parking area")

    return {"payment": tx}



class ImageRequest(BaseModel):
    """Request model for image data"""
    image: str = Field(..., description="Base64 encoded image (data:image/jpeg;base64,...)")


class BoundingBox(BaseModel):
    """Bounding box coordinates"""
    x1: int = Field(..., ge=0, description="Left coordinate")
    y1: int = Field(..., ge=0, description="Top coordinate")
    x2: int = Field(..., ge=0, description="Right coordinate")
    y2: int = Field(..., ge=0, description="Bottom coordinate")


class VehicleDetection(BaseModel):
    """Detected vehicle information"""
    class_name: str = Field(..., description="Vehicle class (car, truck, bus, etc.)")
    confidence: float = Field(..., ge=0, le=1, description="Detection confidence score")
    bbox: BoundingBox = Field(..., description="Bounding box coordinates")


class ParkingSpot(BaseModel):
    """Parking spot information"""
    id: str = Field(..., description="Spot identifier")
    occupied: bool = Field(..., description="Whether spot is occupied")
    x1: int = Field(..., ge=0, description="Left coordinate")
    y1: int = Field(..., ge=0, description="Top coordinate")
    x2: int = Field(..., ge=0, description="Right coordinate")
    y2: int = Field(..., ge=0, description="Bottom coordinate")
    vehicle_class: str | None = Field(None, description="Vehicle class if occupied")
    confidence: float | None = Field(None, ge=0, le=1, description="Detection confidence if occupied")


class DetectionResponse(BaseModel):
    """Response model for vehicle detection"""
    success: bool = Field(..., description="Whether detection was successful")
    vehicles: list[VehicleDetection] = Field(default_factory=list, description="Detected vehicles")
    total_detected: int = Field(..., description="Total number of vehicles detected")
    image_size: dict[str, int] = Field(..., description="Image dimensions")


class SpotDetectionResponse(BaseModel):
    """Response model for parking spot detection"""
    success: bool = Field(..., description="Whether detection was successful")
    vehicles: list[VehicleDetection] = Field(default_factory=list, description="Detected vehicles")
    spots: list[ParkingSpot] = Field(default_factory=list, description="Generated parking spots")
    total_vehicles: int = Field(..., description="Total vehicles detected")
    total_spots: int = Field(..., description="Total parking spots generated")


def decode_image(base64_string: str) -> Image.Image:
    """Decode base64 image string to PIL Image"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]

        image_data = base64.b64decode(base64_string)
        image = Image.open(io.BytesIO(image_data))

        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')

        return image
    except Exception as e:
        raise ValueError(f"Failed to decode image: {e}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    model_name = (
        "YOLOv8n ONNX (Lightweight ~72MB)"
        if DETECTION_ENGINE == "onnx"
        else ("RT-DETR R101VD" if DETECTION_ENGINE == "rtdetr" else "None (Auth-Only)")
    )
    return {
        "status": "healthy",
        "detection_engine": DETECTION_ENGINE,
        "model": model_name,
        "vehicle_classes": sorted(list(VEHICLE_CLASSES)),
        "version": "1.0.0"
    }


@app.post("/detect")
async def detect_vehicles(request: Request):
    """
    Detect vehicles in an image (supports both multipart/form-data with 'file' and JSON with 'image').
    """
    try:
        content_type = request.headers.get("content-type", "")
        image = None

        if "multipart/form-data" in content_type:
            form = await request.form()
            file_upload = form.get("file")
            if file_upload and hasattr(file_upload, "read"):
                file_bytes = await file_upload.read()
                image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
            else:
                raise HTTPException(status_code=400, detail="Missing 'file' in multipart form data")
        else:
            body = await request.json()
            image_b64 = body.get("image")
            if not image_b64:
                raise HTTPException(status_code=400, detail="Missing 'image' in request body")
            image = decode_image(image_b64)

        if not detector:
            logger.warning("Object detection model not ready, returning empty detections")
            return {
                "success": True,
                "vehicles": [],
                "total_detected": 0,
                "image_size": {
                    "width": image.width if image else 640,
                    "height": image.height if image else 360
                }
            }

        # Run detection using active engine
        vehicles = []
        if DETECTION_ENGINE == "onnx":
            vehicles = _detect_onnx(detector, image)
        elif DETECTION_ENGINE == "rtdetr":
            results = detector(image)
            for result in results:
                class_name = result['label'].lower()
                if class_name in VEHICLE_CLASSES:
                    x1 = int(result['box']['xmin'])
                    y1 = int(result['box']['ymin'])
                    x2 = int(result['box']['xmax'])
                    y2 = int(result['box']['ymax'])
                    score = float(result['score'])
                    vehicles.append({
                        "class_name": class_name,
                        "confidence": score,
                        "x1": x1,
                        "y1": y1,
                        "x2": x2,
                        "y2": y2,
                        "bbox": {
                            "x1": x1,
                            "y1": y1,
                            "x2": x2,
                            "y2": y2
                        }
                    })

        logger.info(f"Engine [{DETECTION_ENGINE}] detected {len(vehicles)} vehicles")

        return {
            "success": True,
            "vehicles": vehicles,
            "total_detected": len(vehicles),
            "image_size": {
                "width": image.width,
                "height": image.height
            }
        }

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error during detection: {e}")
        return {
            "success": False,
            "vehicles": [],
            "total_detected": 0,
            "error": str(e)
        }


@app.post("/detect-spots", response_model=SpotDetectionResponse)
async def detect_parking_spots(request: ImageRequest):
    """
    Detect vehicles and generate parking spot suggestions

    Args:
        request: ImageRequest with base64 encoded image

    Returns:
        SpotDetectionResponse with vehicles and suggested parking spots
    """
    try:
        if not detector:
            raise HTTPException(status_code=503, detail="Model not loaded")

        # Decode image
        image = decode_image(request.image)
        logger.info(f"Processing image for spot detection: {image.size}")

        # Run detection
        results = detector(image)

        # Filter only vehicles
        vehicles = []
        for result in results:
            class_name = result['label'].lower()
            if class_name in VEHICLE_CLASSES:
                vehicles.append(VehicleDetection(
                    class_name=class_name,
                    confidence=float(result['score']),
                    bbox=BoundingBox(
                        x1=int(result['box']['xmin']),
                        y1=int(result['box']['ymin']),
                        x2=int(result['box']['xmax']),
                        y2=int(result['box']['ymax'])
                    )
                ))

        # Generate parking spots around detected vehicles
        spots = generate_parking_spots(vehicles, image.width, image.height)

        logger.info(f"Generated {len(spots)} parking spots")

        return SpotDetectionResponse(
            success=True,
            vehicles=vehicles,
            spots=spots,
            total_vehicles=len(vehicles),
            total_spots=len(spots)
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error during spot detection: {e}")
        raise HTTPException(status_code=500, detail=f"Spot detection failed: {str(e)}")


def generate_parking_spots(vehicles: list[VehicleDetection], img_width: int, img_height: int) -> list[ParkingSpot]:
    """Generate parking spot suggestions based on detected vehicles"""
    spots = []
    spot_width = 80   # approximate parking spot width
    spot_height = 160 # approximate parking spot length

    # Create spots for each detected vehicle
    for idx, vehicle in enumerate(vehicles):
        bbox = vehicle.bbox

        # Use vehicle position as center of parking spot
        spot_x = bbox.x1 - (spot_width - (bbox.x2 - bbox.x1)) / 2
        spot_y = bbox.y1 - (spot_height - (bbox.y2 - bbox.y1)) / 2

        spots.append(ParkingSpot(
            id=f"spot_{idx}",
            occupied=True,
            x1=max(0, int(spot_x)),
            y1=max(0, int(spot_y)),
            x2=min(img_width, int(spot_x + spot_width)),
            y2=min(img_height, int(spot_y + spot_height)),
            vehicle_class=vehicle.class_name,
            confidence=vehicle.confidence
        ))

    # Try to detect empty spots by analyzing gaps between vehicles
    if len(vehicles) > 1:
        # Sort vehicles by x position
        sorted_vehicles = sorted(vehicles, key=lambda v: v.bbox.x1)

        avg_vehicle_width = sum(v.bbox.x2 - v.bbox.x1 for v in vehicles) / len(vehicles)
        estimated_spot_width = avg_vehicle_width * 1.5

        # Look for gaps between vehicles
        for i in range(len(sorted_vehicles) - 1):
            current_bbox = sorted_vehicles[i].bbox
            next_bbox = sorted_vehicles[i + 1].bbox

            gap = next_bbox.x1 - current_bbox.x2

            # If there's enough space for another spot
            if gap > estimated_spot_width * 0.8:
                spot_x = current_bbox.x2
                spot_y = current_bbox.y1

                spots.append(ParkingSpot(
                    id=f"spot_empty_{i}",
                    occupied=False,
                    x1=int(spot_x),
                    y1=int(spot_y),
                    x2=int(spot_x + estimated_spot_width),
                    y2=int(spot_y + (current_bbox.y2 - current_bbox.y1))
                ))

    return spots


if __name__ == "__main__":
    import uvicorn
    
    print("\n" + "="*60)
    print("Parking Detection Backend - FastAPI")
    print("="*60)
    print("Starting server on http://localhost:8000")
    print("API Docs: http://localhost:8000/docs")
    print("Endpoints:")
    print("  GET  /health       - Health check")
    print("  POST /detect       - Detect vehicles in image")
    print("  POST /detect-spots - Detect vehicles and generate parking spots")
    print("="*60 + "\n")

    port = int(os.environ.get("PORT", 8001))
    print(f"Server starting on port {port}...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
