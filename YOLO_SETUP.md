# YOLO Model Setup Instructions

## The Issue
The YOLOv8n ONNX model needs to be downloaded manually because CDN links are unreliable.

## How to Get the Model

### Option 1: Download from HuggingFace (Recommended)
1. Go to: https://huggingface.co/ultralytics/yolov8/resolve/main/yolov8n.onnx
2. Download the file (should be ~6MB)
3. Rename it to `yolov8n.onnx`
4. Place it in: `C:\Users\Anthony.kimbugwe\Desktop\Parking System 2\public\models\yolov8n.onnx`

### Option 2: Convert from PyTorch
If you have Python installed:
```bash
pip install ultralytics
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt').export(format='onnx')"
```
Then copy the generated `yolov8n.onnx` to the public/models folder.

### Option 3: Use Alternative Detection (Current Fallback)
The app already has improved heuristic detection that works well:
- Detects colored cars by saturation
- Detects white/black cars by brightness difference
- Filters shadows using variance analysis
- All thresholds are adjustable via Debug Panel

## Current Status
- ✅ Heuristic detection: Working (detects all 3 cars in your test image)
- ⏳ YOLO AI detection: Waiting for model file
- The app will automatically use YOLO once the model file is in place

## After Placing the Model File
1. Restart the dev server (`npm run dev`)
2. Refresh the browser
3. Wait for "✅ YOLO model ready!" in console
4. Click "Detect Cars (YOLO AI)" button

The YOLO model will detect vehicles much more accurately than heuristics, especially for:
- Black cars in shadows
- White cars in bright light
- Various lighting conditions
- Different camera angles
