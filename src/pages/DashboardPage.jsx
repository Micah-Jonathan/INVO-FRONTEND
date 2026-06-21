// src/pages/DashboardPage.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import './DashboardPage.css';

function formatNaira(amount) {
  return '₦' + Number(amount).toLocaleString('en-NG');
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/invoices');
      setInvoices(data.invoices);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ---- Derive the dashboard numbers from the real invoice list ----
  const today = new Date();

  const outstanding = invoices.filter((inv) => inv.status === 'pending' || inv.status === 'partial');
  const overdue = invoices.filter(
    (inv) => (inv.status === 'pending' || inv.status === 'partial') && new Date(inv.due_date) < today
  );
  const paidThisMonth = invoices.filter((inv) => {
    if (inv.status !== 'paid') return false;
    const updated = new Date(inv.updated_at);
    return updated.getMonth() === today.getMonth() && updated.getFullYear() === today.getFullYear();
  });

  const outstandingTotal = outstanding.reduce(
    (sum, inv) => sum + Number(inv.total_amount) - Number(inv.amount_paid),
    0
  );
  const overdueTotal = overdue.reduce(
    (sum, inv) => sum + Number(inv.total_amount) - Number(inv.amount_paid),
    0
  );
  const paidTotal = paidThisMonth.reduce((sum, inv) => sum + Number(inv.amount_paid), 0);

  const filteredInvoices = invoices.filter((inv) => {
    if (filter === 'all') return true;
    if (filter === 'unpaid') return inv.status === 'pending' || inv.status === 'partial';
    if (filter === 'overdue') return overdue.includes(inv);
    if (filter === 'paid') return inv.status === 'paid';
    return true;
  });

  function statusBadge(invoice) {
    const isOverdue = overdue.includes(invoice);
    if (isOverdue) return <span className="badge overdue">Overdue</span>;
    if (invoice.status === 'paid') return <span className="badge paid">Paid</span>;
    if (invoice.status === 'partial') return <span className="badge partial">Partial</span>;
    if (invoice.status === 'draft') return <span className="badge draft">Draft</span>;
    return <span className="badge pending">Pending</span>;
  }

  const firstName = user?.email?.split('@')[0] || 'there';

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Good day, {firstName}</h1>
          <p>Here's what's happening with your invoices today</p>
        </div>
        <button className="new-btn" onClick={() => navigate('/invoices/new')}>
          + New invoice
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Outstanding</div>
          <div className="stat-value">{formatNaira(outstandingTotal)}</div>
          <div className="stat-sub">{outstanding.length} unpaid invoices</div>
        </div>
        <div className="stat">
          <div className="stat-label">Overdue</div>
          <div className="stat-value danger">{formatNaira(overdueTotal)}</div>
          <div className="stat-sub">{overdue.length} past due date</div>
        </div>
        <div className="stat">
          <div className="stat-label">Paid this month</div>
          <div className="stat-value success">{formatNaira(paidTotal)}</div>
          <div className="stat-sub">{paidThisMonth.length} invoices settled</div>
        </div>
      </div>

      <div className="section-head">
        <h2>Recent invoices</h2>
        <div className="filter-row">
          {['all', 'unpaid', 'overdue', 'paid'].map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p>Loading invoices...</p>
      ) : filteredInvoices.length === 0 ? (
        <div className="empty-state">No invoices yet. Create your first one to get started.</div>
      ) : (
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Client</th>
              <th>Due date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((inv) => {
              const remaining = Number(inv.total_amount) - Number(inv.amount_paid);
              const hasPartialPayment = Number(inv.amount_paid) > 0 && inv.status !== 'paid';

              return (
                <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}>
                  <td className="inv-num">{inv.invoice_number}</td>
                  <td>{inv.clients?.name || 'Unknown client'}</td>
                  <td>{formatDate(inv.due_date)}</td>
                  <td className="amt-cell">
                    {formatNaira(hasPartialPayment ? remaining : inv.total_amount)}
                    {hasPartialPayment && (
                      <div className="amt-sub">
                        {formatNaira(inv.amount_paid)} of {formatNaira(inv.total_amount)} paid
                      </div>
                    )}
                  </td>
                  <td>{statusBadge(inv)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}