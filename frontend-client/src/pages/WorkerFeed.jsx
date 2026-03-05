import CivicFeed from './CivicFeed';

// Worker Feed is read-only — no upvoting
export default function WorkerFeed({ onBack }) {
  return <CivicFeed onBack={onBack} readOnly={true} />;
}
