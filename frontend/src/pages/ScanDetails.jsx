import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Link2, MessageSquareText, Trash2 } from 'lucide-react';
import useAsync from '../hooks/useAsync.js';
import { api } from '../services/api.js';
import Spinner from '../components/Spinner.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import ScanResult from '../components/ScanResult.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

export default function ScanDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => api.getScan(id), [id]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const remove = async () => {
    setBusy(true);
    try {
      await api.deleteScan(id);
      navigate('/history', { replace: true });
    } catch (err) {
      setDeleteError(err);
      setConfirm(false);
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <Link className="link back" to="/history"><ArrowLeft size={16} aria-hidden="true" /> Back to history</Link>
      {loading && !data && <Spinner label="Loading scan" />}
      <ErrorBanner error={error} onRetry={error && error.status !== 404 ? reload : undefined}
                   title={error && error.status === 404 ? 'Scan not found' : 'The scan could not be loaded'} />
      <ErrorBanner error={deleteError} title="The scan could not be deleted" />

      {data && (
        <>
          <header className="page-head page-head-row">
            <div>
              <h1>Scan details</h1>
              <p>{data.scanType === 'URL' ? 'URL scan' : 'Message scan'} number {data.id}</p>
            </div>
            <button type="button" className="btn btn-danger-ghost" onClick={() => setConfirm(true)}>
              <Trash2 size={16} aria-hidden="true" /> Delete scan
            </button>
          </header>

          <section className="panel">
            <h2 className="with-icon">
              {data.scanType === 'URL' ? <Link2 size={18} aria-hidden="true" /> : <MessageSquareText size={18} aria-hidden="true" />}
              {data.scanType === 'URL' ? 'Scanned address' : 'Scanned message'}
            </h2>
            <pre className="input-copy">{data.inputText}</pre>
          </section>

          <ScanResult scan={data} showDetailsLink={false} />
        </>
      )}

      <ConfirmDialog open={confirm} title="Delete this scan?"
                     message="The scan and its explanation will be removed from your history. This cannot be undone."
                     busy={busy} onConfirm={remove} onCancel={() => setConfirm(false)} />
    </div>
  );
}
