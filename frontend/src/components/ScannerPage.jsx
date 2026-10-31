import { useRef, useState } from 'react';
import { Loader2, ScanSearch, Eraser } from 'lucide-react';
import ErrorBanner from './ErrorBanner.jsx';
import ScanResult from './ScanResult.jsx';

/** Shared screen for the message and URL scanners. */
export default function ScannerPage({ title, intro, label, placeholder, multiline, maxLength, samples, scan, note }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const submit = async (e) => {
    if (e) e.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await scan(value));
    } catch (err) {
      setResult(null);
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e) => {
    if (multiline && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit();
  };

  const load = (sample) => {
    setValue(sample.value);
    setError(null);
    setResult(null);
    inputRef.current?.focus();
  };

  const clear = () => {
    setValue('');
    setError(null);
    setResult(null);
    inputRef.current?.focus();
  };

  const InputTag = multiline ? 'textarea' : 'input';
  return (
    <div className="page">
      <header className="page-head">
        <h1>{title}</h1>
        <p>{intro}</p>
      </header>

      <form className="panel scan-form" onSubmit={submit}>
        <label htmlFor="scan-input">{label}</label>
        <InputTag
          id="scan-input"
          ref={inputRef}
          className="input mono-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={multiline ? 7 : undefined}
          type={multiline ? undefined : 'text'}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="scan-help"
        />
        <div className="scan-form-foot">
          <span id="scan-help" className="muted small">
            {value.length} / {maxLength} characters. {note}
          </span>
          <div className="row">
            <button type="button" className="btn btn-ghost" onClick={clear} disabled={busy || !value}>
              <Eraser size={16} aria-hidden="true" /> Clear
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy || !value.trim()}>
              {busy ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <ScanSearch size={16} aria-hidden="true" />}
              {busy ? 'Scanning' : 'Scan now'}
            </button>
          </div>
        </div>

        <div className="samples">
          <span className="muted small">Try an example:</span>
          {samples.map((s) => (
            <button key={s.name} type="button" className="chip" onClick={() => load(s)}>{s.name}</button>
          ))}
        </div>
      </form>

      <ErrorBanner error={error} title="The scan could not be completed" />
      {result && <ScanResult scan={result} />}
    </div>
  );
}
