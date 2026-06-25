// src/pages/AddClientPage.jsx

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useBusiness } from '../context/BusinessContext';
import './AddClientPage.css';

function getInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AddClientPage() {
  const navigate = useNavigate();
  const { id } = useParams(); // present only when editing an existing client
  const isEditMode = Boolean(id);
  const { currentBusiness } = useBusiness();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditMode);

  // Duplicate-detection: when typing an email, we check if it already
  // exists in one of the user's OTHER businesses, and offer to import it.
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  useEffect(() => {
    if (isEditMode && currentBusiness) loadClient();
  }, [id, currentBusiness]);

  async function loadClient() {
    setLoadingData(true);
    try {
      const data = await api.business(currentBusiness.id).get(`/clients/${id}`);
      setName(data.client.name || '');
      setEmail(data.client.email || '');
      setPhone(data.client.phone || '');
      setCompanyName(data.client.company_name || '');
      setAddress(data.client.address || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingData(false);
    }
  }

  // Checks for duplicates a moment after the user stops typing the email,
  // rather than on every keystroke (avoids spamming the backend)
  useEffect(() => {
    if (isEditMode || !currentBusiness || !email || !email.includes('@')) {
      setDuplicateMatches([]);
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingDuplicate(true);
      try {
        const data = await api.get(
          `/businesses/${currentBusiness.id}/check-client?email=${encodeURIComponent(email)}`
        );
        setDuplicateMatches(data.matches || []);
      } catch {
        // Silently ignore — duplicate checking is a nice-to-have, not critical
      } finally {
        setCheckingDuplicate(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [email, isEditMode, currentBusiness]);

  function importFromMatch(match) {
    setName(match.name || '');
    setEmail(match.email || '');
    setPhone(match.phone || '');
    setCompanyName(match.company_name || '');
    setAddress(match.address || '');
    setDuplicateMatches([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const payload = {
        name,
        email: email || null,
        phone: phone || null,
        company_name: companyName || null,
        address: address || null,
      };

      if (isEditMode) {
        await api.business(currentBusiness.id).put(`/clients/${id}`, payload);
        navigate(`/clients/${id}`);
      } else {
        await api.business(currentBusiness.id).post('/clients', payload);
        navigate('/clients');
      }
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  }

  if (loadingData) return <p>Loading...</p>;

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-head">
          <div className="modal-title">{isEditMode ? 'Edit client' : 'Add new client'}</div>
          <button className="close-btn" onClick={() => navigate(isEditMode ? `/clients/${id}` : '/clients')}>
            ×
          </button>
        </div>
        <p className="modal-sub">
          {isEditMode
            ? "Update this client's details"
            : "They'll be saved to your client list for future invoices"}
        </p>

        <div className="avatar-preview-row">
          <div className="avatar-preview">{getInitials(name)}</div>
          <div className="avatar-preview-text">
            Avatar is generated automatically from <b>their initials</b>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tunde Fashola"
              required
            />
          </div>

          <div className="field">
            <label>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@email.com"
            />
          </div>

          {checkingDuplicate && <p className="duplicate-checking">Checking for existing client...</p>}

          {duplicateMatches.length > 0 && (
            <div className="duplicate-notice">
              {duplicateMatches.map((match) => (
                <div key={match.id} className="duplicate-match">
                  <span>
                    A client with this email already exists in <b>{match.business_name}</b>.
                  </span>
                  <button type="button" onClick={() => importFromMatch(match)}>
                    Import their details
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="field">
            <label>
              Phone number <span className="opt">(optional)</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+234 8XX XXX XXXX"
            />
          </div>

          <div className="field">
            <label>
              Business / company name <span className="opt">(optional)</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Fashola Logistics Ltd"
            />
          </div>

          <div className="field">
            <label>
              Address <span className="opt">(optional)</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="For invoices that need it"
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => navigate(isEditMode ? `/clients/${id}` : '/clients')}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditMode ? 'Save changes' : 'Save client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}