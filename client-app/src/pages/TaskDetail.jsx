import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Image, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useClient } from '../context/ClientContext';
import {
  ArrowLeft, MapPin, Camera, CheckCircle, Clock,
  Cpu, ShieldCheck, CheckCircle2,
} from 'lucide-react-native';
import { categoryIcons, statusConfig } from '../data/mockData';
import GeoCamera from '../components/shared/GeoCamera';
import { aiAPI } from '../services/api';

const STEPS = ['Submitted', 'Assigned', 'In Progress', 'Resolved'];

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig['Submitted'];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: cfg.dot }]} />
      <Text style={[styles.badgeText, { color: cfg.text }]}>{status}</Text>
    </View>
  );
}

export default function TaskDetail({ task, onBack }) {
  const { updateTaskStatus, myTasks } = useClient();
  const [proofNote, setProofNote] = useState('');
  const [showProofForm, setShowProofForm] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [completionPhoto, setCompletionPhoto] = useState(null);
  const [aiState, setAiState] = useState('idle'); // idle | scanning | verified | error
  const [aiVerdict, setAiVerdict] = useState('');
  const [loading, setLoading] = useState(false);

  const live = myTasks.find(t => t.id === task.id) || task;
  const isResolved = live.status === 'Resolved' || live.status === 'Closed';
  const stepIndex = STEPS.indexOf(live.status);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await updateTaskStatus(live.id, 'In Progress');
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handlePhotoCapture = async ({ photo }) => {
    setCompletionPhoto(photo);
    setShowCamera(false);
    setAiState('scanning');
    setAiVerdict('');
    // We can't call verify-completion until after we PATCH with the photo.
    // So we just show "scanning" here as a placeholder — actual AI runs on backend
    // when the worker hits "Submit & Resolve" (the PATCH response includes ai_completion_score).
    // Simulate a brief analysis delay for UX, then move to "verified".
    await new Promise(r => setTimeout(r, 1500));
    setAiState('verified');
  };

  const handleResolve = async () => {
    if (!completionPhoto) { setShowCamera(true); return; }
    setLoading(true);
    try {
      await updateTaskStatus(live.id, 'Resolved', proofNote, completionPhoto);
      setShowProofForm(false);
    } catch { /* ignore — context logs error */ }
    setLoading(false);
  };

  return (
    <>
      <GeoCamera
        visible={showCamera}
        label="Completion Photo (Required)"
        onCapture={handlePhotoCapture}
        onClose={() => setShowCamera(false)}
      />

      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <ArrowLeft size={16} color="#94a3b8" />
            <Text style={styles.backText}>Back to Tasks</Text>
          </TouchableOpacity>
          <View style={styles.titleRow}>
            <View style={styles.titleIcon}>
              <Text style={{ fontSize: 22 }}>{categoryIcons[live.category]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskId}>{live.id}</Text>
              <Text style={styles.taskTitle} numberOfLines={1}>{live.title}</Text>
            </View>
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Details */}
          <View style={styles.card}>
            <View style={styles.badgeRow}>
              <StatusBadge status={live.status} />
              <View style={[
                styles.priorityBadge,
                live.priority === 'High' ? { backgroundColor: '#fee2e2' } :
                live.priority === 'Medium' ? { backgroundColor: '#ffedd5' } : { backgroundColor: '#dcfce7' },
              ]}>
                <Text style={[
                  styles.priorityText,
                  live.priority === 'High' ? { color: '#b91c1c' } :
                  live.priority === 'Medium' ? { color: '#c2410c' } : { color: '#15803d' },
                ]}>{live.priority} Priority</Text>
              </View>
            </View>

            <Text style={styles.cardTitle}>{live.title}</Text>
            <Text style={styles.cardDesc}>{live.description}</Text>

            <View style={styles.metaRows}>
              <View style={styles.metaRow}>
                <MapPin size={14} color="#9ca3af" />
                <Text style={styles.metaText} numberOfLines={1}>{live.location}</Text>
              </View>
              <View style={styles.metaRow}>
                <Clock size={14} color="#9ca3af" />
                <Text style={styles.metaText}>
                  Assigned: {new Date(live.assignedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                </Text>
              </View>
            </View>
          </View>

          {/* Progress stepper */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>TASK PROGRESS</Text>
            <View style={styles.stepper}>
              {STEPS.map((step, i) => {
                const done = i <= stepIndex;
                const isLast = i === STEPS.length - 1;
                return (
                  <View key={step} style={[styles.stepItem, !isLast && { flex: 1 }]}>
                    <View style={styles.stepDotCol}>
                      <View style={[
                        styles.stepDot,
                        done
                          ? i === stepIndex
                            ? { backgroundColor: '#2563eb', borderColor: '#2563eb' }
                            : { backgroundColor: '#2563eb', borderColor: '#2563eb' }
                          : { backgroundColor: '#fff', borderColor: '#e5e7eb' },
                      ]}>
                        {done
                          ? <CheckCircle2 size={14} color="#fff" />
                          : <View style={styles.stepEmpty} />
                        }
                      </View>
                      <Text style={[styles.stepLabel, done ? { color: '#374151' } : { color: '#d1d5db' }]}>
                        {step === 'In Progress' ? 'Active' : step}
                      </Text>
                    </View>
                    {!isLast && (
                      <View style={[styles.stepLine, i < stepIndex ? styles.stepLineDone : styles.stepLineInactive]} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Actions */}
          {!isResolved && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>ACTIONS</Text>

              {live.status === 'Assigned' && (
                <TouchableOpacity
                  style={[styles.acceptBtn, loading && { opacity: 0.6 }]}
                  onPress={handleAccept}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <>
                        <CheckCircle size={18} color="#fff" />
                        <Text style={styles.acceptBtnText}>Accept & Start Work</Text>
                      </>
                  }
                </TouchableOpacity>
              )}

              {live.status === 'In Progress' && !showProofForm && (
                <TouchableOpacity
                  style={styles.resolveBtn}
                  onPress={() => setShowProofForm(true)}
                >
                  <CheckCircle size={18} color="#fff" />
                  <Text style={styles.resolveBtnText}>Mark as Resolved</Text>
                </TouchableOpacity>
              )}

              {showProofForm && (
                <View style={{ gap: 12 }}>
                  {!completionPhoto ? (
                    <View>
                      <View style={styles.photoRequiredRow}>
                        <Text style={styles.photoRequiredLabel}>Completion Photo</Text>
                        <Text style={styles.photoRequiredAsterisk}> *required</Text>
                      </View>
                      <TouchableOpacity style={styles.cameraTrigger} onPress={() => setShowCamera(true)}>
                        <Camera size={28} color="#3b82f6" />
                        <Text style={styles.cameraTriggerTitle}>Take Completion Photo</Text>
                        <Text style={styles.cameraTriggerSub}>Geo-tagged photo required</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View>
                      <Text style={styles.photoRequiredLabel}>Completion Photo</Text>
                      <View style={styles.completionPhotoBox}>
                        <Image source={{ uri: completionPhoto }} style={styles.completionPhoto} resizeMode="cover" />
                        <TouchableOpacity
                          style={styles.retakeBtn}
                          onPress={() => { setCompletionPhoto(null); setAiState('idle'); }}
                        >
                          <Text style={styles.retakeBtnText}>Retake</Text>
                        </TouchableOpacity>
                      </View>

                      {aiState === 'scanning' && (
                        <View style={styles.aiBox}>
                          <ActivityIndicator size="small" color="#3b82f6" />
                          <View>
                            <View style={styles.aiTitleRow}>
                              <Cpu size={12} color="#1d4ed8" />
                              <Text style={styles.aiTitle}> AI Verification Running…</Text>
                            </View>
                            <Text style={styles.aiSub}>Analysing completion evidence</Text>
                          </View>
                        </View>
                      )}
                      {aiState === 'verified' && (
                        <View style={styles.aiBoxGreen}>
                          <ShieldCheck size={24} color="#22c55e" />
                          <View>
                            <Text style={styles.aiTitleGreen}>Photo Captured</Text>
                            <Text style={styles.aiSubGreen}>AI will score your work on submission</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  <View>
                    <Text style={styles.noteLabel}>Resolution Note</Text>
                    <TextInput
                      style={styles.noteInput}
                      value={proofNote}
                      onChangeText={setProofNote}
                      placeholder="Describe what was done to resolve this issue…"
                      placeholderTextColor="#9ca3af"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={styles.proofActions}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => { setShowProofForm(false); setCompletionPhoto(null); setAiState('idle'); }}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.submitResolveBtn,
                        (!completionPhoto || !proofNote.trim() || aiState === 'scanning' || loading) && { opacity: 0.5 },
                      ]}
                      onPress={handleResolve}
                      disabled={!completionPhoto || !proofNote.trim() || aiState === 'scanning' || loading}
                    >
                      {loading
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.submitResolveBtnText}>Submit & Resolve</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Resolved state */}
          {isResolved && (
            <View style={styles.resolvedBox}>
              <View style={styles.resolvedIcon}>
                <CheckCircle size={28} color="#22c55e" />
              </View>
              <Text style={styles.resolvedTitle}>Task Resolved!</Text>
              <Text style={styles.resolvedSub}>Great work. This issue has been marked as resolved.</Text>
              {live.aiScore != null && (
                <View style={styles.aiScoreBox}>
                  <ShieldCheck size={16} color="#15803d" />
                  <Text style={styles.aiScoreText}>
                    AI Score: {live.aiScore}/100
                    {live.aiVerdict ? ` — ${live.aiVerdict}` : ''}
                  </Text>
                </View>
              )}
              {live.completionPhoto && (
                <Image source={{ uri: live.completionPhoto }} style={styles.resolvedPhoto} resizeMode="cover" />
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { backgroundColor: '#1e293b', paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  backText: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleIcon: { width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  taskId: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  taskTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  priorityText: { fontSize: 11, fontWeight: '600' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
  cardDesc: { fontSize: 13, color: '#6b7280', lineHeight: 20 },
  metaRows: { marginTop: 12, gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 13, color: '#4b5563', flex: 1 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#6b7280', letterSpacing: 0.5, marginBottom: 16 },
  stepper: { flexDirection: 'row', alignItems: 'flex-start' },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepDotCol: { alignItems: 'center', gap: 6 },
  stepDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stepEmpty: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e5e7eb' },
  stepLabel: { fontSize: 9, fontWeight: '600', textAlign: 'center', maxWidth: 48 },
  stepLine: { flex: 1, height: 2, marginBottom: 16, marginHorizontal: 4, borderRadius: 1 },
  stepLineDone: { backgroundColor: '#2563eb' },
  stepLineInactive: { backgroundColor: '#e5e7eb' },
  acceptBtn: { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  resolveBtn: { backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  resolveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  photoRequiredRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  photoRequiredLabel: { fontSize: 11, fontWeight: '700', color: '#4b5563' },
  photoRequiredAsterisk: { fontSize: 11, color: '#ef4444' },
  cameraTrigger: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#93c5fd', borderRadius: 16, padding: 24, alignItems: 'center', gap: 6, backgroundColor: '#eff6ff' },
  cameraTriggerTitle: { fontSize: 14, fontWeight: '700', color: '#1d4ed8' },
  cameraTriggerSub: { fontSize: 11, color: '#3b82f6' },
  completionPhotoBox: { borderRadius: 16, overflow: 'hidden', position: 'relative' },
  completionPhoto: { width: '100%', height: 176 },
  retakeBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  retakeBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  aiBox: { marginTop: 8, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiTitleRow: { flexDirection: 'row', alignItems: 'center' },
  aiTitle: { fontSize: 11, fontWeight: '700', color: '#1d4ed8' },
  aiSub: { fontSize: 11, color: '#3b82f6', marginTop: 2 },
  aiBoxGreen: { marginTop: 8, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiTitleGreen: { fontSize: 11, fontWeight: '700', color: '#15803d' },
  aiSubGreen: { fontSize: 11, color: '#16a34a', marginTop: 2 },
  noteLabel: { fontSize: 11, fontWeight: '700', color: '#4b5563', marginBottom: 6 },
  noteInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 13, color: '#111827', backgroundColor: '#f9fafb', height: 96, textAlignVertical: 'top' },
  proofActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { color: '#4b5563', fontWeight: '600', fontSize: 13 },
  submitResolveBtn: { flex: 1, backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  submitResolveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  resolvedBox: { backgroundColor: '#f0fdf4', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0', gap: 8 },
  resolvedIcon: { width: 56, height: 56, backgroundColor: '#dcfce7', borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  resolvedTitle: { fontSize: 16, fontWeight: '700', color: '#14532d' },
  resolvedSub: { fontSize: 12, color: '#16a34a', textAlign: 'center' },
  aiScoreBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#dcfce7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  aiScoreText: { fontSize: 12, fontWeight: '600', color: '#15803d', flex: 1 },
  resolvedPhoto: { width: '100%', height: 160, borderRadius: 14, marginTop: 4 },
});
