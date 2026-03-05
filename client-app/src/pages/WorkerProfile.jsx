import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useClient } from '../context/ClientContext';
import { authAPI } from '../services/api';
import {
  Lock, CheckCircle2, Eye, EyeOff,
  Phone, Mail, Briefcase, MapPin, Hash, LogOut,
} from 'lucide-react-native';

const INFO_ROWS = [
  { label: 'Employee ID', key: 'displayId',  Icon: Hash      },
  { label: 'Email',       key: 'email',      Icon: Mail      },
  { label: 'Phone',       key: 'phone',      Icon: Phone     },
  { label: 'Ward',        key: 'ward',       Icon: MapPin    },
  { label: 'Category',    key: 'category',   Icon: Briefcase },
];

export default function WorkerProfile({ onLogout }) {
  const { user } = useClient();
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [status, setStatus]           = useState(null); // null | 'success' | 'error'
  const [errorMsg, setErrorMsg]       = useState('');
  const [loading, setLoading]         = useState(false);

  const handleChange = async () => {
    setStatus(null);
    if (form.newPass.length < 4)       { setErrorMsg('New password must be at least 4 characters.'); setStatus('error'); return; }
    if (form.newPass !== form.confirm)  { setErrorMsg('Passwords do not match.');                    setStatus('error'); return; }
    setLoading(true);
    try {
      await authAPI.changePassword(form.current, form.newPass);
      setStatus('success');
      setForm({ current: '', newPass: '', confirm: '' });
    } catch (err) {
      const msg = err.response?.data?.detail
        || err.response?.data?.current_password?.[0]
        || err.response?.data?.new_password?.[0]
        || 'Failed to change password. Please try again.';
      setErrorMsg(msg);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = form.current && form.newPass && form.confirm;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.root}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.decCircle1} />
            <View style={styles.decCircle2} />

            <View style={styles.profileRow}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{user?.name}</Text>
                <Text style={styles.profileRole}>{user?.category}</Text>
                <View style={styles.profileBadges}>
                  <View style={styles.wardBadge}>
                    <Text style={styles.wardBadgeText}>{user?.ward}</Text>
                  </View>
                  <View style={styles.idBadge}>
                    <Text style={styles.idBadgeText}>{user?.displayId}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Info card */}
          <View style={styles.infoCard}>
            <Text style={styles.cardSectionLabel}>EMPLOYEE INFORMATION</Text>
            <View style={{ gap: 10 }}>
              {INFO_ROWS.map(({ label, key, Icon }) => (
                <View key={key} style={styles.infoRow}>
                  <View style={styles.infoIconBox}>
                    <Icon size={14} color="#6b7280" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>{label}</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>{user?.[key] || '—'}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Change Password */}
          <View style={styles.passwordCard}>
            <View style={styles.passwordHeader}>
              <View style={styles.lockIconBox}>
                <Lock size={15} color="#334155" />
              </View>
              <Text style={styles.passwordTitle}>Change Password</Text>
            </View>

            {status === 'success' && (
              <View style={styles.successBox}>
                <CheckCircle2 size={16} color="#22c55e" />
                <Text style={styles.successText}>Password changed successfully!</Text>
              </View>
            )}
            {status === 'error' && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Current Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={form.current}
                onChangeText={v => setForm(p => ({ ...p, current: v }))}
                placeholder="Enter current password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showCurrent}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowCurrent(v => !v)}>
                {showCurrent ? <EyeOff size={16} color="#9ca3af" /> : <Eye size={16} color="#9ca3af" />}
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>New Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={form.newPass}
                onChangeText={v => setForm(p => ({ ...p, newPass: v }))}
                placeholder="Minimum 4 characters"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showNew}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew(v => !v)}>
                {showNew ? <EyeOff size={16} color="#9ca3af" /> : <Eye size={16} color="#9ca3af" />}
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Confirm New Password</Text>
            <TextInput
              style={[styles.inputRow, styles.inputSolo]}
              value={form.confirm}
              onChangeText={v => setForm(p => ({ ...p, confirm: v }))}
              placeholder="Re-enter new password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.updateBtn, (!canSubmit || loading) && styles.updateBtnDisabled]}
              onPress={handleChange}
              disabled={!canSubmit || loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.updateBtnText}>Update Password</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 40 }}>
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <LogOut size={16} color="#ef4444" />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { paddingTop: 52, paddingBottom: 64, paddingHorizontal: 20, backgroundColor: '#1e293b', overflow: 'hidden', position: 'relative' },
  decCircle1: { position: 'absolute', top: -24, right: -24, width: 128, height: 128, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 64 },
  decCircle2: { position: 'absolute', top: 40, right: 32, width: 56, height: 56, backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: 28 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16, zIndex: 1 },
  avatarBox: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563eb', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  profileName: { color: '#fff', fontSize: 20, fontWeight: '700' },
  profileRole: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  profileBadges: { flexDirection: 'row', gap: 8, marginTop: 6 },
  wardBadge: { backgroundColor: '#2563eb', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  wardBadgeText: { color: '#fff', fontSize: 11, fontWeight: '500' },
  idBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  idBadgeText: { color: '#cbd5e1', fontSize: 11, fontWeight: '500' },
  infoCard: { marginHorizontal: 16, marginTop: -32, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8, zIndex: 10 },
  cardSectionLabel: { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.5, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  infoIconBox: { width: 32, height: 32, backgroundColor: '#f3f4f6', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  infoContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 11, color: '#9ca3af' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#1f2937', maxWidth: '60%' },
  passwordCard: { marginHorizontal: 16, marginTop: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  passwordHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  lockIconBox: { width: 32, height: 32, backgroundColor: '#f1f5f9', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  passwordTitle: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  successBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 },
  successText: { fontSize: 13, color: '#15803d', fontWeight: '600' },
  errorBox: { backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 },
  errorText: { fontSize: 13, color: '#b91c1c' },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#4b5563', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, backgroundColor: '#f9fafb', paddingHorizontal: 16 },
  input: { flex: 1, fontSize: 13, color: '#111827', paddingVertical: 12 },
  inputSolo: { fontSize: 13, color: '#111827', paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, backgroundColor: '#f9fafb' },
  eyeBtn: { padding: 4 },
  updateBtn: { marginTop: 20, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: '#1e293b' },
  updateBtnDisabled: { backgroundColor: '#94a3b8' },
  updateBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  demoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
  demoText: { fontSize: 11, color: '#9ca3af' },
  demoPass: { fontWeight: '600', color: '#4b5563' },
  logoutBtn: { backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderColor: '#fecaca', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
});
