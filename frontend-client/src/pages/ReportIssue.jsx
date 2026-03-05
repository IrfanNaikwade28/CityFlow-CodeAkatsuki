import { useState } from 'react';
import { useClient } from '../context/ClientContext';
import { ArrowLeft, MapPin, Camera, ChevronDown, Eye, Lock, CheckCircle, Cpu, ShieldCheck } from 'lucide-react';
import GeoCamera from '../components/shared/GeoCamera';
import { apiAIDetectIssue, dataURLtoBlob } from '../services/api';

const categories = ['Road', 'Water', 'Electricity', 'Garbage', 'Traffic', 'Public Facilities'];
const categoryIcons = { Road: '🛣️', Water: '💧', Electricity: '⚡', Garbage: '🗑️', Traffic: '🚦', 'Public Facilities': '🏛️' };
const WARDS = ['Ward 2','Ward 3','Ward 4','Ward 5','Ward 6','Ward 7','Ward 9','Ward 11','Ward 12','Ward 14'];

const steps = ['Photo', 'Details', 'Submit'];

export default function ReportIssue({ onBack, onSuccess }) {
  const { submitComplaint, user } = useClient();
  const [step, setStep] = useState(1); // 1=Camera, 2=Details, 3=Submit
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [capturedLocation, setCapturedLocation] = useState(null);
  const [form, setForm] = useState({
    category: '',
    title: '',
    description: '',
    location: user?.ward + ', Ichalkaranji',
    ward: user?.ward || 'Ward 5',
    isPublic: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [aiDetecting, setAiDetecting] = useState(false);
  const [aiResult, setAiResult] = useState(null); // { category, title, confidence }

  const handleCameraCapture = async ({ photo, location }) => {
    setCapturedPhoto(photo);
    setCapturedLocation(location);
    setShowCamera(false);
    // Pre-fill location from GPS
    if (location?.label) {
      setForm(p => ({ ...p, location: location.label }));
    }
    // AI: detect issue category + title from photo
    setAiDetecting(true);
    setAiResult(null);
    try {
      const blob = dataURLtoBlob(photo);
      const result = await apiAIDetectIssue(blob);
      setAiResult(result);
      // Pre-fill category and title if not yet set
      setForm(p => ({
        ...p,
        category: p.category || result.category || p.category,
        title: p.title || result.title || p.title,
      }));
    } catch {
      // AI failed silently — user fills manually
    } finally {
      setAiDetecting(false);
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const id = await submitComplaint({
        ...form,
        image: capturedPhoto,
        gpsLocation: capturedLocation,
      });
      onSuccess(id);
    } catch (err) {
      console.error('submitComplaint error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const isStep2Valid = form.category && form.title.trim() && form.description.trim();

  if (showCamera) {
    return (
      <GeoCamera
        label="Take Issue Photo"
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
      />
    );
  }

  return (
    <div className="mobile-container">
      {/* Header */}
      <div className="bg-[#2563eb] pt-10 pb-6 px-5">
        <button
          onClick={step === 1 ? onBack : () => setStep(s => s - 1)}
          className="flex items-center gap-2 text-blue-200 hover:text-white mb-4 text-sm"
        >
          <ArrowLeft size={16} /> {step === 1 ? 'Back' : 'Previous'}
        </button>
        <h1 className="text-white text-xl font-bold">Report an Issue</h1>
        <p className="text-blue-200 text-sm mt-1">Help improve your city</p>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mt-4">
          {steps.map((label, i) => {
            const s = i + 1;
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  ${step > s ? 'bg-white text-[#2563eb]' : step === s ? 'bg-white text-[#2563eb]' : 'bg-white/30 text-white'}`}>
                  {step > s ? <CheckCircle size={14} /> : s}
                </div>
                {s < steps.length && (
                  <div className={`h-0.5 w-8 ${step > s ? 'bg-white' : 'bg-white/30'}`} />
                )}
              </div>
            );
          })}
          <p className="text-blue-200 text-xs ml-2">{steps[step - 1]}</p>
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">

        {/* ─── Step 1: Camera ─── */}
        {step === 1 && (
          <>
            <div className="text-center py-4">
              <Camera size={40} className="text-[#2563eb] mx-auto mb-3" />
              <p className="text-base font-bold text-gray-800">Take a Photo First</p>
              <p className="text-sm text-gray-500 mt-1">A photo with location tag is required to report an issue</p>
            </div>

            {/* Show preview if already captured */}
            {capturedPhoto ? (
              <div className="relative rounded-2xl overflow-hidden border border-gray-200">
                <img src={capturedPhoto} alt="captured" className="w-full h-52 object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-green-400" />
                    <p className="text-white text-xs truncate">{capturedLocation?.label || 'Location captured'}</p>
                  </div>
                </div>
                <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle size={11} /> Captured
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-blue-200 rounded-2xl p-8 text-center bg-blue-50">
                <Camera size={28} className="text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-blue-600 font-medium">No photo yet</p>
              </div>
            )}

            <button
              onClick={() => setShowCamera(true)}
              className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2"
            >
              <Camera size={18} />
              {capturedPhoto ? 'Retake Photo' : 'Open Camera'}
            </button>

            {capturedPhoto && (
              <button
                onClick={() => setStep(2)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-xl"
              >
                Continue to Details
              </button>
            )}

            <p className="text-xs text-gray-400 text-center">
              Your photo and GPS location will be attached to help authorities respond faster.
            </p>
          </>
        )}

        {/* ─── Step 2: Title / Description / Category ─── */}
        {step === 2 && (
          <>
            {/* AI detection status */}
            {aiDetecting && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full border-[3px] border-blue-400 border-t-transparent animate-spin flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-blue-700 flex items-center gap-1">
                    <Cpu size={11} /> AI analysing your photo…
                  </p>
                  <p className="text-xs text-blue-500">Auto-filling category and title</p>
                </div>
              </div>
            )}
            {!aiDetecting && aiResult && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
                <ShieldCheck size={20} className="text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-green-700">AI detected: {aiResult.category}</p>
                  <p className="text-xs text-green-500">{Math.round((aiResult.confidence || 0) * 100)}% confidence · fields pre-filled</p>
                </div>
              </div>
            )}
            {/* Category */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">SELECT CATEGORY *</p>
              <div className="grid grid-cols-3 gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setForm(p => ({ ...p, category: cat }))}
                    className={`py-3 rounded-xl border-2 text-center transition-all
                      ${form.category === cat
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <div className="text-2xl mb-1">{categoryIcons[cat]}</div>
                    <p className="text-xs font-medium text-gray-700 leading-tight">{cat}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Issue Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Brief description of the issue"
                maxLength={80}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Detailed Description *</label>
              <textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe the issue — when did it start, impact on public..."
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <button
              onClick={() => setStep(3)}
              disabled={!isStep2Valid}
              className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
            >
              Next: Review & Submit
            </button>
          </>
        )}

        {/* ─── Step 3: Visibility + Submit ─── */}
        {step === 3 && (
          <>
            {/* Location */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Location</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-3.5 text-gray-400" />
                <input
                  type="text"
                  value={form.location}
                  onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                  placeholder="Enter the address or landmark"
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              {capturedLocation && (
                <div className="mt-2 p-3 bg-green-50 rounded-xl border border-green-100 flex items-center gap-2">
                  <MapPin size={14} className="text-green-600 flex-shrink-0" />
                  <p className="text-xs text-green-700">GPS: {capturedLocation.label}</p>
                </div>
              )}
            </div>

            {/* Ward */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ward</label>
              <div className="relative">
                <select
                  value={form.ward}
                  onChange={e => setForm(p => ({ ...p, ward: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 appearance-none"
                >
                  {WARDS.map(w => <option key={w}>{w}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Public / Private toggle */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">VISIBILITY</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setForm(p => ({ ...p, isPublic: true }))}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                    ${form.isPublic ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}
                >
                  <Eye size={22} className={form.isPublic ? 'text-blue-600' : 'text-gray-400'} />
                  <div className="text-center">
                    <p className={`text-sm font-semibold ${form.isPublic ? 'text-blue-700' : 'text-gray-600'}`}>Public</p>
                    <p className="text-xs text-gray-400 leading-tight mt-0.5">Visible on Civic Feed &amp; sent to authorities</p>
                  </div>
                </button>
                <button
                  onClick={() => setForm(p => ({ ...p, isPublic: false }))}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                    ${!form.isPublic ? 'border-gray-600 bg-gray-50' : 'border-gray-200 bg-white'}`}
                >
                  <Lock size={22} className={!form.isPublic ? 'text-gray-700' : 'text-gray-400'} />
                  <div className="text-center">
                    <p className={`text-sm font-semibold ${!form.isPublic ? 'text-gray-800' : 'text-gray-600'}`}>Private</p>
                    <p className="text-xs text-gray-400 leading-tight mt-0.5">Only sent to authorities, not public</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <p className="text-xs font-semibold text-gray-500 mb-2">ISSUE SUMMARY</p>
              {capturedPhoto && (
                <img src={capturedPhoto} alt="issue" className="w-full h-32 object-cover rounded-lg mb-2" />
              )}
              {[
                ['Category', `${categoryIcons[form.category]} ${form.category}`],
                ['Title', form.title],
                ['Ward', form.ward],
                ['Visibility', form.isPublic ? '🌐 Public' : '🔒 Private'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-800 text-right max-w-[180px] truncate">{val}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl">
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-[#2563eb] hover:bg-blue-700 text-white font-semibold py-3 rounded-xl disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Submit Issue'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
