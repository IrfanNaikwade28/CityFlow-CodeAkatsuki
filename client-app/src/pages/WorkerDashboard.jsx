import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useClient } from '../context/ClientContext';
import { categoryIcons, statusConfig } from '../data/mockData';
import {
  ChevronRight, CheckCircle2, Clock, Bell, LogOut,
  MapPin, AlertTriangle,
} from 'lucide-react-native';

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig['Submitted'];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: cfg.dot }]} />
      <Text style={[styles.badgeText, { color: cfg.text }]}>{status}</Text>
    </View>
  );
}

const PRIORITY_CONFIG = {
  High:   { bar: '#ef4444', badgeBg: '#fee2e2', badgeText: '#b91c1c' },
  Medium: { bar: '#f97316', badgeBg: '#ffedd5', badgeText: '#c2410c' },
  Low:    { bar: '#4ade80', badgeBg: '#dcfce7', badgeText: '#15803d' },
};

export default function WorkerDashboard({ onTaskDetail, onLogout }) {
  const { user, myTasks } = useClient();  const open = myTasks.filter(t => !['Resolved', 'Closed'].includes(t.status));
  const done = myTasks.filter(t => ['Resolved', 'Closed'].includes(t.status));
  const highPriority = open.filter(t => t.priority === 'High').length;

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          {/* Decorative circles */}
          <View style={styles.decCircle1} />
          <View style={styles.decCircle2} />

          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerLabel}>WORKER DASHBOARD</Text>
              <Text style={styles.headerName}>{user?.name}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconBtn}>
                <Bell size={17} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={onLogout}>
                <LogOut size={15} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.headerMeta}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{user?.category}</Text>
            </View>
            <View style={styles.wardRow}>
              <MapPin size={10} color="#94a3b8" />
              <Text style={styles.wardText}>{user?.ward}</Text>
            </View>
          </View>
        </View>

        {/* Stats card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: '#f97316' }]}>{open.length}</Text>
            <Text style={styles.statLabel}>Open</Text>
          </View>
          <View style={[styles.statItem, styles.statBorderX]}>
            <Text style={[styles.statNum, { color: '#22c55e' }]}>{done.length}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: '#1f2937' }]}>{myTasks.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* High priority alert */}
        {highPriority > 0 && (
          <View style={styles.alertBox}>
            <AlertTriangle size={18} color="#ef4444" />
            <Text style={styles.alertText}>
              {highPriority} high-priority {highPriority === 1 ? 'task' : 'tasks'} need attention
            </Text>
          </View>
        )}

        {/* Active tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={14} color="#f97316" />
            <Text style={styles.sectionTitle}>Active Tasks</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{open.length}</Text>
            </View>
          </View>

          <View style={{ gap: 12 }}>
            {open.map(task => {
              const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Low;
              return (
                <TouchableOpacity
                  key={task.id}
                  onPress={() => onTaskDetail(task)}
                  style={styles.taskCard}
                  activeOpacity={0.95}
                >
                  <View style={[styles.priorityBar, { backgroundColor: pc.bar }]} />
                  <View style={styles.taskBody}>
                    <View style={styles.taskRow}>
                      <View style={styles.taskIcon}>
                        <Text style={{ fontSize: 20 }}>{categoryIcons[task.category]}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.taskTitleRow}>
                          <Text style={styles.taskId}>{task.id}</Text>
                          <View style={[styles.priorityChip, { backgroundColor: pc.badgeBg }]}>
                            <Text style={[styles.priorityChipText, { color: pc.badgeText }]}>{task.priority}</Text>
                          </View>
                        </View>
                        <Text style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>
                        <View style={styles.taskMeta}>
                          <StatusBadge status={task.status} />
                          <MapPin size={10} color="#9ca3af" />
                          <Text style={styles.taskLocation} numberOfLines={1}>{task.location}</Text>
                        </View>
                      </View>
                      <ChevronRight size={16} color="#d1d5db" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {open.length === 0 && (
              <View style={styles.emptyBox}>
                <CheckCircle2 size={36} color="#86efac" />
                <Text style={styles.emptyTitle}>All caught up!</Text>
                <Text style={styles.emptyText}>No active tasks right now.</Text>
              </View>
            )}
          </View>
        </View>

        {/* Completed tasks */}
        {done.length > 0 && (
          <View style={[styles.section, { marginBottom: 24 }]}>
            <View style={styles.sectionHeader}>
              <CheckCircle2 size={14} color="#22c55e" />
              <Text style={styles.sectionTitle}>Completed</Text>
              <View style={[styles.countBadge, { backgroundColor: '#dcfce7' }]}>
                <Text style={[styles.countBadgeText, { color: '#15803d' }]}>{done.length}</Text>
              </View>
            </View>
            <View style={{ gap: 8 }}>
              {done.map(task => (
                <TouchableOpacity
                  key={task.id}
                  onPress={() => onTaskDetail(task)}
                  style={styles.doneCard}
                  activeOpacity={0.9}
                >
                  <View style={styles.doneIcon}>
                    <Text style={{ fontSize: 18 }}>{categoryIcons[task.category]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.doneTitle} numberOfLines={1}>{task.title}</Text>
                    <StatusBadge status={task.status} />
                  </View>
                  <ChevronRight size={14} color="#d1d5db" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  header: { paddingTop: 52, paddingBottom: 64, paddingHorizontal: 20, backgroundColor: '#1e293b', overflow: 'hidden', position: 'relative' },
  decCircle1: { position: 'absolute', top: -24, right: -24, width: 112, height: 112, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 56 },
  decCircle2: { position: 'absolute', top: 32, right: 40, width: 48, height: 48, backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, zIndex: 1 },
  headerLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '500', letterSpacing: 1 },
  headerName: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryBadge: { backgroundColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  categoryBadgeText: { color: '#fff', fontSize: 11, fontWeight: '500' },
  wardRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wardText: { color: '#94a3b8', fontSize: 11 },
  statsCard: { marginHorizontal: 16, marginTop: -40, backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8, zIndex: 10 },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  statBorderX: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#f3f4f6' },
  statNum: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  alertBox: { marginHorizontal: 16, marginTop: 12, backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertText: { fontSize: 13, fontWeight: '600', color: '#b91c1c', flex: 1 },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', flex: 1 },
  countBadge: { backgroundColor: '#ffedd5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  countBadgeText: { fontSize: 11, fontWeight: '600', color: '#c2410c' },
  taskCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  priorityBar: { height: 4, width: '100%' },
  taskBody: { padding: 16 },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  taskIcon: { width: 44, height: 44, backgroundColor: '#f3f4f6', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  taskTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  taskId: { fontSize: 10, color: '#9ca3af', fontWeight: '500' },
  priorityChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  priorityChipText: { fontSize: 10, fontWeight: '600' },
  taskTitle: { fontSize: 13, fontWeight: '700', color: '#1f2937' },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  taskLocation: { fontSize: 10, color: '#9ca3af', flex: 1 },
  emptyBox: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', paddingVertical: 40, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  emptyText: { fontSize: 11, color: '#9ca3af' },
  doneCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: 0.8 },
  doneIcon: { width: 36, height: 36, backgroundColor: '#f0fdf4', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '600' },
});
