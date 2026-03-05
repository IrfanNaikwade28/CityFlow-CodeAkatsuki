import { useState, useEffect } from 'react';
import { useClient } from '../context/ClientContext';
import { ArrowLeft, Megaphone, Shield, AlertCircle, Radio, Clock, ThumbsUp } from 'lucide-react';
import { categoryIcons } from '../data/mockData';
import FeedIssueCard from '../components/shared/FeedIssueCard';
import { apiGetPublicIssues } from '../services/api';

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

// Static admin notices shown in the feed
const adminNotices = [
  {
    id: 'N-001', type: 'Maintenance',
    title: 'Scheduled Water Supply Interruption',
    body: 'Water supply in Ward 5, 7 and 12 will be interrupted on Feb 23rd from 9 AM to 2 PM.',
    ward: 'Ward 5, 7, 12', postedAt: '2026-02-21T08:00:00', upvotes: 12,
  },
  {
    id: 'N-002', type: 'Alert',
    title: 'Open Manhole on Karve Road — Avoid Area',
    body: 'Dangerous open manhole on Karve Road (Ward 6). Citizens advised to avoid this stretch.',
    ward: 'Ward 6', postedAt: '2026-02-21T07:30:00', upvotes: 56,
  },
  {
    id: 'N-003', type: 'Announcement',
    title: 'CityFlow App Now Available',
    body: 'Citizens of Ichalkaranji can now report civic issues via the CityFlow mobile app on Play Store & App Store.',
    ward: 'All Wards', postedAt: '2026-02-20T10:00:00', upvotes: 34,
  },
];

const noticeCfg = {
  Announcement: { bg: 'bg-blue-50 border-blue-100', badge: 'bg-blue-100 text-blue-700', Icon: Megaphone, color: 'text-blue-600' },
  Alert: { bg: 'bg-red-50 border-red-100', badge: 'bg-red-100 text-red-700', Icon: AlertCircle, color: 'text-red-600' },
  Maintenance: { bg: 'bg-amber-50 border-amber-100', badge: 'bg-amber-100 text-amber-700', Icon: Shield, color: 'text-amber-600' },
  Event: { bg: 'bg-green-50 border-green-100', badge: 'bg-green-100 text-green-700', Icon: Radio, color: 'text-green-600' },
};

function NoticeCard({ notice }) {
  const cfg = noticeCfg[notice.type] || noticeCfg.Announcement;
  const { Icon } = cfg;
  return (
    <div className={`border rounded-2xl p-4 ${cfg.bg}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <Icon size={16} className={cfg.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.badge}`}>{notice.type}</span>
            <span className="text-[10px] text-gray-500">{notice.ward}</span>
          </div>
          <p className="text-sm font-bold text-gray-800">{notice.title}</p>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">{notice.body}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><Clock size={9} />{new Date(notice.postedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
            <span className="flex items-center gap-1"><ThumbsUp size={9} />{notice.upvotes}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CivicFeed({ onBack, readOnly = false }) {
  const { myComplaints, upvoteComplaint } = useClient();
  const [catFilter, setCatFilter] = useState('All');
  const [tab, setTab] = useState('issues'); // 'issues' | 'notices'
  const [upvotedIds, setUpvotedIds] = useState({});
  const [publicIssues, setPublicIssues] = useState([]);

  // Fetch public issues from API
  useEffect(() => {
    apiGetPublicIssues()
      .then(data => setPublicIssues(Array.isArray(data) ? data : (data.results || [])))
      .catch(() => {});
  }, []);

  const now = Date.now();

  // Merge public API issues + citizen's own public complaints; deduplicate by id
  const ownPublic = myComplaints
    .filter(c => c.is_public !== false && c.isPublic !== false)
    .map(c => ({ ...c, distance: '< 1 km' }));

  const allFeed = [...publicIssues, ...ownPublic]
    .filter(issue => {
      const resolvedAt = issue.resolved_at || issue.resolvedAt;
      if (issue.status === 'Resolved' && resolvedAt) {
        return now - new Date(resolvedAt).getTime() < TWO_DAYS_MS;
      }
      return true;
    });

  const seen = new Set();
  const deduped = allFeed.filter(i => {
    const key = i.display_id || i.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const categories = ['All', 'Road', 'Water', 'Electricity', 'Garbage', 'Traffic', 'Public Facilities'];
  const filtered = catFilter === 'All' ? deduped : deduped.filter(i => i.category === catFilter);

  const handleUpvote = (id) => {
    if (readOnly) return;
    setUpvotedIds(prev => ({ ...prev, [id]: true }));
    upvoteComplaint(id);
  };

  return (
    <div className="mobile-container bg-gray-50 flex flex-col">
      {/* Sticky header */}
      <div className="bg-white sticky top-0 z-20 border-b border-gray-100 shadow-sm flex-shrink-0">
        <div className="pt-safe pt-4 pb-3 px-4">
          <button onClick={onBack} className="flex items-center gap-1.5 text-gray-500 mb-3 text-sm active:opacity-70">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">Civic Feed</h1>
              <p className="text-gray-400 text-xs mt-0.5">
                {readOnly ? 'Community issues in your area' : `${filtered.length} issues near you`}
              </p>
            </div>
            {/* Tab pills */}
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1 flex-shrink-0">
              {[
                { key: 'issues', label: 'Issues' },
                { key: 'notices', label: 'Notices' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                    ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category filter pills — only on issues tab */}
        {tab === 'issues' && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
            {categories.map(f => (
              <button
                key={f}
                onClick={() => setCatFilter(f)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95
                  ${catFilter === f ? 'bg-[#2563eb] text-white shadow-sm' : 'bg-gray-100 text-gray-600'}`}
              >
                {f !== 'All' && categoryIcons[f]}
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-3 pb-safe pb-24">
        {tab === 'issues' && (
          <>
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-sm text-gray-400">No issues in this category</p>
              </div>
            )}
            {filtered.map(issue => (
              <FeedIssueCard
                key={issue.display_id || issue.id}
                issue={issue}
                readOnly={readOnly}
                onUpvote={handleUpvote}
                upvoted={!!(upvotedIds[issue.display_id] || upvotedIds[issue.id])}
              />
            ))}
          </>
        )}

        {tab === 'notices' && (
          <div className="space-y-3">
            {adminNotices.map(n => <NoticeCard key={n.id} notice={n} />)}
          </div>
        )}
      </div>
    </div>
  );
}
