import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen, History, LayoutDashboard, Link2, LogOut, Menu, MessageSquareText, ShieldCheck, X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/message', label: 'Message scanner', icon: MessageSquareText },
  { to: '/url', label: 'URL scanner', icon: Link2 },
  { to: '/history', label: 'Scan history', icon: History },
  { to: '/how-it-works', label: 'How it works', icon: BookOpen },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="shell">
      <header className="mobile-bar">
        <button type="button" className="icon-btn" aria-label={open ? 'Close menu' : 'Open menu'}
                aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        <span className="brand-name">PhishShield AI</span>
      </header>

      <aside className={`rail ${open ? 'rail-open' : ''}`}>
        <div className="brand">
          <ShieldCheck size={26} aria-hidden="true" />
          <div>
            <span className="brand-name">PhishShield AI</span>
            <span className="brand-sub">Scam and phishing checker</span>
          </div>
        </div>

        <nav aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="rail-foot">
          <div className="whoami">
            <span className="avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-block" onClick={signOut}>
            <LogOut size={16} aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
