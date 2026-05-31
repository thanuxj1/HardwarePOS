// ============================================
// TOOLFLOW — Settings Page (Fixed)
// ============================================
import { icon } from '../components/icons.js';
import { showToast } from '../components/toast.js';
import { getSettings, updateSettings, resetData } from '../store.js';
import { confirmDialog, closeModal } from '../components/modal.js';
import { t, setLanguage } from '../utils/i18n.js';

let activeTab = 'shop';

export function renderSettings(container) {
  activeTab = 'shop';
  draw(container);
}

function draw(container) {
  const s = getSettings();
  const tabs = [
    { key: 'shop',    label: t('shopProfile'),  icn: 'tool' },
    { key: 'rental',  label: t('rentalRules'),  icn: 'clipboard-list' },
    { key: 'billing', label: t('taxBilling'),   icn: 'credit-card' },
    { key: 'system',  label: t('system'),        icn: 'settings' },
  ];

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <p class="page-subtitle">${t('configurePreferences')}</p>
      </div>
    </div>
    <div class="settings-layout">
      <div class="settings-nav">
        ${tabs.map(tab => `
          <div class="settings-nav-item ${tab.key === activeTab ? 'active' : ''}" data-tab="${tab.key}">
            ${icon(tab.icn, 18)}
            <span style="margin-left:8px">${tab.label}</span>
          </div>`).join('')}
      </div>
      <div class="settings-panel animate-fadeInUp">
        ${activeTab === 'shop'    ? shopPanel(s)    :
          activeTab === 'rental'  ? rentalPanel(s)  :
          activeTab === 'billing' ? billingPanel(s) :
          systemPanel()}
      </div>
    </div>`;

  // Tab navigation
  document.querySelectorAll('[data-tab]').forEach(b => {
    b.addEventListener('click', () => { activeTab = b.dataset.tab; draw(container); });
  });

  // Save form
  const form = document.getElementById('settings-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const data = {};
      // Collect all named inputs/selects/textareas in the form
      form.querySelectorAll('[name]').forEach(el => {
        const v = el.value;
        data[el.name] = (el.type === 'number' || (!isNaN(v) && v !== '')) ? parseFloat(v) : v;
      });
      // Apply language change immediately
      if (data.language && data.language !== window.__TF_LANG__) {
        setLanguage(data.language);
      }
      // Apply currency change immediately
      if (data.currency) {
        window.__TF_CURRENCY__ = data.currency;
        localStorage.setItem('tf_currency', data.currency);
      }
      updateSettings(data);
      showToast(t('settingsSaved'), 'success');
      // Re-draw to update all labels
      draw(container);
    });
  }

  // Reset data
  document.getElementById('btn-reset-data')?.addEventListener('click', () => {
    confirmDialog(
      t('resetAllData'),
      t('resetConfirm'),
      () => {
        resetData();
        closeModal();
        const fresh = getSettings();
        window.__TF_CURRENCY__ = fresh.currency || 'LKR';
        setLanguage(fresh.language || 'en');
        showToast(t('dataReset'), 'info');
        draw(container);
      }
    );
  });
}

function shopPanel(s) {
  return `<form id="settings-form">
    <div class="settings-section">
      <div class="settings-section-title">${t('shopProfile')}</div>
      <div class="settings-row">
        <div class="form-group">
          <label class="form-label">${t('shopName')}</label>
          <input class="form-input" name="shopName" value="${s.shopName || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Shop Subtitle</label>
          <input class="form-input" name="shopSubtitle" value="${s.shopSubtitle || ''}" placeholder="e.g. Dynamic Tools">
        </div>
        <div class="form-group">
          <label class="form-label">${t('phone')}</label>
          <input class="form-input" name="shopPhone" value="${s.shopPhone || ''}">
        </div>
      </div>
      <div class="settings-row">
        <div class="form-group">
          <label class="form-label">${t('email')}</label>
          <input class="form-input" type="email" name="shopEmail" value="${s.shopEmail || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">${t('currency')}</label>
          <select class="form-select" name="currency">
            <option value="LKR" ${s.currency === 'LKR' ? 'selected' : ''}>🇱🇰 LKR — Sri Lankan Rupee</option>
            <option value="USD" ${s.currency === 'USD' ? 'selected' : ''}>🇺🇸 USD — US Dollar</option>
            <option value="EUR" ${s.currency === 'EUR' ? 'selected' : ''}>🇪🇺 EUR — Euro</option>
            <option value="GBP" ${s.currency === 'GBP' ? 'selected' : ''}>🇬🇧 GBP — British Pound</option>
            <option value="INR" ${s.currency === 'INR' ? 'selected' : ''}>🇮🇳 INR — Indian Rupee</option>
          </select>
        </div>
      </div>
      <div class="settings-row">
        <div class="form-group" style="flex:2">
          <label class="form-label">${t('address')}</label>
          <textarea class="form-textarea" name="shopAddress" rows="2">${s.shopAddress || ''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">${t('language')}</label>
          <select class="form-select" name="language">
            <option value="en" ${(s.language || 'en') === 'en' ? 'selected' : ''}>🇬🇧 English</option>
            <option value="si" ${s.language === 'si' ? 'selected' : ''}>🇱🇰 සිංහල (Sinhala)</option>
          </select>
          <div class="form-hint" style="margin-top:6px">${t('changesAfterSaving')}</div>
        </div>
      </div>
    </div>
    <button type="submit" class="btn btn-primary">${icon('check-circle', 18)} ${t('saveSettings')}</button>
  </form>`;
}

function rentalPanel(s) {
  return `<form id="settings-form">
    <div class="settings-section">
      <div class="settings-section-title">${t('rentalRules')}</div>
      <div class="settings-row">
        <div class="form-group">
          <label class="form-label">Weekly Discount (%)</label>
          <input type="number" class="form-input" name="weeklyDiscount" value="${s.weeklyDiscount ?? 10}" min="0" max="100">
          <div class="form-hint">Applied for rentals 7+ days</div>
        </div>
        <div class="form-group">
          <label class="form-label">Monthly Discount (%)</label>
          <input type="number" class="form-input" name="monthlyDiscount" value="${s.monthlyDiscount ?? 20}" min="0" max="100">
          <div class="form-hint">Applied for rentals 30+ days</div>
        </div>
      </div>
      <div class="settings-row">
        <div class="form-group">
          <label class="form-label">Late Fee Multiplier</label>
          <input type="number" step="0.1" class="form-input" name="lateFeeMultiplier" value="${s.lateFeeMultiplier ?? 1.5}" min="1">
          <div class="form-hint">Daily rate × this value per overdue day</div>
        </div>
        <div class="form-group">
          <label class="form-label">Grace Period (days)</label>
          <input type="number" class="form-input" name="gracePeriodDays" value="${s.gracePeriodDays ?? 0}" min="0">
          <div class="form-hint">Days before late fees apply</div>
        </div>
      </div>
      <div class="form-group" style="max-width:280px">
        <label class="form-label">Default Security Deposit</label>
        <input type="number" class="form-input" name="defaultDeposit" value="${s.defaultDeposit ?? 2000}" min="0">
      </div>
    </div>
    <button type="submit" class="btn btn-primary" style="margin-top:16px">${icon('check-circle', 18)} Save Rules</button>
  </form>`;
}

function billingPanel(s) {
  return `<form id="settings-form">
    <div class="settings-section">
      <div class="settings-section-title">${t('taxBilling')}</div>
      <div class="settings-row">
        <div class="form-group">
          <label class="form-label">Tax Rate (%)</label>
          <input type="number" step="0.1" class="form-input" name="taxRate" value="${s.taxRate ?? 0}" min="0" max="100">
          <div class="form-hint">Set 0 for tax-exempt transactions</div>
        </div>
        <div class="form-group">
          <label class="form-label">Invoice Prefix</label>
          <input class="form-input" name="invoicePrefix" value="${s.invoicePrefix || 'INV'}">
          <div class="form-hint">e.g. INV → INV-0001</div>
        </div>
      </div>
      <div class="settings-row">
        <div class="form-group">
          <label class="form-label">Receipt Footer</label>
          <textarea class="form-textarea" name="receiptFooter" rows="3">${s.receiptFooter || 'Thank you for your business! Please return tools on time.'}</textarea>
        </div>
      </div>
    </div>
    <button type="submit" class="btn btn-primary" style="margin-top:16px">${icon('check-circle', 18)} Save Billing</button>
  </form>`;
}

function systemPanel() {
  return `
    <div class="settings-section">
      <div class="settings-section-title">${t('system')}</div>
      <div class="glass-card" style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong>${t('resetData')}</strong>
          <p style="font-size:var(--font-sm);color:var(--text-muted);margin-top:4px">Restore all data to initial demo state</p>
        </div>
        <button class="btn btn-danger btn-sm" id="btn-reset-data">${icon('refresh-cw', 16)} Reset</button>
      </div>
      <div class="glass-card" style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong>Version</strong>
          <p style="font-size:var(--font-sm);color:var(--text-muted);margin-top:4px">ToolFlow POS v1.1.0 — Sri Lanka Edition</p>
        </div>
        <span class="badge badge-available">Latest</span>
      </div>
    </div>`;
}
