// src/context/AuthContext.jsx
//
// This keeps track of "who is logged in" across the WHOLE app.
// Any page can ask: const { user, loading } = useAuth()
// instead of each page having to check Supabase individually.

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { api } from '../lib/api';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if there's already a logged-in session (e.g. user refreshed the page)
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
      if (data.session?.user) ensureSetup();
    });

    // Listen for login/logout events anywhere in the app.
    // This fires for password login, signup, AND Google OAuth's redirect back.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) ensureSetup();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Calls the backend to make sure this user has a profile + first business.
  // Harmless to call repeatedly — it's a no-op once already set up.
  async function ensureSetup() {
    try {
      await api.post('/auth/ensure-setup', {});
    } catch (err) {
      console.error('Setup check failed:', err.message);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}