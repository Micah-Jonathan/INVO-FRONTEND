// src/pages/CreateInvoicePage.jsx

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useBusiness } from '../context/BusinessContext';
import './CreateInvoicePage.css';

function formatNaira(amount) {
  return '₦' + Number(amount || 0).toLocaleString('en-NG');
}

function todayPlusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

let nextLineId = 1;
function newLineItem() {
  return { id: nextLineId++, description: '', quantity: 1, unit_price: '' };
}

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const { id } = useParams(); // present only when editing an existing invoice
  const isEditMode = Boolean(id);
  const [searchParams] = useSearchParams();
  const preselectedClientId = searchParams.get('client');
  const { currentBusiness } = useBusiness();

  const [clients, setClients] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [clientId, setClientId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState(7.5);
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState([newLineItem()]);
  const [existingStatus, setExistingStatus] = useState('pending');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentBusiness) loadInitialData();
  }, [currentBusiness, id]);

  async function loadInitialData() {
    setLoadingData(true);
    try {
      const clientsRes = await api.business(currentBusiness.id).get('/clients');
      setClients(clientsRes.clients);

      if (isEditMode) {
        // Editing: load the existing invoice and pre-fill everything from it
        const invRes = await api.business(currentBusiness.id).get(`/invoices/${id}`);
        setClientId(invRes.invoice.client_id);
        setDueDate(invRes.invoice.due_date);
        setTaxEnabled(invRes.invoice.tax_enabled);
        setTaxRate(invRes.invoice.tax_rate);
        setNotes(invRes.invoice.notes || '');
        setExistingStatus(invRes.invoice.status);
        setLineItems(
          invRes.lineItems.map((li) => ({
            id: nextLineId++,
            description: li.description,
            quantity: li.quantity,
            unit_price: li.unit_price,
          }))
        );
      } else {
        // Creating: apply this BUSINESS's defaults (no longer a separate /profile call —
        // currentBusiness already has these fields from the BusinessContext)
        setTaxEnabled(currentBusiness.default_tax_enabled);
        setTaxRate(currentBusiness.default_tax_rate);
        setDueDate(todayPlusDays(currentBusiness.default_payment_terms_days || 7));
        if (preselectedClientId) setClientId(preselectedClientId);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingData(false);
    }
  }

  function updateLineItem(id, field, value) {
    setLineItems((items) =>
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  function addLineItem() {
    setLineItems((items) => [...items, newLineItem()]);
  }

  function removeLineItem(id) {
    setLineItems((items) => (items.length > 1 ? items.filter((item) => item.id !== id) : items));
  }

  // ---- Live calculations ----
  const subtotal = lineItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
    0
  );
  const taxAmount = taxEnabled ? subtotal * (Number(taxRate) / 100) : 0;
  const total = subtotal + taxAmount;

  async function handleSubmit(status) {
    setError('');

    if (!clientId) {
      setError('Please select a client.');
      return;
    }
    const validLineItems = lineItems.filter((i) => i.description.trim() && Number(i.unit_price) > 0);
    if (validLineItems.length === 0) {
      setError('Please add at least one line item with a description and price.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        // Editing only updates top-level invoice fields (status, due date, notes, tax).
        // Line item changes aren't saved in edit mode yet — that's a known limitation.
        await api.business(currentBusiness.id).put(`/invoices/${id}`, {
          status: existingStatus,
          due_date: dueDate,
          notes,
          tax_enabled: taxEnabled,
          tax_rate: taxEnabled ? Number(taxRate) : 0,
        });
        navigate(`/invoices/${id}`);
      } else {
        const data = await api.business(currentBusiness.id).post('/invoices', {
          client_id: clientId,
          due_date: dueDate,
          tax_enabled: taxEnabled,
          tax_rate: taxEnabled ? Number(taxRate) : 0,
          notes,
          status,
          line_items: validLineItems.map((i) => ({
            description: i.description,
            quantity: Number(i.quantity),
            unit_price: Number(i.unit_price),
          })),
        });
        navigate(`/invoices/${data.invoice.id}`);
      }
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  }

  if (loadingData) return <p>Loading...</p>;

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate('/invoices')}>
            ←
          </button>
          <h1>{isEditMode ? `Edit invoice` : 'New invoice'}</h1>
        </div>
        <div className="topbar-actions">
          {!isEditMode && (
            <button className="btn-ghost" onClick={() => handleSubmit('draft')} disabled={isSubmitting}>
              Save as draft
            </button>
          )}
          <button
            className="btn-primary"
            onClick={() => handleSubmit('pending')}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : isEditMode ? 'Save changes' : 'Send invoice'}
          </button>
        </div>
      </div>

      {isEditMode && (
        <p className="edit-note">
          Note: line items can't be changed here yet — only dates, tax, status, and notes.
        </p>
      )}

      {error && <p className="form-error">{error}</p>}

      {clients.length === 0 && (
        <p className="form-error">
          You don't have any clients yet.{' '}
          <span className="link" onClick={() => navigate('/clients/new')}>
            Add a client first
          </span>
          .
        </p>
      )}

      <div className="card">
        <p className="card-title">Client & dates</p>
        <div className="row2">
          <div className="field">
            <label>Client</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <p className="card-title">Line items</p>
        <div className="line-items-head">
          <span>Description</span>
          <span>Qty</span>
          <span>Unit price</span>
          <span>Amount</span>
          <span></span>
        </div>

        {lineItems.map((item) => (
          <div className="line-item-row" key={item.id}>
            <input
              type="text"
              placeholder="e.g. Website homepage redesign"
              value={item.description}
              onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
            />
            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)}
            />
            <input
              type="number"
              min="0"
              placeholder="0"
              value={item.unit_price}
              onChange={(e) => updateLineItem(item.id, 'unit_price', e.target.value)}
            />
            <span className="line-amt">
              {formatNaira(Number(item.quantity || 0) * Number(item.unit_price || 0))}
            </span>
            <button className="remove-btn" onClick={() => removeLineItem(item.id)}>
              ×
            </button>
          </div>
        ))}

        <button className="add-line-btn" onClick={addLineItem}>
          + Add line item
        </button>

        <div className="totals">
          <div className="total-row">
            <span>Subtotal</span>
            <span>{formatNaira(subtotal)}</span>
          </div>

          <div className="tax-row">
            <div className="tax-left">
              <div
                className={`switch ${taxEnabled ? 'on' : ''}`}
                onClick={() => setTaxEnabled(!taxEnabled)}
              >
                <div className="switch-knob" />
              </div>
              <span>Add tax</span>
              {taxEnabled && (
                <input
                  type="number"
                  className="tax-rate-input"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  step="0.1"
                  min="0"
                />
              )}
              {taxEnabled && <span>%</span>}
            </div>
            <span className={`tax-amount ${!taxEnabled ? 'disabled' : ''}`}>
              {taxEnabled ? formatNaira(taxAmount) : 'Not applied'}
            </span>
          </div>

          <div className="total-row grand">
            <span>Total due</span>
            <span>{formatNaira(total)}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <p className="card-title">Notes</p>
        <div className="field">
          <label>Payment instructions (optional)</label>
          <textarea
            rows="2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Pay via bank transfer — GTBank, 0123456789"
          />
        </div>
      </div>
    </div>
  );
}