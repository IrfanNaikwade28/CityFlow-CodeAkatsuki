import { useState } from 'react';
import { useClient } from '../context/ClientContext';
import { categoryIcons, statusConfig } from '../data/mockData';
import { ChevronRight, CheckCircle2, Clock, Bell, LogOut, Home, Radio, Map, User, MapPin, AlertTriangle } from 'lucide-react';

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig['Submitted'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

const PRIORITY_CONFIG = {
  High:   { bar: 'bg-red-500',    badge: 'bg-red-100 text-red-700',    label: '🔴' },
  Medium: { bar: 'bg-orange-400', badge: 'bg-orange-100 text-orange-700', label: '🟡' },
  Low:    { bar: 'bg-green-400',  badge: 'bg-green-100 text-green-700', label: '🟢' },
};

export default function WorkerDashboard({ onTaskDetail, onLogout, onFeed, onMap, onProfile }) {
  const { user, myTasks } = useClient();
  const [activeTab, setActiveTab] = useState('home');

  const tabs = [
    { id: 'home',    label: 'Home',    icon: Home   },
    { id: 'feed',    label: 'Feed',    icon: Radio  },
    { id: 'map',     label: 'Map',     icon: Map    },
    { id: 'profile', label: 'Profile', icon: User   },
  ];

  const handleTabChange = (id) => {
    setActiveTab(id);
    if (id === 'feed')    onFeed?.();
    else if (id === 'map')     onMap?.();
    else if (id === 'profile') onProfile?.();
  };

  const open = myTasks.filter(t => !['Resolved', 'Closed'].includes(t.status));
  const done = myTasks.filter(t => ['Resolved', 'Closed'].includes(t.status));
  const highPriority = open.filter(t => t.priority === 'High').length;

  return (
    <div style={{ paddingBottom: '72px' }}>
      <div className="mobile-container" style={{ background: '#f1f5f9' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)' }}
          className="pt-12 pb-16 px-5 relative overflow-hidden">
          {/* Decorative */}
          <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/5 rounded-full" />
          <div className="absolute top-8 right-10 w-12 h-12 bg-blue-500/20 rounded-full" />

          <div className="flex items-center justify-between mb-2 relative z-10">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Worker Dashboard</p>
              <h1 className="text-white text-xl font-bold mt-0.5">{user?.full_name || user?.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
                <Bell size={17} className="text-white" />
              </button>
              <button onClick={onLogout} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
                <LogOut size={15} className="text-white" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 relative z-10">
            <span className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-full font-medium">{user?.category}</span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin size={10} /> {user?.ward}
            </span>
          </div>
        </div>

        {/* Stats card */}
        <div className="mx-4 -mt-10 bg-white rounded-2xl shadow-xl p-4 z-10 relative">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="py-1">
              <p className="text-2xl font-bold text-orange-500">{open.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Open</p>
            </div>
            <div className="border-x border-gray-100 py-1">
              <p className="text-2xl font-bold text-green-500">{done.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Done</p>
            </div>
            <div className="py-1">
              <p className="text-2xl font-bold text-gray-800">{myTasks.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Total</p>
            </div>
          </div>
        </div>

        {/* High priority alert */}
        {highPriority > 0 && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-700">
              {highPriority} high-priority {highPriority === 1 ? 'task' : 'tasks'} need attention
            </p>
          </div>
        )}

        {/* Active tasks */}
        <div className="px-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-orange-500" />
            <p className="text-sm font-bold text-gray-700">Active Tasks</p>
            <span className="text-xs bg-orange-100 text-orange-600 font-semibold px-2 py-0.5 rounded-full">{open.length}</span>
          </div>
          <div className="space-y-3">
            {open.map(task => {
              const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Low;
              return (
                <button
                  key={task.id}
                  onClick={() => onTaskDetail(task)}
                  className="w-full bg-white rounded-2xl overflow-hidden text-left shadow-sm border border-gray-100 active:scale-[0.99] transition-transform"
                >
                  {/* Priority color bar */}
                  <div className={`h-1 w-full ${pc.bar}`} />
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                        {categoryIcons[task.category]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-xs text-gray-400 font-medium">{task.display_id || task.id}</p>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${pc.badge}`}>
                            {task.priority}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-gray-800 line-clamp-2">{task.title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <StatusBadge status={task.status} />
                          <span className="text-xs text-gray-400 flex items-center gap-0.5 truncate">
                            <MapPin size={10} /> {task.location_text || task.location}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 mt-1 flex-shrink-0" />
                    </div>
                  </div>
                </button>
              );
            })}

            {open.length === 0 && (
              <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
                <CheckCircle2 size={36} className="text-green-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-500">All caught up!</p>
                <p className="text-xs text-gray-400 mt-1">No active tasks right now.</p>
              </div>
            )}
          </div>
        </div>

        {/* Completed tasks */}
        {done.length > 0 && (
          <div className="px-4 mt-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={14} className="text-green-500" />
              <p className="text-sm font-bold text-gray-700">Completed</p>
              <span className="text-xs bg-green-100 text-green-600 font-semibold px-2 py-0.5 rounded-full">{done.length}</span>
            </div>
            <div className="space-y-2">
              {done.map(task => (
                <button
                  key={task.id}
                  onClick={() => onTaskDetail(task)}
                  className="w-full bg-white rounded-2xl p-3.5 text-left shadow-sm border border-gray-100 active:bg-gray-50 opacity-80"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                      {categoryIcons[task.category]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-700 truncate">{task.title}</p>
                      <StatusBadge status={task.status} />
                    </div>
                    <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-200 flex z-50 pb-safe">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors active:bg-gray-50
              ${activeTab === t.id ? 'text-[#2563eb]' : 'text-gray-400'}`}
          >
            <t.icon size={20} />
            <span className="text-xs font-medium">{t.label}</span>
            {activeTab === t.id && (
              <span className="w-1 h-1 bg-[#2563eb] rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
