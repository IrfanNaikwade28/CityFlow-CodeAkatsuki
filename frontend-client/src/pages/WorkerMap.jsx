import { useState } from 'react';
import { useClient } from '../context/ClientContext';
import { ArrowLeft, MapPin, Navigation } from 'lucide-react';
import { categoryIcons, statusConfig } from '../data/mockData';

// Static map bounds for Ichalkaranji area (Ward zones)
// We map lat/lng to SVG coordinates deterministically for demo purposes
const MAP_BOUNDS = { minLat: 18.49, maxLat: 18.58, minLng: 73.78, maxLng: 73.93 };
const SVG_W = 320, SVG_H = 260;

function toSvg(lat, lng) {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * SVG_W;
  const y = SVG_H - ((lat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * SVG_H;
  return { x: Math.round(x), y: Math.round(y) };
}

// Static GPS coords for known locations (same as admin mockData)
const LOCATION_COORDS = {
  'MG Road, Near Bus Stop': { lat: 18.5204, lng: 73.8567 },
  'Shivaji Market Gate': { lat: 18.5100, lng: 73.8700 },
  'Baner Road, Near D-Mart': { lat: 18.5590, lng: 73.7868 },
  'Koregaon Park, Main Entrance': { lat: 18.5362, lng: 73.8940 },
};

const PRIORITY_COLORS = { High: '#ef4444', Medium: '#f97316', Low: '#22c55e' };

const WARD_LABELS = [
  { name: 'Ward 5', lat: 18.522, lng: 73.856 },
  { name: 'Ward 7', lat: 18.510, lng: 73.870 },
  { name: 'Ward 12', lat: 18.559, lng: 73.787 },
  { name: 'Ward 9', lat: 18.536, lng: 73.894 },
  { name: 'Ward 3', lat: 18.529, lng: 73.848 },
];

export default function WorkerMap({ onBack }) {
  const { myTasks } = useClient();
  const [selectedTask, setSelectedTask] = useState(null);

  // Assign coords to tasks
  const tasksWithCoords = myTasks.map((t, i) => {
    const loc = t.location_text || t.location || '';
    const coords = LOCATION_COORDS[loc] || {
      lat: 18.505 + (i * 0.012),
      lng: 73.840 + (i * 0.015),
    };
    return { ...t, ...coords };
  });

  return (
    <div className="mobile-container bg-gray-50">
      {/* Header */}
      <div className="bg-slate-800 pt-10 pb-4 px-5">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white mb-3 text-sm">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2">
          <Navigation size={18} className="text-blue-400" />
          <div>
            <h1 className="text-white font-bold">Task Map</h1>
            <p className="text-slate-400 text-xs">{myTasks.length} task{myTasks.length !== 1 ? 's' : ''} assigned</p>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="mx-4 mt-4 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        <div className="bg-[#e8f0fe] relative" style={{ height: 280 }}>
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            width="100%"
            height="100%"
            className="absolute inset-0"
          >
            {/* Background */}
            <rect width={SVG_W} height={SVG_H} fill="#dbeafe" rx="0" />

            {/* Road lines (decorative) */}
            <line x1="0" y1="130" x2="320" y2="130" stroke="#bfdbfe" strokeWidth="6" />
            <line x1="160" y1="0" x2="160" y2="260" stroke="#bfdbfe" strokeWidth="4" />
            <line x1="0" y1="80" x2="280" y2="200" stroke="#bfdbfe" strokeWidth="3" />
            <line x1="50" y1="0" x2="300" y2="260" stroke="#bfdbfe" strokeWidth="2" strokeDasharray="6,4" />
            <line x1="0" y1="190" x2="320" y2="90" stroke="#bfdbfe" strokeWidth="2" strokeDasharray="6,4" />

            {/* Ward labels */}
            {WARD_LABELS.map(w => {
              const p = toSvg(w.lat, w.lng);
              return (
                <text key={w.name} x={p.x} y={p.y} fontSize="9" fill="#93c5fd" fontFamily="sans-serif" textAnchor="middle">
                  {w.name}
                </text>
              );
            })}

            {/* Worker current position (center) */}
            <circle cx={160} cy={130} r={8} fill="#2563eb" opacity={0.3} />
            <circle cx={160} cy={130} r={5} fill="#2563eb" />
            <text x={160} y={149} fontSize="9" fill="#1e40af" fontFamily="sans-serif" textAnchor="middle">You</text>

            {/* Task pins */}
            {tasksWithCoords.map(task => {
              const p = toSvg(task.lat, task.lng);
              const isResolved = ['Resolved', 'Closed'].includes(task.status);
              const color = isResolved ? '#9ca3af' : (PRIORITY_COLORS[task.priority] || '#6b7280');
              const isSelected = selectedTask?.id === task.id;

              return (
                <g key={task.id} onClick={() => setSelectedTask(isSelected ? null : task)} style={{ cursor: 'pointer' }}>
                  {isSelected && <circle cx={p.x} cy={p.y} r={18} fill={color} opacity={0.2} />}
                  {/* Pin */}
                  <ellipse cx={p.x} cy={p.y + 14} rx={5} ry={3} fill="rgba(0,0,0,0.15)" />
                  <path
                    d={`M${p.x},${p.y} 
                       C${p.x - 10},${p.y - 5} ${p.x - 10},${p.y - 20} ${p.x},${p.y - 22}
                       C${p.x + 10},${p.y - 20} ${p.x + 10},${p.y - 5} ${p.x},${p.y}`}
                    fill={color}
                    stroke="white"
                    strokeWidth={1.5}
                  />
                  <text x={p.x} y={p.y - 9} fontSize="10" textAnchor="middle" fill="white">
                    {isResolved ? '✓' : '!'}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm rounded-xl px-3 py-2 text-xs space-y-1">
            {[['#ef4444', 'High'], ['#f97316', 'Medium'], ['#22c55e', 'Low'], ['#9ca3af', 'Done']].map(([c, l]) => (
              <div key={l} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                <span className="text-gray-600">{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected task info */}
        {selectedTask && (
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                {categoryIcons[selectedTask.category]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{selectedTask.title}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                   <MapPin size={11} />
                   <span>{selectedTask.location_text || selectedTask.location}</span>
                 </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                    ${selectedTask.priority === 'High' ? 'bg-red-100 text-red-700' :
                      selectedTask.priority === 'Medium' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                    {selectedTask.priority}
                  </span>
                  <span className="text-xs text-gray-500">{selectedTask.status}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="px-4 mt-4 pb-24">
        <p className="text-xs font-semibold text-gray-500 mb-3">ALL TASK LOCATIONS</p>
        <div className="space-y-2">
          {tasksWithCoords.map(task => {
            const isResolved = ['Resolved', 'Closed'].includes(task.status);
            return (
              <button
                key={task.id}
                onClick={() => setSelectedTask(task.id === selectedTask?.id ? null : task)}
                className={`w-full bg-white rounded-xl p-3 text-left border transition-all
                  ${selectedTask?.id === task.id ? 'border-blue-400 shadow-md' : 'border-gray-100 shadow-sm'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: isResolved ? '#9ca3af' : PRIORITY_COLORS[task.priority] }} />
                  <span className="text-xl">{categoryIcons[task.category]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                       <MapPin size={10} />
                       <span className="truncate">{task.location_text || task.location}</span>
                     </div>
                  </div>
                  <span className="text-xs text-gray-400">{task.status}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

