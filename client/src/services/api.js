const rawApiUrl = import.meta.env.VITE_API_URL;
const BASE_URL = rawApiUrl 
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/api`)
  : '/api';

const getHeaders = () => {
  const token = localStorage.getItem('mb_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const request = async (endpoint, options = {}) => {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'API Error');
  }
  return response.json();
};

export const get = (endpoint) => request(endpoint, { method: 'GET' });
export const post = (endpoint, data) => request(endpoint, { method: 'POST', body: JSON.stringify(data) });
export const patch = (endpoint, data) => request(endpoint, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined });
export const del = (endpoint) => request(endpoint, { method: 'DELETE' });

export const auth = {
  register: (data) => post('/auth/register', data),
  login: (data) => post('/auth/login', data),
  getMe: () => get('/auth/me'),
  updateName: (data) => patch('/auth/me', data),
};

export const spaces = {
  getSpaces: (my = false) => get(`/spaces${my ? '?my=true' : ''}`),
  createSpace: (data) => post('/spaces', data),
  getSpace: (id) => get(`/spaces/${id}`),
  joinSpace: (id) => post(`/spaces/${id}/join`),
  getSpaceSessions: (id) => get(`/spaces/${id}/sessions`),
};

export const sessions = {
  createSession: (data) => post('/sessions', data),
  getSession: (id) => get(`/sessions/${id}`),
  addItem: (sessionId, data) => post(`/sessions/${sessionId}/items`, data),
  removeItem: (sessionId, itemId) => del(`/sessions/${sessionId}/items/${itemId}`),
  lockSession: (id) => post(`/sessions/${id}/lock`),
  finalizeSession: (id, data) => post(`/sessions/${id}/finalize`, data),
  contribute: (id) => post(`/sessions/${id}/contribute`),
  updateDelivery: (id, data) => patch(`/sessions/${id}/delivery`, data),
  getMyContributions: () => get('/sessions/my/contributions'),
};

export const debts = {
  getDebts: () => get('/debts'),
  payDebt: (id) => patch(`/debts/${id}/pay`),
  confirmDebt: (id) => patch(`/debts/${id}/confirm`),
};

export const notifications = {
  getNotifications: () => get('/notifications'),
  markAllRead: () => patch('/notifications/read'),
};
