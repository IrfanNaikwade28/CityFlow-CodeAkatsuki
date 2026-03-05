import { useState } from 'react';
import { ClientProvider, useClient } from './context/ClientContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import CitizenHome from './pages/CitizenHome';
import ReportIssue from './pages/ReportIssue';
import IssueSubmitSuccess from './pages/IssueSubmitSuccess';
import MyComplaints from './pages/MyComplaints';
import ComplaintDetail from './pages/ComplaintDetail';
import CivicFeed from './pages/CivicFeed';
import WorkerDashboard from './pages/WorkerDashboard';
import TaskDetail from './pages/TaskDetail';
import WorkerFeed from './pages/WorkerFeed';
import WorkerMap from './pages/WorkerMap';
import WorkerProfile from './pages/WorkerProfile';

// Bottom nav
import { Home, FileText, Radio } from 'lucide-react';

function CitizenBottomNav({ active, onHome, onComplaints, onFeed }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home, action: onHome },
    { id: 'complaints', label: 'My Issues', icon: FileText, action: onComplaints },
    { id: 'feed', label: 'Civic Feed', icon: Radio, action: onFeed },
  ];
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-200 flex z-50 pb-safe">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={t.action}
          className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors
            ${active === t.id ? 'text-[#2563eb]' : 'text-gray-400'}`}
        >
          <t.icon size={20} />
          <span className="text-xs font-medium">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

function AppContent() {
  const { user, authLoading, logout } = useClient();
  const [page, setPage] = useState('login');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [lastSubmittedId, setLastSubmittedId] = useState(null);
  const [activeTab, setActiveTab] = useState('home');

  // Show a minimal loader while restoring session from localStorage
  if (authLoading) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // After login, redirect to correct dashboard
  if (user && page === 'login') {
    if (user.role === 'citizen') { setPage('home'); setActiveTab('home'); }
    else setPage('workerDash');
  }

  if (!user) {
    if (page === 'register') return <Register onBack={() => setPage('login')} />;
    return <Login onRegister={() => setPage('register')} />;
  }

  // ── Worker flow ──
  if (user.role === 'worker') {
    if (page === 'taskDetail' && selectedTask) {
      return <TaskDetail task={selectedTask} onBack={() => setPage('workerDash')} />;
    }
    if (page === 'workerFeed') {
      return <WorkerFeed onBack={() => setPage('workerDash')} />;
    }
    if (page === 'workerMap') {
      return <WorkerMap onBack={() => setPage('workerDash')} />;
    }
    if (page === 'workerProfile') {
      return <WorkerProfile onBack={() => setPage('workerDash')} />;
    }
    return (
      <WorkerDashboard
        onTaskDetail={(task) => { setSelectedTask(task); setPage('taskDetail'); }}
        onLogout={() => { logout(); setPage('login'); }}
        onFeed={() => setPage('workerFeed')}
        onMap={() => setPage('workerMap')}
        onProfile={() => setPage('workerProfile')}
      />
    );
  }

  // ── Citizen flow ──
  const goHome = () => { setPage('home'); setActiveTab('home'); };
  const goComplaints = () => { setPage('myComplaints'); setActiveTab('complaints'); };
  const goFeed = () => { setPage('feed'); setActiveTab('feed'); };

  const showBottomNav = ['home', 'myComplaints', 'feed'].includes(page);

  return (
    <div style={{ paddingBottom: showBottomNav ? 'calc(64px + env(safe-area-inset-bottom, 0px))' : '0' }}>
      {page === 'home' && (
        <CitizenHome
          onReport={() => setPage('report')}
          onMyComplaints={goComplaints}
          onFeed={goFeed}
          onComplaintDetail={(c) => { setSelectedComplaint(c); setPage('detail'); }}
        />
      )}
      {page === 'report' && (
        <ReportIssue
          onBack={goHome}
          onSuccess={(id) => { setLastSubmittedId(id); setPage('success'); }}
        />
      )}
      {page === 'success' && (
        <IssueSubmitSuccess
          issueId={lastSubmittedId}
          onHome={goHome}
          onTrack={goComplaints}
        />
      )}
      {page === 'myComplaints' && (
        <MyComplaints
          onBack={goHome}
          onDetail={(c) => { setSelectedComplaint(c); setPage('detail'); }}
        />
      )}
      {page === 'detail' && selectedComplaint && (
        <ComplaintDetail
          complaint={selectedComplaint}
          onBack={() => { setPage('myComplaints'); setActiveTab('complaints'); }}
        />
      )}
      {page === 'feed' && (
        <CivicFeed onBack={goHome} />
      )}

      {showBottomNav && (
        <CitizenBottomNav
          active={activeTab}
          onHome={goHome}
          onComplaints={goComplaints}
          onFeed={goFeed}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <ClientProvider>
      <AppContent />
    </ClientProvider>
  );
}

export default App;
