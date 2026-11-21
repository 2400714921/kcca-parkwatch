# KCCA ParkWatch — Smart Municipal Parking & Occupancy Detection System

A full-stack smart parking management, AI vehicle occupancy detection, and mobile-money payment platform built for municipal parking operations in Kampala.

- **Frontend:** React 18, Vite 5, Tailwind CSS, Leaflet GIS Maps (`frontend/`)
- **Backend:** FastAPI, YOLOv8n ONNX (~72 MB), JWT + bcrypt auth, PostgreSQL with local JSON fallback (`backend_new/`)
- **Payments:** Flutterwave v3 integration with automatic local sandbox fallback when `FLW_SECRET_KEY` is not configured

---

## Project Structure

```text
Parking System 2/
├── backend_new/
│   ├── main.py                  # FastAPI server, auth, RBAC, payments, AI detection (/detect)
│   ├── db.py                    # Unified PostgreSQL + local JSON persistence & default seeds
│   ├── models/yolov8n.onnx      # Lightweight YOLOv8n ONNX vehicle detector
│   ├── requirements.txt         # Python dependencies
│   ├── render.yaml              # Render web service + PostgreSQL blueprint
│   ├── .env.example             # Sample backend environment variables
│   └── start.bat                # Windows quick-start script
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Routing, background video loop, 5s live telemetry polling
│   │   └── components/          # LandingPage, AreaDetailsPage, MonitorWorkspace,
│   │                            # WardenVerifyPage, AttendantManagementPage, PayParkingPage, etc.
│   ├── package.json             # Node.js scripts & dependencies
│   └── vite.config.mjs          # Vite configuration
└── README.md
```

---

## How to Start Locally

### Prerequisites
- **Python** 3.10+
- **Node.js** 18+ (with `npm`)

### 1. Start the Backend (FastAPI)

```bash
cd backend_new

# Create and activate a virtual environment
python -m venv venv
# Windows (PowerShell / CMD):
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# (Optional) Create your local .env from .env.example
copy .env.example .env   # macOS/Linux: cp .env.example .env

# Start the API server
python main.py
```

The backend runs on **http://localhost:8001**:
- **Interactive API Docs (Swagger):** http://localhost:8001/docs
- **Health Check:** http://localhost:8001/health

### 2. Start the Frontend (React + Vite)

Open a second terminal:

```bash
cd frontend

# Install Node dependencies
npm install

# Start the development server
npm run dev
```

The frontend runs on **http://localhost:5173/**.

To create a production build:

```bash
cd frontend
npm run build
```

---

## Environment Variables

### Backend (`backend_new/.env` or Render Environment)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Port for the FastAPI server | `8001` |
| `JWT_SECRET` | Secret key used to sign JWT auth tokens | Auto-generated in `.jwt_secret` locally; generated on Render |
| `FRONTEND_URL` | Allowed CORS origin for the hosted frontend | `*` (if unset locally) |
| `DATABASE_URL` | PostgreSQL connection string (`postgres://` or `postgresql://`) | Falls back to local `users.json`, `areas.json`, `payments.json` when unset |
| `FLW_SECRET_KEY` | Flutterwave Secret Key (`FLWSECK_TEST-...` or live key) | Optional — falls back to local payment sandbox if empty |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL of the FastAPI backend | `http://localhost:8001` on localhost, `https://kcca-parkwatch.onrender.com` in production |

---

## Default Test Credentials

Both **`@parkwatch.ug`** and **`@kcca.go.ug`** seed accounts are built into `backend_new/db.py` (`DEFAULT_SEEDS`) and work out of the box on both local and Render deployments. Sign in using either **email** (in the Sign In modal) or **username**:

| Role | `@parkwatch.ug` Email | `@kcca.go.ug` Email | Username | Password |
| :--- | :--- | :--- | :--- | :--- |
| **System Admin** (`admin`) | `admin@parkwatch.ug` | `admin@kcca.go.ug` | `admin_pw` / `admin` | `admin123` |
| **ParkingArea Owner** (`operator`) | `owner@parkwatch.ug` | `owner@kcca.go.ug` | `owner_pw` / `owner_kcca` | `owner123` |
| **Parking Attendant** (`warden`) | `attendant@parkwatch.ug` | `attendant@kcca.go.ug` | `attendant_pw` / `attendant_kcca` | `attendant123` |
| **Motorist / Driver** (`motorist`) | `motorist@parkwatch.ug` | `motorist@kcca.go.ug` | `motorist_pw` / `motorist` | `motorist123` |

> **Note:** Both `attendant@parkwatch.ug` and `attendant@kcca.go.ug` are pre-assigned to **City Square Municipal Arcade** (`1700000000001`).

---

## Roles & Key Capabilities

### 1. System Admin (`admin`)
- Full access to **Operations Dashboard**, **Parking Facilities** (including assigning facility owners), **Live Monitor**, **Payments**, and **User Management** (create/edit users, assign multiple roles, activate/deactivate accounts).

### 2. ParkingArea Owner (`operator`)
- Scoped **Operations Dashboard** and **My Parking Facilities** showing only facilities they own.
- **Live Monitor** (`/dashboard/monitor/:areaId`): load parking video footage (stored in browser IndexedDB), draw/calibrate parking bays (**Mark Spots**), run **Scan Current Frame** or continuous AI detection (`POST /detect`), and sync live occupancy telemetry (`POST /areas/:id/telemetry`).
  - *Option B Background Mode:* Leaving the browser tab open after logging out keeps the hidden `<video>` playing and syncing live stats to the public **Landing Page (`/`)** and **View Details (`/areas/:areaId`)**.
- **My Parking Attendants** (`/dashboard/attendants`): assign attendants with a required email address, password, and owned facility; edit details, reset passwords, toggle active status, or remove attendants.

### 3. Parking Attendant (`warden`)
- Dedicated **Parking Attendant Dashboard** (`/dashboard`) scoped to their assigned parking facility.
- **Verify Vehicle Number Plate**: check if a vehicle pass is `VALID`, `OVERSTAY` (with balance due), or `UNPAID`, inspect plate transaction history, and view/print receipts.
- View **Area Payments** (`/dashboard/payments`) for their assigned facility.

### 4. Motorist / Public Visitor (`motorist`)
- **Public Landing Page (`/`)** & **Kampala GIS Map**: live bay availability auto-refreshed every 5 seconds.
- **View Details (`/areas/:areaId`)**: live occupancy stats, trend bar chart, recent snapshots, operating hours, Google Maps directions, and **Pay for Parking**.
- **Pay Parking (`/dashboard/pay/:areaId`)** & **Payment History (`/dashboard/payments`)**: pay via Flutterwave v3 (or sandbox) and view/print official receipts.

---

## Hosting Notes (Render)
- Backend blueprint is defined in `backend_new/render.yaml` (`uvicorn main:app --host 0.0.0.0 --port $PORT`).
- On Render, set `FLW_SECRET_KEY` in **Environment → Environment Variables** if you want real Flutterwave v3 test/live checkout instead of local sandbox fallback.
- `DATABASE_URL` automatically enables PostgreSQL persistence for `users` (including `roles`, `assigned_area_id`, `assigned_area_name`), `areas`, and `payments`.
