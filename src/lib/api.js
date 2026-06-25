// src/lib/api.js
//
// Same fetch wrapper as before, PLUS a new helper: api.business(businessId)
// returns a version of `api` where every call automatically gets prefixed
// with /businesses/:businessId — so pages don't need to manually build
// that URL prefix on every single call.

import { supabase } from './supabaseClient';

const API_URL = import.meta.env.VITE_API_URL;

async function request(path, options = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong.');
  }

  return data;
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),

  // NEW: returns a business-scoped version of the api helper.
  // Usage: api.business(businessId).get('/clients')
  //   -> actually calls GET /businesses/{businessId}/clients
  business: (businessId) => ({
    get: (path) => request(`/businesses/${businessId}${path}`, { method: 'GET' }),
    post: (path, body) =>
      request(`/businesses/${businessId}${path}`, { method: 'POST', body: JSON.stringify(body) }),
    put: (path, body) =>
      request(`/businesses/${businessId}${path}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (path) => request(`/businesses/${businessId}${path}`, { method: 'DELETE' }),
  }),
};