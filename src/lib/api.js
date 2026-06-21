// src/lib/api.js
//
// A small wrapper around fetch() that:
// 1. Automatically points to your backend URL
// 2. Automatically attaches the logged-in user's token (if there is one)
// 3. Throws a clean error if the backend responds with one

import { supabase } from './supabaseClient';

const API_URL = import.meta.env.VITE_API_URL;

async function request(path, options = {}) {
  // Get the current session (if logged in) so we can attach the token
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
};