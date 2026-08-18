import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import {
  X,
  Camera,
  MapPin,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Zap,
  RefreshCw,
  Navigation,
  Compass,
  Radio,
  Sliders,
  ShieldAlert,
  ShieldCheck,
  LocateFixed,
  AlertTriangle,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  getCurrentCoordinates,
  calculateDistanceMeters,
  formatDistance,
  SIMULATED_LOCATIONS,
  GeolocationResult,
} from '../../lib/geolocation';
import { parseQRPayload } from '../../lib/qr';
import { addToOfflineQueue } from '../../lib/storage';
import { AttendanceStatus } from '../../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type LocationMode = 'BROWSER_LIVE' | 'SIMULATED_PRESET' | 'CUSTOM_COORDS';

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, isOnline } = useAuth();
  const { markAttendance, sessions, courses } = useAttendance();

  // Scan & Result State
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    status?: AttendanceStatus;
    message: string;
    courseCode?: string;
    distanceMeters?: number;
    allowedRadiusMeters?: number;
    excessMeters?: number;
    checkInTime?: string;
    studentLocation?: { latitude: number; longitude: number };
    classroomLocation?: { latitude: number; longitude: number; name?: string };
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selectedDemoSessionId, setSelectedDemoSessionId] = useState<string>('');

  // Geolocation API State
  const [locationMode, setLocationMode] = useState<LocationMode>('BROWSER_LIVE');
  const [browserCoords, setBrowserCoords] = useState<GeolocationResult | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'IDLE' | 'ACQUIRING' | 'LOCKED' | 'ERROR'>('IDLE');
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string | null>(null);
  const [selectedSimPresetId, setSelectedSimPresetId] = useState<string>(SIMULATED_LOCATIONS[0].id);
  const [customLat, setCustomLat] = useState<number>(51.5074);
  const [customLon, setCustomLon] = useState<number>(-0.1278);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-target';

  const openSessions = sessions.filter((s) => s.isOpen);
  const activeSession =
    sessions.find((s) => s.id === selectedDemoSessionId) || openSessions[0] || sessions[0];

  // Auto-select first active session
  useEffect(() => {
    if (openSessions.length > 0 && !selectedDemoSessionId) {
      setSelectedDemoSessionId(openSessions[0].id);
    }
  }, [openSessions, selectedDemoSessionId]);

  /**
   * Acquire live GPS position via Browser Geolocation API
   */
  const acquireBrowserLocation = useCallback(async () => {
    setGpsStatus('ACQUIRING');
    setGpsErrorMessage(null);

    try {
      const coords = await getCurrentCoordinates();
      setBrowserCoords(coords);
      setGpsStatus('LOCKED');
    } catch (err: any) {
      console.warn('Browser Geolocation API acquisition error:', err);
      setGpsStatus('ERROR');
      setGpsErrorMessage(
        err?.message || 'Failed to acquire location from Browser Geolocation API.'
      );
    }
  }, []);

  // Request browser location when modal opens
  useEffect(() => {
    if (isOpen) {
      acquireBrowserLocation();
    } else {
      setScanResult(null);
      setCameraError(null);
      cleanupScanner();
    }
  }, [isOpen, acquireBrowserLocation]);

  // Compute active coordinates based on chosen mode
  const getActiveCoordinates = (): {
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null => {
    if (locationMode === 'BROWSER_LIVE') {
      if (browserCoords) {
        return {
          latitude: browserCoords.latitude,
          longitude: browserCoords.longitude,
          accuracy: browserCoords.accuracy,
        };
      }
      return null;
    }

    if (locationMode === 'SIMULATED_PRESET') {
      const preset = SIMULATED_LOCATIONS.find((p) => p.id === selectedSimPresetId);
      const baseLat = activeSession?.coordinates?.latitude || 51.5074;
      const baseLon = activeSession?.coordinates?.longitude || -0.1278;

      if (preset) {
        return {
          latitude: baseLat + preset.offsetLat,
          longitude: baseLon + preset.offsetLon,
          accuracy: 5,
        };
      }
      return { latitude: baseLat, longitude: baseLon, accuracy: 5 };
    }

    if (locationMode === 'CUSTOM_COORDS') {
      return {
        latitude: customLat,
        longitude: customLon,
        accuracy: 10,
      };
    }

    return null;
  };

  const currentCoords = getActiveCoordinates();

  // Compute live distance to selected session classroom
  const liveClassroomCoords = activeSession?.coordinates;
  const liveAllowedRadius = liveClassroomCoords?.radiusMeters || 80;
  const liveCalculatedDistance =
    currentCoords && liveClassroomCoords
      ? calculateDistanceMeters(
          currentCoords.latitude,
          currentCoords.longitude,
          liveClassroomCoords.latitude,
          liveClassroomCoords.longitude
        )
      : null;

  const isLiveWithinBounds =
    liveCalculatedDistance !== null ? liveCalculatedDistance <= liveAllowedRadius : null;

  // Start Camera Scanner when Modal Opens
  useEffect(() => {
    if (!isOpen) {
      cleanupScanner();
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      try {
        setCameraError(null);
        await new Promise((r) => setTimeout(r, 200));

        const element = document.getElementById(scannerContainerId);
        if (!element) return;

        const html5QrCode = new Html5Qrcode(scannerContainerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          async (decodedText) => {
            if (isProcessing) return;
            handleQRCodeScanned(decodedText);
          },
          () => {}
        );
      } catch (err: any) {
        console.warn('Camera start error:', err);
        if (isMounted) {
          setCameraError(
            err?.message || 'Camera access not available or blocked in this environment.'
          );
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      cleanupScanner();
    };
  }, [isOpen]);

  const cleanupScanner = () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {});
        }
      } catch (e) {
        // ignore
      }
      scannerRef.current = null;
    }
  };

  /**
   * Processes decoded QR string or simulator input with Browser Geolocation API validation
   */
  const handleQRCodeScanned = async (rawQrText: string) => {
    if (isProcessing || !currentUser) return;
    setIsProcessing(true);

    try {
      const parsed = parseQRPayload(rawQrText);
      if (!parsed) {
        setScanResult({
          success: false,
          message:
            'Invalid QR Code format. Please scan an authorized ClassTrack rotating dynamic QR code.',
        });
        setIsProcessing(false);
        return;
      }

      const { sessionId, token } = parsed;
      const targetSession = sessions.find((s) => s.id === sessionId);
      const targetCourse = courses.find((c) => c.id === targetSession?.courseId);

      // Acquire or retrieve current coordinates
      let coords = getActiveCoordinates();

      // If user selected Browser Live mode but hasn't acquired yet, try now
      if (locationMode === 'BROWSER_LIVE' && !coords) {
        try {
          const fresh = await getCurrentCoordinates();
          setBrowserCoords(fresh);
          coords = {
            latitude: fresh.latitude,
            longitude: fresh.longitude,
            accuracy: fresh.accuracy,
          };
          setGpsStatus('LOCKED');
        } catch (err: any) {
          setGpsStatus('ERROR');
          setScanResult({
            success: false,
            message:
              'Browser Geolocation error: ' +
              (err?.message ||
                'Location access is required to verify physical classroom presence. Please allow location permissions in your browser.'),
          });
          setIsProcessing(false);
          return;
        }
      }

      const sessionCoords = targetSession?.coordinates || targetCourse?.coordinates;
      const radius = sessionCoords?.radiusMeters || 80;

      // Check distance in advance for diagnostic UI reporting
      let preDistance: number | undefined = undefined;
      if (coords && sessionCoords) {
        preDistance = calculateDistanceMeters(
          coords.latitude,
          coords.longitude,
          sessionCoords.latitude,
          sessionCoords.longitude
        );
      }

      // Offline mode handling
      if (!isOnline) {
        addToOfflineQueue({
          id: `offline-${Date.now()}`,
          sessionId,
          token,
          studentId: currentUser.id,
          studentNumber: currentUser.studentNumber || 'N/A',
          studentName: currentUser.name,
          timestamp: new Date().toISOString(),
          coords: coords ? { latitude: coords.latitude, longitude: coords.longitude } : undefined,
        });

        setScanResult({
          success: true,
          status: 'PRESENT',
          courseCode: targetSession?.courseCode || 'CLASS',
          message:
            'Offline Mode: Attendance scan and GPS coordinates saved to local device storage. It will synchronize automatically when internet is restored.',
          checkInTime: new Date().toISOString(),
          distanceMeters: preDistance,
          allowedRadiusMeters: radius,
          studentLocation: coords ? { latitude: coords.latitude, longitude: coords.longitude } : undefined,
          classroomLocation: sessionCoords,
        });
        setIsProcessing(false);
        return;
      }

      // Execute check-in with Geolocation verification
      const result = await markAttendance(sessionId, token, currentUser, coords || undefined);

      const calculatedDist = result.distanceMeters ?? preDistance;
      const excess =
        calculatedDist !== undefined ? Math.max(0, calculatedDist - radius) : undefined;

      setScanResult({
        success: result.success,
        status: result.status,
        message: result.message,
        courseCode: targetSession?.courseCode || result.record?.courseCode,
        distanceMeters: calculatedDist,
        allowedRadiusMeters: radius,
        excessMeters: excess,
        checkInTime: result.record?.checkInTime || new Date().toISOString(),
        studentLocation: coords ? { latitude: coords.latitude, longitude: coords.longitude } : undefined,
        classroomLocation: sessionCoords,
      });
    } catch (err: any) {
      setScanResult({
        success: false,
        message: err.message || 'An unexpected error occurred during attendance verification.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * One-click demo scan simulator
   */
  const handleSimulateScan = () => {
    const targetSession = sessions.find((s) => s.id === selectedDemoSessionId) || openSessions[0];
    if (!targetSession) {
      setScanResult({
        success: false,
        message:
          'No active attendance sessions currently open. Please launch an attendance session from the Coordinator dashboard first.',
      });
      return;
    }

    const payload = JSON.stringify({
      app: 'ClassTrack',
      version: '1.0',
      sessionId: targetSession.id,
      token: targetSession.currentToken,
      t: Date.now(),
    });

    handleQRCodeScanned(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#18181b] rounded-3xl shadow-2xl max-w-xl w-full border border-[#27272a] overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#09090b] text-[#fafafa] flex items-center justify-between border-b border-[#27272a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Smart Attendance Scanner</h3>
              <p className="text-xs text-zinc-400">
                Rotating dynamic QR verification with GPS geofencing
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              cleanupScanner();
              onClose();
            }}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Result Feedback Card if Scanned */}
          {scanResult ? (
            <div className="text-center py-2 space-y-5 animate-scale-in">
              <div
                className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center shadow-lg ${
                  scanResult.success
                    ? scanResult.status === 'PRESENT'
                      ? 'bg-emerald-950/80 text-emerald-400 border-2 border-emerald-500'
                      : 'bg-amber-950/80 text-amber-400 border-2 border-amber-500'
                    : 'bg-rose-950/80 text-rose-400 border-2 border-rose-500'
                }`}
              >
                {scanResult.success ? (
                  <CheckCircle className="w-8 h-8" />
                ) : (
                  <AlertCircle className="w-8 h-8" />
                )}
              </div>

              <div>
                <h4
                  className={`text-xl font-black ${
                    scanResult.success
                      ? scanResult.status === 'PRESENT'
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {scanResult.success
                    ? `Attendance Verified: ${scanResult.status}`
                    : 'Check-In Rejected (Out of Bounds)'}
                </h4>
                <p className="text-xs sm:text-sm text-zinc-300 mt-2 max-w-md mx-auto leading-relaxed">
                  {scanResult.message}
                </p>
              </div>

              {/* Comprehensive Geolocation Diagnostics Box */}
              <div className="bg-[#27272a]/60 rounded-2xl p-4 border border-[#27272a] text-left space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-zinc-700/60 pb-2">
                  <span className="font-bold text-zinc-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <LocateFixed className="w-3.5 h-3.5 text-emerald-400" />
                    Browser Geolocation Diagnostics
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      scanResult.success
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {scanResult.success ? 'Geofence Valid' : 'Geofence Exceeded'}
                  </span>
                </div>

                {/* Distance Meter & Comparison */}
                {scanResult.distanceMeters !== undefined && (
                  <div className="space-y-1.5 bg-[#18181b] p-3 rounded-xl border border-zinc-800">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400 font-medium">Calculated Distance:</span>
                      <span
                        className={`font-mono font-bold text-sm ${
                          scanResult.success ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatDistance(scanResult.distanceMeters)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400 font-medium">Configured Classroom Radius:</span>
                      <span className="font-mono font-bold text-zinc-200">
                        {scanResult.allowedRadiusMeters || 80}m
                      </span>
                    </div>

                    {!scanResult.success && scanResult.excessMeters !== undefined && (
                      <div className="flex justify-between items-center text-xs pt-1 border-t border-zinc-800 text-rose-400 font-semibold">
                        <span>Radius Exceeded By:</span>
                        <span className="font-mono">+{scanResult.excessMeters}m</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Student & Course Details */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-zinc-400 block">Student Name:</span>
                    <span className="font-bold text-[#fafafa]">{currentUser?.name}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Student ID:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {currentUser?.studentNumber}
                    </span>
                  </div>
                  {scanResult.courseCode && (
                    <div>
                      <span className="text-zinc-400 block">Course Code:</span>
                      <span className="font-bold text-[#fafafa]">{scanResult.courseCode}</span>
                    </div>
                  )}
                  {scanResult.checkInTime && (
                    <div>
                      <span className="text-zinc-400 block">Timestamp:</span>
                      <span className="font-medium text-zinc-300">
                        {new Date(scanResult.checkInTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* GPS Coordinates Record */}
                {scanResult.studentLocation && (
                  <div className="text-[10px] font-mono text-zinc-400 bg-[#18181b] p-2 rounded-lg border border-zinc-800/80">
                    <div>
                      Student GPS: {scanResult.studentLocation.latitude.toFixed(6)},{' '}
                      {scanResult.studentLocation.longitude.toFixed(6)}
                    </div>
                    {scanResult.classroomLocation && (
                      <div>
                        Classroom Target: {scanResult.classroomLocation.latitude.toFixed(6)},{' '}
                        {scanResult.classroomLocation.longitude.toFixed(6)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setScanResult(null)}
                  className="flex-1 py-2.5 bg-[#27272a] hover:bg-zinc-700 text-[#fafafa] font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Try Scan Again
                </button>
                <button
                  onClick={() => {
                    cleanupScanner();
                    onClose();
                  }}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Camera Scanner Viewport */}
              <div className="relative rounded-2xl overflow-hidden bg-black border border-zinc-800 aspect-square flex items-center justify-center shadow-inner">
                <div id={scannerContainerId} className="w-full h-full" />

                {/* Animated Scanner Overlays */}
                {!cameraError && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                    <div className="w-56 h-56 border-2 border-emerald-400/80 rounded-2xl relative">
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br" />
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                  </div>
                )}

                {/* Camera fallback message */}
                {cameraError && (
                  <div className="p-6 text-center text-zinc-300 max-w-xs space-y-2">
                    <Camera className="w-10 h-10 mx-auto text-zinc-500" />
                    <p className="text-xs font-medium text-zinc-300">
                      Camera feed unavailable in this browser container.
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Use the instant simulator below to test live Geolocation proximity and QR check-in!
                    </p>
                  </div>
                )}

                {isProcessing && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2">
                    <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                    <span className="text-xs font-bold tracking-wider uppercase">
                      Evaluating Browser GPS & Token...
                    </span>
                  </div>
                )}
              </div>

              {/* Geolocation Proximity Radar Card */}
              <div className="bg-[#27272a]/50 rounded-2xl p-4 border border-[#27272a] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-[#fafafa]">
                      Browser Geolocation API Radar
                    </span>
                  </div>

                  {gpsStatus === 'ACQUIRING' && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Acquiring GPS...
                    </span>
                  )}
                  {gpsStatus === 'LOCKED' && locationMode === 'BROWSER_LIVE' && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" /> Live GPS Locked
                    </span>
                  )}
                  {gpsStatus === 'ERROR' && locationMode === 'BROWSER_LIVE' && (
                    <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-rose-400" /> GPS Error
                    </span>
                  )}
                </div>

                {/* Location Mode Selector */}
                <div className="grid grid-cols-3 gap-1.5 bg-[#18181b] p-1 rounded-xl border border-zinc-800 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setLocationMode('BROWSER_LIVE');
                      acquireBrowserLocation();
                    }}
                    className={`py-1.5 px-2 rounded-lg transition text-center cursor-pointer ${
                      locationMode === 'BROWSER_LIVE'
                        ? 'bg-emerald-500 text-black font-bold shadow-xs'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Live Browser API
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationMode('SIMULATED_PRESET')}
                    className={`py-1.5 px-2 rounded-lg transition text-center cursor-pointer ${
                      locationMode === 'SIMULATED_PRESET'
                        ? 'bg-emerald-500 text-black font-bold shadow-xs'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Proximity Presets
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationMode('CUSTOM_COORDS')}
                    className={`py-1.5 px-2 rounded-lg transition text-center cursor-pointer ${
                      locationMode === 'CUSTOM_COORDS'
                        ? 'bg-emerald-500 text-black font-bold shadow-xs'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Custom Lat/Lng
                  </button>
                </div>

                {/* Sub-panels based on location mode */}
                {locationMode === 'BROWSER_LIVE' && (
                  <div className="space-y-2 text-xs bg-[#18181b] p-3 rounded-xl border border-zinc-800">
                    {browserCoords ? (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Device Coordinates:</span>
                          <span className="font-mono text-emerald-400 font-semibold">
                            {browserCoords.latitude.toFixed(5)}°, {browserCoords.longitude.toFixed(5)}°
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-zinc-500">GPS Sensor Accuracy:</span>
                          <span className="font-mono text-zinc-300">
                            ±{Math.round(browserCoords.accuracy)}m
                          </span>
                        </div>
                      </div>
                    ) : gpsStatus === 'ERROR' ? (
                      <div className="space-y-2">
                        <p className="text-[11px] text-rose-300 leading-tight">
                          {gpsErrorMessage ||
                            'Browser location permission denied. Switch to Proximity Presets or click retry.'}
                        </p>
                        <button
                          type="button"
                          onClick={acquireBrowserLocation}
                          className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> Retry Browser Location
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-zinc-400 text-xs py-1">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        <span>Contacting Browser Geolocation API...</span>
                      </div>
                    )}
                  </div>
                )}

                {locationMode === 'SIMULATED_PRESET' && (
                  <div className="space-y-2">
                    <label className="block text-[11px] text-zinc-400 font-medium">
                      Select Simulated Student Distance:
                    </label>
                    <select
                      value={selectedSimPresetId}
                      onChange={(e) => setSelectedSimPresetId(e.target.value)}
                      className="w-full text-xs font-medium bg-[#18181b] border border-zinc-700 text-[#fafafa] rounded-lg p-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {SIMULATED_LOCATIONS.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.label} — {loc.expectedStatus === 'VALID' ? '✅ Pass' : '❌ Reject'}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-zinc-400 italic">
                      {SIMULATED_LOCATIONS.find((l) => l.id === selectedSimPresetId)?.description}
                    </p>
                  </div>
                )}

                {locationMode === 'CUSTOM_COORDS' && (
                  <div className="grid grid-cols-2 gap-2 bg-[#18181b] p-3 rounded-xl border border-zinc-800">
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-bold mb-1">
                        Latitude (°N)
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={customLat}
                        onChange={(e) => setCustomLat(parseFloat(e.target.value) || 0)}
                        className="w-full text-xs font-mono bg-[#27272a] border border-zinc-700 text-white rounded p-1.5 outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-bold mb-1">
                        Longitude (°W)
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={customLon}
                        onChange={(e) => setCustomLon(parseFloat(e.target.value) || 0)}
                        className="w-full text-xs font-mono bg-[#27272a] border border-zinc-700 text-white rounded p-1.5 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {/* Real-time Distance Radar Bar */}
                {liveCalculatedDistance !== null && (
                  <div className="bg-[#18181b] p-3 rounded-xl border border-zinc-800 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        Classroom Geofence Distance:
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          isLiveWithinBounds ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatDistance(liveCalculatedDistance)} / {liveAllowedRadius}m
                      </span>
                    </div>

                    {/* Progress visual */}
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isLiveWithinBounds ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (liveCalculatedDistance / liveAllowedRadius) * 100
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px]">
                      <span
                        className={
                          isLiveWithinBounds
                            ? 'text-emerald-400 font-bold'
                            : 'text-rose-400 font-bold'
                        }
                      >
                        {isLiveWithinBounds
                          ? '✓ Inside Classroom Bounds'
                          : '✗ Outside Configured Radius (Check-in will be rejected)'}
                      </span>
                      <span className="text-zinc-500 font-mono">
                        Target: {activeSession?.courseCode}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Instant Simulator Section */}
              <div className="bg-[#27272a]/50 rounded-2xl p-4 border border-[#27272a] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-bold text-[#fafafa]">
                      Attendance Check-In Simulator
                    </span>
                  </div>
                  <span className="text-[10px] bg-amber-950/60 text-amber-400 border border-amber-500/30 font-bold px-2 py-0.5 rounded-full">
                    One-Tap Test
                  </span>
                </div>

                {openSessions.length > 0 ? (
                  <div className="space-y-2">
                    <label className="block text-[11px] text-zinc-400 font-medium">
                      Active Classroom Attendance Session:
                    </label>
                    <select
                      value={selectedDemoSessionId}
                      onChange={(e) => setSelectedDemoSessionId(e.target.value)}
                      className="w-full text-xs font-medium bg-[#18181b] border border-zinc-700 text-[#fafafa] rounded-lg p-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {openSessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.courseCode} - {s.courseName} (Radius: {s.coordinates?.radiusMeters || 80}m)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="text-xs text-amber-300 bg-amber-950/40 p-2.5 rounded-lg border border-amber-500/30 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>No active sessions open. Launch a session from the Coordinator hub to test live check-ins!</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSimulateScan}
                  disabled={openSessions.length === 0 || isProcessing}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Execute Check-In with Geolocation Verification</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
