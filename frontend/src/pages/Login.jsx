import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

const DEMO = { email: 'demo@phishshield.local', password: 'Demo@1234' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login({ mode }) {
  const isRegister = mode === 'register';
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state && location.state.from) || '/';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  if (user) return <Navigate to={redirectTo} replace />;

  const validate = () => {
    const errs = {};
    if (isRegister && !name.trim()) errs.name = 'Please enter your name.';
    if (!EMAIL_RE.test(email.trim())) errs.email = 'Please enter a valid email address.';
    if (!password) errs.password = 'Please enter your password.';
    else if (isRegister && password.length < 8) errs.password = 'Use at least 8 characters.';
    return errs;
  };

  const run = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err);
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    run(() => (isRegister ? register(name.trim(), email.trim(), password) : login(email.trim(), password)));
  };

  const useDemo = () => run(() => login(DEMO.email, DEMO.password));

  return (
    <div className="auth">
      <aside className="auth-side">
        <div className="brand">
          <ShieldCheck size={30} aria-hidden="true" />
          <span className="brand-name">PhishShield AI</span>
        </div>
        <h1>Check it before you tap it.</h1>
        <p>
          Paste a suspicious SMS, WhatsApp message, email or link. PhishShield AI shows a risk score, points to the exact
          warning signs and tells you what to do next.
        </p>
        <ul className="auth-points">
          <li>Explains every warning sign in plain language</li>
          <li>Never opens the links you check</li>
          <li>Keeps your scan history on your own computer</li>
        </ul>
        <p className="muted small">Built by Team GRAVITON for CGC University. Parteek, Shiva and Nishtha.</p>
      </aside>

      <main className="auth-main">
        <form className="panel auth-card" onSubmit={submit} noValidate>
          <h2>{isRegister ? 'Create your account' : 'Sign in'}</h2>
          <p className="muted">{isRegister ? 'It takes less than a minute.' : 'Use your account to open your dashboard.'}</p>

          <ErrorBanner error={error} title={isRegister ? 'Could not create the account' : 'Could not sign in'} />

          {isRegister && (
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)}
                     autoComplete="name" aria-invalid={Boolean(fieldErrors.name)} />
              {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                   autoComplete="email" aria-invalid={Boolean(fieldErrors.email)} />
            {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="input-icon input-icon-right">
              <input id="password" className="input" type={showPassword ? 'text' : 'password'} value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     autoComplete={isRegister ? 'new-password' : 'current-password'}
                     aria-invalid={Boolean(fieldErrors.password)} />
              <button type="button" className="icon-btn" aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? <Loader2 className="spin" size={16} aria-hidden="true" /> : isRegister ? <UserPlus size={16} aria-hidden="true" /> : <LogIn size={16} aria-hidden="true" />}
            {busy ? 'Please wait' : isRegister ? 'Create account' : 'Sign in'}
          </button>

          {!isRegister && (
            <>
              <div className="divider"><span>or</span></div>
              <button type="button" className="btn btn-ghost btn-block" onClick={useDemo} disabled={busy}>
                Try the demo account
              </button>
              <p className="muted small demo-hint">Demo login: {DEMO.email} with password {DEMO.password}</p>
            </>
          )}

          <p className="auth-switch">
            {isRegister ? (<>Already have an account? <Link className="link" to="/login">Sign in</Link></>)
              : (<>New here? <Link className="link" to="/register">Create an account</Link></>)}
          </p>
        </form>
      </main>
    </div>
  );
}
