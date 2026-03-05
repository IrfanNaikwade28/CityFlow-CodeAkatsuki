// Unified FeedIssueCard — used by CivicFeed (Citizen), WorkerFeed (Worker)
// Shows: issue photo, citizen reporter, status lifecycle, assigned worker, completion photo + worker name
import { useState } from 'react';
import {
  ThumbsUp, MessageCircle, MapPin, User, CheckCircle,
  Clock, ChevronDown, ChevronUp, Wrench, Send, Image
} from 'lucide-react';
import { categoryIcons, categoryColors, statusConfig } from '../../data/mockData';

function StatusPill({ status }) {
  const cfg = statusConfig[status] || statusConfig['Submitted'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

// Horizontal status stepper
const STEPS = ['Submitted', 'Assigned', 'In Progress', 'Resolved'];
function StatusStepper({ status }) {
  const idx = STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-0 mt-3 mb-1">
      {STEPS.map((step, i) => {
        const done = i <= idx;
        const isCurrent = i === idx;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                ${done
                  ? isCurrent
                    ? 'bg-blue-600 border-blue-600 scale-110'
                    : 'bg-blue-500 border-blue-500'
                  : 'bg-white border-gray-200'}`}>
                {done && !isCurrent && <CheckCircle size={10} className="text-white" />}
                {isCurrent && <span className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <span className={`text-[9px] mt-1 font-medium whitespace-nowrap
                ${done ? 'text-blue-600' : 'text-gray-300'}`}>
                {step === 'In Progress' ? 'In Prog.' : step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-4 rounded-full transition-all
                ${i < idx ? 'bg-blue-400' : 'bg-gray-100'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function FeedIssueCard({ issue, readOnly = false, onUpvote, upvoted = false }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [localComments, setLocalComments] = useState(issue.comments || []);
  const [localUpvotes, setLocalUpvotes] = useState(issue.upvotes || 0);
  const [hasUpvoted, setHasUpvoted] = useState(upvoted);

  const isResolved = issue.status === 'Resolved' || issue.status === 'Closed';

  // Normalise field names — API uses snake_case, old mock used camelCase
  const reporterName    = issue.reported_by_name  || issue.reporterName    || 'Anonymous';
  const reportedAt      = issue.reported_at        || issue.reportedAt      || Date.now();
  const assignedTo      = issue.assigned_to        || issue.assignedTo      || null;
  const assignedToName  = issue.assigned_to_name   || issue.assignedToName  || null;
  const resolvedAt      = issue.resolved_at        || issue.resolvedAt      || null;
  const completionPhoto = issue.completion_photo   || issue.completionPhoto || null;
  const displayId       = issue.display_id         || issue.id;

  const handleUpvote = () => {
    if (readOnly || hasUpvoted) return;
    setHasUpvoted(true);
    setLocalUpvotes(v => v + 1);
    onUpvote?.(issue.display_id || issue.id);
  };

  const handleComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const newComment = {
      id: Date.now(),
      user: 'You',
      text: commentText.trim(),
      time: new Date().toISOString(),
    };
    setLocalComments(prev => [...prev, newComment]);
    setCommentText('');
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm overflow-hidden border transition-all
      ${isResolved ? 'border-green-100' : 'border-gray-100'}`}>

      {/* ── Issue / Before photo ── */}
      {issue.image ? (
        <div className="relative w-full aspect-video overflow-hidden bg-gray-100">
          <img
            src={issue.image}
            alt={issue.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
          {/* Category badge overlaid on photo */}
          <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm bg-white/80 text-gray-700 flex items-center gap-1`}>
            {categoryIcons[issue.category]} {issue.category}
          </span>
          {isResolved && (
            <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
              <CheckCircle size={10} /> Resolved
            </div>
          )}
        </div>
      ) : (
        // No photo placeholder — minimal banner
        <div className={`h-10 flex items-center px-4 gap-2 ${isResolved ? 'bg-green-50' : 'bg-gray-50'}`}>
          <span className="text-base">{categoryIcons[issue.category]}</span>
          <span className="text-xs text-gray-500 font-medium">{issue.category}</span>
          {isResolved && (
            <span className="ml-auto bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle size={10} /> Resolved
            </span>
          )}
        </div>
      )}

      <div className="p-4">
        {/* ── Reporter row ── */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {(reporterName || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-800">{reporterName}</p>
            <p className="text-[10px] text-gray-400 flex items-center gap-1">
              <MapPin size={9} /> {issue.ward}
              {issue.distance && <span className="ml-1">· {issue.distance}</span>}
              <span className="ml-1">· {new Date(reportedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
            </p>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0
            ${issue.priority === 'High' ? 'bg-red-100 text-red-600' :
              issue.priority === 'Medium' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
            {issue.priority}
          </span>
        </div>

        {/* ── Title ── */}
        <p className="text-sm font-bold text-gray-900 leading-snug mb-2">{issue.title}</p>

        {/* ── Status lifecycle stepper ── */}
        <StatusStepper status={issue.status} />

        {/* ── Assigned worker row ── */}
        {assignedTo && (
          <div className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-xl text-xs
            ${isResolved ? 'bg-green-50' : 'bg-blue-50'}`}>
            <Wrench size={12} className={isResolved ? 'text-green-600' : 'text-blue-500'} />
            <span className={`font-semibold ${isResolved ? 'text-green-700' : 'text-blue-700'}`}>
              {isResolved ? 'Resolved by' : 'Assigned to'}:
            </span>
            <span className={isResolved ? 'text-green-600' : 'text-blue-600'}>
              {assignedToName || assignedTo}
            </span>
          </div>
        )}

        {/* ── Completion photo (After Fix) ── */}
        {isResolved && completionPhoto && (
          <div className="mt-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <CheckCircle size={12} className="text-green-500" />
              <span className="text-xs font-semibold text-green-700">After Fix</span>
              {resolvedAt && (
                <span className="text-[10px] text-gray-400 ml-auto flex items-center gap-1">
                  <Clock size={9} /> {new Date(resolvedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </span>
              )}
            </div>
            <div className="relative rounded-xl overflow-hidden border border-green-200 aspect-video bg-gray-100">
              <img
                src={completionPhoto}
                alt="After fix"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-900/50 to-transparent p-2">
                <p className="text-white text-[10px] font-semibold">
                  {assignedToName || assignedTo ? `Fixed by ${assignedToName || assignedTo}` : 'Issue resolved'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── No completion photo yet placeholder ── */}
        {isResolved && !completionPhoto && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <Image size={12} className="text-gray-300" />
            <span className="text-xs text-gray-400">No completion photo uploaded</span>
          </div>
        )}

        {/* ── Actions bar ── */}
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-50">
          {/* Upvote */}
          <button
            onClick={handleUpvote}
            disabled={readOnly || hasUpvoted}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all active:scale-95
              ${hasUpvoted
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'}
              ${(readOnly || hasUpvoted) ? 'cursor-default' : ''}`}
          >
            <ThumbsUp size={13} className={hasUpvoted ? 'fill-white' : ''} />
            {localUpvotes}
          </button>

          {/* Comments toggle */}
          <button
            onClick={() => setShowComments(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
          >
            <MessageCircle size={13} />
            {localComments.length}
            {showComments ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          <span className="ml-auto text-[10px] text-gray-300 font-mono">{displayId}</span>
        </div>

        {/* ── Comments section ── */}
        {showComments && (
          <div className="mt-3 space-y-2">
            {localComments.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">No comments yet. Be the first!</p>
            )}
            {localComments.map(c => (
              <div key={c.id} className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                  {((c.user_name || c.user) || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                  <p className="text-xs font-bold text-gray-700">{c.user_name || c.user}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{c.text}</p>
                  {(c.created_at || c.time) && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(c.created_at || c.time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {/* Comment input (only for non-readOnly) */}
            {!readOnly && (
              <form onSubmit={handleComment} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500 bg-white"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="p-2 bg-blue-600 rounded-xl text-white disabled:opacity-50 active:scale-95"
                >
                  <Send size={13} />
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
