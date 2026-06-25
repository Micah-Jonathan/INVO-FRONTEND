// src/context/BusinessContext.jsx
//
// Tracks which business is currently "active" across the whole app.
// Every page that shows clients/invoices needs to know this.
// The chosen business persists across reloads using localStorage,
// so switching businesses feels sticky rather than resetting every refresh.

import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

const BusinessContext = createContext(undefined);

export function BusinessProvider({ children }) {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadBusinesses();
    } else {
      setBusinesses([]);
      setCurrentBusiness(null);
      setLoading(false);
    }
  }, [user]);

  async function loadBusinesses() {
    setLoading(true);
    try {
      const data = await api.get('/businesses');
      setBusinesses(data.businesses);

      // Try to restore the last-used business from localStorage,
      // but only if it still exists in this user's list
      const savedId = localStorage.getItem('currentBusinessId');
      const restored = data.businesses.find((b) => b.id === savedId);

      setCurrentBusiness(restored || data.businesses[0] || null);
    } catch (err) {
      console.error('Failed to load businesses:', err.message);
    } finally {
      setLoading(false);
    }
  }

  function switchBusiness(businessId) {
    const found = businesses.find((b) => b.id === businessId);
    if (found) {
      setCurrentBusiness(found);
      localStorage.setItem('currentBusinessId', found.id);
    }
  }

  // Call this after creating a new business, so the list refreshes
  // and the new one can be selected immediately
  async function refreshBusinesses(selectNewId) {
    const data = await api.get('/businesses');
    setBusinesses(data.businesses);
    if (selectNewId) {
      const found = data.businesses.find((b) => b.id === selectNewId);
      if (found) {
        setCurrentBusiness(found);
        localStorage.setItem('currentBusinessId', found.id);
      }
    }
  }

  return (
    <BusinessContext.Provider
      value={{ businesses, currentBusiness, loading, switchBusiness, refreshBusinesses }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used inside a BusinessProvider');
  }
  return context;
}