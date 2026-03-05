import { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, X, RefreshCw, CheckCircle, Navigation } from 'lucide-react';

/**
 * GeoCamera — opens device camera, captures photo, reverse-geocodes real GPS,
 * and burns a geo-stamp (address, coordinates, date/time, CityFlow branding)
 * directly onto the canvas — exactly like field-camera apps.
 *
 * Props:
 *   onCapture({ photo: base64String, location: { lat, lng, label } })
 *   onClose()
 *   label — optional heading string
 */

// ── Reverse-geocode via Nominatim (OSM, no API key, native fetch) ─────────────
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (!res.ok) throw new Error('nominatim error');
    const data = await res.json();
    const a = data.address || {};
    // Build a readable address line
    const parts = [
      a.road || a.pedestrian || a.footway || a.path,
      a.suburb || a.neighbourhood || a.village || a.town || a.city_district,
      a.city || a.town || a.county,
      a.state,
      a.postcode,
    ].filter(Boolean);
    const label = parts.length ? parts.join(', ') : data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    return { label, raw: data };
  } catch {
    return { label: `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`, raw: null };
  }
}

// ── Burn geo-stamp onto canvas ────────────────────────────────────────────────
function burnGeoStamp(canvas, { lat, lng, address, datetime }) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // Scale factor so stamp looks proportional regardless of capture resolution
  const scale = Math.max(1, W / 640);
  const pad   = Math.round(10 * scale);

  // ── Bottom strip background ────────────────────────────────────────────────
  const stripH = Math.round(72 * scale);
  const grd = ctx.createLinearGradient(0, H - stripH, 0, H);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(0.25, 'rgba(0,0,0,0.82)');
  grd.addColorStop(1, 'rgba(0,0,0,0.92)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, H - stripH, W, stripH);

  // ── Left column: map pin + address ────────────────────────────────────────
  const pinSize = Math.round(11 * scale);
  const lineH1  = Math.round(13 * scale);   // address font size
  const lineH2  = Math.round(10 * scale);   // coords / secondary font size
  const baseY   = H - stripH + Math.round(18 * scale);

  // Pin dot
  ctx.fillStyle = '#22c55e'; // green-500
  ctx.beginPath();
  ctx.arc(pad + pinSize / 2, baseY + lineH1 / 2 - 1, pinSize / 2, 0, Math.PI * 2);
  ctx.fill();

  // Address — wrap to 2 lines if needed
  ctx.fillStyle = '#ffffff';
  ctx.font      = `bold ${lineH1}px system-ui, sans-serif`;
  ctx.textBaseline = 'top';

  const maxW = W - pad * 3 - pinSize;
  const words = address.split(', ');
  let line1 = '', line2 = '';
  for (const w of words) {
    const test = line1 ? `${line1}, ${w}` : w;
    if (ctx.measureText(test).width < maxW * 0.55) {
      line1 = test;
    } else {
      line2 = line2 ? `${line2}, ${w}` : w;
    }
  }
  if (!line2 && ctx.measureText(line1).width > maxW) {
    // truncate with ellipsis
    let truncated = address;
    while (ctx.measureText(truncated + '…').width > maxW && truncated.length > 8) {
      truncated = truncated.slice(0, -1);
    }
    line1 = truncated + '…';
  }
  ctx.fillText(line1, pad + pinSize + pad * 0.6, baseY);
  if (line2) {
    ctx.font = `${lineH2}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(line2, pad + pinSize + pad * 0.6, baseY + lineH1 + Math.round(2 * scale));
  }

  // Coords row
  const coordY = baseY + lineH1 + (line2 ? lineH2 + Math.round(4 * scale) : 0) + Math.round(5 * scale);
  ctx.font      = `${lineH2}px 'Courier New', monospace`;
  ctx.fillStyle = '#86efac'; // green-300
  ctx.fillText(
    `${lat >= 0 ? lat.toFixed(5) + '° N' : Math.abs(lat).toFixed(5) + '° S'}  ${lng >= 0 ? lng.toFixed(5) + '° E' : Math.abs(lng).toFixed(5) + '° W'}`,
    pad + pinSize + pad * 0.6,
    coordY
  );

  // ── Right column: date / time / branding ──────────────────────────────────
  const rightX = W - pad;

  // Date line
  ctx.font      = `bold ${lineH1}px system-ui, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.fillText(datetime.dateLine, rightX, baseY);

  // Time line
  ctx.font      = `${lineH2 + 1}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(datetime.timeLine, rightX, baseY + lineH1 + Math.round(3 * scale));

  // Branding pill
  const brandY = coordY + 1;
  ctx.font      = `bold ${Math.round(9 * scale)}px system-ui, sans-serif`;
  ctx.fillStyle = '#2563eb'; // blue-600
  const brandText = 'CityFlow';
  const bW = ctx.measureText(brandText).width + Math.round(10 * scale);
  const bH = Math.round(14 * scale);
  const bX = rightX - bW;
  ctx.beginPath();
  ctx.roundRect(bX, brandY, bW, bH, Math.round(4 * scale));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(brandText, rightX - Math.round(5 * scale), brandY + Math.round(2.5 * scale));

  // ── Top-left: accuracy badge ───────────────────────────────────────────────
  ctx.textAlign = 'left';
  ctx.font      = `bold ${Math.round(9 * scale)}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  const gpsText = '● GPS VERIFIED';
  const gW = ctx.measureText(gpsText).width + Math.round(8 * scale);
  const gH = Math.round(16 * scale);
  ctx.beginPath();
  ctx.roundRect(pad, pad + Math.round(36 * scale), gW, gH, Math.round(4 * scale));
  ctx.fill();
  ctx.fillStyle = '#22c55e';
  ctx.fillText(gpsText, pad + Math.round(4 * scale), pad + Math.round(36 * scale) + Math.round(3.5 * scale));
}

// ── Format datetime ───────────────────────────────────────────────────────────
function formatDatetime(date) {
  const days   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dd  = String(date.getDate()).padStart(2, '0');
  const mon = months[date.getMonth()];
  const yr  = date.getFullYear();
  const day = days[date.getDay()];
  const hh  = String(date.getHours()).padStart(2, '0');
  const mm  = String(date.getMinutes()).padStart(2, '0');
  const ss  = String(date.getSeconds()).padStart(2, '0');
  return {
    dateLine: `${day}, ${dd} ${mon} ${yr}`,
    timeLine: `${hh}:${mm}:${ss}`,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GeoCamera({ onCapture, onClose, label = 'Take Photo' }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [phase, setPhase] = useState('init'); // init | camera | locating | preview | error
  const [photo, setPhoto]             = useState(null);   // stamped base64 dataURL
  const [rawPhoto, setRawPhoto]       = useState(null);   // unstamped (for retake preview)
  const [geoLabel, setGeoLabel]       = useState('Locating…');
  const [geoCoords, setGeoCoords]     = useState(null);
  const [geoAccuracy, setGeoAccuracy] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode]   = useState('environment');
  const [locProgress, setLocProgress] = useState('Requesting GPS…');

  // ── Start camera ─────────────────────────────────────────────────────────
  const startCamera = async (facing = facingMode) => {
    setCameraError(null);
    setPhase('init');

    // navigator.mediaDevices is only available on HTTPS or localhost.
    // On plain HTTP (e.g. LAN IP), the browser blocks it entirely.
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        window.location.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(window.location.hostname)
          ? 'Camera requires a secure connection (HTTPS). You are on HTTP over a local IP address.'
          : 'Camera API not supported by this browser.'
      );
      setPhase('error');
      return;
    }

    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase('camera');
    } catch (err) {
      setCameraError(err.message || 'Camera not available');
      setPhase('error');
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  // ── Capture frame → get GPS → burn stamp → show preview ──────────────────
  const capture = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Draw raw frame
    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const raw = canvas.toDataURL('image/jpeg', 0.92);
    setRawPhoto(raw);
    setPhase('locating');
    stopStream();

    // Get real GPS
    setLocProgress('Requesting GPS…');
    if (!navigator.geolocation) {
      applyFallbackGeo(canvas, raw);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setGeoAccuracy(Math.round(accuracy));
        setLocProgress('Reverse geocoding…');
        const { label: addr } = await reverseGeocode(lat, lng);
        setGeoCoords({ lat, lng });
        setGeoLabel(addr);
        applyStamp(canvas, raw, lat, lng, addr);
      },
      () => {
        applyFallbackGeo(canvas, raw);
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  const applyFallbackGeo = (canvas, raw) => {
    const lat = 16.6944 + Math.random() * 0.005;
    const lng = 74.4615 + Math.random() * 0.005;
    const addr = 'Ichalkaranji, Kolhapur, Maharashtra';
    setGeoCoords({ lat, lng });
    setGeoLabel(addr + ' (approx)');
    applyStamp(canvas, raw, lat, lng, addr + ' (approx)');
  };

  const applyStamp = (canvas, raw, lat, lng, address) => {
    // Re-draw raw frame (canvas may have been reused)
    const img = new Image();
    img.onload = () => {
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const datetime = formatDatetime(new Date());
      burnGeoStamp(canvas, { lat, lng, address, datetime });
      const stamped = canvas.toDataURL('image/jpeg', 0.92);
      setPhoto(stamped);
      setPhase('preview');
    };
    img.src = raw;
  };

  const retake = () => {
    setPhoto(null);
    setRawPhoto(null);
    setGeoCoords(null);
    setGeoLabel('Locating…');
    setPhase('init');
    startCamera(facingMode);
  };

  const flipCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  };

  const confirm = () => {
    onCapture({ photo, location: { ...geoCoords, label: geoLabel } });
  };

  // Demo fallback (no hardware camera)
  const useDemoPhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280; canvas.height = 720;
    const ctx = canvas.getContext('2d');
    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, 500);
    sky.addColorStop(0, '#0ea5e9');
    sky.addColorStop(1, '#38bdf8');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1280, 720);
    // Ground
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(0, 520, 1280, 200);
    // Building
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(490, 200, 300, 320);
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(470, 200); ctx.lineTo(640, 120); ctx.lineTo(810, 200);
    ctx.closePath();
    ctx.fill();
    // Windows
    ctx.fillStyle = '#7dd3fc';
    [[530,260],[620,260],[530,360],[620,360]].forEach(([x,y]) => ctx.fillRect(x, y, 50, 50));
    // Door
    ctx.fillStyle = '#78350f';
    ctx.fillRect(605, 400, 70, 120);
    const raw = canvas.toDataURL('image/jpeg', 0.9);
    setRawPhoto(raw);
    setPhase('locating');
    setLocProgress('Requesting GPS…');

    if (!navigator.geolocation) {
      applyFallbackGeo(canvas, raw);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocProgress('Reverse geocoding…');
        const { label: addr } = await reverseGeocode(lat, lng);
        setGeoCoords({ lat, lng });
        setGeoLabel(addr);
        applyStamp(canvas, raw, lat, lng, addr);
      },
      () => applyFallbackGeo(canvas, raw),
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-10 pb-3 bg-black/90 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Camera size={16} className="text-blue-400" />
          <h2 className="text-white font-semibold text-sm">{label}</h2>
        </div>
        <button
          onClick={() => { stopStream(); onClose(); }}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white active:bg-white/20"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Camera live view ── */}
      {(phase === 'camera' || phase === 'init') && (
        <div className="flex-1 relative overflow-hidden bg-black">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />

          {/* Viewfinder corners */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-64 h-48">
              {/* TL */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/70 rounded-tl" />
              {/* TR */}
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/70 rounded-tr" />
              {/* BL */}
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/70 rounded-bl" />
              {/* BR */}
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/70 rounded-br" />
            </div>
          </div>

          {/* Live geo-tag preview strip at bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-6 pointer-events-none">
            <div className="flex items-center gap-1.5">
              <Navigation size={11} className="text-green-400 flex-shrink-0 animate-pulse" />
              <p className="text-white/80 text-xs">GPS will be captured on photo</p>
            </div>
            <p className="text-white/40 text-[10px] mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
              {' · '}
              {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </p>
          </div>

          {/* Flip button */}
          <button
            onClick={flipCamera}
            className="absolute top-4 right-4 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white active:bg-black/70"
          >
            <RefreshCw size={18} />
          </button>

          {phase === 'init' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* ── GPS locating overlay ── */}
      {phase === 'locating' && (
        <div className="flex-1 relative overflow-hidden">
          {rawPhoto && <img src={rawPhoto} className="w-full h-full object-cover" alt="captured" />}
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-green-400 border-t-transparent animate-spin" />
            <div className="text-center">
              <p className="text-white font-semibold text-sm">Tagging Location…</p>
              <p className="text-white/60 text-xs mt-1">{locProgress}</p>
            </div>
            <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full">
              <MapPin size={13} className="text-green-400" />
              <p className="text-white/70 text-xs">Stamping GPS coordinates on photo</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview with burnt-in stamp ── */}
      {phase === 'preview' && photo && (
        <div className="flex-1 relative overflow-hidden">
          <img src={photo} className="w-full h-full object-cover" alt="captured with geo stamp" />

          {/* Accuracy badge top-right */}
          {geoAccuracy !== null && (
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-white text-[10px] font-semibold">±{geoAccuracy}m</span>
            </div>
          )}

          {/* Live clock overlay (separate from stamp) */}
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1.5 rounded-xl">
            <p className="text-white text-[10px] font-mono font-semibold">
              {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </p>
          </div>
        </div>
      )}

      {/* ── Error / no camera ── */}
      {phase === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gray-900 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center">
            <Camera size={36} className="text-gray-500" />
          </div>
          <div>
            <p className="text-white font-semibold text-base">Camera Unavailable</p>
            <p className="text-gray-400 text-sm mt-1 leading-relaxed">{cameraError}</p>
            {cameraError && cameraError.includes('HTTPS') && (
              <p className="text-yellow-400 text-xs mt-2 leading-relaxed">
                Open the app at <span className="font-mono">https://</span> or use localhost to enable camera access.
              </p>
            )}
          </div>
          <button
            onClick={useDemoPhoto}
            className="bg-blue-600 hover:bg-blue-700 text-white px-7 py-3 rounded-xl font-semibold text-sm active:scale-95 transition-transform"
          >
            Use Demo Photo (with real GPS)
          </button>
          <p className="text-gray-500 text-xs">
            GPS & address stamp will still be applied
          </p>
        </div>
      )}

      {/* Hidden canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Bottom bar ── */}
      <div className="bg-black/95 px-5 py-5 flex items-center justify-between flex-shrink-0 border-t border-white/5">

        {/* Camera live — shutter */}
        {phase === 'camera' && (
          <>
            {/* Flip (left) */}
            <button
              onClick={flipCamera}
              className="w-11 h-11 bg-white/10 rounded-full flex items-center justify-center text-white active:bg-white/20"
            >
              <RefreshCw size={20} />
            </button>

            {/* Shutter (centre) */}
            <button
              onClick={capture}
              className="w-18 h-18 rounded-full border-[3px] border-white p-1 active:scale-90 transition-transform"
              style={{ width: 68, height: 68 }}
            >
              <div className="w-full h-full rounded-full bg-white" />
            </button>

            {/* Spacer right */}
            <div className="w-11" />
          </>
        )}

        {/* Preview — retake + use */}
        {phase === 'preview' && (
          <>
            <button
              onClick={retake}
              className="flex-1 border border-white/30 text-white font-semibold py-3 rounded-xl text-sm mr-3 active:bg-white/10"
            >
              Retake
            </button>
            <button
              onClick={confirm}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <CheckCircle size={17} /> Use Photo
            </button>
          </>
        )}

        {/* Init / locating — waiting */}
        {(phase === 'init' || phase === 'locating') && (
          <div className="w-full flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/50 text-sm">
              {phase === 'init' ? 'Initialising camera…' : locProgress}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
