// src/pages/CreateBusinessPage.jsx
//
// Lets a premium user create an additional business.
// If they choose to base it on an existing business, we copy that
// business's settings over and show a clear notice about what was
// copied, with the option to change anything before/after saving.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useBusiness } from '../context/BusinessContext';
import './CreateBusinessPage.css';

export default function CreateBusinessPage() {
  const navigate = useNavigate();
  const { businesses, refreshBusinesses } = useBusiness();

  const [businessName, setBusinessName] = useState('');
  const [copyFromId, setCopyFromId] = useState(businesses[0]?.id || '');
  const [useDefaults, setUseDefaults] = useState(true); // true = blank defaults, false = copy from existing
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!businessName.trim()) {
      setError('Please give this business a name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = { business_name: businessName };
      if (!useDefaults && copyFromId) {
        payload.copy_from_business_id = copyFromId;
      }

      const data = await api.post('/businesses', payload);

      await refreshBusinesses(data.business.id);

      if (data.copiedFrom) {
        const sourceName = businesses.find((b) => b.id === data.copiedFrom)?.business_name || 'that business';
        // Show the notice, then let them continue to settings to review/change anything
        setCopiedNotice(sourceName);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  }

  // After a copy, show a brief confirmation before sending them onward —
  // this is the "explicit notice" we promised, not a silent copy.
  if (copiedNotice) {
    return (
      <div className="create-business-shell">
        <div className="create-business-card">
          <div className="copied-icon">✓</div>
          <h2>Business created</h2>
          <p>
            We copied the tax rate, invoice numbering, and payment terms from{' '}
            <b>{copiedNotice}</b> as a starting point. You can change any of these in Settings.
          </p>
          <button className="btn-primary" onClick={() => navigate('/settings')}>
            Review settings now
          </button>
          <button className="btn-ghost" onClick={() => navigate('/dashboard')}>
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="create-business-shell">
      <div className="create-business-card">
        <h2>Add a new business</h2>
        <p className="create-business-sub">
          Each business has its own clients, invoices, and settings.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Business name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. My Side Hustle"
              autoFocus
            />
          </div>

          {businesses.length > 0 && (
            <div className="field">
              <label>Starting settings</label>
              <div className="radio-row">
                <label className="radio-option">
                  <input
                    type="radio"
                    checked={useDefaults}
                    onChange={() => setUseDefaults(true)}
                  />
                  Start blank (default settings)
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    checked={!useDefaults}
                    onChange={() => setUseDefaults(false)}
                  />
                  Copy settings from an existing business
                </label>
              </div>

              {!useDefaults && (
                <select
                  value={copyFromId}
                  onChange={(e) => setCopyFromId(e.target.value)}
                  className="copy-from-select"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.business_name || 'Untitled business'}
                    </option>
                  ))}
                </select>
              )}
              {!useDefaults && (
                <p className="copy-note">
                  This copies the tax rate, invoice prefix, and payment terms — not your clients
                  or invoices. You'll be able to choose which clients to bring over separately.
                </p>
              )}
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={() => navigate('/dashboard')}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create business'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}