// src/pages/ClientProfilePage.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useBusiness } from '../context/BusinessContext';
import './ClientProfilePage.css';

function formatNaira(amount) {
  return '₦' + Number(amount).toLocaleString('en-NG');
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ClientProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentBusiness } = useBusiness();
  const [client, setClient] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (currentBusiness) loadClient();
  }, [id, currentBusiness]);

  async function loadClient() {
    setLoading(true);
    setError('');
    try {
      const data = await api.business(currentBusiness.id).get(`/clients/${id}`);
      setClient(data.client);
      setInvoices(data.invoices);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setError('');
    try {
      await api.business(currentBusiness.id).delete(`/clients/${id}`);
      navigate('/clients');
    } catch (err) {
      setError(err.message);
      setIsDeleting(false);
    }
  }

  if (loading) return <p>Loading client...</p>;
  if (error) return <p className="form-error">{error}</p>;
  if (!client) return <p>Client not found.</p>;

  const today = new Date();
  const isOverdue = (inv) =>
    (inv.status === 'pending' || inv.status === 'partial') && new Date(inv.due_date) < today;

  const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.amount_paid), 0);
  const outstanding = totalBilled - totalPaid;

  function statusBadge(inv) {
    if (isOverdue(inv)) return <span className="badge overdue">Overdue</span>;
    if (inv.status === 'paid') return <span className="badge paid">Paid</span>;
    if (inv.status === 'partial') return <span className="badge partial">Partial</span>;
    if (inv.status === 'draft') return <span className="badge draft">Draft</span>;
    return <span className="badge pending">Pending</span>;
  }

  return (
    <div>
      <div className="topbar">
        <button className="back-btn" onClick={() => navigate('/clients')}>
          ←
        </button>
        <h1>Client profile</h1>
      </div>

      <div className="profile-header">
        <div className="profile-avatar">{getInitials(client.name)}</div>
        <div className="profile-info">
          <div className="profile-name">{client.name}</div>
          <div className="profile-meta-row">
            {client.email && <span className="profile-meta-item">{client.email}</span>}
            {client.phone && <span className="profile-meta-item">{client.phone}</span>}
            <span className="profile-meta-item">Client since {formatDate(client.created_at)}</span>
          </div>
        </div>
        <div className="profile-actions">
          <button className="btn-ghost" onClick={() => navigate(`/clients/${client.id}/edit`)}>
            Edit
          </button>
          <button className="btn-primary" onClick={() => navigate(`/invoices/new?client=${client.id}`)}>
            + New invoice
          </button>
        </div>
      </div>

      {!showDeleteConfirm ? (
        <button className="delete-link" onClick={() => setShowDeleteConfirm(true)}>
          Delete this client
        </button>
      ) : (
        <div className="delete-confirm">
          <span>Delete {client.name}? This will also delete all {invoices.length} of their invoices. This can't be undone.</span>
          <button className="btn-danger" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Yes, delete'}
          </button>
          <button className="btn-ghost" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </button>
        </div>
      )}

      <div className="stats-row">
        <div className="stat">
          <div className="stat-label">Total invoices</div>
          <div className="stat-value">{invoices.length}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total billed</div>
          <div className="stat-value">{formatNaira(totalBilled)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Outstanding</div>
          <div className="stat-value danger">{formatNaira(outstanding)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total paid</div>
          <div className="stat-value success">{formatNaira(totalPaid)}</div>
        </div>
      </div>

      <div className="section-head">
        <h2>Invoice history</h2>
      </div>

      {invoices.length === 0 ? (
        <div className="empty-state">No invoices for this client yet.</div>
      ) : (
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Issued</th>
              <th>Due</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}>
                <td className="inv-num">{inv.invoice_number}</td>
                <td>{formatDate(inv.issue_date)}</td>
                <td>{formatDate(inv.due_date)}</td>
                <td className="amt-cell">{formatNaira(inv.total_amount)}</td>
                <td>{statusBadge(inv)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}