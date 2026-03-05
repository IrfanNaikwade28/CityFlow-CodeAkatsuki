const BASE = 'http://10.1.87.150:8000' || import.meta.env.VITE_API_BASE_URL;

// const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/';
 
// ── Token helpers ────────────────────────────────────────────────────────────
export const getAccessToken  = () => localStorage.getItem('cf_access');
export const getRefreshToken = () => localStorage.getItem('cf_refresh');
export const setTokens = (access, refresh) => {
  localStorage.setItem('cf_access', access);
  if (refresh) localStorage.setItem('cf_refresh', refresh);
};
export const clearTokens = () => {
  localStorage.removeItem('cf_access');
  localStorage.removeItem('cf_refresh');
};

// ── Token refresh ────────────────────────────────────────────────────────────
let refreshPromise = null;

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) throw new Error('No refresh token');
    const res = await fetch(`${BASE}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) {
      clearTokens();
      throw new Error('Session expired');
    }
    const data = await res.json();
    setTokens(data.access, null);
    return data.access;
  })();
  try {
    const token = await refreshPromise;
    return token;
  } finally {
    refreshPromise = null;
  }
}

// ── Core fetch wrapper ───────────────────────────────────────────────────────
async function apiFetch(path, options = {}, retry = true) {
  const token = getAccessToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Don't set Content-Type for FormData (let browser set boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    try {
      const newToken = await refreshAccessToken();
      return apiFetch(path, options, false);
    } catch {
      clearTokens();
      throw new Error('SESSION_EXPIRED');
    }
  }

  return res;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export async function apiLogin(email, password) {
  const res = await fetch(`${BASE}/api/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.non_field_errors?.[0] || 'Login failed');
  return data; // { user, access, refresh }
}

export async function apiRegister({ name, email, password, phone, ward }) {
  const res = await fetch(`${BASE}/api/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role: 'citizen', phone, ward }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = Object.values(data).flat().join(' ');
    throw new Error(msg || 'Registration failed');
  }
  return data;
}

export async function apiGetMe() {
  const res = await apiFetch('/api/auth/me/');
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
}

// ── Issues ───────────────────────────────────────────────────────────────────
export async function apiGetMyIssues() {
  const res = await apiFetch('/api/issues/my/');
  if (!res.ok) throw new Error('Failed to fetch issues');
  return res.json();
}

export async function apiGetAssignedIssues() {
  const res = await apiFetch('/api/issues/assigned/');
  if (!res.ok) throw new Error('Failed to fetch assigned issues');
  return res.json();
}

export async function apiGetNearbyIssues(lat, lng, radius_km = 5) {
  const res = await apiFetch(`/api/issues/nearby/?lat=${lat}&lng=${lng}&radius_km=${radius_km}`);
  if (!res.ok) throw new Error('Failed to fetch nearby issues');
  return res.json();
}

export async function apiGetPublicIssues(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await apiFetch(`/api/issues/${qs ? '?' + qs : ''}`);
  if (!res.ok) throw new Error('Failed to fetch issues');
  return res.json();
}

export async function apiGetIssueDetail(id) {
  const res = await apiFetch(`/api/issues/${id}/`);
  if (!res.ok) throw new Error('Failed to fetch issue detail');
  return res.json();
}

export async function apiSubmitIssue(formData) {
  // formData is a FormData object (multipart)
  const res = await apiFetch('/api/issues/', {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = Object.values(data).flat().join(' ');
    throw new Error(msg || 'Failed to submit issue');
  }
  return data;
}

export async function apiUpdateIssueStatus(issueId, status, note) {
  const res = await apiFetch(`/api/issues/${issueId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to update issue status');
  return data;
}

export async function apiSubmitCompletionPhoto(issueId, photoBlob, note) {
  const fd = new FormData();
  fd.append('completion_photo', photoBlob, 'completion.jpg');
  if (note) fd.append('note', note);
  fd.append('status', 'Resolved');
  const res = await apiFetch(`/api/issues/${issueId}/`, {
    method: 'PATCH',
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to submit completion photo');
  return data;
}

export async function apiUpvoteIssue(issueId) {
  const res = await apiFetch(`/api/issues/${issueId}/upvote/`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to upvote');
  return data; // { upvoted, upvotes }
}

export async function apiAddComment(issueId, text) {
  const res = await apiFetch(`/api/issues/${issueId}/comments/`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to add comment');
  return data;
}

// ── AI ───────────────────────────────────────────────────────────────────────
export async function apiAIDetectIssue(imageBlob) {
  const fd = new FormData();
  fd.append('image', imageBlob, 'issue.jpg');
  const res = await apiFetch('/api/ai/detect-issue/', {
    method: 'POST',
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error('AI detection failed');
  return data; // { category, title, confidence }
}

export async function apiAIVerifyCompletion(issueId) {
  const res = await apiFetch(`/api/ai/verify-completion/${issueId}/`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error('AI verification failed');
  return data;
}

// ── Helper: dataURL blob → File ──────────────────────────────────────────────
export function dataURLtoBlob(dataURL) {
  const [header, base64] = dataURL.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
