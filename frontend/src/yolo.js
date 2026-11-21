import * as ort from 'onnxruntime-web'

// COCO class names (YOLOv8 is trained on COCO dataset)
const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
  'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop',
  'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
  'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
]

// Vehicle classes in COCO: car=2, motorcycle=3, bus=5, truck=7
const VEHICLE_CLASS_IDS = [2, 3, 5, 7]

let yoloSession = null
let modelLoading = false

/**
 * Load YOLOv8n model from CDN
 */
export async function loadYOLOModel() {
  if (yoloSession) return yoloSession
  if (modelLoading) {
    while (modelLoading) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return yoloSession
  }

  modelLoading = true
  try {
    console.log('Loading YOLO11n model...')
    
    // Configure ONNX Runtime to use WebGL backend (no WASM MIME issues)
    ort.env.wasm.wasmPaths = '/models/'
    
    // Try WebGL first, fall back to wasm
    const sessionOptions = {
      executionProviders: ['webgl', 'wasm'],
      graphOptimizationLevel: 'all'
    }
    
    const modelURL = '/models/yolov8n.onnx'
    
    console.log('Creating inference session with WebGL/WASM backends...')
    yoloSession = await ort.InferenceSession.create(modelURL, sessionOptions)
    
    console.log('✅ YOLO11n model loaded successfully!')
    return yoloSession
  } catch (error) {
    console.error('❌ Failed to load YOLO model:', error.message)
    console.log('YOLO AI detection unavailable. Using heuristic detection instead.')
    throw error
  } finally {
    modelLoading = false
  }
}

/**
 * Prepare image for YOLO inference
 * YOLOv8 expects: 640x640 RGB image, normalized to [0,1], shape [1, 3, 640, 640]
 */
function prepareImage(sourceElement) {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 640
  
  const ctx = canvas.getContext('2d')
  ctx.drawImage(sourceElement, 0, 0, 640, 640)
  
  const imageData = ctx.getImageData(0, 0, 640, 640)
  const data = imageData.data
  
  // Create float32 array in CHW format (Channel-Height-Width)
  const float32Data = new Float32Array(3 * 640 * 640)
  
  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4
    float32Data[pixelIndex] = data[i] / 255.0                    // R
    float32Data[pixelIndex + 640 * 640] = data[i + 1] / 255.0    // G
    float32Data[pixelIndex + 2 * 640 * 640] = data[i + 2] / 255.0 // B
  }
  
  return new ort.Tensor('float32', float32Data, [1, 3, 640, 640])
}

/**
 * Run YOLO inference and return vehicle detections
 */
export async function detectVehicles(sourceElement) {
  const session = await loadYOLOModel()
  
  // Prepare input
  const inputTensor = prepareImage(sourceElement)
  
  try {
    // Run inference
    const feeds = { images: inputTensor }
    const results = await session.run(feeds)
    
    console.log('YOLO output keys:', Object.keys(results))
    
    // Get the output tensor - try different possible output names
    let outputTensor = results.output0 || results.output || results[Object.keys(results)[0]]
    
    if (!outputTensor) {
      throw new Error('No valid output tensor found')
    }
    
    console.log('Output tensor dims:', outputTensor.dims)
    console.log('Output tensor data length:', outputTensor.data.length)
    
    const dataArray = outputTensor.data
    const dims = outputTensor.dims
    
    // YOLO output format: [batch, num_detections, 85] or [batch, 84, num_detections]
    // Try to detect the format
    let numPredictions, numFeatures, isTransposed
    
    if (dims.length === 3) {
      if (dims[1] > dims[2]) {
        // Format: [1, 84, 8400] - transposed
        numFeatures = dims[1]
        numPredictions = dims[2]
        isTransposed = true
      } else {
        // Format: [1, 8400, 84] - standard
        numPredictions = dims[1]
        numFeatures = dims[2]
        isTransposed = false
      }
    } else {
      throw new Error(`Unexpected output dimensions: ${dims}`)
    }
    
    console.log(`Parsing: ${numPredictions} predictions, ${numFeatures} features, transposed: ${isTransposed}`)
    
    const detections = []
    
    for (let i = 0; i < numPredictions; i++) {
      // Find class with highest score
      let maxClassId = 0
      let maxScore = 0
      
      // Classes start at index 4 (after bbox coordinates)
      for (let c = 0; c < 80; c++) {
        let score
        if (isTransposed) {
          // [1, 84, 8400] format
          score = dataArray[(4 + c) * numPredictions + i]
        } else {
          // [1, 8400, 84] format
          score = dataArray[i * numFeatures + 4 + c]
        }
        
        if (score > maxScore) {
          maxScore = score
          maxClassId = c
        }
      }
      
      // Filter by confidence and vehicle classes
      if (maxScore > 0.25 && VEHICLE_CLASS_IDS.includes(maxClassId)) {
        // Decode bounding box
        let cx, cy, w, h
        
        if (isTransposed) {
          cx = dataArray[0 * numPredictions + i]
          cy = dataArray[1 * numPredictions + i]
          w = dataArray[2 * numPredictions + i]
          h = dataArray[3 * numPredictions + i]
        } else {
          cx = dataArray[i * numFeatures + 0]
          cy = dataArray[i * numFeatures + 1]
          w = dataArray[i * numFeatures + 2]
          h = dataArray[i * numFeatures + 3]
        }
        
        // Convert center format to corner format
        const x1 = cx - w / 2
        const y1 = cy - h / 2
        const x2 = cx + w / 2
        const y2 = cy + h / 2
        
        detections.push({
          classId: maxClassId,
          className: COCO_CLASSES[maxClassId],
          confidence: maxScore,
          bbox: [x1, y1, x2, y2]
        })
      }
    }
    
    console.log(`Raw detections: ${detections.length}`)
    
    // Apply Non-Maximum Suppression
    const filtered = nms(detections, 0.45)
    console.log(`After NMS: ${filtered.length} vehicles`)
    
    return filtered
    
  } catch (error) {
    console.error('YOLO inference error:', error)
    throw error
  }
}

/**
 * Non-Maximum Suppression to remove duplicate detections
 */
function nms(detections, iouThreshold) {
  // Sort by confidence
  detections.sort((a, b) => b.confidence - a.confidence)
  
  const keep = []
  
  while (detections.length > 0) {
    const best = detections.shift()
    keep.push(best)
    
    // Remove detections with high IoU
    detections = detections.filter(det => {
      const iou = calculateIoU(best.bbox, det.bbox)
      return iou < iouThreshold
    })
  }
  
  return keep
}

/**
 * Calculate Intersection over Union
 */
function calculateIoU(box1, box2) {
  const [x1, y1, x2, y2] = box1
  const [x3, y3, x4, y4] = box2
  
  const intersectionX1 = Math.max(x1, x3)
  const intersectionY1 = Math.max(y1, y3)
  const intersectionX2 = Math.min(x2, x4)
  const intersectionY2 = Math.min(y2, y4)
  
  const intersectionArea = Math.max(0, intersectionX2 - intersectionX1) * 
                           Math.max(0, intersectionY2 - intersectionY1)
  
  const box1Area = (x2 - x1) * (y2 - y1)
  const box2Area = (x4 - x3) * (y4 - y3)
  
  const unionArea = box1Area + box2Area - intersectionArea
  
  return unionArea > 0 ? intersectionArea / unionArea : 0
}

/**
 * Check if a point is inside a rectangle
 */
export function isPointInRect(point, rect) {
  const [x1, y1, x2, y2] = rect
  return point.x >= x1 && point.x <= x2 && point.y >= y1 && point.y <= y2
}
