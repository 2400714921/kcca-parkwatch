# KCCA ParkWatch — Simple System Guide & Presentation Summary

This guide explains **KCCA ParkWatch** in plain, non-technical language so anyone on the team can understand and present what the system does, how it works, who uses it, what technologies power it, and its current limitations.

---

## 1. What the System Should Do

**KCCA ParkWatch** is a smart municipal parking and occupancy detection platform built for Kampala Capital City Authority (KCCA). Its goal is to solve parking congestion and revenue leakage by:

1. **Helping Motorists Find Parking Fast:** Showing real-time available vs. occupied parking bays, hourly prices (yellow price badges), and exact GPS directions across Kampala facilities.
2. **Automating Spot Counting with AI:** Detecting vehicles parked in marked bays from camera/video footage and updating **live analytics** automatically.
3. **Enabling Digital Parking Payments:** Allowing motorists to pay for parking passes online (via Flutterwave mobile money / card checkout or sandbox) and receive printable digital receipts.
4. **Supporting On-Site Enforcement:** Giving Parking Attendants a dedicated console to verify vehicle number plates (`VALID`, `OVERSTAY`, or `UNPAID`) at their assigned facility.
5. **Empowering Facility Owners & KCCA Admins:** Letting owners monitor their own facilities, view scoped analytics, and assign/manage their attendants, while Admins oversee the entire city network.

---

## 2. How the System Works (Simply Explained)

1. **Step 1 — Facility Setup & Bay Marking:** An Admin or ParkingArea Owner registers a parking facility (name, location, GPS coordinates, hourly rate, photo) and draws boxes over the parking spaces (**Mark Spots**) on the facility video in **Live Monitor**.
2. **Step 2 — Video Playback & AI Detection:** As the parking video plays in **Live Monitor**, the browser sends a snapshot of the current video frame every ~1.5 seconds to the backend AI detector.
3. **Step 3 — Counting Free vs. Occupied Bays:** The AI model (`YOLOv8n ONNX`) detects cars, trucks, buses, and motorcycles in the frame and checks which marked parking bays they overlap with.
4. **Step 4 — Syncing Live Analytics:** Every few seconds, the updated occupancy counts (`available`, `occupied`, `occupancyRate%`) are saved to the backend database. The **Landing Page (`/`)** and **Facility Details (`/areas/:areaId`)** poll for updates every 5 seconds so everyone sees **live analytics** in real time — even if the operator logs out while leaving the monitor tab open.
5. **Step 5 — Payment & Verification:** A motorist clicks **Pay for Parking** (from the dashboard or directly from the Facility Details page), pays for their desired hours, and gets a receipt. At the parking lot, the **Parking Attendant** types the vehicle's plate number to confirm whether the pass is valid or has overstayed.

---

## 3. Technology Stack & Hosting

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, React Router 7, Vite 5, Tailwind CSS 4, Leaflet 1.9 + OpenStreetMap, Material Symbols |
| **Backend API** | Python, FastAPI, Uvicorn / Gunicorn, Pydantic 2 |
| **Authentication & Security** | `bcrypt` password hashing, `PyJWT` (HS256) bearer tokens, multi-role RBAC, Safari-safe CORS |
| **AI / Computer Vision** | `YOLOv8n` in ONNX format running via ONNX Runtime (CPU), Pillow & NumPy |
| **Database & Storage** | PostgreSQL (`users`, `areas`, `payments`, `facility_videos` tables) with local JSON/file fallbacks and browser IndexedDB caching |
| **Payments** | Flutterwave v3 API (UGX mobile money / card) with automatic local sandbox fallback |
| **Hosting** | **Vercel** (Frontend) and **Render** (FastAPI Backend + PostgreSQL Database) |

---

## 4. User Roles & Seeded Accounts

The system supports **4 roles** (and accounts can hold multiple roles and switch between them in the sidebar):

1. **Motorist / Driver (`motorist`):**
   - Signs in and stays on the Landing Page, automatically scrolled to the live parking spots.
   - Searches/filters facilities, views **live analytics** and yellow hourly rates, opens exact GPS Google Maps directions, pays for parking, and views/prints receipts.
2. **Parking Attendant (`warden`):**
   - Sees a dedicated dashboard scoped **only** to their assigned parking facility.
   - Verifies vehicle number plates (`VALID`, `OVERSTAY` with balance due, or `UNPAID`), views area payments, and prints receipts.
3. **ParkingArea Owner (`operator`):**
   - Sees **My Parking Facilities** and an Operations Dashboard scoped **only** to facilities they own.
   - Opens **Live Monitor** to upload shared videos (≤ 50 MB or Shared URL), mark bays, run AI detection, and manage **My Parking Attendants** (assigning attendants with required email addresses).
4. **System Admin (`admin`):**
   - Has full system-wide visibility across all facilities, payments, and analytics.
   - Assigns facility owners, creates/edits/deactivates user accounts, and assigns multiple roles.

### Seeded Default Test Accounts

Both **`@parkwatch.ug`** and **`@kcca.go.ug`** accounts are pre-seeded so anyone testing can sign in easily:

| Role | `@parkwatch.ug` Email | `@kcca.go.ug` Email | Password |
| :--- | :--- | :--- | :--- |
| **System Admin** (`admin`) | `admin@parkwatch.ug` | `admin@kcca.go.ug` | `admin123` |
| **ParkingArea Owner** (`operator`) | `owner@parkwatch.ug` | `owner@kcca.go.ug` | `owner123` |
| **Parking Attendant** (`warden`) | `attendant@parkwatch.ug` | `attendant@kcca.go.ug` | `attendant123` |
| **Motorist / Driver** (`motorist`) | `motorist@parkwatch.ug` | `motorist@kcca.go.ug` | `motorist123` |

*(Both seeded attendants are pre-assigned to **City Square Municipal Arcade**.)*

---

## 5. Limitations & Challenges (Why Some Things Could Not Be Achieved)

1. **Lack of Live Camera Feeds (CCTV / RTSP):**
   - **Challenge:** The team did not have access to live municipal CCTV or IP/RTSP camera streams installed at KCCA parking lots.
   - **Result:** The system uses uploaded or linked MP4/WebM video clips in **Live Monitor** to simulate overhead camera feeds. Connecting real RTSP streams later would require an edge/media relay server (e.g., WebRTC/HLS) since browsers cannot play raw RTSP directly.
2. **AI Model Limitations:**
   - **Challenge:** To run smoothly without expensive GPUs, the system uses a lightweight CPU-based **YOLOv8n ONNX** model.
   - **Result:** Detection accuracy can drop in heavy rain, poor night lighting, steep camera angles, or when tall vehicles block smaller cars behind them. Additionally, the model detects **vehicle presence**, not **Automatic Number Plate Recognition (ANPR/OCR)** — which is why Parking Attendants type the plate number to verify payment status.
3. **Hosting Restrictions (Render & Vercel):**
   - **Challenge:** The frontend is hosted on **Vercel** and the backend + PostgreSQL database are hosted on **Render's free tier** (which sleeps after ~15 minutes of inactivity, has 512 MB RAM, shared CPU, an ephemeral local disk, and a 1 GB PostgreSQL storage cap).
   - **Result:**
     - **Cold starts:** If the backend has been idle, the first login or API request takes ~20–40 seconds to wake Render up.
     - **Browser-driven video processing:** Continuous 24/7 server-side video decoding on Render Free would exceed the 512 MB RAM limit and pause when Render sleeps, so video playback and frame capture run in the operator's browser tab while syncing lightweight **live analytics** to Render.
     - **50 MB shared video cap:** Because Render's local disk is wiped on redeploy, shared video uploads are stored in PostgreSQL (`facility_videos`) with a 50 MB limit per clip. Production scale with large/long videos would use dedicated cloud object storage (such as AWS S3 or Cloudinary).
4. **Payment Gateway Mode:**
   - Payments currently run in **Flutterwave Test Mode** (with an automatic local sandbox fallback if `FLW_SECRET_KEY` is not set in Render's environment) rather than processing real live money transactions.
