// src/pages/ClientsPage.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useBusiness } from '../context/BusinessContext';
import './ClientsPage.css';

function formatNaira(amount) {
  return '₦' + Number(amount).toLocaleString('en-NG');
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ClientsPage() {
  const navigate = useNavigate();
  const { currentBusiness } = useBusiness();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (currentBusiness) loadClients();
  }, [currentBusiness]);

  async function loadClients() {
    setLoading(true);
    setError('');
    try {
      const data = await api.business(currentBusiness.id).get('/clients');
      setClients(data.clients);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredClients = clients.filter((c) => {
    const term = search.toLowerCase();
    return c.name.toLowerCase().includes(term) || (c.email || '').toLowerCase().includes(term);
  });

  if (!currentBusiness) return <p>Loading your business...</p>;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Clients</h1>
          <p>Everyone you've invoiced, in one place</p>
        </div>
        <button className="new-btn" onClick={() => navigate('/clients/new')}>
          + Add client
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search clients by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p>Loading clients...</p>
      ) : filteredClients.length === 0 ? (
        <div className="empty-state">
          {clients.length === 0
            ? 'No clients yet. Add your first one to get started.'
            : 'No clients match your search.'}
        </div>
      ) : (
        <table className="client-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client) => (
              <tr key={client.id} onClick={() => navigate(`/clients/${client.id}`)}>
                <td>
                  <div className="client-who">
                    <div className="avatar">{getInitials(client.name)}</div>
                    <div>
                      <div className="client-name">{client.name}</div>
                      {client.company_name && (
                        <div className="client-meta">{client.company_name}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td>
                  <span className="contact-line">{client.email || '—'}</span>
                  {client.phone && <span className="contact-line sub">{client.phone}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}