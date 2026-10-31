import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="screen-center">
      <div className="panel narrow">
        <h1>Page not found</h1>
        <p className="muted">That address does not exist in PhishShield AI.</p>
        <Link className="btn btn-primary" to="/">Go to the dashboard</Link>
      </div>
    </div>
  );
}
