import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { ArrowLeft, Building2 } from 'lucide-react-native';
import { useClient } from '../context/ClientContext';

const wards = ['Ward 3','Ward 4','Ward 5','Ward 6','Ward 7','Ward 8','Ward 9','Ward 10','Ward 12','Ward 14'];

export default function Register({ onBack }) {
  const { register } = useClient();
  const [form, setForm] = useState({ name: '', email: '', phone: '', ward: '', password: '', confirm: '' });
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wardOpen, setWardOpen] = useState(false);
  const [error, setError] = useState('');

  const update = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    setError('');
    if (form.password !== form.confirm) { Alert.alert('Error', 'Passwords do not match'); return; }
    if (!form.name || !form.email || !form.phone || !form.ward || !form.password) {
      Alert.alert('Error', 'Please fill all fields'); return;
    }
    setLoading(true);
    const result = await register(form);
    setLoading(false);
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error);
    }
  };

  if (success) {
    return (
      <View style={styles.successRoot}>
        <View style={styles.successIcon}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Registered!</Text>
        <Text style={styles.successSub}>Your account has been created. You can now login.</Text>
        <TouchableOpacity onPress={onBack} style={styles.successBtn}>
          <Text style={styles.successBtnText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fields = [
    { key: 'name',     label: 'Full Name',       placeholder: 'Enter your full name',   secure: false, kb: 'default' },
    { key: 'email',    label: 'Email Address',    placeholder: 'example@email.com',      secure: false, kb: 'email-address' },
    { key: 'phone',    label: 'Mobile Number',    placeholder: '9876543210',             secure: false, kb: 'phone-pad' },
    { key: 'password', label: 'Password',         placeholder: 'Create a password',      secure: true,  kb: 'default' },
    { key: 'confirm',  label: 'Confirm Password', placeholder: 'Repeat password',        secure: true,  kb: 'default' },
  ];

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={16} color="#bfdbfe" />
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Account</Text>
        <Text style={styles.headerSub}>Join CityFlow as a Citizen</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {fields.map(f => (
          <View key={f.key} style={styles.fieldGroup}>
            <Text style={styles.label}>{f.label}</Text>
            <TextInput
              style={styles.input}
              value={form[f.key]}
              onChangeText={v => update(f.key, v)}
              placeholder={f.placeholder}
              placeholderTextColor="#9ca3af"
              secureTextEntry={f.secure}
              keyboardType={f.kb}
              autoCapitalize="none"
            />
          </View>
        ))}

        {/* Ward picker */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Select Ward</Text>
          <TouchableOpacity style={styles.input} onPress={() => setWardOpen(v => !v)}>
            <Text style={{ color: form.ward ? '#111827' : '#9ca3af', fontSize: 13 }}>
              {form.ward || '— Select your ward —'}
            </Text>
          </TouchableOpacity>
          {wardOpen && (
            <View style={styles.wardDropdown}>
              {wards.map(w => (
                <TouchableOpacity
                  key={w}
                  onPress={() => { update('ward', w); setWardOpen(false); }}
                  style={styles.wardOption}
                >
                  <Text style={[styles.wardOptionText, form.ward === w && styles.wardOptionSelected]}>
                    {w}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>Create Account</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { backgroundColor: '#2563eb', paddingTop: 52, paddingBottom: 32, paddingHorizontal: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText: { color: '#bfdbfe', fontSize: 13 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: { color: '#bfdbfe', fontSize: 13, marginTop: 2 },
  scroll: { padding: 20, paddingBottom: 40 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '600', color: '#4b5563', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 13, color: '#111827', backgroundColor: '#fff', justifyContent: 'center' },
  wardDropdown: { marginTop: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, overflow: 'hidden' },
  wardOption: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  wardOptionText: { fontSize: 13, color: '#374151' },
  wardOptionSelected: { color: '#2563eb', fontWeight: '600' },
  submitBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  errorText: { color: '#dc2626', fontSize: 12 },
  successRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#fff' },
  successIcon: { width: 80, height: 80, backgroundColor: '#dcfce7', borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  checkmark: { fontSize: 40, color: '#16a34a' },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  successSub: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  successBtn: { backgroundColor: '#2563eb', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
  successBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
