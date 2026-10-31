import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History as HistoryIcon, Link2, MessageSquareText, Search, Trash2 } from 'lucide-react';
import useAsync from '../hooks/useAsync.js';
import { api } from '../services/api.js';
import { formatDate } from '../services/format.js';
import RiskBadge from '../components/RiskBadge.jsx';
import Spinner from '../components/Spinner.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

export default function History() {
  const [type, setType] = useState('');
  const [level, setLevel] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, error, reload } = useAsync(
    () => api.listScans({ type, level, q: query }), [type, level, query]);

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteScan(toDelete.id);
      setToDelete(null);
      reload();
    } catch (err) {
      setDeleteError(err);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = Boolean(type || level || query);

  return (
    <div className="page">
      <header className="page-head">
        <h1>Scan history</h1>
        <p>Every scan you run is stored so you can review the explanation again later.</p>
      </header>

      <div className="panel filters">
        <div className="field-inline">
          <label htmlFor="f-type">Type</label>
          <select id="f-type" className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            <option value="MESSAGE">Messages</option>
            <option value="URL">URLs</option>
          </select>
        </div>
        <div className="field-inline">
          <label htmlFor="f-level">Risk level</label>
          <select id="f-level" className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">All levels</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
        <div className="field-inline grow">
          <label htmlFor="f-search">Search text</label>
          <div className="input-icon">
            <Search size={16} aria-hidden="true" />
            <input id="f-search" className="input" type="search" value={search} placeholder="Search in scanned text"
                   onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <ErrorBanner error={deleteError} title="The scan could not be deleted" />
      <ErrorBanner error={error} onRetry={reload} title="History could not be loaded" />
      {loading && !data && <Spinner label="Loading history" />}

      {data && data.length === 0 && (
        <EmptyState icon={HistoryIcon} title={filtered ? 'No scans match these filters' : 'No scans saved yet'}>
          {filtered
            ? <p>Try clearing a filter or searching for different text.</p>
            : <p>Scan a message or a URL and it will appear here.</p>}
          {!filtered && (
            <div className="row center">
              <Link className="btn btn-primary" to="/message">Scan a message</Link>
              <Link className="btn btn-ghost" to="/url">Scan a URL</Link>
            </div>
          )}
        </EmptyState>
      )}

      {data && data.length > 0 && (
        <ul className="history-list">
          {data.map((s) => (
            <li key={s.id} className="history-item">
              <Link to={`/history/${s.id}`} className="history-main">
                <span className="history-type">
                  {s.scanType === 'URL' ? <Link2 size={18} aria-hidden="true" /> : <MessageSquareText size={18} aria-hidden="true" />}
                  <span>{s.scanType === 'URL' ? 'URL' : 'Message'}</span>
                </span>
                <span className="history-preview">{s.preview}</span>
                <span className="history-meta">
                  <RiskBadge level={s.riskLevel} />
                  <span className="score-pill" title="Risk score out of 100">{s.riskScore}</span>
                  <span className="muted small">{s.indicatorCount} signs</span>
                  <span className="muted small">{formatDate(s.createdAt)}</span>
                </span>
              </Link>
              <button type="button" className="icon-btn danger" aria-label={`Delete scan ${s.id}`} onClick={() => setToDelete(s)}>
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this scan?"
        message="The scan and its explanation will be removed from your history. This cannot be undone."
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
