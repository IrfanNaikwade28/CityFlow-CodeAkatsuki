import { useState } from 'react';
import { useClient } from '../context/ClientContext';
import { ArrowLeft, ChevronRight, User } from 'lucide-react';
import { categoryIcons, statusConfig } from '../data/mockData';

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

export default function MyComplaints({ onBack, onDetail }) {
  const { myComplaints } = useClient();
  const [filter, setFilter] = useState('All');

  const filters = ['All', 'In Progress', 'Submitted', 'Assigned', 'Resolved'];
  const filtered = filter === 'All' ? myComplaints : myComplaints.filter(c => c.status === filter);

  return (
    <div className="mobile-container" style={{ background: '#f1f5f9' }}>
      {/* Sticky header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="pt-12 pb-3 px-5">
          <button onClick={onBack} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 mb-3 text-sm font-medium">
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="text-xl font-bold text-gray-900">My Complaints</h1>
          <p className="text-gray-400 text-xs mt-0.5">{myComplaints.length} complaints filed</p>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 px-5 pb-3 overflow-x-auto scrollbar-none">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors
                ${filter === f
                  ? 'bg-[#2563eb] text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 pb-6">
        {filtered.map(c => {
          const stepIdx = STATUS_ORDER.indexOf(c.status);
          const progress = ((stepIdx + 1) / STATUS_ORDER.length) * 100;
          const progressColor =
            c.status === 'Resolved' || c.status === 'Closed' ? 'bg-green-500' :
            c.status === 'In Progress' ? 'bg-blue-500' :
            c.status === 'Assigned' ? 'bg-yellow-500' : 'bg-gray-300';

          return (
            <button
              key={c.display_id || c.id}
              onClick={() => onDetail(c)}
              className="w-full bg-white rounded-2xl overflow-hidden text-left shadow-sm border border-gray-100 active:scale-[0.99] transition-transform"
            >
              {/* Photo strip */}
              {c.image && (
                <div className="relative h-24 overflow-hidden">
                  <img src={c.image} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                    <StatusBadge status={c.status} />
                    <span className="text-white text-xs font-semibold bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">
                      {new Date(c.reported_at || c.reportedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon when no image */}
                  {!c.image && (
                    <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                      {categoryIcons[c.category]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-400 font-medium">{c.display_id || c.id}</p>
                      {!c.image && (
                        <p className="text-xs text-gray-400">
                           {new Date(c.reported_at || c.reportedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5 line-clamp-2">{c.title}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {!c.image && <StatusBadge status={c.status} />}
                      <span className="text-xs text-gray-400">{c.ward}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 mt-1 flex-shrink-0" />
                </div>

                {/* Worker assigned row */}
                {(c.assigned_to_name || c.assignedToName) && (
                   <div className="flex items-center gap-1.5 mt-2.5 bg-blue-50 rounded-xl px-3 py-1.5">
                     <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                       <User size={11} className="text-white" />
                     </div>
                     <span className="text-xs font-medium text-blue-700">
                       {c.status === 'Resolved' || c.status === 'Closed'
                         ? `Resolved by ${c.assigned_to_name || c.assignedToName}`
                         : `Assigned to ${c.assigned_to_name || c.assignedToName}`}
                     </span>
                   </div>
                 )}

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Progress</span>
                    <span className="font-medium">{stepIdx + 1}/{STATUS_ORDER.length}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${progressColor}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {/* Step labels */}
                  <div className="flex justify-between mt-1">
                    {STATUS_ORDER.map((s, i) => (
                      <span
                        key={s}
                        className={`text-[9px] font-medium ${i <= stepIdx ? 'text-gray-600' : 'text-gray-300'}`}
                      >
                        {s === 'In Progress' ? 'Active' : s === 'Submitted' ? 'New' : s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm font-medium text-gray-500">No complaints found.</p>
            {filter !== 'All' && (
              <button onClick={() => setFilter('All')} className="mt-2 text-xs text-blue-600 font-semibold">
                Clear filter
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
