# Quick Start Guide

## 🚀 Running the System

### Frontend Only (Heuristic Detection)
```bash
npm run dev
```
Opens at http://localhost:5173

### Full Stack (AI + Heuristic)

**Terminal 1 - Backend:**
```bash
npm run backend
```
Starts Flask server on http://localhost:5000

**Terminal 2 - Frontend:**
```bash
npm run dev
```
Opens at http://localhost:5173

**Or run both at once:**
```bash
npm run start:all
```

## 📊 Detection Modes

### AI Detection (RT-DETR)
- **Button**: "🤖 AI Detect Cars"
- **Accuracy**: State-of-the-art
- **Speed**: 0.5-2 seconds
- **Requires**: Backend running
- **Best for**: Production use, challenging lighting

### Heuristic Detection
- **Button**: "Heuristic Detect Cars"
- **Accuracy**: Good for standard scenarios
- **Speed**: Instant (<0.1s)
- **Requires**: Nothing extra
- **Best for**: Quick testing, offline use

## 🔧 Adjusting Detection

If heuristic detection misses vehicles:

1. Click "Show Debug Panel"
2. Adjust thresholds:
   - **Min Brightness**: Lower to detect darker cars
   - **Max Brightness**: Raise to detect lighter cars
   - **Min Saturation**: Increase for colored vehicles
   - **Shadow Max Brightness**: Lower to filter more shadows

3. Check browser console (F12) for detailed spot analysis

## 💾 Saving Configurations

1. Mark parking spots manually or use "Auto-Detect All"
2. Enter configuration name in text field
3. Click "Save Current Spots"
4. Configuration auto-loads on similar images

## 📁 File Locations

- **Backend code**: `backend/app.py`
- **Frontend code**: `src/App.jsx`
- **Setup guide**: `SETUP.md`
- **API docs**: `backend/README.md`

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't start | Run `cd backend && pip install -r requirements.txt` |
| No "AI Detect" button | Backend not running, start with `npm run backend` |
| Dark cars not detected | Lower Min Brightness threshold in Debug Panel |
| Shadows detected as cars | Lower Shadow Max Brightness threshold |
| Model download slow | First run downloads ~150MB, be patient |

## 📞 Need Help?

Check these files:
- `SETUP.md` - Complete setup instructions
- `backend/README.md` - API documentation
- Browser console (F12) - Debug logs from detection
