import { useState, useEffect } from 'react';
import { useClient } from '../context/ClientContext';
import { categoryIcons, statusConfig } from '../data/mockData';
import { apiGetNearbyIssues, apiGetPublicIssues } from '../services/api';
import { Plus, MapPin, Bell, ChevronRight, TrendingUp, AlertCircle } from 'lucide-react';

const STATUS_ORDER = ['Submitted', 'Assigned', 'In Progress', 'Resolved', 'Closed'];

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig['Submitted'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

function PriorityDot({ priority }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full
      ${priority === 'High' ? 'bg-red-100 text-red-700' :
        priority === 'Medium' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
      {priority}
    </span>
  );
}

const CATEGORY_COLORS = {
  Road:              { bg: 'bg-orange-100', text: 'text-orange-700' },
  Water:             { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  Electricity:       { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  Garbage:           { bg: 'bg-green-100',  text: 'text-green-700'  },
  Traffic:           { bg: 'bg-red-100',    text: 'text-red-700'    },
  'Public Facilities':{ bg: 'bg-purple-100', text: 'text-purple-700'},
};

export default function CitizenHome({ onReport, onMyComplaints, onFeed, onComplaintDetail }) {
  const { user, myComplaints } = useClient();
  const [nearbyIssues, setNearbyIssues] = useState([]);

  useEffect(() => {
    // Try to get nearby issues using GPS; fall back to public feed
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const data = await apiGetNearbyIssues(pos.coords.latitude, pos.coords.longitude, 5);
            setNearbyIssues(data.slice(0, 2));
          } catch {
            loadPublicFallback();
          }
        },
        () => loadPublicFallback(),
        { timeout: 5000 }
      );
    } else {
      loadPublicFallback();
    }
  }, []);

  const loadPublicFallback = async () => {
    try {
      const data = await apiGetPublicIssues();
      setNearbyIssues(data.slice(0, 2));
    } catch {}
  };

  const open = myComplaints.filter(c => !['Resolved', 'Closed'].includes(c.status)).length;
  const resolved = myComplaints.filter(c => ['Resolved', 'Closed'].includes(c.status)).length;

  const categories = ['Road', 'Water', 'Electricity', 'Garbage', 'Traffic', 'Public Facilities'];

  const displayName = user?.full_name || user?.name || 'User';

  return (
    <div className="mobile-container" style={{ background: '#f1f5f9' }}>
      {/* Header — gradient blue */}
      <div style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%)' }}
        className="pt-12 pb-20 px-5 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute top-4 -right-2 w-16 h-16 bg-white/5 rounded-full" />

        <div className="flex items-center justify-between mb-1 relative z-10">
          <div>
            <p className="text-blue-200 text-sm font-medium">Good morning,</p>
            <h1 className="text-white text-2xl font-bold mt-0.5">{displayName.split(' ')[0]}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Bell size={18} className="text-white" />
            </button>
            <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center text-white font-bold text-base border-2 border-white/50">
              {displayName.charAt(0)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2 relative z-10">
          <MapPin size={12} className="text-blue-300" />
          <p className="text-blue-200 text-xs">{user?.ward} · Ichalkaranji Municipal Corporation</p>
        </div>
      </div>

      {/* Stats card — floats over header */}
      <div className="mx-4 -mt-12 bg-white rounded-2xl shadow-xl p-4 z-10 relative">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="py-1">
            <p className="text-2xl font-bold text-gray-900">{myComplaints.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total</p>
          </div>
          <div className="border-x border-gray-100 py-1">
            <p className="text-2xl font-bold text-orange-500">{open}</p>
            <p className="text-xs text-gray-400 mt-0.5">Open</p>
          </div>
          <div className="py-1">
            <p className="text-2xl font-bold text-green-500">{resolved}</p>
            <p className="text-xs text-gray-400 mt-0.5">Resolved</p>
          </div>
        </div>
      </div>

      {/* Report Issue CTA */}
      <div className="mx-4 mt-4">
        <button
          onClick={onReport}
          className="w-full rounded-2xl py-4 flex items-center justify-center gap-3 font-semibold text-base active:scale-95 transition-transform text-white"
          style={{ background: 'linear-gradient(90deg, #2563eb, #3b82f6)' }}
        >
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Plus size={20} />
          </div>
          Report an Issue
        </button>
      </div>

      {/* Categories */}
      <div className="px-4 mt-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Report by Category</p>
        <div className="grid grid-cols-3 gap-2.5">
          {categories.map(cat => {
            const col = CATEGORY_COLORS[cat] || { bg: 'bg-gray-100', text: 'text-gray-700' };
            return (
              <button
                key={cat}
                onClick={onReport}
                className={`rounded-2xl p-3.5 text-center ${col.bg} active:scale-95 transition-transform`}
              >
                <div className="text-2xl mb-1.5">{categoryIcons[cat]}</div>
                <p className={`text-xs font-semibold leading-tight ${col.text}`}>{cat}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent complaints */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">My Recent Issues</p>
          <button onClick={onMyComplaints} className="text-xs text-blue-600 font-semibold flex items-center gap-0.5">
            View all <ChevronRight size={13} />
          </button>
        </div>
        <div className="space-y-2.5">
          {myComplaints.slice(0, 3).map(c => {
            const progress = ((STATUS_ORDER.indexOf(c.status) + 1) / STATUS_ORDER.length) * 100;
            return (
              <button
                key={c.display_id || c.id}
                onClick={() => onComplaintDetail(c)}
                className="w-full bg-white rounded-2xl overflow-hidden text-left shadow-sm border border-gray-100 active:bg-gray-50 transition-colors"
              >
                {/* Photo strip if available */}
                {c.image && (
                  <div className="relative h-20 overflow-hidden">
                    <img src={c.image} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <div className="absolute bottom-1.5 left-3">
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="absolute bottom-1.5 right-3">
                      <PriorityDot priority={c.priority} />
                    </div>
                  </div>
                )}
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {!c.image && <span className="text-lg flex-shrink-0">{categoryIcons[c.category]}</span>}
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">{c.display_id || c.id}</p>
                        <p className="text-sm font-semibold text-gray-800 truncate">{c.title}</p>
                      </div>
                    </div>
                    {!c.image && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <StatusBadge status={c.status} />
                      </div>
                    )}
                    <ChevronRight size={15} className="text-gray-300 flex-shrink-0 mt-0.5" />
                  </div>
                  {/* Mini progress bar */}
                  <div className="mt-2.5">
                    <div className="w-full bg-gray-100 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full transition-all
                          ${c.status === 'Resolved' || c.status === 'Closed' ? 'bg-green-500' :
                            c.status === 'In Progress' ? 'bg-blue-500' :
                            c.status === 'Assigned' ? 'bg-yellow-500' : 'bg-gray-300'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
          {myComplaints.length === 0 && (
            <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
              <AlertCircle size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No complaints filed yet.</p>
              <button onClick={onReport} className="mt-3 text-xs text-blue-600 font-semibold">
                Report your first issue →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Nearby Issues preview */}
      <div className="px-4 mt-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">Nearby Issues</p>
          <button onClick={onFeed} className="text-xs text-blue-600 font-semibold flex items-center gap-0.5">
            View feed <ChevronRight size={13} />
          </button>
        </div>
        <div className="space-y-2.5">
          {nearbyIssues.map(issue => (
            <div key={issue.display_id || issue.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              {issue.image && (
                <div className="relative h-24 overflow-hidden">
                  <img src={issue.image} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                    <StatusBadge status={issue.status} />
                    <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">
                      <TrendingUp size={10} className="text-white" />
                      <span className="text-white text-xs font-semibold">{issue.upvotes}</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="px-3.5 py-2.5 flex items-center gap-3">
                {!issue.image && <span className="text-xl">{categoryIcons[issue.category]}</span>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{issue.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {!issue.image && <StatusBadge status={issue.status} />}
                    <span className="text-xs text-gray-400 flex items-center gap-0.5">
                      <MapPin size={10} /> {issue.distance ? `${issue.distance} km` : issue.ward}
                    </span>
                    {!issue.image && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
                        <TrendingUp size={10} /> {issue.upvotes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {nearbyIssues.length === 0 && (
            <div className="text-center py-6 bg-white rounded-2xl border border-gray-100">
              <p className="text-xs text-gray-400">No nearby issues found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
