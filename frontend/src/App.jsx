import React, { useState, useRef, useEffect } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
} from 'react-router-dom'
import LandingPage from './components/LandingPage'
import LoginPage from './components/LoginPage'
import LoginModal from './components/LoginModal'
import MonitorWorkspace from './components/MonitorWorkspace'
import { Dashboard, RegisterAreaModal } from './components/OperatorPages'
import EditAreaModal from './components/EditAreaModal'
import { Header, Footer } from './components/Shell'
import Sidebar from './components/Sidebar'
import DashboardHeader from './components/DashboardHeader'
import UpdateProfileModal from './components/UpdateProfileModal'
import UserManagement from './components/UserManagement'
import MotoristDashboard from './components/MotoristDashboard'
import AreaDetailsPage from './components/AreaDetailsPage'
import ProfilePage from './components/ProfilePage'
import FacilityFormPage from './components/FacilityFormPage'
import PayParkingPage from './components/PayParkingPage'
import PaymentsHistoryPage from './components/PaymentsHistoryPage'
import PaymentDetailsPage from './components/PaymentDetailsPage'
import WardenVerifyPage from './components/WardenVerifyPage'
import AttendantManagementPage from './components/AttendantManagementPage'
import {
  saveFacilityVideo,
  getFacilityVideo,
  updateFacilityPlayback,
  deleteFacilityVideo,
  savePlaybackState,
} from './utils/videoStorage'

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8001'
    : 'https://kcca-parkwatch.onrender.com')
const ANALYTICS_KEEP = 200
const SNAPSHOT_INTERVAL_S = 15

export default function App() {
  return (
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  )
}

function MainApp() {
  const navigate = useNavigate()
  const location = useLocation()

  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('kcca_theme') || 'light'
  })

  useEffect(() => {
    localStorage.setItem('kcca_theme', theme)
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))

  // Parking Areas state
  const [parkingAreas, setParkingAreas] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('parkingAreas')) || []
    } catch {
      return []
    }
  })
  const [selectedArea, setSelectedArea] = useState(null)

  // Auth state
  const [auth, setAuth] = useState(() => {
    const savedRole = localStorage.getItem('parkwatch_role') || 'operator'
    let savedRoles = [savedRole]
    try {
      const raw = JSON.parse(localStorage.getItem('parkwatch_roles') || 'null')
      if (Array.isArray(raw) && raw.length > 0) savedRoles = raw
    } catch {}
    return {
      token: localStorage.getItem('parkwatch_token'),
      username: localStorage.getItem('parkwatch_user'),
      role: savedRole,
      roles: savedRoles,
      displayName: localStorage.getItem('parkwatch_display_name'),
    }
  })

  const handleSwitchRole = (nextRole) => {
    setAuth((prev) => {
      if (!prev.roles?.includes(nextRole)) return prev
      localStorage.setItem('parkwatch_role', nextRole)
      return { ...prev, role: nextRole }
    })
    navigate('/dashboard')
  }
  const [authChecking, setAuthChecking] = useState(true)
  const [loginForm, setLoginForm] = useState(() => ({
    email: localStorage.getItem('parkwatch_last_identifier') || '',
    username: localStorage.getItem('parkwatch_last_identifier') || '',
    password: '',
  }))
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Modal State
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [areaToEdit, setAreaToEdit] = useState(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [loginModalConfig, setLoginModalConfig] = useState({ isOpen: false, initialMode: 'signin' })

  const handleOpenLoginModal = (opts = {}) => {
    setLoginError('')
    setLoginModalConfig({
      isOpen: true,
      initialMode: opts.initialMode || 'signin',
    })
  }

  // Public availability feed
  const [availability, setAvailability] = useState({})

  // Backend ML Engine Health State
  const [backendHealth, setBackendHealth] = useState({ engine: 'onnx', model: 'YOLOv8n ONNX' })

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data) {
          setBackendHealth({
            detection_engine: data.detection_engine || 'none',
            engine: data.detection_engine || 'none',
            model: data.model || 'Unknown',
          })
        }
      })
      .catch(() => setBackendHealth({ detection_engine: 'none', engine: 'none', model: 'Offline' }))
  }, [])

  // Form State
  const [newArea, setNewArea] = useState({
    name: '',
    location: '',
    capacity: '',
    hourlyRate: 'UGX 2,000 / hr',
    imageUrl: '',
  })

  // Load parking facilities from backend (scoped by auth token/role)
  useEffect(() => {
    async function loadBackendAreas() {
      try {
        const headers = auth?.token
          ? { Authorization: `Bearer ${auth.token}`, 'X-Active-Role': auth.role || 'motorist' }
          : {}
        const res = await fetch(`${API_URL}/areas`, { headers })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            setParkingAreas(data)
            return
          }
        }
      } catch (e) {
        console.warn('Backend /areas unavailable, relying on localStorage:', e)
      }
    }
    loadBackendAreas()

    // Poll public facility availability every 5s on Landing Page & Area Details so live background feeds reflect immediately
    const isPublicFeedView =
      location.pathname === '/' || location.pathname.startsWith('/areas/')
    if (!isPublicFeedView) return
    const timer = setInterval(loadBackendAreas, 5000)
    return () => clearInterval(timer)
  }, [auth?.token, auth?.role, location.pathname])

  // Monitor State & Refs
  const [videoStream, setVideoStream] = useState(null)
  const [videoMeta, setVideoMeta] = useState(null)
  const [videoUploadStatus, setVideoUploadStatus] = useState({ busy: false, error: '', message: '' })
  const videoStreamRef = useRef(null)
  const selectedAreaRef = useRef(null)
  const loadedAreaIdRef = useRef(null)
  const lastSavedTimeRef = useRef(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [parkingSpots, setParkingSpots] = useState([])
  const [isMarkingMode, setIsMarkingMode] = useState(false)
  const drawingRef = useRef({ active: false, start: null, end: null })
  const parkingSpotsRef = useRef([])
  const occupiedSpotsRef = useRef(new Set())
  const [occupiedSpots, setOccupiedSpots] = useState(new Set())
  const [analyticsHistory, setAnalyticsHistory] = useState([])
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [detectIntervalMs, setDetectIntervalMs] = useState(1500)
  const lastSnapshotRef = useRef(-Infinity)
  const lastTelemetrySyncRef = useRef(0)

  const canvasRef = useRef(null)
  const videoRef = useRef(null)
  const fileInputRef = useRef(null)

  // Restore existing session
  useEffect(() => {
    const token = localStorage.getItem('parkwatch_token')

    if (!token) {
      setAuthChecking(false)
      return
    }

    fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (res.status === 401 || res.status === 403) {
          // Token is truly expired or invalid
          localStorage.removeItem('parkwatch_token')
          localStorage.removeItem('parkwatch_user')
          localStorage.removeItem('parkwatch_role')
          localStorage.removeItem('parkwatch_display_name')
          setAuth({ token: null, username: null, role: 'operator', displayName: null })
          return null
        }
        return res.ok ? res.json() : null
      })
      .then(data => {
        if (data?.username) {
          const roles = Array.isArray(data.roles) && data.roles.length > 0 ? data.roles : [data.role || 'operator']
          const savedRole = localStorage.getItem('parkwatch_role')
          const role = savedRole && roles.includes(savedRole) ? savedRole : (data.role || roles[0])
          const displayName = data.display_name || data.username
          localStorage.setItem('parkwatch_role', role)
          localStorage.setItem('parkwatch_roles', JSON.stringify(roles))
          localStorage.setItem('parkwatch_display_name', displayName)
          setAuth({
            token,
            username: data.username,
            role,
            roles,
            displayName,
            assignedAreaId: data.assigned_area_id || null,
            assignedAreaName: data.assigned_area_name || null,
          })
        }
      })
      .catch((err) => {
        console.warn('Backend /auth/me check temporarily unreachable, preserving cached session:', err)
      })
      .finally(() => setAuthChecking(false))
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    setLoggingIn(true)

    const identifier = (loginForm.email || loginForm.username || '').trim()

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: identifier,
          username: identifier,
          password: loginForm.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map((d) => (typeof d === 'string' ? d : d.msg)).filter(Boolean).join('; ')
          : data.detail
        setLoginError(detail || 'Login failed')
        return
      }

      const roles = Array.isArray(data.roles) && data.roles.length > 0 ? data.roles : [data.role || 'operator']
      const role = data.role || roles[0]
      const displayName = data.display_name || data.username
      localStorage.setItem('parkwatch_token', data.token)
      localStorage.setItem('parkwatch_user', data.username)
      localStorage.setItem('parkwatch_role', role)
      localStorage.setItem('parkwatch_roles', JSON.stringify(roles))
      localStorage.setItem('parkwatch_display_name', displayName)
      localStorage.setItem('parkwatch_last_identifier', identifier)
      setAuth({
        token: data.token,
        username: data.username,
        role,
        roles,
        displayName,
        assignedAreaId: data.assigned_area_id || null,
        assignedAreaName: data.assigned_area_name || null,
      })
      setLoginForm({ email: identifier, username: identifier, password: '' })
      const targetRedirect = loginModalConfig.redirectTo
      setLoginModalConfig({ isOpen: false, initialMode: 'signin' })
      if (targetRedirect) {
        navigate(targetRedirect)
      } else if (role === 'motorist') {
        navigate('/')
        setTimeout(() => {
          document.getElementById('parking-spots')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 120)
      } else {
        navigate('/dashboard')
      }
    } catch {
      setLoginError('Cannot reach the server. Is the backend running?')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleSignup = async (signupData) => {
    setLoggingIn(true)
    setLoginError('')
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: signupData.username,
          password: signupData.password,
          display_name: signupData.displayName,
          email: signupData.email,
          phone: signupData.phone,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map((d) => (typeof d === 'string' ? d : d.msg)).filter(Boolean).join('; ')
          : data.detail
        throw new Error(detail || 'Signup failed')
      }

      const role = data.role || 'motorist'
      const displayName = data.display_name || data.username
      localStorage.setItem('parkwatch_token', data.token)
      localStorage.setItem('parkwatch_user', data.username)
      localStorage.setItem('parkwatch_role', role)
      localStorage.setItem('parkwatch_display_name', displayName)
      localStorage.setItem('parkwatch_last_identifier', signupData.email || signupData.username)
      setAuth({
        token: data.token,
        username: data.username,
        role,
        displayName,
        assignedAreaId: data.assigned_area_id || null,
        assignedAreaName: data.assigned_area_name || null,
      })
      const targetRedirect = loginModalConfig.redirectTo
      setLoginModalConfig({ isOpen: false, initialMode: 'signin' })
      if (targetRedirect) {
        navigate(targetRedirect)
      } else if (role === 'motorist') {
        navigate('/')
        setTimeout(() => {
          document.getElementById('parking-spots')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 120)
      } else {
        navigate('/dashboard')
      }
    } finally {
      setLoggingIn(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('parkwatch_token')
    localStorage.removeItem('parkwatch_user')
    localStorage.removeItem('parkwatch_role')
    localStorage.removeItem('parkwatch_display_name')
    setAuth({ token: null, username: null, role: null, displayName: null })
    setLoginModalConfig({ isOpen: false, initialMode: 'signin' })
    navigate('/', { replace: true })
  }

  // Derive per-area public availability
  useEffect(() => {
    const summary = {}
    parkingAreas.forEach((area) => {
      const total = (area.spots || []).length || area.totalCapacity || 0
      const history = area.analytics || []
      const latest = history[history.length - 1]
      summary[area.id] = {
        id: area.id,
        area,
        total,
        free: latest ? latest.available : total,
        occupied: latest ? latest.occupied : 0,
        updatedAt: latest ? latest.recordedAt : null,
        hasLive: history.length > 0,
      }
    })
    setAvailability(summary)
  }, [parkingAreas])

  // Save parking areas to localStorage
  useEffect(() => {
    localStorage.setItem('parkingAreas', JSON.stringify(parkingAreas))
  }, [parkingAreas])

  // Canvas render engine: draws video frame + parking bay overlays + live drag marking
  const renderCanvas = () => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Sync canvas intrinsic dimensions to video dimensions
    if (video && video.videoWidth && video.videoHeight) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }
    }

    const cw = canvas.width || 1280
    const ch = canvas.height || 720

    // 1. Draw video frame ONLY if current frame is available AND belongs to the active facility
    const isCurrentVideoValid =
      Boolean(videoStream) &&
      Boolean(videoMeta) &&
      String(videoMeta.areaId) === String(selectedArea?.id)

    if (isCurrentVideoValid && video && video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, cw, ch)
    } else {
      ctx.fillStyle = '#090d16'
      ctx.fillRect(0, 0, cw, ch)
    }

    // 2. Draw all parking spots with status
    const spots = parkingSpotsRef.current || []
    const occupied = occupiedSpotsRef.current || new Set()

    spots.forEach((spot, index) => {
      const isOccupied = occupied.has(index)
      const x1 = Math.min(spot.x1, spot.x2)
      const y1 = Math.min(spot.y1, spot.y2)
      const w = Math.abs(spot.x2 - spot.x1)
      const h = Math.abs(spot.y2 - spot.y1)

      // Translucent box fill
      ctx.fillStyle = isOccupied ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'
      ctx.fillRect(x1, y1, w, h)

      // Solid border outline
      ctx.strokeStyle = isOccupied ? '#ef4444' : '#10b981'
      ctx.lineWidth = 2.5
      ctx.strokeRect(x1, y1, w, h)

      // Corner accent brackets (high-tech municipal surveillance look)
      const cLen = Math.min(12, w / 4, h / 4)
      ctx.strokeStyle = isOccupied ? '#b91c1c' : '#047857'
      ctx.lineWidth = 3.5
      // Top-left
      ctx.beginPath(); ctx.moveTo(x1, y1 + cLen); ctx.lineTo(x1, y1); ctx.lineTo(x1 + cLen, y1); ctx.stroke()
      // Top-right
      ctx.beginPath(); ctx.moveTo(x1 + w - cLen, y1); ctx.lineTo(x1 + w, y1); ctx.lineTo(x1 + w, y1 + cLen); ctx.stroke()
      // Bottom-left
      ctx.beginPath(); ctx.moveTo(x1, y1 + h - cLen); ctx.lineTo(x1, y1 + h); ctx.lineTo(x1 + cLen, y1 + h); ctx.stroke()
      // Bottom-right
      ctx.beginPath(); ctx.moveTo(x1 + w - cLen, y1 + h); ctx.lineTo(x1 + w, y1 + h); ctx.lineTo(x1 + w, y1 + h - cLen); ctx.stroke()

      // Header Tag: "BAY X • OCCUPIED" or "BAY X • FREE"
      const label = `BAY ${index + 1} • ${isOccupied ? 'OCCUPIED' : 'FREE'}`
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif'
      const metrics = ctx.measureText(label)
      const tagW = metrics.width + 12
      const tagH = 18
      const tagX = x1
      const tagY = y1 >= tagH + 2 ? y1 - tagH - 2 : y1 + 2

      ctx.fillStyle = isOccupied ? 'rgba(220, 38, 38, 0.95)' : 'rgba(5, 150, 105, 0.95)'
      if (ctx.roundRect) {
        ctx.beginPath()
        ctx.roundRect(tagX, tagY, tagW, tagH, 4)
        ctx.fill()
      } else {
        ctx.fillRect(tagX, tagY, tagW, tagH)
      }

      ctx.fillStyle = '#ffffff'
      ctx.fillText(label, tagX + 6, tagY + 13)
    })

    // 3. Draw active drag-selection rectangle if marking a spot
    if (drawingRef.current?.active && drawingRef.current.start && drawingRef.current.end) {
      const { start, end } = drawingRef.current
      const rx1 = Math.min(start.x, end.x)
      const ry1 = Math.min(start.y, end.y)
      const rw = Math.abs(end.x - start.x)
      const rh = Math.abs(end.y - start.y)

      ctx.fillStyle = 'rgba(245, 158, 11, 0.28)'
      ctx.fillRect(rx1, ry1, rw, rh)

      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = 2.5
      ctx.setLineDash([6, 4])
      ctx.strokeRect(rx1, ry1, rw, rh)
      ctx.setLineDash([])

      const dragLabel = `NEW BAY (${Math.round(rw)}×${Math.round(rh)})`
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif'
      const dMetrics = ctx.measureText(dragLabel)
      const dTagW = dMetrics.width + 12
      const dTagH = 18
      const dTagX = rx1
      const dTagY = ry1 >= dTagH + 2 ? ry1 - dTagH - 2 : ry1 + 2

      ctx.fillStyle = 'rgba(245, 158, 11, 0.95)'
      if (ctx.roundRect) {
        ctx.beginPath()
        ctx.roundRect(dTagX, dTagY, dTagW, dTagH, 4)
        ctx.fill()
      } else {
        ctx.fillRect(dTagX, dTagY, dTagW, dTagH)
      }

      ctx.fillStyle = '#000000'
      ctx.fillText(dragLabel, dTagX + 6, dTagY + 13)
    }
  }

  // Continuous Canvas render loop with requestAnimationFrame
  useEffect(() => {
    let animId = null

    if (isPlaying) {
      const loop = () => {
        renderCanvas()
        animId = requestAnimationFrame(loop)
      }
      animId = requestAnimationFrame(loop)
    } else {
      renderCanvas()
    }

    return () => {
      if (animId) cancelAnimationFrame(animId)
    }
  }, [isPlaying, videoStream, parkingSpots, occupiedSpots])

  // Canvas listeners for video events (loaded data, seek, canplay, ended)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedData = () => {
      renderCanvas()
      detectVehiclesInCurrentFrame(true)
    }
    const handleCanPlay = () => {
      renderCanvas()
      detectVehiclesInCurrentFrame(true)
    }
    const handleSeeked = () => {
      setCurrentTime(video.currentTime)
      renderCanvas()
      detectVehiclesInCurrentFrame(true)
    }
    const handleEnded = () => {
      setIsPlaying(false)
      renderCanvas()
    }

    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('canplaythrough', handleCanPlay)
    video.addEventListener('seeked', handleSeeked)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('canplaythrough', handleCanPlay)
      video.removeEventListener('seeked', handleSeeked)
      video.removeEventListener('ended', handleEnded)
    }
  }, [videoStream])

  // Video time update handler with throttled storage persistence
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      const cur = video.currentTime
      setCurrentTime(cur)
      setVideoDuration(video.duration || 0)

      const targetArea = selectedAreaRef.current
      if (targetArea) {
        const now = Date.now()
        if (now - lastSavedTimeRef.current > 1500) {
          lastSavedTimeRef.current = now
          updateFacilityPlayback(targetArea.id, {
            currentTime: cur,
            isPlaying: !video.paused,
          })
        }
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    return () => video.removeEventListener('timeupdate', handleTimeUpdate)
  }, [videoStream])

  // Synchronous flush of playback state on page refresh or browser close
  useEffect(() => {
    const handleBeforeUnload = () => {
      const targetArea = selectedAreaRef.current
      if (videoRef.current && targetArea?.id) {
        const cur = videoRef.current.currentTime
        const playing = !videoRef.current.paused
        savePlaybackState(targetArea.id, { currentTime: cur, isPlaying: playing })
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // Sequential AI detection loop
  useEffect(() => {
    if (!isPlaying || !videoRef.current || parkingSpots.length === 0) return

    let cancelled = false

    const loop = async () => {
      while (!cancelled) {
        await detectVehiclesInCurrentFrame()
        if (cancelled) break
        await new Promise(resolve => setTimeout(resolve, detectIntervalMs))
      }
    }

    loop()

    return () => {
      cancelled = true
    }
  }, [isPlaying, parkingSpots.length, detectIntervalMs])

  const handleCreateArea = async (overrideData = null) => {
    const src = overrideData || newArea
    const name = (src.name || '').trim()
    if (name.length < 3) return

    let formattedRate = (src.hourlyRate || '').trim()
    if (!formattedRate) {
      formattedRate = 'UGX 2,000 / hr'
    } else if (/^\d+$/.test(formattedRate)) {
      formattedRate = `UGX ${parseInt(formattedRate, 10).toLocaleString()} / hr`
    } else if (!formattedRate.toUpperCase().startsWith('UGX')) {
      formattedRate = `UGX ${formattedRate}`
    }

    const created = {
      id: Date.now(),
      name,
      location: (src.location || '').trim(),
      totalCapacity: parseInt(src.capacity) || 0,
      hourlyRate: formattedRate,
      imageUrl: src.imageUrl || '',
      createdAt: new Date().toISOString(),
      spots: [],
      spotDimensions: null,
      analytics: [],
    }

    setParkingAreas(prev => [...prev, created])
    setNewArea({ name: '', location: '', capacity: '', hourlyRate: 'UGX 2,000 / hr', imageUrl: '' })
    setRegisterModalOpen(false)

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (auth?.token) headers.Authorization = `Bearer ${auth.token}`
      await fetch(`${API_URL}/areas`, {
        method: 'POST',
        headers,
        body: JSON.stringify(created),
      })
    } catch (e) {
      console.warn('Failed to save area to backend:', e)
    }
  }

  const handleUpdateArea = async (areaId, updatedFields) => {
    setParkingAreas(prev =>
      prev.map(a => (String(a.id) === String(areaId) ? { ...a, ...updatedFields } : a))
    )
    if (selectedArea && String(selectedArea.id) === String(areaId)) {
      setSelectedArea(prev => ({ ...prev, ...updatedFields }))
    }

    try {
      await fetch(`${API_URL}/areas/${areaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      })
    } catch (e) {
      console.warn('Failed to update area in backend:', e)
    }
  }

  const handleClearAreaSpots = async (areaId) => {
    setParkingAreas(prev =>
      prev.map(a =>
        String(a.id) === String(areaId) ? { ...a, spots: [], spotDimensions: null } : a
      )
    )
    if (selectedArea && String(selectedArea.id) === String(areaId)) {
      setParkingSpots([])
      parkingSpotsRef.current = []
      setOccupiedSpots(new Set())
      occupiedSpotsRef.current = new Set()
      setSelectedArea(prev => ({ ...prev, spots: [], spotDimensions: null }))
      renderCanvas()
    }

    try {
      await fetch(`${API_URL}/areas/${areaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spots: [], spotDimensions: null }),
      })
    } catch (e) {
      console.warn('Failed to clear spots in backend:', e)
    }
  }

  const scaleSpots = (spots, oldDims, newDims) => {
    if (!oldDims || !newDims) return spots
    if (oldDims.width === newDims.width && oldDims.height === newDims.height) return spots

    const scaleX = newDims.width / oldDims.width
    const scaleY = newDims.height / oldDims.height

    return spots.map(spot => ({
      ...spot,
      x1: spot.x1 * scaleX,
      y1: spot.y1 * scaleY,
      x2: spot.x2 * scaleX,
      y2: spot.y2 * scaleY,
    }))
  }

  const persistSpots = async (spotsToSave, dims) => {
    if (!selectedArea) return

    const updatedArea = {
      ...selectedArea,
      spots: spotsToSave,
      spotDimensions: dims || selectedArea.spotDimensions,
    }

    setSelectedArea(updatedArea)
    setParkingAreas(prev =>
      prev.map(area => (area.id === selectedArea.id ? updatedArea : area))
    )

    try {
      await fetch(`${API_URL}/areas/${selectedArea.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedArea),
      })
    } catch (e) {
      console.warn('Failed to update area on backend:', e)
    }
  }

  const loadVideoForArea = async (area) => {
    if (!area) return
    const targetAreaId = String(area.id)

    // Flush/save previous area's playback state before switching
    if (selectedAreaRef.current && String(selectedAreaRef.current.id) !== targetAreaId && videoRef.current) {
      const cur = videoRef.current.currentTime
      const playing = !videoRef.current.paused
      updateFacilityPlayback(selectedAreaRef.current.id, { currentTime: cur, isPlaying: playing })
    }

    // Immediately and synchronously unbind previous video so no frame or stream leaks across areas
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.removeAttribute('src')
      videoRef.current.load()
    }
    if (videoStreamRef.current) {
      URL.revokeObjectURL(videoStreamRef.current)
      videoStreamRef.current = null
    }
    setVideoStream(null)
    setVideoMeta(null)
    setIsPlaying(false)
    setCurrentTime(0)
    setVideoDuration(0)
    renderCanvas()

    try {
      const record = await getFacilityVideo(targetAreaId)
      // Guard: If the operator navigated to another facility while waiting for IndexedDB, abort
      if (selectedAreaRef.current && String(selectedAreaRef.current.id) !== targetAreaId) {
        return
      }

      if (record && record.blob) {
        const url = URL.createObjectURL(record.blob)
        videoStreamRef.current = url
        setVideoStream(url)
        setVideoMeta({
          areaId: targetAreaId,
          fileName: record.fileName || 'footage.mp4',
          fileSize: record.fileSize || 0,
          savedAt: record.savedAt,
          isRestored: true,
        })

        if (videoRef.current) {
          videoRef.current.src = url
          videoRef.current.preload = 'auto'
          videoRef.current.muted = true
          videoRef.current.load()

          videoRef.current.onloadedmetadata = () => {
            // Guard: ensure area hasn't changed during metadata decode
            if (selectedAreaRef.current && String(selectedAreaRef.current.id) !== targetAreaId) {
              return
            }
            const dur = videoRef.current.duration || 0
            setVideoDuration(dur)
            if (canvasRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth || 1280
              canvasRef.current.height = videoRef.current.videoHeight || 720
            }

            if (area.spotDimensions && parkingSpotsRef.current.length > 0) {
              const newDims = {
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight,
              }
              const rescaled = scaleSpots(parkingSpotsRef.current, area.spotDimensions, newDims)
              setParkingSpots(rescaled)
              parkingSpotsRef.current = rescaled
              persistSpots(rescaled, newDims)
            }

            const targetTime = Math.min(Math.max(record.currentTime || 0, 0.001), dur > 0 ? dur : 0.001)
            try {
              videoRef.current.currentTime = targetTime
            } catch {
              renderCanvas()
            }
            setCurrentTime(targetTime)

            if (record.isPlaying) {
              videoRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(err => {
                  console.warn('Autoplay resume prevented by browser, keeping paused at frame:', err)
                  setIsPlaying(false)
                })
            } else {
              setIsPlaying(false)
            }

            setTimeout(() => {
              renderCanvas()
              detectVehiclesInCurrentFrame(true)
            }, 80)
          }

          videoRef.current.onloadeddata = () => renderCanvas()
          videoRef.current.onseeked = () => {
            renderCanvas()
            detectVehiclesInCurrentFrame(true)
          }
        }
        return
      }
    } catch (e) {
      console.warn('Could not restore video from IndexedDB for area:', targetAreaId, e)
    }

    // Fallback: Check if facility has a shared remote/public videoUrl
    const rawRemoteUrl = (area.videoUrl || '').trim()
    const remoteUrl = rawRemoteUrl.startsWith('/') ? `${API_URL}${rawRemoteUrl}` : rawRemoteUrl
    if (remoteUrl) {
      setVideoStream(remoteUrl)
      setVideoMeta({
        areaId: targetAreaId,
        fileName: remoteUrl.split('/').pop()?.split('?')[0] || 'shared-video.mp4',
        fileSize: 0,
        isRestored: true,
        isRemoteUrl: true,
      })

      if (videoRef.current) {
        videoRef.current.crossOrigin = 'anonymous'
        videoRef.current.src = remoteUrl
        videoRef.current.preload = 'auto'
        videoRef.current.muted = true
        videoRef.current.load()

        videoRef.current.onloadedmetadata = () => {
          if (selectedAreaRef.current && String(selectedAreaRef.current.id) !== targetAreaId) {
            return
          }
          const dur = videoRef.current.duration || 0
          setVideoDuration(dur)
          if (canvasRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth || 1280
            canvasRef.current.height = videoRef.current.videoHeight || 720
          }
          if (area.spotDimensions && parkingSpotsRef.current.length > 0) {
            const newDims = {
              width: videoRef.current.videoWidth,
              height: videoRef.current.videoHeight,
            }
            const rescaled = scaleSpots(parkingSpotsRef.current, area.spotDimensions, newDims)
            setParkingSpots(rescaled)
            parkingSpotsRef.current = rescaled
            persistSpots(rescaled, newDims)
          }
          setCurrentTime(0)
          setIsPlaying(false)
          setTimeout(() => {
            renderCanvas()
            detectVehiclesInCurrentFrame(true)
          }, 80)
        }
        videoRef.current.onloadeddata = () => renderCanvas()
        videoRef.current.onseeked = () => {
          renderCanvas()
          detectVehiclesInCurrentFrame(true)
        }
      }
      return
    }

    // Fallback: No video saved for this facility
    if (videoStreamRef.current) {
      URL.revokeObjectURL(videoStreamRef.current)
      videoStreamRef.current = null
    }
    setVideoStream(null)
    setVideoMeta(null)
    setIsPlaying(false)
    setCurrentTime(0)
    setVideoDuration(0)
    renderCanvas()
  }

  const handleSelectArea = (area, shouldNavigate = true) => {
    if (!area) return
    setSelectedArea(area)
    selectedAreaRef.current = area

    setOccupiedSpots(new Set())
    occupiedSpotsRef.current = new Set()
    lastSnapshotRef.current = -Infinity
    setAnalyticsHistory(area.analytics || [])

    let spotsToLoad = area.spots || []
    if (videoRef.current && area.spotDimensions && spotsToLoad.length > 0) {
      const currentDims = {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      }
      if (currentDims.width && currentDims.height) {
        spotsToLoad = scaleSpots(spotsToLoad, area.spotDimensions, currentDims)
      }
    }

    setParkingSpots(spotsToLoad)
    parkingSpotsRef.current = spotsToLoad

    // Load persisted video footage for this area
    loadVideoForArea(area)

    if (shouldNavigate) {
      navigate(`/dashboard/monitor/${area.id}`)
    }
  }

  // Ensure persistent video is loaded whenever selectedArea changes or restores
  useEffect(() => {
    selectedAreaRef.current = selectedArea
    if (selectedArea && loadedAreaIdRef.current !== selectedArea.id) {
      loadedAreaIdRef.current = selectedArea.id
      loadVideoForArea(selectedArea)
    }
  }, [selectedArea])

  const handleDeleteArea = async (id) => {
    if (window.confirm('Delete this parking facility from KCCA monitoring network?')) {
      deleteFacilityVideo(id)
      setParkingAreas(prev => prev.filter(area => area.id !== id))
      if (selectedArea?.id === id) {
        setSelectedArea(null)
        selectedAreaRef.current = null
        if (videoStreamRef.current) {
          URL.revokeObjectURL(videoStreamRef.current)
          videoStreamRef.current = null
        }
        setVideoStream(null)
        setVideoMeta(null)
        setParkingSpots([])
        navigate('/dashboard')
      }

      try {
        await fetch(`${API_URL}/areas/${id}`, { method: 'DELETE' })
      } catch (e) {
        console.warn('Failed to delete area on backend:', e)
      }
    }
  }

  const handleSaveVideoUrl = async (rawUrl) => {
    const target = selectedAreaRef.current || selectedArea
    if (!target) return
    const cleanUrl = (rawUrl || '').trim()
    if (!cleanUrl) return

    const updatedArea = { ...target, videoUrl: cleanUrl }
    selectedAreaRef.current = updatedArea
    setSelectedArea(updatedArea)
    setParkingAreas((prev) => prev.map((a) => (a.id === target.id ? updatedArea : a)))

    try {
      await fetch(`${API_URL}/areas/${target.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: cleanUrl }),
      })
    } catch (e) {
      console.warn('Failed to save shared videoUrl to backend:', e)
    }

    await deleteFacilityVideo(target.id).catch(() => {})
    loadVideoForArea(updatedArea)
  }

  const handleClearVideo = async () => {
    const target = selectedAreaRef.current || selectedArea
    if (!target) return
    if (window.confirm(`Remove saved video footage for ${target.name}?`)) {
      await deleteFacilityVideo(target.id)
      if (target.videoUrl) {
        const updatedArea = { ...target, videoUrl: '' }
        selectedAreaRef.current = updatedArea
        setSelectedArea(updatedArea)
        setParkingAreas((prev) => prev.map((a) => (a.id === target.id ? updatedArea : a)))
        fetch(`${API_URL}/areas/${target.id}/video`, { method: 'DELETE' }).catch(() => {})
      }
      if (videoStreamRef.current) {
        URL.revokeObjectURL(videoStreamRef.current)
        videoStreamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.src = ''
      }
      setVideoStream(null)
      setVideoMeta(null)
      setIsPlaying(false)
      setCurrentTime(0)
      setVideoDuration(0)
      renderCanvas()
    }
  }

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const targetArea = selectedAreaRef.current || selectedArea
    if (!targetArea) return
    const targetAreaId = String(targetArea.id)

    await saveFacilityVideo(targetAreaId, file, {
      areaId: targetAreaId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      currentTime: 0,
      isPlaying: false,
    })

    if (videoStreamRef.current) {
      URL.revokeObjectURL(videoStreamRef.current)
    }

    const url = URL.createObjectURL(file)
    videoStreamRef.current = url
    setVideoStream(url)
    setVideoMeta({
      areaId: targetAreaId,
      fileName: file.name,
      fileSize: file.size,
      savedAt: new Date().toISOString(),
      isRestored: false,
    })
    setIsPlaying(false)
    setCurrentTime(0)

    if (videoRef.current) {
      videoRef.current.src = url
      videoRef.current.preload = 'auto'
      videoRef.current.muted = true
      videoRef.current.load()
      videoRef.current.onloadedmetadata = () => {
        setVideoDuration(videoRef.current.duration)
        if (canvasRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth || 1280
          canvasRef.current.height = videoRef.current.videoHeight || 720
        }
        if (targetArea?.spotDimensions && parkingSpotsRef.current.length > 0) {
          const newDims = {
            width: videoRef.current.videoWidth,
            height: videoRef.current.videoHeight,
          }
          const rescaled = scaleSpots(parkingSpotsRef.current, targetArea.spotDimensions, newDims)
          setParkingSpots(rescaled)
          parkingSpotsRef.current = rescaled
          persistSpots(rescaled, newDims)
        }
        try {
          videoRef.current.currentTime = 0.001
        } catch {
          renderCanvas()
        }
        setTimeout(() => detectVehiclesInCurrentFrame(true), 80)
      }
      videoRef.current.onloadeddata = () => renderCanvas()
      videoRef.current.onseeked = () => {
        renderCanvas()
        detectVehiclesInCurrentFrame(true)
      }
    }
    // Sync uploaded video to backend/PostgreSQL after local playback is bound
    e.target.value = ''
    if (file.size > 50 * 1024 * 1024) {
      setVideoUploadStatus({
        busy: false,
        error: 'Video exceeds 50 MB — saved on this browser only. Use a smaller clip (<= 50 MB) or Shared URL for all users.',
        message: '',
      })
      return
    }

    setVideoUploadStatus({ busy: true, error: '', message: 'Uploading shared video for all users and browsers...' })
    try {
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await fetch(`${API_URL}/areas/${targetAreaId}/video`, {
        method: 'POST',
        body: formData,
      })
      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}))
        setVideoUploadStatus({
          busy: false,
          error: errData.detail || 'Could not sync video to server; saved on this browser only.',
          message: '',
        })
        return
      }
      const res = await uploadRes.json()
      if (res?.videoUrl) {
        setParkingAreas((prev) =>
          prev.map((a) => (String(a.id) === targetAreaId ? { ...a, videoUrl: res.videoUrl } : a))
        )
        if (selectedAreaRef.current && String(selectedAreaRef.current.id) === targetAreaId) {
          selectedAreaRef.current = { ...selectedAreaRef.current, videoUrl: res.videoUrl }
        }
        setVideoUploadStatus({
          busy: false,
          error: '',
          message: 'Video saved and shared across all users and browsers.',
        })
      }
    } catch {
      setVideoUploadStatus({
        busy: false,
        error: 'Network error uploading video to server; saved on this browser only.',
        message: '',
      })
    }
  }

  const togglePlayPause = () => {
    if (!videoRef.current) return
    const targetArea = selectedAreaRef.current || selectedArea

    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
      renderCanvas()
      if (targetArea) {
        updateFacilityPlayback(targetArea.id, {
          currentTime: videoRef.current.currentTime,
          isPlaying: false,
        })
      }
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true)
        if (targetArea) {
          updateFacilityPlayback(targetArea.id, {
            currentTime: videoRef.current.currentTime,
            isPlaying: true,
          })
        }
      }).catch(err => {
        console.error('Video playback failed:', err)
        setIsPlaying(false)
      })
    }
  }

  const handleSeek = (time) => {
    if (!videoRef.current) return
    const targetArea = selectedAreaRef.current || selectedArea
    const target = Math.max(0, Math.min(time, videoDuration || 0))
    videoRef.current.currentTime = target === 0 ? 0.001 : target
    setCurrentTime(target)
    if (targetArea) {
      updateFacilityPlayback(targetArea.id, {
        currentTime: target,
        isPlaying,
      })
    }
  }

  const clearAllSpots = () => {
    if (window.confirm('Clear all marked parking bays?')) {
      setParkingSpots([])
      parkingSpotsRef.current = []
      setOccupiedSpots(new Set())
      occupiedSpotsRef.current = new Set()
      persistSpots([], null)
    }
  }

  const deleteSpot = (index) => {
    const updated = parkingSpots.filter((_, i) => i !== index)
    setParkingSpots(updated)
    parkingSpotsRef.current = updated
    const nextOccupied = new Set(occupiedSpots)
    nextOccupied.delete(index)
    setOccupiedSpots(nextOccupied)
    occupiedSpotsRef.current = nextOccupied
    persistSpots(updated)
  }

  const detectVehiclesInCurrentFrame = async (force = false) => {
    const video = videoRef.current
    const spots = parkingSpotsRef.current
    if (!video || (!isPlaying && !force) || spots.length === 0) return

    try {
      const offscreen = document.createElement('canvas')
      offscreen.width = video.videoWidth
      offscreen.height = video.videoHeight
      const ctx = offscreen.getContext('2d')
      ctx.drawImage(video, 0, 0)

      const blob = await new Promise(resolve => offscreen.toBlob(resolve, 'image/jpeg', 0.85))
      if (!blob) return

      const formData = new FormData()
      formData.append('file', blob, 'frame.jpg')

      const response = await fetch(`${API_URL}/detect`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) return

      const data = await response.json()
      const rawList = Array.isArray(data) ? data : (data.vehicles || [])
      const vehicleDetections = rawList.map(d => ({
        class_name: d.class_name || d.label || '',
        x1: d.x1 ?? d.bbox?.x1 ?? 0,
        y1: d.y1 ?? d.bbox?.y1 ?? 0,
        x2: d.x2 ?? d.bbox?.x2 ?? 0,
        y2: d.y2 ?? d.bbox?.y2 ?? 0,
      })).filter(d =>
        ['car', 'truck', 'bus', 'motorcycle'].includes(d.class_name.toLowerCase())
      )

      const isPointInside = (pt, box) => {
        const bx1 = Math.min(box[0], box[2])
        const bx2 = Math.max(box[0], box[2])
        const by1 = Math.min(box[1], box[3])
        const by2 = Math.max(box[1], box[3])
        return pt.x >= bx1 && pt.x <= bx2 && pt.y >= by1 && pt.y <= by2
      }

      const occupied = new Set()
      spots.forEach((spot, index) => {
        const spotBox = [spot.x1, spot.y1, spot.x2, spot.y2]
        for (const det of vehicleDetections) {
          const detBox = [det.x1, det.y1, det.x2, det.y2]
          const iou = calculateIoU(spotBox, detBox)
          const detCenter = {
            x: (det.x1 + det.x2) / 2,
            y: (det.y1 + det.y2) / 2,
          }
          if (iou > 0.12 || isPointInside(detCenter, spotBox)) {
            occupied.add(index)
            break
          }
        }
      })

      setOccupiedSpots(occupied)
      occupiedSpotsRef.current = occupied
      renderCanvas()

      const now = video.currentTime
      if (now < lastSnapshotRef.current) {
        lastSnapshotRef.current = -Infinity
      }
      const wallNow = Date.now()
      const shouldRecordLocal = now - lastSnapshotRef.current >= SNAPSHOT_INTERVAL_S
      const shouldSyncRemote = wallNow - lastTelemetrySyncRef.current >= 4000

      if (shouldRecordLocal || shouldSyncRemote) {
        if (shouldRecordLocal) lastSnapshotRef.current = now
        if (shouldSyncRemote) lastTelemetrySyncRef.current = wallNow

        const total = spots.length
        const occCount = occupied.size
        const snapshot = {
          time: formatTime(now),
          timeSeconds: Math.floor(now),
          recordedAt: new Date().toISOString(),
          total,
          occupied: occCount,
          available: total - occCount,
          occupancyRate: total > 0 ? Math.round((occCount / total) * 100) : 0,
        }

        const activeArea = selectedAreaRef.current
        setAnalyticsHistory(prev => {
          const next = [...prev, snapshot].slice(-ANALYTICS_KEEP)
          if (activeArea) {
            setParkingAreas(areas =>
              areas.map(a => (a.id === activeArea.id ? { ...a, analytics: next } : a))
            )
          }
          return next
        })

        if (shouldSyncRemote && activeArea?.id) {
          fetch(`${API_URL}/areas/${activeArea.id}/telemetry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(snapshot),
          }).catch(() => {})
        }
      }
    } catch {
      // transient detection frame error
    }
  }

  const calculateIoU = (boxA, boxB) => {
    const xA = Math.max(boxA[0], boxB[0])
    const yA = Math.max(boxA[1], boxB[1])
    const xB = Math.min(boxA[2], boxB[2])
    const yB = Math.min(boxA[3], boxB[3])
    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA)
    const boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
    const boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])
    return interArea / (boxAArea + boxBArea - interArea)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleMouseDown = (e) => {
    if (!isMarkingMode || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasRef.current.width / rect.width
    const scaleY = canvasRef.current.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    drawingRef.current = { active: true, start: { x, y }, end: { x, y } }

    const handleMouseMove = (moveEvent) => {
      if (!drawingRef.current.active) return
      const currentX = (moveEvent.clientX - rect.left) * scaleX
      const currentY = (moveEvent.clientY - rect.top) * scaleY
      drawingRef.current.end = { x: currentX, y: currentY }
      renderCanvas()
    }

    const handleMouseUp = () => {
      if (drawingRef.current.active && drawingRef.current.start && drawingRef.current.end) {
        const { start, end } = drawingRef.current
        const x1 = Math.min(start.x, end.x)
        const y1 = Math.min(start.y, end.y)
        const x2 = Math.max(start.x, end.x)
        const y2 = Math.max(start.y, end.y)

        if (Math.abs(x2 - x1) > 15 && Math.abs(y2 - y1) > 15) {
          const newSpot = { id: Date.now(), x1, y1, x2, y2 }
          const updated = [...parkingSpotsRef.current, newSpot]
          setParkingSpots(updated)
          parkingSpotsRef.current = updated
          const dims = { width: canvasRef.current.width, height: canvasRef.current.height }
          persistSpots(updated, dims)
          // Immediately scan current frame to evaluate occupancy for the newly marked bay
          setTimeout(() => {
            detectVehiclesInCurrentFrame(true)
          }, 60)
        }
      }
      drawingRef.current = { active: false, start: null, end: null }
      renderCanvas()
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const currentAnalytics = {
    totalSpots: parkingSpots.length,
    occupiedSpots: occupiedSpots.size,
    availableSpots: parkingSpots.length - occupiedSpots.size,
    occupancyRate:
      parkingSpots.length > 0 ? Math.round((occupiedSpots.size / parkingSpots.length) * 100) : 0,
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Hidden camera & upload elements */}
      <video ref={videoRef} crossOrigin="anonymous" autoPlay={false} playsInline muted loop preload="auto" style={{ display: 'none' }} />
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleVideoUpload}
        style={{ display: 'none' }}
      />

      {/* Modal Dialog for Registering a Parking Area */}
      <RegisterAreaModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        form={newArea}
        setForm={setNewArea}
        onSubmit={handleCreateArea}
      />

      {/* Modal Dialog for Editing an Existing Parking Area */}
      <EditAreaModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setAreaToEdit(null)
        }}
        area={areaToEdit}
        onSave={handleUpdateArea}
        onClearSpots={handleClearAreaSpots}
      />

      {/* Modal Dialog for Operator Profile Update */}
      <UpdateProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        auth={auth}
        onProfileUpdated={(user) => {
          if (user?.display_name) {
            setAuth(prev => ({ ...prev, displayName: user.display_name }))
          }
        }}
      />

      {/* Modal Dialog for User / Operator Sign-In & Sign-Up */}
      <LoginModal
        isOpen={loginModalConfig.isOpen}
        initialMode={loginModalConfig.initialMode}
        onClose={() => {
          setLoginModalConfig(prev => ({ ...prev, isOpen: false }))
          setLoginError('')
        }}
        form={loginForm}
        setForm={setLoginForm}
        onSubmit={handleLogin}
        onSignup={handleSignup}
        error={loginError}
        busy={loggingIn}
      />

      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <div className="min-h-screen flex flex-col">
              <Header
                auth={auth}
                onLogout={handleLogout}
                theme={theme}
                onToggleTheme={toggleTheme}
                onOpenLoginModal={handleOpenLoginModal}
                isAuthModalOpen={loginModalConfig.isOpen}
              />
              <main className="grow pt-20">
                <LandingPage
                  entries={Object.values(availability)}
                  auth={auth}
                  onOpenLoginModal={handleOpenLoginModal}
                  setCurrentView={(view) => {
                    if (view === 'login') {
                      handleOpenLoginModal({ initialMode: 'signin' })
                    } else if (view === 'dashboard') {
                      navigate('/dashboard')
                    } else if (view.startsWith('monitor/')) {
                      navigate(`/dashboard/${view}`)
                    } else {
                      navigate('/')
                    }
                  }}
                />
              </main>
              <Footer />
            </div>
          }
        />

        <Route
          path="/areas/:areaId"
          element={
            <div className="h-screen w-screen overflow-hidden flex bg-slate-50 dark:bg-[#090d16]">
              <Sidebar
                auth={auth}
                onLogout={handleLogout}
                theme={theme}
                onToggleTheme={toggleTheme}
                selectedArea={selectedArea}
                parkingAreas={parkingAreas}
                availability={availability}
                mobileOpen={mobileSidebarOpen}
                onCloseMobile={() => setMobileSidebarOpen(false)}
                onOpenLoginModal={handleOpenLoginModal}
                onOpenProfileModal={() => setProfileModalOpen(true)}
              />
              <div className="flex-1 h-screen flex flex-col overflow-hidden">
                <DashboardHeader
                  auth={auth}
                  onLogout={handleLogout}
                  onOpenProfileModal={() => setProfileModalOpen(true)}
                  selectedArea={selectedArea}
                  onToggleMobileSidebar={() => setMobileSidebarOpen(v => !v)}
                  onOpenLoginModal={handleOpenLoginModal}
                />
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                  <div className="max-w-7xl mx-auto">
                    <AreaDetailsPage
                      areas={parkingAreas}
                      availability={availability}
                      auth={auth}
                      onOpenLoginModal={handleOpenLoginModal}
                    />
                  </div>
                </main>
              </div>
            </div>
          }
        />

        <Route
          path="/login"
          element={
            <RedirectToHomeWithLogin
              onOpen={() => handleOpenLoginModal({ initialMode: 'signin' })}
            />
          }
        />

        {/* Protected Operator Console Layout & Nested Routes */}
        <Route
          path="/dashboard"
          element={
            !auth.token && !authChecking ? (
              <Navigate to="/" replace />
            ) : (
              <div className="h-screen w-screen overflow-hidden flex bg-slate-50 dark:bg-[#090d16]">
                <Sidebar
                  auth={auth}
                  onLogout={handleLogout}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  selectedArea={selectedArea}
                  parkingAreas={parkingAreas}
                  availability={availability}
                  mobileOpen={mobileSidebarOpen}
                  onCloseMobile={() => setMobileSidebarOpen(false)}
                  onOpenProfileModal={() => navigate('/dashboard/profile')}
                  onSwitchRole={handleSwitchRole}
                />
                <div className="flex-1 h-screen flex flex-col overflow-hidden">
                  <DashboardHeader
                    auth={auth}
                    onLogout={handleLogout}
                    onOpenProfileModal={() => navigate('/dashboard/profile')}
                    selectedArea={selectedArea}
                    onToggleMobileSidebar={() => setMobileSidebarOpen(v => !v)}
                  />
                  <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                      <Outlet />
                    </div>
                  </main>
                </div>
              </div>
            )
          }
        >
          <Route
            index
            element={
              auth.role === 'motorist' ? (
                <MotoristDashboard
                  areas={parkingAreas}
                  availability={availability}
                  auth={auth}
                  onOpenProfileModal={() => navigate('/dashboard/profile')}
                />
              ) : auth.role === 'warden' ? (
                <WardenVerifyPage
                  auth={auth}
                  areas={parkingAreas}
                />
              ) : (
                <Dashboard
                  areas={parkingAreas}
                  availability={availability}
                  auth={auth}
                  onSelect={handleSelectArea}
                  onRegisterClick={() => navigate('/dashboard/facilities/new')}
                  onViewFacilities={() => navigate('/dashboard/monitor')}
                />
              )
            }
          />
          <Route
            path="profile"
            element={
              <ProfilePage
                auth={auth}
                onProfileUpdated={(user) => {
                  if (user?.display_name) {
                    setAuth(prev => ({ ...prev, displayName: user.display_name }))
                  }
                }}
              />
            }
          />
          <Route
            path="pay"
            element={<PayParkingPage areas={parkingAreas} auth={auth} />}
          />
          <Route
            path="pay/:areaId"
            element={<PayParkingPage areas={parkingAreas} auth={auth} />}
          />
          <Route
            path="payments"
            element={<PaymentsHistoryPage auth={auth} areas={parkingAreas} />}
          />
          <Route
            path="payments/:txRef"
            element={<PaymentDetailsPage auth={auth} />}
          />
          <Route
            path="facilities/new"
            element={
              auth.role === 'motorist' ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <FacilityFormPage
                  areas={parkingAreas}
                  auth={auth}
                  onCreateArea={handleCreateArea}
                />
              )
            }
          />
          <Route
            path="facilities/:areaId/edit"
            element={
              auth.role === 'motorist' ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <FacilityFormPage
                  areas={parkingAreas}
                  auth={auth}
                  onUpdateArea={handleUpdateArea}
                  onClearSpots={handleClearAreaSpots}
                />
              )
            }
          />
          <Route
            path="attendants"
            element={
              auth.role === 'admin' || auth.role === 'operator' ? (
                <AttendantManagementPage auth={auth} areas={parkingAreas} />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
          <Route
            path="users"
            element={
              auth.role === 'admin' ? (
                <UserManagement auth={auth} />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
          <Route
            path="areas/:areaId"
            element={
              <AreaDetailsPage
                areas={parkingAreas}
                availability={availability}
                auth={auth}
              />
            }
          />
          <Route
            path="register-facility"
            element={<Navigate to="/dashboard" replace />}
          />
          <Route
            path="create-area"
            element={<Navigate to="/dashboard" replace />}
          />
          <Route
            path="monitor"
            element={
              auth.role === 'motorist' ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <MonitorRouteWrapper
                  parkingAreas={parkingAreas}
                  availability={availability}
                  auth={auth}
                  selectedArea={selectedArea}
                  onSelectArea={handleSelectArea}
                  onOpenRegisterModal={() => navigate('/dashboard/facilities/new')}
                  onEditArea={(area) => navigate(`/dashboard/facilities/${area.id}/edit`)}
                  onDeleteArea={handleDeleteArea}
                  onClearAreaSpots={handleClearAreaSpots}
                  backendHealth={backendHealth}
                  videoStream={videoStream}
                  videoMeta={videoMeta}
                  onClearVideo={handleClearVideo}
                  isPlaying={isPlaying}
                  spots={parkingSpots}
                  occupiedSpots={occupiedSpots}
                  current={currentAnalytics}
                  history={analyticsHistory}
                  currentTime={currentTime}
                  videoDuration={videoDuration}
                  detectIntervalMs={detectIntervalMs}
                  markingMode={isMarkingMode}
                  onToggleMarking={() => {
                    setIsMarkingMode(v => {
                      const next = !v
                      if (!next) setTimeout(() => detectVehiclesInCurrentFrame(true), 60)
                      return next
                    })
                  }}
                  onPlayPause={togglePlayPause}
                  onUploadClick={() => fileInputRef.current?.click()}
                  onClearSpots={clearAllSpots}
                  onDeleteSpot={deleteSpot}
                  onIntervalChange={setDetectIntervalMs}
                  onBack={() => navigate('/dashboard')}
                  formatTime={formatTime}
                  canvasRef={canvasRef}
                  onMouseDown={handleMouseDown}
                  onSeek={handleSeek}
                  onScanFrame={() => detectVehiclesInCurrentFrame(true)}
                  onSaveVideoUrl={handleSaveVideoUrl}
                  videoUploadStatus={videoUploadStatus}
                />
              )
            }
          />
          <Route
            path="monitor/:areaId"
            element={
              auth.role === 'motorist' ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <MonitorRouteWrapper
                  parkingAreas={parkingAreas}
                  availability={availability}
                  auth={auth}
                  selectedArea={selectedArea}
                  onSelectArea={handleSelectArea}
                  onOpenRegisterModal={() => navigate('/dashboard/facilities/new')}
                  onEditArea={(area) => navigate(`/dashboard/facilities/${area.id}/edit`)}
                  onDeleteArea={handleDeleteArea}
                  onClearAreaSpots={handleClearAreaSpots}
                  backendHealth={backendHealth}
                  videoStream={videoStream}
                  videoMeta={videoMeta}
                  onClearVideo={handleClearVideo}
                  isPlaying={isPlaying}
                  spots={parkingSpots}
                  occupiedSpots={occupiedSpots}
                  current={currentAnalytics}
                  history={analyticsHistory}
                  currentTime={currentTime}
                  videoDuration={videoDuration}
                  detectIntervalMs={detectIntervalMs}
                  markingMode={isMarkingMode}
                  onToggleMarking={() => {
                    setIsMarkingMode(v => {
                      const next = !v
                      if (!next) setTimeout(() => detectVehiclesInCurrentFrame(true), 60)
                      return next
                    })
                  }}
                  onPlayPause={togglePlayPause}
                  onUploadClick={() => fileInputRef.current?.click()}
                  onClearSpots={clearAllSpots}
                  onDeleteSpot={deleteSpot}
                  onIntervalChange={setDetectIntervalMs}
                  onBack={() => navigate('/dashboard')}
                  formatTime={formatTime}
                  canvasRef={canvasRef}
                  onMouseDown={handleMouseDown}
                  onSeek={handleSeek}
                  onScanFrame={() => detectVehiclesInCurrentFrame(true)}
                  onSaveVideoUrl={handleSaveVideoUrl}
                  videoUploadStatus={videoUploadStatus}
                />
              )
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

function MonitorRouteWrapper({
  parkingAreas,
  availability = {},
  auth,
  selectedArea,
  onSelectArea,
  onOpenRegisterModal,
  onEditArea,
  onDeleteArea,
  onClearAreaSpots,
  backendHealth,
  videoStream,
  videoMeta,
  onClearVideo,
  isPlaying,
  spots,
  occupiedSpots,
  current,
  history,
  currentTime,
  videoDuration,
  detectIntervalMs,
  markingMode,
  onToggleMarking,
  onPlayPause,
  onUploadClick,
  onClearSpots,
  onDeleteSpot,
  onIntervalChange,
  onBack,
  formatTime,
  canvasRef,
  onMouseDown,
  onSeek,
  onScanFrame,
}) {
  const { areaId } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    if (areaId) {
      if (!selectedArea || String(selectedArea.id) !== String(areaId)) {
        const found = parkingAreas.find(a => String(a.id) === String(areaId))
        if (found) {
          onSelectArea(found, false)
        }
      }
    }
  }, [areaId, selectedArea, parkingAreas])

  const targetArea = areaId
    ? parkingAreas.find(a => String(a.id) === String(areaId)) || selectedArea
    : null

  const isAreaVideo = Boolean(videoMeta) && String(videoMeta.areaId) === String(targetArea?.id)

  return (
    <MonitorWorkspace
      area={targetArea}
      areas={parkingAreas}
      availability={availability}
      auth={auth}
      onSelectArea={onSelectArea}
      onOpenRegisterModal={onOpenRegisterModal}
      onEditArea={onEditArea}
      onDeleteArea={onDeleteArea}
      onClearAreaSpots={onClearAreaSpots}
      backendHealth={backendHealth}
      videoStream={isAreaVideo ? videoStream : null}
      videoMeta={isAreaVideo ? videoMeta : null}
      onClearVideo={onClearVideo}
      isPlaying={isAreaVideo ? isPlaying : false}
      spots={spots}
      occupiedSpots={occupiedSpots}
      current={current}
      history={history}
      currentTime={currentTime}
      videoDuration={videoDuration}
      detectIntervalMs={detectIntervalMs}
      markingMode={markingMode}
      onToggleMarking={onToggleMarking}
      onPlayPause={onPlayPause}
      onUploadClick={onUploadClick}
      onClearSpots={onClearSpots}
      onDeleteSpot={onDeleteSpot}
      onIntervalChange={onIntervalChange}
      onBack={onBack}
      formatTime={formatTime}
      canvasRef={canvasRef}
      onMouseDown={onMouseDown}
      onSeek={onSeek}
      onScanFrame={onScanFrame}
    />
  )
}

function RedirectToHomeWithLogin({ onOpen }) {
  const navigate = useNavigate()
  useEffect(() => {
    onOpen()
    navigate('/', { replace: true })
  }, [onOpen, navigate])
  return null
}
