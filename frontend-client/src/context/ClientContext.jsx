import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  apiLogin, apiGetMe, apiGetMyIssues, apiGetAssignedIssues,
  apiSubmitIssue, apiUpdateIssueStatus, apiSubmitCompletionPhoto,
  apiAddComment, apiUpvoteIssue,
  setTokens, clearTokens, getAccessToken, getRefreshToken,
  dataURLtoBlob,
} from '../services/api';

const ClientContext = createContext();

export function ClientProvider({ children }) {
  const [user, setUser]             = useState(null);
  const [myComplaints, setMyComplaints] = useState([]);
  const [myTasks, setMyTasks]       = useState([]);
  const [authLoading, setAuthLoading] = useState(true); // true while restoring session

  // ── Restore session on mount ────────────────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      if (!getAccessToken() && !getRefreshToken()) {
        setAuthLoading(false);
        return;
      }
      try {
        const me = await apiGetMe();
        setUser(me);
      } catch {
        clearTokens();
      } finally {
        setAuthLoading(false);
      }
    };
    restore();
  }, []);

  // ── Fetch data when user changes ────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setMyComplaints([]);
      setMyTasks([]);
      return;
    }
    if (user.role === 'citizen') {
      apiGetMyIssues()
        .then(data => setMyComplaints(data))
        .catch(() => {});
    } else if (user.role === 'worker') {
      apiGetAssignedIssues()
        .then(data => setMyTasks(data))
        .catch(() => {});
    }
  }, [user]);

  // ── Auth actions ─────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    try {
      const data = await apiLogin(email, password);
      setTokens(data.access, data.refresh);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Invalid credentials' };
    }
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    setMyComplaints([]);
    setMyTasks([]);
  };

  // ── Citizen: submit complaint ────────────────────────────────────────────────
  const submitComplaint = async ({ category, title, description, location, ward, isPublic, image, gpsLocation }) => {
    const fd = new FormData();
    fd.append('title', title);
    fd.append('description', description);
    fd.append('category', category);
    fd.append('ward', ward);
    fd.append('location_text', location || '');
    fd.append('is_public', isPublic ? 'true' : 'false');
    if (gpsLocation?.lat) fd.append('location_lat', gpsLocation.lat);
    if (gpsLocation?.lng) fd.append('location_lng', gpsLocation.lng);
    if (image) {
      // image is a data-URL string from GeoCamera
      const blob = dataURLtoBlob(image);
      fd.append('image', blob, 'issue.jpg');
    }

    const newIssue = await apiSubmitIssue(fd);
    // Refresh my complaints list
    setMyComplaints(prev => [newIssue, ...prev]);
    return newIssue.display_id;
  };

  // ── Citizen: add comment ─────────────────────────────────────────────────────
  const addComment = async (issueId, text) => {
    try {
      await apiAddComment(issueId, text);
      // Refresh the specific issue — we'll refresh the full list for simplicity
      const updated = await apiGetMyIssues();
      setMyComplaints(updated);
    } catch (err) {
      console.error('addComment error:', err);
    }
  };

  // ── Citizen: upvote ──────────────────────────────────────────────────────────
  const upvoteComplaint = async (issueId) => {
    try {
      const result = await apiUpvoteIssue(issueId);
      // Update the count in local state
      setMyComplaints(prev =>
        prev.map(c => (c.display_id === issueId || c.id === issueId)
          ? { ...c, upvotes: result.upvotes }
          : c
        )
      );
      return result;
    } catch (err) {
      console.error('upvote error:', err);
    }
  };

  // ── Worker: update task status ───────────────────────────────────────────────
  const updateTaskStatus = async (taskId, newStatus, note, completionPhoto) => {
    try {
      let updated;
      if (newStatus === 'Resolved' && completionPhoto) {
        // completionPhoto is a data-URL from GeoCamera
        const blob = dataURLtoBlob(completionPhoto);
        updated = await apiSubmitCompletionPhoto(taskId, blob, note);
      } else {
        updated = await apiUpdateIssueStatus(taskId, newStatus, note || '');
      }
      // Refresh tasks list
      const tasks = await apiGetAssignedIssues();
      setMyTasks(tasks);
      return updated;
    } catch (err) {
      console.error('updateTaskStatus error:', err);
      throw err;
    }
  };

  // ── Refresh helpers (pages can call these to reload data) ────────────────────
  const refreshMyComplaints = useCallback(async () => {
    if (user?.role === 'citizen') {
      const data = await apiGetMyIssues();
      setMyComplaints(data);
    }
  }, [user]);

  const refreshMyTasks = useCallback(async () => {
    if (user?.role === 'worker') {
      const data = await apiGetAssignedIssues();
      setMyTasks(data);
    }
  }, [user]);

  return (
    <ClientContext.Provider value={{
      user,
      authLoading,
      login,
      logout,
      myComplaints,
      myTasks,
      submitComplaint,
      addComment,
      upvoteComplaint,
      updateTaskStatus,
      refreshMyComplaints,
      refreshMyTasks,
      // Keep `complaints` alias so CivicFeed / ComplaintDetail that read `complaints` still work
      complaints: myComplaints,
    }}>
      {children}
    </ClientContext.Provider>
  );
}

export const useClient = () => useContext(ClientContext);
