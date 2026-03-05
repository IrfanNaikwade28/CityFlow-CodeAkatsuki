import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ActivityIndicator, Image, SafeAreaView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Camera, MapPin, X, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react-native';

/**
 * GeoCamera — full-screen camera modal.
 * Props:
 *   visible: bool
 *   onCapture({ photo: uri, location: { lat, lng, label, address } })
 *   onClose()
 *   label — optional heading string
 *
 * Behaviour:
 *   - Requests BOTH camera and location permissions on open.
 *   - If either is denied, blocks usage and shows a message.
 *   - On capture, fetches real GPS coords + reverse-geocoded address.
 *   - Shows geo-tag overlay with lat, lng, address, and date/time.
 */
export default function GeoCamera({ visible, onCapture, onClose, label = 'Take Photo' }) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locPermission, setLocPermission] = useState(null); // 'granted' | 'denied' | null
  const [facing, setFacing] = useState('back');
  const [phase, setPhase] = useState('camera'); // camera | locating | preview | error
  const [photoUri, setPhotoUri] = useState(null);
  const [geoLabel, setGeoLabel] = useState('Locating…');
  const [geoAddress, setGeoAddress] = useState('');
  const [geoCoords, setGeoCoords] = useState(null);
  const [geoDateTime, setGeoDateTime] = useState('');
  const cameraRef = useRef(null);

  // Reset state and request permissions when modal opens
  useEffect(() => {
    if (!visible) return;
    setPhase('camera');
    setPhotoUri(null);
    setGeoLabel('Locating…');
    setGeoAddress('');
    setGeoCoords(null);
    setGeoDateTime('');
    requestAllPermissions();
  }, [visible]);

  const requestAllPermissions = async () => {
    // Camera permission
    if (cameraPermission && !cameraPermission.granted) {
      await requestCameraPermission();
    }
    // Location permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocPermission(status);
  };

  const bothGranted =
    cameraPermission?.granted &&
    locPermission === 'granted';

  const capture = async () => {
    if (!cameraRef.current) return;
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      setPhotoUri(pic.uri);
      setPhase('locating');
      await fetchGeo();
    } catch {
      setPhase('error');
    }
  };

  const fetchGeo = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = loc.coords;
      setGeoCoords({ lat: latitude, lng: longitude });

      const coordLabel = `${latitude.toFixed(5)}° N, ${longitude.toFixed(5)}° E`;
      setGeoLabel(coordLabel);

      // Reverse geocode
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (place) {
        const parts = [
          place.name,
          place.street,
          place.district || place.subregion,
          place.city,
        ].filter(Boolean);
        const address = parts.join(', ') || place.region || 'Unknown location';
        setGeoAddress(address);
      }
    } catch {
      // Real GPS failed — show best-effort coords
      setGeoLabel('GPS unavailable');
      setGeoAddress('Location could not be determined');
    }

    const now = new Date();
    setGeoDateTime(
      now.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
    );
    setPhase('preview');
  };

  const retake = () => {
    setPhotoUri(null);
    setGeoLabel('Locating…');
    setGeoAddress('');
    setGeoCoords(null);
    setPhase('camera');
  };

  const confirm = () => {
    onCapture({
      photo: photoUri,
      location: {
        lat: geoCoords?.lat,
        lng: geoCoords?.lng,
        label: geoAddress || geoLabel,
        address: geoAddress,
        coordLabel: geoLabel,
      },
    });
  };

  const flipCamera = () => setFacing(f => (f === 'back' ? 'front' : 'back'));

  if (!visible) return null;

  // Still loading permissions
  if (!cameraPermission || locPermission === null) {
    return (
      <Modal visible={visible} animationType="slide" statusBarTranslucent>
        <View style={styles.centered}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.waitText}>Checking permissions…</Text>
        </View>
      </Modal>
    );
  }

  // Either permission denied — block and show message
  if (!bothGranted) {
    const cameraOk = cameraPermission?.granted;
    const locOk = locPermission === 'granted';
    return (
      <Modal visible={visible} animationType="slide" statusBarTranslucent>
        <SafeAreaView style={styles.root}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{label}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={22} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
          <View style={styles.centered}>
            <AlertTriangle size={48} color="#f59e0b" />
            <Text style={styles.errorTitle}>Permissions Required</Text>
            <Text style={styles.errorBody}>
              Both Camera and Location access are required to use this feature.
              {'\n\n'}
              {!cameraOk ? '• Camera permission is denied.\n' : ''}
              {!locOk ? '• Location permission is denied.\n' : ''}
              {'\n'}Please enable them in your device Settings.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={requestAllPermissions}
            >
              <Text style={styles.primaryBtnText}>Grant Permissions</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{label}</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        {/* Camera view */}
        {phase === 'camera' && (
          <View style={styles.cameraContainer}>
            <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
              <View style={styles.viewfinder} />
            </CameraView>
          </View>
        )}

        {/* Locating GPS */}
        {phase === 'locating' && photoUri && (
          <View style={styles.photoContainer}>
            <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.overlayText}>Getting your location…</Text>
            </View>
          </View>
        )}

        {/* Preview with geo-tag */}
        {phase === 'preview' && photoUri && (
          <View style={styles.photoContainer}>
            <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
            <View style={styles.geoStamp}>
              <View style={styles.geoStampContent}>
                {/* Address line */}
                <View style={styles.geoRow}>
                  <MapPin size={13} color="#4ade80" />
                  <Text style={styles.geoAddress} numberOfLines={2}>{geoAddress || geoLabel}</Text>
                </View>
                {/* Coordinates */}
                <Text style={styles.geoCoords}>{geoLabel}</Text>
                {/* Date/time + watermark */}
                <View style={styles.geoFooterRow}>
                  <Text style={styles.geoDateTime}>{geoDateTime}</Text>
                  <Text style={styles.geoWatermark}>CityFlow</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Error */}
        {phase === 'error' && (
          <View style={styles.centered}>
            <Camera size={48} color="#6b7280" />
            <Text style={styles.errorTitle}>Capture failed</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={retake}>
              <Text style={styles.primaryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom bar */}
        <View style={styles.bottomBar}>
          {phase === 'camera' && (
            <View style={styles.shutterRow}>
              <View style={{ width: 48 }} />
              <TouchableOpacity style={styles.shutter} onPress={capture}>
                <View style={styles.shutterInner} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.flipSmallBtn} onPress={flipCamera}>
                <RefreshCw size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          {phase === 'preview' && (
            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.retakeBtn} onPress={retake}>
                <Text style={styles.retakeBtnText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirm}>
                <CheckCircle size={17} color="#fff" />
                <Text style={styles.confirmBtnText}>Use Photo</Text>
              </TouchableOpacity>
            </View>
          )}
          {phase === 'locating' && (
            <View style={styles.waitRow}>
              <Text style={styles.waitText}>Please wait…</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827', gap: 16, paddingHorizontal: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: 'rgba(0,0,0,0.8)' },
  headerTitle: { color: '#fff', fontWeight: '600', fontSize: 14 },
  cameraContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  viewfinder: { position: 'absolute', top: '25%', left: '12%', right: '12%', bottom: '25%', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 12 },
  photoContainer: { flex: 1, position: 'relative' },
  photo: { flex: 1, width: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', gap: 12 },
  overlayText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  // Geo-tag overlay
  geoStamp: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  geoStampContent: { backgroundColor: 'rgba(0,0,0,0.72)', paddingHorizontal: 16, paddingBottom: 16, paddingTop: 12, gap: 4 },
  geoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  geoAddress: { color: '#fff', fontSize: 12, fontWeight: '600', flex: 1, lineHeight: 17 },
  geoCoords: { color: '#4ade80', fontSize: 11, fontWeight: '500', marginLeft: 19 },
  geoFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, marginLeft: 19 },
  geoDateTime: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  geoWatermark: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  // Permission denied
  errorTitle: { color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center' },
  errorBody: { color: '#9ca3af', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  primaryBtn: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  // Bottom bar
  bottomBar: { backgroundColor: '#000', paddingHorizontal: 24, paddingVertical: 24 },
  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shutter: { width: 64, height: 64, borderRadius: 32, borderWidth: 4, borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff' },
  flipSmallBtn: { width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  previewActions: { flexDirection: 'row', gap: 12 },
  retakeBtn: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  retakeBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  confirmBtn: { flex: 1, backgroundColor: '#22c55e', paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  confirmBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  waitRow: { alignItems: 'center' },
  waitText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
});
