import { CheckCircle2 } from 'lucide-react';

export default function IssueSubmitSuccess({ issueId, onHome, onTrack }) {
  return (
    <div className="mobile-container flex flex-col items-center justify-center px-6 text-center bg-white">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 size={48} className="text-green-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900">Issue Reported!</h2>
      <p className="text-gray-500 text-sm mt-2 max-w-[260px]">
        Your issue has been successfully submitted to the municipal office.
      </p>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl px-6 py-4 w-full">
        <p className="text-xs text-gray-500 mb-1">Issue ID</p>
        <p className="text-2xl font-bold text-blue-700">{issueId}</p>
        <p className="text-xs text-gray-500 mt-2">Save this ID to track your issue</p>
      </div>

      <div className="mt-6 space-y-3 w-full">
        <button
          onClick={onTrack}
          className="w-full bg-[#2563eb] text-white font-semibold py-3 rounded-xl"
        >
          Track My Issue
        </button>
        <button
          onClick={onHome}
          className="w-full border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl"
        >
          Back to Home
        </button>
      </div>

      <p className="text-xs text-gray-400 mt-6">
        You will be notified when the issue status is updated.
      </p>
    </div>
  );
}
