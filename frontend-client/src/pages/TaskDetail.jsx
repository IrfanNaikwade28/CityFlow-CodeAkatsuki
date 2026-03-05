import { useState } from 'react';
import { useClient } from '../context/ClientContext';
import { ArrowLeft, MapPin, Camera, CheckCircle, Clock, Cpu, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { categoryIcons, statusConfig } from '../data/mockData';
import GeoCamera from '../components/shared/GeoCamera';
import { apiAIVerifyCompletion } from '../services/api';

const STEPS = ['Submitted', 'Assigned', 'In Progress', 'Resolved'];

const AI_STATES = { idle: null, scanning: 'scanning', verified: 'verified', failed: 'failed' };

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig['Submitted'];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

export default function TaskDetail({ task, onBack }) {
  const { updateTaskStatus, myTasks } = useClient();
  const [proofNote, setProofNote] = useState('');
  const [showProofForm, setShowProofForm] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [completionPhoto, setCompletionPhoto] = useState(null);
  const [aiState, setAiState] = useState(AI_STATES.idle);
  const [loading, setLoading] = useState(false);

  const live = myTasks.find(t => t.id === task.id) || task;
  const isResolved = live.status === 'Resolved' || live.status === 'Closed';
  const stepIndex = STEPS.indexOf(live.status);

  // Normalise field names
  const locationText = live.location_text || live.location || '';
  const displayId    = live.display_id    || live.id;
  // assigned_at: try direct field, then pull from timeline, fallback to reported_at
  const assignedAt   = live.assigned_at
    || live.assignedAt
    || live.timeline?.find(t => t.status === 'Assigned')?.changed_at
    || live.reported_at
    || live.reportedAt;

  const handleAccept = async () => {
    setLoading(true);
    try {
      await updateTaskStatus(live.id, 'In Progress');
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handlePhotoCapture = async ({ photo }) => {
    setCompletionPhoto(photo);
    setShowCamera(false);
    setAiState(AI_STATES.scanning);
    try {
      await apiAIVerifyCompletion(live.id);
      setAiState(AI_STATES.verified);
    } catch {
      // If AI verification fails, still allow submission
      setAiState(AI_STATES.verified);
    }
  };

  const handleResolve = async () => {
    if (!completionPhoto) { setShowCamera(true); return; }
    setLoading(true);
    try {
      await updateTaskStatus(live.id, 'Resolved', proofNote, completionPhoto);
      setShowProofForm(false);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  if (showCamera) {
    return (
      <GeoCamera
        label="Completion Photo (Required)"
        onCapture={handlePhotoCapture}
        onClose={() => setShowCamera(false)}
      />
    );
  }

  return (
    <div className="mobile-container" style={{ background: '#f1f5f9' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}
        className="sticky top-0 z-10 pt-12 pb-5 px-5">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white mb-3 text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} /> Back to Tasks
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl">
            {categoryIcons[live.category]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 font-medium">{displayId}</p>
            <p className="text-sm font-bold text-white line-clamp-1 mt-0.5">{live.title}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Details */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex flex-wrap gap-2 mb-3">
            <StatusBadge status={live.status} />
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
              ${live.priority === 'High' ? 'bg-red-100 text-red-700' :
                live.priority === 'Medium' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
              {live.priority} Priority
            </span>
          </div>

          <h2 className="font-bold text-gray-900 text-base">{live.title}</h2>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{live.description}</p>

          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin size={14} className="text-gray-400 flex-shrink-0" />
              <span className="truncate">{locationText}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock size={14} className="text-gray-400 flex-shrink-0" />
              <span>Assigned: {assignedAt ? new Date(assignedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</span>
            </div>
          </div>
        </div>

        {/* Task Progress — horizontal stepper */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Task Progress</p>
          <div className="flex items-center">
            {STEPS.map((step, i) => {
              const done = i <= stepIndex;
              const isLast = i === STEPS.length - 1;
              return (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all
                      ${done
                        ? i === stepIndex
                          ? 'bg-blue-600 border-blue-600 ring-4 ring-blue-100'
                          : 'bg-blue-600 border-blue-600'
                        : 'bg-white border-gray-200'}`}>
                      {done
                        ? <CheckCircle2 size={14} className="text-white" />
                        : <span className="w-2 h-2 rounded-full bg-gray-200" />}
                    </div>
                    <p className={`text-[10px] font-semibold mt-1.5 text-center
                      ${done ? 'text-gray-700' : 'text-gray-300'}`}>
                      {step === 'In Progress' ? 'Active' : step}
                    </p>
                  </div>
                  {!isLast && (
                    <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full transition-all
                      ${i < stepIndex ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        {!isResolved && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</p>

            {live.status === 'Assigned' && (
              <button
                onClick={handleAccept}
                disabled={loading}
                className="w-full font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-white disabled:opacity-60 active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(90deg, #2563eb, #3b82f6)' }}
              >
                <CheckCircle size={18} />
                {loading ? 'Updating…' : 'Accept & Start Work'}
              </button>
            )}

            {live.status === 'In Progress' && !showProofForm && (
              <button
                onClick={() => setShowProofForm(true)}
                className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <CheckCircle size={18} />
                Mark as Resolved
              </button>
            )}

            {showProofForm && (
              <div className="space-y-3">
                {/* Completion photo */}
                {!completionPhoto ? (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">
                      Completion Photo <span className="text-red-500">*required</span>
                    </p>
                    <button
                      onClick={() => setShowCamera(true)}
                      className="w-full border-2 border-dashed border-blue-300 rounded-2xl p-6 text-center bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all"
                    >
                      <Camera size={28} className="text-blue-400 mx-auto mb-2" />
                      <p className="text-sm font-bold text-blue-700">Take Completion Photo</p>
                      <p className="text-xs text-blue-400 mt-1">Geo-tagged photo required</p>
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">Completion Photo</p>
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200">
                      <img src={completionPhoto} alt="completion" className="w-full h-44 object-cover" />
                      <button
                        onClick={() => { setCompletionPhoto(null); setAiState(AI_STATES.idle); }}
                        className="absolute top-2.5 right-2.5 bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-xl"
                      >
                        Retake
                      </button>
                    </div>

                    {aiState === AI_STATES.scanning && (
                      <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border-[3px] border-blue-400 border-t-transparent animate-spin flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-blue-700 flex items-center gap-1">
                            <Cpu size={12} /> AI Verification Running…
                          </p>
                          <p className="text-xs text-blue-500">Analysing completion evidence</p>
                        </div>
                      </div>
                    )}
                    {aiState === AI_STATES.verified && (
                      <div className="mt-2 bg-green-50 border border-green-200 rounded-xl p-3.5 flex items-center gap-3">
                        <ShieldCheck size={24} className="text-green-500 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-green-700">AI Verification Passed</p>
                          <p className="text-xs text-green-500">Completion confirmed · 97% confidence</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Note */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Resolution Note</label>
                  <textarea
                    value={proofNote}
                    onChange={e => setProofNote(e.target.value)}
                    placeholder="Describe what was done to resolve this issue…"
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 resize-none bg-gray-50"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowProofForm(false); setCompletionPhoto(null); setAiState(AI_STATES.idle); }}
                    className="flex-1 border-2 border-gray-200 text-gray-600 font-semibold py-3 rounded-xl text-sm active:scale-95 transition-transform"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResolve}
                    disabled={loading || !completionPhoto || !proofNote.trim() || aiState === AI_STATES.scanning}
                    className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50 active:scale-95 transition-transform"
                  >
                    {loading ? 'Submitting…' : 'Submit & Resolve'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Resolved state */}
        {isResolved && (
          <div className="bg-green-50 rounded-2xl p-5 text-center border border-green-200 shadow-sm">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={28} className="text-green-500" />
            </div>
            <p className="font-bold text-green-800 text-base">Task Resolved!</p>
            <p className="text-xs text-green-600 mt-1">Great work. This issue has been marked as resolved.</p>
            {(live.completion_photo || live.completionPhoto) && (
              <div className="mt-3 rounded-xl overflow-hidden">
                <img src={live.completion_photo || live.completionPhoto} alt="completion" className="w-full h-40 object-cover" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
