# ParkWatch Dashboard - User Guide

## Overview

ParkWatch is a comprehensive parking management dashboard that allows you to:
- Create and manage multiple parking areas
- Upload videos of parking lots
- Interactively mark parking spots on video frames
- Monitor real-time vehicle detection as video plays
- View live analytics and occupancy history

## Getting Started

### 1. Access the Dashboard
Open your browser to: **http://localhost:5173**

### 2. Create Your First Parking Area
1. Click **"Create Area"** in the top navigation
2. Enter parking area details:
   - **Name**: e.g., "Downtown Lot A" (required)
   - **Location**: e.g., "123 Main Street" (optional)
   - **Total Capacity**: Maximum number of spots (optional)
3. Click **"Create Area"**

### 3. Start Monitoring
1. From the dashboard, click **"Monitor"** on your parking area
2. Upload a video file of your parking lot
3. Click **"Mark Spots"** to enter marking mode
4. Click and drag on the video to draw rectangles around each parking spot
5. Click **"Stop Marking"** when done

### 4. Real-Time Analytics
Once spots are marked:
1. Click **"Play"** to start the video
2. AI detection runs automatically every 2 seconds
3. Watch the analytics update in real-time:
   - **Current Status**: Shows occupied/available counts
   - **Occupancy Rate**: Visual progress bar
   - **Analytics History**: Timestamped detection results

## Features

### Dashboard View
- **Overview Statistics**: Total areas, spots, and locations
- **Area Cards**: Quick access to each parking area
- **Create Button**: Add new parking areas

### Parking Area Management
- **Create**: Add new areas with name, location, capacity
- **Monitor**: Open video monitoring interface
- **Delete**: Remove areas and all associated data
- **Persistence**: All data saved to localStorage

### Video Monitoring Interface

#### Left Panel - Video & Controls
- **Video Upload**: Select video files (MP4, AVI, MOV, etc.)
- **Playback Controls**: Play/Pause with progress bar
- **Spot Marking**: Click and drag to draw parking spots
- **Spot List**: View all marked spots with status
- **Clear Spots**: Remove all markings and start over

#### Right Panel - Analytics
- **Current Status**:
  - Total spots count
  - Available spots (green)
  - Occupied spots (red)
  - Occupancy rate percentage
  - Visual occupancy bar

- **Analytics History**:
  - Timestamped entries every 2 seconds
  - Shows occupied/available counts
  - Occupancy rate at each timestamp
  - Last 100 entries stored

- **Detection Status**:
  - Active/Inactive indicator
  - Detection interval information

### Interactive Spot Marking
- **Start Marking**: Click "Mark Spots" button
- **Draw Rectangle**: Click and drag on video frame
- **Preview**: Yellow dashed rectangle while drawing
- **Finalize**: Release mouse to create spot
- **Numbering**: Spots auto-numbered sequentially
- **Color Coding**:
  - Green = Available
  - Red = Occupied

### Real-Time Vehicle Detection
- **Automatic**: Runs every 2 seconds while video plays
- **AI-Powered**: Uses RT-DETR model via FastAPI backend
- **Overlap Detection**: Matches vehicles to marked spots
- **Threshold**: 30% overlap required to mark as occupied
- **Live Updates**: Analytics update instantly

## Analytics Explained

### Current Status Metrics
- **Total Spots**: Number of marked parking spots
- **Available**: Spots without detected vehicles
- **Occupied**: Spots with detected vehicles
- **Occupancy Rate**: (Occupied / Total) × 100%

### Analytics History
Each entry records:
- **Timestamp**: Video time (MM:SS format)
- **Occupied Count**: Vehicles detected in spots
- **Available Count**: Empty spots
- **Occupancy Rate**: Percentage at that moment

### Use Cases
- **Peak Hours Analysis**: Identify busiest times
- **Turnover Rate**: Track how often spots change
- **Capacity Planning**: Determine if more spots needed
- **Revenue Optimization**: Adjust pricing based on demand

## Tips & Best Practices

### Video Recording
- Record from elevated position for best coverage
- Ensure good lighting conditions
- Keep camera stationary (no panning/zooming)
- Record during different times for comprehensive data
- Recommended resolution: 720p or higher

### Marking Spots
- Mark spots when they're clearly visible (empty preferred)
- Draw tight rectangles around each spot
- Include full parking space, not just vehicle
- Number spots logically (left to right, front to back)
- Review spot list to verify all are marked

### Detection Accuracy
- Ensure backend is running (port 8000)
- Good video quality improves detection
- Proper lighting reduces false positives
- Clear view of vehicles helps AI accuracy
- Adjust detection interval if needed (code modification)

### Data Management
- Regularly review and clean up old areas
- Export important analytics (future feature)
- Use descriptive names for easy identification
- Add locations for geographic organization
- Monitor storage usage (localStorage limit ~5MB)

## Troubleshooting

### Backend Not Connecting
- Verify FastAPI is running: `curl http://localhost:8000/health`
- Check console for CORS errors
- Ensure backend started successfully
- Restart backend if needed

### Video Not Playing
- Check file format (MP4 recommended)
- Verify browser supports codec
- Try different video file
- Check browser console for errors

### Spots Not Detecting Vehicles
- Ensure spots are properly marked
- Verify backend is running
- Check video quality and lighting
- Confirm vehicles are visible in frame
- Review overlap threshold (currently 30%)

### Analytics Not Updating
- Verify video is playing
- Check detection status shows "Active"
- Ensure spots are marked
- Monitor browser console for errors
- Verify backend endpoint accessibility

### Performance Issues
- Reduce video resolution if laggy
- Limit number of marked spots
- Close other browser tabs
- Check system resources
- Consider reducing detection frequency

## Keyboard Shortcuts (Future Enhancement)
- Space: Play/Pause video
- M: Toggle marking mode
- Delete: Remove last spot
- Esc: Exit marking mode

## Upcoming Features
- Export analytics to CSV/Excel
- Multiple camera support
- Alert notifications for full capacity
- Historical trend charts
- Mobile responsive design
- User authentication
- Cloud storage integration
- Real-time alerts via email/SMS

## Support

For issues or questions:
1. Check this guide
2. Review browser console (F12)
3. Verify backend health endpoint
4. Check system requirements
5. Review error messages

## System Requirements

### Frontend
- Modern browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- localStorage support
- Video codec support (H.264 recommended)

### Backend
- Python 3.8+
- FastAPI + Uvicorn
- RT-DETR model (~150MB)
- 4GB RAM minimum
- GPU optional (faster inference)

### Network
- localhost connectivity
- Port 5173 (frontend)
- Port 8000 (backend)
- CORS enabled

---

**Version**: 1.0.0
**Last Updated**: 2026-11-09
