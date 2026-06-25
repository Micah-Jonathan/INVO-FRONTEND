// src/pages/InvoiceDetailPage.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { supabase } from '../lib/supabaseClient';
import { useBusiness } from '../context/BusinessContext';
import './InvoiceDetailPage.css';

function formatNaira(amount) {
  return '₦' + Number(amount).toLocaleString('en-NG');
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentBusiness } = useBusiness();

  const [invoice, setInvoice] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [paymentAmount, setPaymentAmount] = useState('');
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (currentBusiness) loadInvoice();
  }, [id, currentBusiness]);

  async function loadInvoice() {
    setLoading(true);
    setError('');
    try {
      const data = await api.business(currentBusiness.id).get(`/invoices/${id}`);
      setInvoice(data.invoice);
      setLineItems(data.lineItems || []);
      setPayments(data.payments || []);
      setActivity(data.activity || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkFullyPaid() {
    const remaining = Number(invoice.total_amount) - Number(invoice.amount_paid);
    await recordPayment(remaining);
  }

  async function handleRecordPartial(e) {
    e.preventDefault();
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) return;
    await recordPayment(amount);
    setPaymentAmount('');
    setShowPaymentInput(false);
  }

  async function recordPayment(amount) {
    setIsSubmittingPayment(true);
    setError('');
    try {
      await api.business(currentBusiness.id).post(`/invoices/${id}/payments`, { amount, method: 'bank transfer' });
      await loadInvoice(); // refresh everything so the UI reflects the new payment
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmittingPayment(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setError('');
    try {
      await api.business(currentBusiness.id).delete(`/invoices/${id}`);
      navigate('/invoices');
    } catch (err) {
      setError(err.message);
      setIsDeleting(false);
    }
  }

  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');

  async function handleDownloadPdf() {
    setIsDownloading(true);
    setError('');
    try {
      // Get the current session token, same way api.js does it
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/businesses/${currentBusiness.id}/invoices/${id}/pdf`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to download PDF.');
      }

      // Turn the response into a downloadable file in the browser
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleSendReminder() {
    setIsSendingReminder(true);
    setError('');
    setReminderMessage('');
    try {
      const data = await api.business(currentBusiness.id).post(`/invoices/${id}/send-reminder`, {});
      setReminderMessage(data.message);
      await loadInvoice(); // refresh so the activity log shows the new entry
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSendingReminder(false);
    }
  }

  if (!currentBusiness) return <p>Loading your business...</p>;
  if (loading) return <p>Loading invoice...</p>;
  if (error && !invoice) return <p className="form-error">{error}</p>;
  if (!invoice) return <p>Invoice not found.</p>;

  const today = new Date();
  const isOverdue =
    (invoice.status === 'pending' || invoice.status === 'partial') && new Date(invoice.due_date) < today;
  const remaining = Number(invoice.total_amount) - Number(invoice.amount_paid);
  const paidPercent = Math.min(100, (Number(invoice.amount_paid) / Number(invoice.total_amount)) * 100);

  function statusBadge() {
    if (isOverdue) return <span className="badge overdue">Overdue</span>;
    if (invoice.status === 'paid') return <span className="badge paid">Paid</span>;
    if (invoice.status === 'partial') return <span className="badge partial">Partial</span>;
    if (invoice.status === 'draft') return <span className="badge draft">Draft</span>;
    return <span className="badge pending">Pending</span>;
  }

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate('/invoices')}>
            ←
          </button>
          <h1>{invoice.invoice_number}</h1>
          {statusBadge()}
        </div>
        <div className="topbar-actions">
          <button className="btn-ghost" onClick={handleDownloadPdf} disabled={isDownloading}>
            {isDownloading ? 'Downloading...' : 'Download PDF'}
          </button>
          <button className="btn-ghost" onClick={() => navigate(`/invoices/${id}/edit`)}>
            Edit
          </button>
          {!showDeleteConfirm ? (
            <button className="btn-danger-ghost" onClick={() => setShowDeleteConfirm(true)}>
              Delete
            </button>
          ) : (
            <div className="delete-confirm">
              <span>Delete this invoice?</span>
              <button className="btn-danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button className="btn-ghost" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="layout">
        <div className="invoice-paper">
          <div className="paper-head">
            <div className="inv-title">INVOICE</div>
            <div className="inv-sub">{invoice.invoice_number}</div>
          </div>

          <div className="bill-rows">
            <div className="bill-block">
              <p className="label">Billed to</p>
              <p className="name">{invoice.clients?.name}</p>
              {invoice.clients?.email && <p className="sub">{invoice.clients.email}</p>}
              {invoice.clients?.phone && <p className="sub">{invoice.clients.phone}</p>}
            </div>
            <div className="bill-block right">
              <p className="label">Dates</p>
              <p className="name">Issued: {formatDate(invoice.issue_date)}</p>
              <p className={`sub ${isOverdue ? 'overdue-text' : ''}`}>
                Due: {formatDate(invoice.due_date)}
              </p>
            </div>
          </div>

          <table className="line-table">
            <thead>
              <tr>
                <th>Description</th>
                <th className="num">Qty</th>
                <th className="num">Unit price</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => (
                <tr key={item.id}>
                  <td className="desc-cell">{item.description}</td>
                  <td className="num">{item.quantity}</td>
                  <td className="num">{formatNaira(item.unit_price)}</td>
                  <td className="num">{formatNaira(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="totals-block">
            <div className="total-row">
              <span>Subtotal</span>
              <span>{formatNaira(invoice.subtotal)}</span>
            </div>
            {invoice.tax_enabled && (
              <div className="total-row">
                <span>Tax ({invoice.tax_rate}%)</span>
                <span>{formatNaira(invoice.tax_amount)}</span>
              </div>
            )}
            <div className="total-row grand">
              <span>Total due</span>
              <span>{formatNaira(invoice.total_amount)}</span>
            </div>
          </div>

          {invoice.notes && (
            <div className="notes-block">
              <b>Notes:</b> {invoice.notes}
            </div>
          )}
        </div>

        <div className="side-panel">
          <div className="side-card">
            <p className="side-card-title">Payment status</p>

            <div className="payment-progress-wrap">
              <div className="payment-progress-bar">
                <div className="payment-progress-fill" style={{ width: `${paidPercent}%` }} />
              </div>
              <div className="payment-progress-label">
                <span>
                  <b>{formatNaira(invoice.amount_paid)}</b> paid
                </span>
                <span>of {formatNaira(invoice.total_amount)}</span>
              </div>
            </div>

            {invoice.status !== 'paid' && (
              <>
                <button
                  className="mark-paid-btn"
                  onClick={handleMarkFullyPaid}
                  disabled={isSubmittingPayment}
                >
                  {isSubmittingPayment ? 'Recording...' : `Mark as fully paid (${formatNaira(remaining)})`}
                </button>

                {!showPaymentInput ? (
                  <button className="partial-btn" onClick={() => setShowPaymentInput(true)}>
                    Record partial payment
                  </button>
                ) : (
                  <form className="partial-form" onSubmit={handleRecordPartial}>
                    <input
                      type="number"
                      placeholder="Amount paid"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      max={remaining}
                      min={1}
                      required
                    />
                    <button type="submit" disabled={isSubmittingPayment}>
                      {isSubmittingPayment ? '...' : 'Save'}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>

          <div className="side-card">
            <p className="side-card-title">Reminders</p>
            {invoice.status === 'paid' ? (
              <p className="no-activity">This invoice is fully paid — no reminder needed.</p>
            ) : !invoice.clients?.email ? (
              <p className="no-activity">This client has no email on file. Add one to send reminders.</p>
            ) : (
              <>
                <p className="reminder-target">Will send to: {invoice.clients.email}</p>
                <button
                  className="send-reminder-btn"
                  onClick={handleSendReminder}
                  disabled={isSendingReminder}
                >
                  {isSendingReminder ? 'Sending...' : 'Send reminder now'}
                </button>
                {reminderMessage && <p className="reminder-success">{reminderMessage}</p>}
              </>
            )}
          </div>

          <div className="side-card">
            <p className="side-card-title">Activity</p>
            {activity.length === 0 ? (
              <p className="no-activity">No activity yet.</p>
            ) : (
              activity.map((item) => (
                <div className="activity-item" key={item.id}>
                  <div className="activity-text">{item.description}</div>
                  <div className="activity-time">{formatDate(item.created_at)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}