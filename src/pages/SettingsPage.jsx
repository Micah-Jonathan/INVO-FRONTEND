// src/pages/SettingsPage.jsx

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import './SettingsPage.css';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState(7.5);
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [paymentTermsDays, setPaymentTermsDays] = useState(7);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/profile');
      const p = data.profile;
      setBusinessName(p.business_name || '');
      setBusinessPhone(p.business_phone || '');
      setBusinessAddress(p.business_address || '');
      setTaxEnabled(p.default_tax_enabled);
      setTaxRate(p.default_tax_rate);
      setInvoicePrefix(p.invoice_prefix || 'INV-');
      setPaymentTermsDays(p.default_payment_terms_days || 7);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      await api.put('/profile', {
        business_name: businessName,
        business_phone: businessPhone,
        business_address: businessAddress,
        default_tax_enabled: taxEnabled,
        default_tax_rate: Number(taxRate),
        invoice_prefix: invoicePrefix,
        default_payment_terms_days: Number(paymentTermsDays),
      });
      setSuccess('Settings saved successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  function setPresetRate(value) {
    setTaxRate(value);
    setTaxEnabled(value > 0);
  }

  if (loading) return <p>Loading settings...</p>;

  return (
    <div>
      <div className="topbar">
        <h1>Settings</h1>
        <p>Manage your business profile and invoicing defaults</p>
      </div>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}

      <form onSubmit={handleSave}>
        <div className="card">
          <p className="card-title">Business profile</p>
          <p className="card-desc">This appears on every invoice you send</p>
          <div className="row2">
            <div className="field">
              <label>Business name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your business name"
              />
            </div>
            <div className="field">
              <label>Phone number</label>
              <input
                type="text"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                placeholder="+234 80X XXX XXXX"
              />
            </div>
          </div>
          <div className="field">
            <label>Business address</label>
            <input
              type="text"
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              placeholder="Your business address"
            />
          </div>
        </div>

        <div className="card tax-card">
          <p className="card-title">Default tax rate</p>
          <p className="card-desc">
            Applied automatically to new invoices — you can still turn it off per invoice
          </p>

          <div className="tax-field-row">
            <div
              className={`switch ${taxEnabled ? 'on' : ''}`}
              onClick={() => setTaxEnabled(!taxEnabled)}
            >
              <div className="switch-knob" />
            </div>
            <span className="tax-label-text">Add tax to new invoices by default</span>
            <div className="rate-input-wrap">
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                step="0.1"
                min="0"
              />
              <span>%</span>
            </div>
          </div>

          <div className="preset-rates">
            <button type="button" className="preset-btn" onClick={() => setPresetRate(0)}>
              No tax
            </button>
            <button type="button" className="preset-btn" onClick={() => setPresetRate(7.5)}>
              7.5% (VAT)
            </button>
            <button type="button" className="preset-btn" onClick={() => setPresetRate(5)}>
              5%
            </button>
            <button type="button" className="preset-btn" onClick={() => setPresetRate(10)}>
              10%
            </button>
          </div>

          <div className="tax-applies-note">
            Changing this won't affect invoices you've already sent — only new ones going forward.
          </div>
        </div>

        <div className="card">
          <p className="card-title">Invoice defaults</p>
          <div className="row2">
            <div className="field">
              <label>Invoice number prefix</label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                placeholder="INV-"
              />
            </div>
            <div className="field">
              <label>Default payment terms (days)</label>
              <input
                type="number"
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(e.target.value)}
                min="1"
              />
            </div>
          </div>
        </div>

        <div className="save-row">
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}