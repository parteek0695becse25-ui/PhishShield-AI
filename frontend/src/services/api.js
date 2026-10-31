const TOKEN_KEY = 'phishshield.token';

export const tokenStore = {
  get() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(token) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* storage unavailable */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
  },
};

export class ApiError extends Error {
  constructor(message, status, fieldErrors) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors || {};
  }
}

let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

const FALLBACKS = {
  401: 'Please sign in to continue.',
  404: 'That item was not found.',
  502: 'The PhishShield server is not responding. Check that start.bat is still running (see logs/backend.log).',
  503: 'A required service is not available. Check logs/engine.log and logs/backend.log.',
  504: 'The PhishShield server took too long to respond.',
};

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the PhishShield server. Make sure start.bat is running.', 0);
  }

  if (res.status === 204) return null;

  let data = null;
  try { data = await res.json(); } catch { /* empty or non-JSON body */ }

  if (!res.ok) {
    if (res.status === 401 && auth && token) {
      tokenStore.clear();
      if (unauthorizedHandler) unauthorizedHandler();
    }
    const message = (data && data.message) || FALLBACKS[res.status] || `Request failed (HTTP ${res.status}).`;
    throw new ApiError(message, res.status, data && data.fieldErrors);
  }
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  register: (name, email, password) =>
    request('/auth/register', { method: 'POST', body: { name, email, password }, auth: false }),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  scanMessage: (text) => request('/scans/message', { method: 'POST', body: { text } }),
  scanUrl: (url) => request('/scans/url', { method: 'POST', body: { url } }),
  listScans: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    });
    const suffix = qs.toString();
    return request(`/scans${suffix ? `?${suffix}` : ''}`);
  },
  getScan: (id) => request(`/scans/${id}`),
  deleteScan: (id) => request(`/scans/${id}`, { method: 'DELETE' }),
  stats: () => request('/dashboard/stats'),
  health: () => request('/health', { auth: false }),
};
