import { Link } from 'react-router-dom';
import { CheckCircle2, FileSearch, Info, ShieldAlert } from 'lucide-react';
import RiskMeter from './RiskMeter.jsx';
import IndicatorList from './IndicatorList.jsx';
import { formatDate } from '../services/format.js';

export default function ScanResult({ scan, showDetailsLink = true }) {
  const flagged = scan.riskLevel === 'HIGH' || scan.riskLevel === 'CRITICAL';
  const Icon = flagged ? ShieldAlert : CheckCircle2;
  return (
    <section className="result" aria-live="polite">
      <div className="result-top">
        <RiskMeter score={scan.riskScore} level={scan.riskLevel} />
        <div className="result-summary">
          <h2><Icon size={20} aria-hidden="true" /> Scan result</h2>
          <p>{scan.explanation}</p>
          <p className="muted small">Scan #{scan.id} saved {formatDate(scan.createdAt)}</p>
          {showDetailsLink && (
            <Link className="btn btn-ghost" to={`/history/${scan.id}`}><FileSearch size={16} aria-hidden="true" /> Open full details</Link>
          )}
        </div>
      </div>

      <div className="result-block">
        <h3>Warning signs found ({scan.indicators.length})</h3>
        <IndicatorList indicators={scan.indicators} />
      </div>

      <div className="result-block">
        <h3>Safety recommendations</h3>
        <ul className="recs">
          {scan.recommendations.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>

      <div className="banner banner-info">
        <Info size={18} aria-hidden="true" />
        <div>
          {scan.notice && <p>{scan.notice}</p>}
          <p>{scan.disclaimer}</p>
          {scan.engine && (
            <p className="muted small">
              Method: {scan.engine.method || 'rule-based heuristics'}. Machine-learning model: {scan.engine.machine_learning ? 'yes' : 'no'}.
              Live threat database lookup: {scan.engine.threat_intelligence_lookup ? 'yes' : 'no'}.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
