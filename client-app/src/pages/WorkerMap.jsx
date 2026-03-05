import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useClient } from '../context/ClientContext';
import { MapPin, Navigation, CheckCircle, AlertCircle, Clock } from 'lucide-react-native';
import { categoryIcons, statusConfig } from '../data/mockData';
import Svg, {
  Rect, Line, Circle, Text as SvgText, Path, Ellipse, G, Polygon,
} from 'react-native-svg';

const MAP_BOUNDS = { minLat: 18.49, maxLat: 18.58, minLng: 73.78, maxLng: 73.93 };
const SVG_W = 340;
const SVG_H = 280;

function toSvg(lat, lng) {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * SVG_W;
  const y = SVG_H - ((lat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * SVG_H;
  return { x: Math.round(x), y: Math.round(y) };
}

// Ward zone polygons (lat/lng arrays) — approximate shapes for Ichalkaranji wards
const WARD_ZONES = [
  {
    name: 'Ward 5',
    color: '#3b82f6',
    opacity: 0.12,
    points: [
      { lat: 18.510, lng: 73.840 }, { lat: 18.510, lng: 73.870 },
      { lat: 18.530, lng: 73.870 }, { lat: 18.530, lng: 73.840 },
    ],
  },
  {
    name: 'Ward 7',
    color: '#8b5cf6',
    opacity: 0.12,
    points: [
      { lat: 18.500, lng: 73.860 }, { lat: 18.500, lng: 73.893 },
      { lat: 18.520, lng: 73.893 }, { lat: 18.520, lng: 73.860 },
    ],
  },
  {
    name: 'Ward 12',
    color: '#10b981',
    opacity: 0.12,
    points: [
      { lat: 18.545, lng: 73.780 }, { lat: 18.545, lng: 73.810 },
      { lat: 18.575, lng: 73.810 }, { lat: 18.575, lng: 73.780 },
    ],
  },
  {
    name: 'Ward 9',
    color: '#f59e0b',
    opacity: 0.12,
    points: [
      { lat: 18.525, lng: 73.880 }, { lat: 18.525, lng: 73.915 },
      { lat: 18.550, lng: 73.915 }, { lat: 18.550, lng: 73.880 },
    ],
  },
  {
    name: 'Ward 3',
    color: '#ef4444',
    opacity: 0.1,
    points: [
      { lat: 18.490, lng: 73.840 }, { lat: 18.490, lng: 73.860 },
      { lat: 18.510, lng: 73.860 }, { lat: 18.510, lng: 73.840 },
    ],
  },
];

const WARD_LABEL_COORDS = [
  { name: 'W5',  lat: 18.520, lng: 73.855, color: '#1d4ed8' },
  { name: 'W7',  lat: 18.510, lng: 73.877, color: '#6d28d9' },
  { name: 'W12', lat: 18.560, lng: 73.795, color: '#059669' },
  { name: 'W9',  lat: 18.537, lng: 73.897, color: '#b45309' },
  { name: 'W3',  lat: 18.500, lng: 73.850, color: '#b91c1c' },
];

// Roads: [lat1, lng1, lat2, lng2, width, dash]
const ROADS = [
  // Main arterials
  [18.490, 73.780, 18.575, 73.930, 5, null],        // diagonal main road
  [18.530, 73.780, 18.530, 73.930, 4, null],         // horizontal main
  [18.490, 73.855, 18.575, 73.855, 3, null],         // vertical mid
  // Secondary
  [18.510, 73.800, 18.510, 73.920, 2.5, null],
  [18.550, 73.790, 18.550, 73.910, 2, null],
  [18.490, 73.820, 18.575, 73.880, 2, null],
  // Tertiary / lanes
  [18.520, 73.800, 18.490, 73.860, 1.5, '5,4'],
  [18.540, 73.850, 18.570, 73.900, 1.5, '5,4'],
  [18.495, 73.870, 18.540, 73.930, 1.5, '5,4'],
  [18.505, 73.815, 18.555, 73.835, 1.5, '5,4'],
];

const LOCATION_COORDS = {
  'Nehru Chowk, Main Road, Ichalkaranji': { lat: 18.5204, lng: 73.8567 },
  'Sadar Bazar, Near Textile Market':      { lat: 18.5100, lng: 73.8700 },
  'Near Ichalkaranji Bus Stand':           { lat: 18.5590, lng: 73.7868 },
  'Kasba Peth Road, Near Old Market':      { lat: 18.5362, lng: 73.8940 },
};

const PRIORITY_COLORS = { High: '#ef4444', Medium: '#f97316', Low: '#22c55e' };

export default function WorkerMap() {
  const { myTasks } = useClient();
  const [selectedTask, setSelectedTask] = useState(null);

  const tasksWithCoords = myTasks.map((t, i) => {
    const coords = LOCATION_COORDS[t.location] || {
      lat: 18.505 + i * 0.013,
      lng: 73.841 + i * 0.016,
    };
    return { ...t, ...coords };
  });

  const totalCount  = tasksWithCoords.length;
  const activeCount = tasksWithCoords.filter(t => t.status === 'In Progress').length;
  const doneCount   = tasksWithCoords.filter(t => ['Resolved', 'Closed'].includes(t.status)).length;
  const pendingCount = tasksWithCoords.filter(t => t.status === 'Assigned').length;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Navigation size={18} color="#60a5fa" />
          <View>
            <Text style={styles.titleText}>Task Map</Text>
            <Text style={styles.titleSub}>{totalCount} task{totalCount !== 1 ? 's' : ''} assigned</Text>
          </View>
        </View>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        {[
          { icon: <AlertCircle size={14} color="#f97316" />, label: 'Pending',  val: pendingCount, color: '#f97316' },
          { icon: <Clock       size={14} color="#2563eb"  />, label: 'Active',   val: activeCount,  color: '#2563eb' },
          { icon: <CheckCircle size={14} color="#16a34a"  />, label: 'Done',     val: doneCount,    color: '#16a34a' },
        ].map(s => (
          <View key={s.label} style={styles.statItem}>
            {s.icon}
            <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Map card */}
        <View style={styles.mapCard}>
          <View style={styles.mapContainer}>
            <Svg width="100%" height={290} viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
              {/* Background — land */}
              <Rect width={SVG_W} height={SVG_H} fill="#e8f0fe" />

              {/* Ward zone fills */}
              {WARD_ZONES.map(zone => {
                const pts = zone.points.map(p => {
                  const s = toSvg(p.lat, p.lng);
                  return `${s.x},${s.y}`;
                }).join(' ');
                return (
                  <Polygon
                    key={zone.name}
                    points={pts}
                    fill={zone.color}
                    fillOpacity={zone.opacity}
                    stroke={zone.color}
                    strokeOpacity={0.35}
                    strokeWidth={1}
                  />
                );
              })}

              {/* Roads */}
              {ROADS.map(([lat1, lng1, lat2, lng2, w, dash], i) => {
                const a = toSvg(lat1, lng1);
                const b = toSvg(lat2, lng2);
                return (
                  <Line
                    key={i}
                    x1={a.x} y1={a.y}
                    x2={b.x} y2={b.y}
                    stroke={w >= 4 ? '#c7d7f5' : '#d4e0f7'}
                    strokeWidth={w}
                    strokeDasharray={dash || undefined}
                  />
                );
              })}

              {/* Ward labels */}
              {WARD_LABEL_COORDS.map(w => {
                const p = toSvg(w.lat, w.lng);
                return (
                  <G key={w.name}>
                    <Rect
                      x={p.x - 11} y={p.y - 8}
                      width={22} height={13}
                      rx={4} ry={4}
                      fill="white"
                      fillOpacity={0.7}
                    />
                    <SvgText
                      x={p.x} y={p.y + 3}
                      fontSize="8"
                      fill={w.color}
                      fontFamily="sans-serif"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {w.name}
                    </SvgText>
                  </G>
                );
              })}

              {/* Worker position — pulsing dot */}
              <Circle cx={170} cy={140} r={18} fill="#2563eb" opacity={0.1} />
              <Circle cx={170} cy={140} r={11} fill="#2563eb" opacity={0.2} />
              <Circle cx={170} cy={140} r={6}  fill="#2563eb" />
              <Circle cx={170} cy={140} r={3}  fill="white" />
              <SvgText x={170} y={163} fontSize="8" fill="#1e40af" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">YOU</SvgText>

              {/* Task pins — teardrop shape */}
              {tasksWithCoords.map(task => {
                const p = toSvg(task.lat, task.lng);
                const isResolved = ['Resolved', 'Closed'].includes(task.status);
                const color = isResolved ? '#9ca3af' : (PRIORITY_COLORS[task.priority] || '#6b7280');
                const isSelected = selectedTask?.id === task.id;
                // Teardrop: top circle + pointed bottom
                const cx = p.x;
                const cy = p.y - 24; // tip of teardrop at p.y
                const r  = isSelected ? 11 : 9;

                return (
                  <G key={task.id} onPress={() => setSelectedTask(isSelected ? null : task)}>
                    {/* Halo when selected */}
                    {isSelected && (
                      <Circle cx={cx} cy={cy} r={r + 8} fill={color} opacity={0.18} />
                    )}
                    {/* Drop shadow */}
                    <Ellipse cx={cx} cy={p.y + 2} rx={r * 0.6} ry={3} fill="rgba(0,0,0,0.18)" />
                    {/* Teardrop body */}
                    <Path
                      d={`M${cx},${p.y} C${cx - r * 0.6},${p.y - r * 0.8} ${cx - r},${cy + r * 0.5} ${cx - r},${cy} a${r},${r} 0 1 1 ${r * 2},0 C${cx + r},${cy + r * 0.5} ${cx + r * 0.6},${p.y - r * 0.8} ${cx},${p.y}`}
                      fill={color}
                      stroke="white"
                      strokeWidth={1.5}
                    />
                    {/* Icon inside */}
                    <SvgText
                      x={cx} y={cy + 4}
                      fontSize={isResolved ? "9" : "10"}
                      textAnchor="middle"
                      fill="white"
                      fontWeight="bold"
                    >
                      {isResolved ? '✓' : task.priority === 'High' ? '!' : '·'}
                    </SvgText>
                  </G>
                );
              })}
            </Svg>

            {/* Legend */}
            <View style={styles.legend}>
              {[['#ef4444', 'High'], ['#f97316', 'Med'], ['#22c55e', 'Low'], ['#9ca3af', 'Done']].map(([c, l]) => (
                <View key={l} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: c }]} />
                  <Text style={styles.legendText}>{l}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Selected task info */}
          {selectedTask && (
            <View style={styles.selectedInfo}>
              <View style={styles.selectedIconBox}>
                <Text style={{ fontSize: 20 }}>{categoryIcons[selectedTask.category]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedTitle}>{selectedTask.title}</Text>
                <View style={styles.selectedMeta}>
                  <MapPin size={11} color="#9ca3af" />
                  <Text style={styles.selectedLocation} numberOfLines={1}>{selectedTask.location}</Text>
                </View>
                <View style={styles.selectedBadges}>
                  <View style={[
                    styles.priorityChip,
                    selectedTask.priority === 'High'   ? { backgroundColor: '#fee2e2' } :
                    selectedTask.priority === 'Medium' ? { backgroundColor: '#ffedd5' } :
                                                         { backgroundColor: '#dcfce7' },
                  ]}>
                    <Text style={[
                      styles.priorityChipText,
                      selectedTask.priority === 'High'   ? { color: '#b91c1c' } :
                      selectedTask.priority === 'Medium' ? { color: '#c2410c' } :
                                                           { color: '#15803d' },
                    ]}>{selectedTask.priority}</Text>
                  </View>
                  <View style={[
                    styles.statusChip,
                    { backgroundColor: statusConfig[selectedTask.status]?.bg || '#f3f4f6' },
                  ]}>
                    <View style={[styles.statusDot, { backgroundColor: statusConfig[selectedTask.status]?.dot || '#9ca3af' }]} />
                    <Text style={[styles.statusChipText, { color: statusConfig[selectedTask.status]?.text || '#6b7280' }]}>
                      {selectedTask.status}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Task list */}
        <Text style={styles.listLabel}>ALL TASK LOCATIONS</Text>
        <View style={{ gap: 8 }}>
          {tasksWithCoords.map(task => {
            const isResolved = ['Resolved', 'Closed'].includes(task.status);
            const isSelected = selectedTask?.id === task.id;
            const pinColor = isResolved ? '#9ca3af' : (PRIORITY_COLORS[task.priority] || '#6b7280');
            return (
              <TouchableOpacity
                key={task.id}
                style={[styles.listItem, isSelected ? styles.listItemSelected : styles.listItemDefault]}
                onPress={() => setSelectedTask(task.id === selectedTask?.id ? null : task)}
                activeOpacity={0.85}
              >
                <View style={[styles.listPin, { backgroundColor: pinColor }]}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                    {isResolved ? '✓' : task.priority[0]}
                  </Text>
                </View>
                <Text style={{ fontSize: 19 }}>{categoryIcons[task.category]}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle} numberOfLines={1}>{task.title}</Text>
                  <View style={styles.listMeta}>
                    <MapPin size={10} color="#9ca3af" />
                    <Text style={styles.listLocation} numberOfLines={1}>{task.location}</Text>
                  </View>
                </View>
                <View style={[
                  styles.listStatusBadge,
                  { backgroundColor: statusConfig[task.status]?.bg || '#f3f4f6' },
                ]}>
                  <Text style={[
                    styles.listStatusText,
                    { color: statusConfig[task.status]?.text || '#6b7280' },
                  ]} numberOfLines={1}>{task.status}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#f1f5f9' },
  header:        { backgroundColor: '#1e293b', paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
  titleSub:      { color: '#94a3b8', fontSize: 11, marginTop: 1 },

  statsBar:      { flexDirection: 'row', backgroundColor: '#1e293b', paddingBottom: 16, paddingHorizontal: 20, gap: 0 },
  statItem:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingVertical: 10, marginHorizontal: 4 },
  statVal:       { fontSize: 15, fontWeight: '700' },
  statLabel:     { fontSize: 10, color: '#94a3b8', fontWeight: '500' },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16 },

  mapCard:       { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3, marginBottom: 16 },
  mapContainer:  { position: 'relative' },
  legend:        { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.93)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, gap: 5, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:     { width: 9, height: 9, borderRadius: 5 },
  legendText:    { fontSize: 10, color: '#4b5563', fontWeight: '500' },

  selectedInfo:     { padding: 14, borderTopWidth: 1, borderTopColor: '#f3f4f6', flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  selectedIconBox:  { width: 40, height: 40, backgroundColor: '#f3f4f6', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  selectedTitle:    { fontSize: 13, fontWeight: '600', color: '#1f2937' },
  selectedMeta:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  selectedLocation: { fontSize: 11, color: '#9ca3af', flex: 1 },
  selectedBadges:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  priorityChip:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  priorityChipText: { fontSize: 11, fontWeight: '600' },
  statusChip:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusDot:        { width: 5, height: 5, borderRadius: 3 },
  statusChipText:   { fontSize: 11, fontWeight: '500' },

  listLabel:         { fontSize: 10, fontWeight: '700', color: '#6b7280', letterSpacing: 0.5, marginBottom: 10 },
  listItem:          { backgroundColor: '#fff', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1 },
  listItemDefault:   { borderColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  listItemSelected:  { borderColor: '#60a5fa', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  listPin:           { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  listTitle:         { fontSize: 13, fontWeight: '500', color: '#1f2937' },
  listMeta:          { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  listLocation:      { fontSize: 11, color: '#9ca3af', flex: 1 },
  listStatusBadge:   { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  listStatusText:    { fontSize: 10, fontWeight: '600' },
});
