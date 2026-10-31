import { LEVEL_LABEL } from '../services/format.js';

export default function IndicatorList({ indicators }) {
  if (!indicators || indicators.length === 0) {
    return <p className="muted">No suspicious patterns were found by the rules in this engine.</p>;
  }
  return (
    <ul className="indicators">
      {indicators.map((ind, i) => (
        <li key={`${ind.name}-${i}`} className={`indicator sev-${ind.severity.toLowerCase()}`}>
          <div className="indicator-head">
            <h4>{ind.name}</h4>
            <span className={`badge badge-${ind.severity.toLowerCase()}`}>{LEVEL_LABEL[ind.severity] || ind.severity}</span>
          </div>
          <p>{ind.explanation}</p>
          {ind.evidence && (
            <p className="evidence"><span>Found in the text</span><code>{ind.evidence}</code></p>
          )}
          {ind.recommendation && <p className="advice"><strong>What to do:</strong> {ind.recommendation}</p>}
        </li>
      ))}
    </ul>
  );
}
