# Parking Detection System - Setup Guide

## Architecture

This system uses a **hybrid detection approach**:
- **Backend (Python)**: RT-DETR AI model for high-accuracy vehicle detection
- **Frontend (React)**: Heuristic-based detection as fallback + UI for marking spots

## Quick Start

### Option 1: Frontend Only (Heuristic Detection)
If you don't need AI-powered detection, just run the React app:

```bash
npm run dev
```

The heuristic detection works well for most parking scenarios and requires no backend setup.

### Option 2: Full Stack (AI + Heuristic)

#### Step 1: Start Backend

**Windows:**
```bash
cd backend
start.bat
```

**Mac/Linux:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

The server will start on `http://localhost:5000`

**First run note:** The RT-DETR model (~150MB) will download automatically. This takes 1-2 minutes.

#### Step 2: Start Frontend

In a new terminal:
```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

## How It Works

### Backend Detection Flow
1. User uploads image to React app
2. Image converted to base64 and sent to Flask API
3. RT-DETR model detects all vehicles with bounding boxes
4. Backend returns vehicle locations and confidence scores
5. Frontend checks which marked parking spots contain vehicles
6. Spots colored red (occupied) or green (available)

### Fallback Behavior
- If backend is not running → automatically uses heuristic detection
- If backend returns error → falls back to heuristic detection
- User can manually choose detection method via buttons

## Features

### Backend (RT-DETR)
- ✅ State-of-the-art object detection accuracy
- ✅ Detects: cars, trucks, buses, motorcycles, bicycles
- ✅ Confidence scores for each detection
- ✅ Handles various lighting conditions
- ✅ Works with aerial/top-down views

### Frontend (Heuristic)
- ✅ No server required
- ✅ Instant response time
- ✅ Adjustable thresholds via debug panel
- ✅ Shadow filtering
- ✅ Multi-color vehicle detection (white, black, colored)
- ✅ Save/load spot configurations
- ✅ Auto-scaling across different images

## API Endpoints

See `backend/README.md` for full API documentation.

## Troubleshooting

### Backend won't start
- Ensure Python 3.8+ is installed: `python --version`
- Check if port 5000 is available
- Verify dependencies: `pip install -r requirements.txt`

### Model download fails
- Check internet connection
- First download is ~150MB, may take time
- Subsequent runs use cached weights

### Frontend can't connect to backend
- Verify backend is running on port 5000
- Check CORS is enabled (it is by default)
- Open browser console (F12) for error messages

### Detection accuracy issues
- **AI mode**: Generally very accurate, check image quality
- **Heuristic mode**: Adjust thresholds in Debug Panel
  - Lower "Min Brightness" for darker vehicles
  - Increase "Min Saturation" for colored cars
  - Adjust "Shadow Max Brightness" to filter shadows better

## Performance

### Hardware Requirements
- **Backend**: 4GB RAM minimum, GPU optional (CUDA auto-detected)
- **Frontend**: Any modern browser, no special requirements

### Inference Time
- **Backend**: 0.5-2 seconds per image (depends on GPU)
- **Frontend**: <0.1 seconds (instant)

## Development

### Project Structure
```
Parking System 2/
├── src/
│   └── App.jsx          # Main React component
├── backend/
│   ├── app.py           # Flask server + RT-DETR
│   ├── requirements.txt # Python dependencies
│   └── test_backend.py  # Test script
├── package.json         # Node.js dependencies
└── SETUP.md            # This file
```

### Adding New Features
- Backend endpoints: Add routes in `backend/app.py`
- Frontend UI: Modify `src/App.jsx`
- Detection logic: Update `detectCarsLegacy()` or add new AI endpoint

## Testing

Test the backend independently:
```bash
cd backend
python test_backend.py
```

This creates a synthetic image with colored rectangles and verifies detection works.

## Production Deployment

For production use:
1. Deploy backend to cloud (AWS, GCP, Azure) with GPU instance
2. Update `API_URL` in `App.jsx` to production URL
3. Build frontend: `npm run build`
4. Serve static files from CDN or web server

## License

Use freely for personal and commercial projects. RT-DETR model subject to its own license (Apache 2.0).
