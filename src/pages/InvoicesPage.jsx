// src/pages/InvoicesPage.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useBusiness } from '../context/BusinessContext';
import './InvoicesPage.css';

function formatNaira(amount) {
  return '₦' + Number(amount).toLocaleString('en-NG');
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { currentBusiness } = useBusiness();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (currentBusiness) loadInvoices();
  }, [currentBusiness]);

  async function loadInvoices() {
    setLoading(true);
    setError('');
    try {
      const data = await api.business(currentBusiness.id).get('/invoices');
      setInvoices(data.invoices);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const today = new Date();
  const isOverdue = (inv) =>
    (inv.status === 'pending' || inv.status === 'partial') && new Date(inv.due_date) < today;

  const counts = {
    all: invoices.length,
    draft: invoices.filter((i) => i.status === 'draft').length,
    pending: invoices.filter((i) => i.status === 'pending' && !isOverdue(i)).length,
    overdue: invoices.filter(isOverdue).length,
    paid: invoices.filter((i) => i.status === 'paid').length,
  };

  const filtered = invoices.filter((inv) => {
    // status filter
    if (filter === 'draft' && inv.status !== 'draft') return false;
    if (filter === 'pending' && (inv.status !== 'pending' || isOverdue(inv))) return false;
    if (filter === 'overdue' && !isOverdue(inv)) return false;
    if (filter === 'paid' && inv.status !== 'paid') return false;

    // search filter
    const term = search.toLowerCase();
    const clientName = (inv.clients?.name || '').toLowerCase();
    return inv.invoice_number.toLowerCase().includes(term) || clientName.includes(term);
  });

  function statusBadge(inv) {
    if (isOverdue(inv)) return <span className="badge overdue">Overdue</span>;
    if (inv.status === 'paid') return <span className="badge paid">Paid</span>;
    if (inv.status === 'partial') return <span className="badge partial">Partial</span>;
    if (inv.status === 'draft') return <span className="badge draft">Draft</span>;
    return <span className="badge pending">Pending</span>;
  }

  if (!currentBusiness) return <p>Loading your business...</p>;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Invoices</h1>
          <p>Every invoice you've created, across all clients</p>
        </div>
        <button className="new-btn" onClick={() => navigate('/invoices/new')}>
          + New invoice
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="filter-row">
        {['all', 'draft', 'pending', 'overdue', 'paid'].map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="filter-count">{counts[f]}</span>
          </button>
        ))}
      </div>

      <div className="toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by invoice # or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p>Loading invoices...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          {invoices.length === 0
            ? 'No invoices yet. Create your first one to get started.'
            : 'No invoices match this filter.'}
        </div>
      ) : (
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Client</th>
              <th>Issued</th>
              <th>Due</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => {
              const remaining = Number(inv.total_amount) - Number(inv.amount_paid);
              const hasPartialPayment = Number(inv.amount_paid) > 0 && inv.status !== 'paid';

              return (
                <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}>
                  <td className="inv-num">{inv.invoice_number}</td>
                  <td>{inv.clients?.name || 'Unknown client'}</td>
                  <td>{formatDate(inv.issue_date)}</td>
                  <td className={isOverdue(inv) ? 'due-overdue' : ''}>{formatDate(inv.due_date)}</td>
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