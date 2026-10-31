import { Cpu, Database, Globe, MonitorSmartphone } from 'lucide-react';
import { LEVELS, LEVEL_COLOR, LEVEL_LABEL } from '../services/format.js';

const RANGES = { LOW: '0 to 24', MEDIUM: '25 to 49', HIGH: '50 to 74', CRITICAL: '75 to 100' };
const MEANING = {
  LOW: 'No strong warning signs. Stay careful with unexpected requests.',
  MEDIUM: 'Some warning signs. Verify through an official channel before acting.',
  HIGH: 'Several clear warning signs. Do not click, reply or pay.',
  CRITICAL: 'Many strong warning signs together. Treat it as a scam.',
};

export default function HowItWorks() {
  return (
    <div className="page prose">
      <header className="page-head">
        <h1>How PhishShield AI works</h1>
        <p>What happens when you press Scan, and what the result does and does not mean.</p>
      </header>

      <section className="panel">
        <h2>The path of a scan</h2>
        <ol className="flow">
          <li><MonitorSmartphone size={20} aria-hidden="true" /><div><strong>Web app (React)</strong><span>Sends your text or URL, together with your login token, to the backend.</span></div></li>
          <li><Globe size={20} aria-hidden="true" /><div><strong>Backend (Java Spring Boot)</strong><span>Checks your login and the input, then asks the detection engine to analyse it.</span></div></li>
          <li><Cpu size={20} aria-hidden="true" /><div><strong>Detection engine (Python FastAPI)</strong><span>Applies the rules, builds the list of warning signs and calculates the score.</span></div></li>
          <li><Database size={20} aria-hidden="true" /><div><strong>Database (H2 on your computer)</strong><span>The backend stores the scan so it appears in your history and dashboard.</span></div></li>
        </ol>
      </section>

      <section className="panel">
        <h2>Risk levels</h2>
        <table className="table">
          <thead><tr><th>Level</th><th>Score</th><th>What it suggests</th></tr></thead>
          <tbody>
            {LEVELS.map((l) => (
              <tr key={l}>
                <td><span className="dot" style={{ background: LEVEL_COLOR[l] }} /> {LEVEL_LABEL[l]}</td>
                <td>{RANGES[l]}</td>
                <td>{MEANING[l]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">
          Each warning sign has a weight. Signs of the same kind are not added up in full, so one tactic is not counted twice.
          When several different tactics appear together a small bonus is added. The total is capped at 100.
        </p>
      </section>

      <div className="two-col">
        <section className="panel">
          <h2>What the message scanner looks for</h2>
          <ul className="bullets">
            <li>Prize and lottery claims you never entered</li>
            <li>Account blocked, suspended or KYC warnings</li>
            <li>Requests for OTP, PIN, CVV or passwords</li>
            <li>Fees, taxes or transfers demanded up front</li>
            <li>Urgency, secrecy and threats of arrest</li>
            <li>Risky links and impersonated banks or services</li>
          </ul>
        </section>
        <section className="panel">
          <h2>What the URL scanner looks for</h2>
          <ul className="bullets">
            <li>Numeric IP addresses instead of names</li>
            <li>Shortened links and unusual domain endings</li>
            <li>Brand names placed in someone else's domain</li>
            <li>Look-alike spellings and strange characters</li>
            <li>The @ trick, odd ports and very long addresses</li>
            <li>Words such as login, verify or account</li>
          </ul>
        </section>
      </div>

      <section className="panel">
        <h2>Please keep in mind</h2>
        <ul className="bullets">
          <li>The engine uses written rules (heuristics). It is not a trained machine-learning model.</li>
          <li>The score is a measure of warning signs. It is not the probability that something is fraud.</li>
          <li>Links are never opened. They are read as text, and no live threat-intelligence service is queried.</li>
          <li>False positives and false negatives are possible. A low score does not prove a message is safe.</li>
          <li>If money was lost, call the cyber crime helpline 1930 in India and report at cybercrime.gov.in.</li>
        </ul>
      </section>
    </div>
  );
}
