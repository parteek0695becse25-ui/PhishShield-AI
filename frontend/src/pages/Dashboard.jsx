import { Link } from 'react-router-dom';
import { Activity, Link2, MessageSquareText, ShieldAlert, ShieldCheck, ScanSearch } from 'lucide-react';
import useAsync from '../hooks/useAsync.js';
import { api } from '../services/api.js';
import { LEVELS, LEVEL_COLOR, LEVEL_LABEL, formatDate } from '../services/format.js';
import StatCard from '../components/StatCard.jsx';
import Spinner from '../components/Spinner.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.stats(), []);

  return (
    <div className="page">
      <header className="page-head page-head-row">
        <div>
          <h1>Welcome back, {user.name.split(' ')[0]}</h1>
          <p>A summary of everything you have scanned so far.</p>
        </div>
        <div className="row">
          <Link className="btn btn-primary" to="/message"><MessageSquareText size={16} aria-hidden="true" /> Scan a message</Link>
          <Link className="btn btn-ghost" to="/url"><Link2 size={16} aria-hidden="true" /> Scan a URL</Link>
        </div>
      </header>

      {loading && !data && <Spinner label="Loading dashboard" />}
      <ErrorBanner error={error} onRetry={reload} title="The dashboard could not be loaded" />

      {data && data.totalScans === 0 && (
        <EmptyState icon={ScanSearch} title="No scans yet">
          <p>Your dashboard fills in as you scan. Start with a suspicious message or link you received.</p>
          <div className="row center">
            <Link className="btn btn-primary" to="/message">Scan a message</Link>
            <Link className="btn btn-ghost" to="/url">Scan a URL</Link>
          </div>
        </EmptyState>
      )}

      {data && data.totalScans > 0 && (
        <>
          <div className="stat-grid">
            <StatCard icon={Activity} label="Total scans" value={data.totalScans} hint={`Average risk score ${data.averageScore}`} />
            <StatCard icon={ShieldAlert} tone="critical" label="High-risk scans" value={data.highRiskScans} hint="High and critical levels" />
            <StatCard icon={ShieldCheck} tone="low" label="Low-risk scans" value={data.lowRiskScans} hint="Score below 25" />
            <StatCard icon={Activity} tone="medium" label="Medium-risk scans" value={data.mediumRiskScans} hint="Score 25 to 49" />
          </div>

          <div className="two-col">
            <section className="panel">
              <h2>Risk distribution</h2>
              <div className="dist-bar" role="img"
                   aria-label={LEVELS.map((l) => `${LEVEL_LABEL[l]}: ${data.riskDistribution[l] || 0}`).join(', ')}>
                {LEVELS.map((l) => {
                  const n = data.riskDistribution[l] || 0;
                  return n > 0 ? <span key={l} style={{ flexGrow: n, background: LEVEL_COLOR[l] }} /> : null;
                })}
              </div>
              <ul className="dist-legend">
                {LEVELS.map((l) => {
                  const n = data.riskDistribution[l] || 0;
                  const pct = Math.round((n / data.totalScans) * 100);
                  return (
                    <li key={l}>
                      <span className="dot" style={{ background: LEVEL_COLOR[l] }} />
                      <span>{LEVEL_LABEL[l]}</span>
                      <strong>{n}</strong>
                      <span className="muted">{pct}%</span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="panel">
              <h2>By scan type</h2>
              <div className="type-rows">
                <div className="type-row">
                  <MessageSquareText size={20} aria-hidden="true" />
                  <div>
                    <strong>Messages</strong>
                    <span className="muted">{data.messageScans.total} scanned, {data.messageScans.flagged} flagged high or critical</span>
                  </div>
                  <span className="type-avg">avg {data.messageScans.averageScore}</span>
                </div>
                <div className="type-row">
                  <Link2 size={20} aria-hidden="true" />
                  <div>
                    <strong>URLs</strong>
                    <span className="muted">{data.urlScans.total} scanned, {data.urlScans.flagged} flagged high or critical</span>
                  </div>
                  <span className="type-avg">avg {data.urlScans.averageScore}</span>
                </div>
              </div>
            </section>
          </div>

          <section className="panel">
            <div className="panel-head">
              <h2>Recent scans</h2>
              <Link className="link" to="/history">View all history</Link>
            </div>
            <ul className="recent">
              {data.recentScans.map((s) => (
                <li key={s.id}>
                  <Link to={`/history/${s.id}`} className="recent-row">
                    {s.scanType === 'URL' ? <Link2 size={18} aria-hidden="true" /> : <MessageSquareText size={18} aria-hidden="true" />}
                    <span className="recent-text">{s.preview}</span>
                    <RiskBadge level={s.riskLevel} />
                    <span className="score-pill">{s.riskScore}</span>
                    <span className="muted small recent-date">{formatDate(s.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
