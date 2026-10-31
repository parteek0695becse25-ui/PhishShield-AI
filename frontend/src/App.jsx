import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MessageScanner from './pages/MessageScanner.jsx';
import UrlScanner from './pages/UrlScanner.jsx';
import History from './pages/History.jsx';
import ScanDetails from './pages/ScanDetails.jsx';
import HowItWorks from './pages/HowItWorks.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login mode="login" />} />
      <Route path="/register" element={<Login mode="register" />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="message" element={<MessageScanner />} />
          <Route path="url" element={<UrlScanner />} />
          <Route path="history" element={<History />} />
          <Route path="history/:id" element={<ScanDetails />} />
          <Route path="how-it-works" element={<HowItWorks />} />
        </Route>
      </Route>
      <Route path="/dashboard" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
