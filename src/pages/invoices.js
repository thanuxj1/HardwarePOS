// ============================================
// TOOLFLOW — Invoices & Billing Page (Fixed)
// ============================================
import { icon } from '../components/icons.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { getInvoices, updateInvoice, getCustomer, getSettings } from '../store.js';
import { formatCurrency, formatDate } from '../utils/helpers.js';
import { t } from '../utils/i18n.js';
import { notifyPaymentReceived } from '../utils/notifications.js';

let statusFilter = 'All';
let typeFilter = 'All';

export function renderInvoices(container) {
  statusFilter = 'All';
  typeFilter = 'All';
  draw(container);
}

function draw(container) {
  const allInv = getInvoices();
  let invoices = allInv;
  if (statusFilter !== 'All') invoices = invoices.filter(i => i.status === statusFilter);
  if (typeFilter !== 'All') {
    if (typeFilter === 'rental') invoices = invoices.filter(i => !i.type || i.type === 'rental' || i.type === 'mixed');
    else if (typeFilter === 'sale') invoices = invoices.filter(i => i.type === 'sale' || i.type === 'mixed');
  }

  const totalRev = allInv.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
  const unpaidTotal = allInv.filter(i => i.status === 'unpaid').reduce((s, i) => s + (i.total || 0), 0);
  const salesCount = allInv.filter(i => i.type === 'sale' || i.type === 'mixed').length;
  const rentalCount = allInv.filter(i => !i.type || i.type === 'rental' || i.type === 'mixed').length;

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><p class="page-subtitle">${t('billingTracking')}</p></div>
    </div>
    <div class="stat-cards stagger-children">
      <div class="stat-card emerald animate-fadeInUp"><div class="stat-card-content"><div class="stat-card-label">${t('totalRevenue')}</div><div class="stat-card-value">${formatCurrency(totalRev)}</div></div><div class="stat-card-icon emerald">${icon('trending-up', 22)}</div></div>
      <div class="stat-card rose animate-fadeInUp"><div class="stat-card-content"><div class="stat-card-label">${t('outstanding')}</div><div class="stat-card-value">${formatCurrency(unpaidTotal)}</div></div><div class="stat-card-icon rose">${icon('alert-circle', 22)}</div></div>
      <div class="stat-card cyan animate-fadeInUp"><div class="stat-card-content"><div class="stat-card-label">${t('rentalInvoices')}</div><div class="stat-card-value">${rentalCount}</div></div><div class="stat-card-icon cyan">${icon('clipboard-list', 22)}</div></div>
      <div class="stat-card violet animate-fadeInUp"><div class="stat-card-content"><div class="stat-card-label">${t('saleInvoices')}</div><div class="stat-card-value">${salesCount}</div></div><div class="stat-card-icon violet">${icon('tag', 22)}</div></div>
    </div>
    <div class="rentals-filters" style="margin-bottom:var(--space-md);display:flex;gap:8px;flex-wrap:wrap">
      <div style="display:flex;gap:6px">
        ${['All','paid','unpaid','partial'].map(s => `<button class="pos-category-btn ${s === statusFilter ? 'active' : ''}" data-if="${s}">${s === 'All' ? t('allStatus') : s === 'paid' ? t('paid') : s === 'unpaid' ? t('unpaid') : t('partial')}</button>`).join('')}
      </div>
      <div style="display:flex;gap:6px;margin-left:auto">
        ${['All','rental','sale'].map(s => `<button class="pos-category-btn ${s === typeFilter ? 'active' : ''}" data-it="${s}">${s === 'All' ? t('allTypes') : s === 'rental' ? t('rental') : t('sale')}</button>`).join('')}
      </div>
    </div>
    <div class="data-table-wrapper animate-fadeInUp"><table class="data-table"><thead><tr>
      <th>${t('invoiceNo')}</th><th>${t('type')}</th><th>${t('customers')}</th><th>${t('date')}</th><th>${t('items')}</th><th>${t('total')}</th><th>${t('status')}</th><th>${t('paymentMethod')}</th><th>${t('actions')}</th>
    </tr></thead><tbody>
      ${invoices.length === 0 ? `<tr><td colspan="9"><div class="data-table-empty">${icon('file-text', 48)}<p>${t('noResults')}</p></div></td></tr>` :
        invoices.map(inv => {
          const cust = inv.customerId === 'WALKIN' ? { name: 'Walk-in Customer' } : getCustomer(inv.customerId);
          const isSale = inv.type === 'sale';
          const isMixed = inv.type === 'mixed';
          return `<tr>
            <td><strong style="color:var(--accent-cyan)">#${inv.id.toUpperCase().slice(0,8)}</strong></td>
            <td><span class="badge ${isMixed ? 'badge-partial' : (isSale ? 'badge-rented' : 'badge-active')}">${isMixed ? '📦 Mixed' : (isSale ? `🏷️ ${t('sale')}` : `📋 ${t('rental')}`)}</span></td>
            <td>${cust?.name || 'Unknown'}</td>
            <td>${formatDate(inv.createdAt)}</td>
            <td>${inv.items?.length || 0} ${t('items')}</td>
            <td style="font-weight:600">${formatCurrency(inv.total || 0)}</td>
            <td><span class="badge badge-${inv.status}">${inv.status === 'paid' ? t('paid') : inv.status === 'unpaid' ? t('unpaid') : t('partial')}</span></td>
            <td style="color:var(--text-muted)">${inv.paymentMethod || '—'}</td>
            <td><div class="row-actions">
              <button class="row-action-btn" data-view-inv="${inv.id}" title="${t('view')}">${icon('eye', 16)}</button>
              ${inv.status === 'unpaid' ? `<button class="row-action-btn" data-pay-inv="${inv.id}" title="${t('recordPayment')}">${icon('credit-card', 16)}</button>` : ''}
              ${inv.status === 'unpaid' ? `<button class="row-action-btn" data-print-inv="${inv.id}" title="${t('printReceipt')}">${icon('printer', 16)}</button>` : ''}
            </div></td></tr>`;
        }).join('')}
    </tbody></table></div>`;

  document.querySelectorAll('[data-if]').forEach(b => b.addEventListener('click', () => { statusFilter = b.dataset.if; draw(container); }));
  document.querySelectorAll('[data-it]').forEach(b => b.addEventListener('click', () => { typeFilter = b.dataset.it; draw(container); }));
  document.querySelectorAll('[data-view-inv]').forEach(b => b.addEventListener('click', () => viewInvoice(b.dataset.viewInv)));
  document.querySelectorAll('[data-pay-inv]').forEach(b => b.addEventListener('click', () => recordPayment(b.dataset.payInv, container)));
  document.querySelectorAll('[data-print-inv]').forEach(b => b.addEventListener('click', () => printInvoice(b.dataset.printInv)));
}

function viewInvoice(id) {
  const inv = getInvoices().find(i => i.id === id);
  if (!inv) return;
  const cust = inv.customerId === 'WALKIN' ? { name: 'Walk-in Customer', phone: '' } : getCustomer(inv.customerId);
  const settings = getSettings();
  const isSale = inv.type === 'sale';
  const isMixed = inv.type === 'mixed';
  const body = `
    <div class="receipt">
      <div class="receipt-header">
        <h2>${settings.shopName || 'ToolFlow'}</h2>
        <p>${settings.shopAddress || ''}<br>${settings.shopPhone || ''}</p>
        <p style="margin-top:8px;font-weight:600">INVOICE #${inv.id.toUpperCase().slice(0,8)}</p>
        <p>${formatDate(inv.createdAt)} · ${isMixed ? '📦 MIXED' : (isSale ? '🏷️ SALE' : '📋 RENTAL')}</p>
      </div>
      <p style="margin-bottom:12px;color:#333"><strong>Bill to:</strong> ${cust?.name || 'Unknown'}<br>${cust?.phone || ''}</p>
      <div class="receipt-items">
        ${(inv.items || []).map(it => {
          const label = isSale
            ? `${it.name}${it.qty > 1 ? ` ×${it.qty}` : ''}`
            : `${it.name} (${it.days != null ? it.days + 'd' : '—'} × ${formatCurrency(it.rate || 0)})`;
          return `<div class="receipt-item"><span>${label}</span><span>${formatCurrency(it.total || 0)}</span></div>`;
        }).join('')}
      </div>
      <div class="receipt-divider"></div>
      <div class="receipt-item"><span>Subtotal</span><span>${formatCurrency(inv.subtotal || 0)}</span></div>
      <div class="receipt-item"><span>Tax</span><span>${formatCurrency(inv.tax || 0)}</span></div>
      ${inv.deposit && inv.deposit !== 0 ? `<div class="receipt-item"><span>Deposit</span><span>${formatCurrency(inv.deposit)}</span></div>` : ''}
      <div class="receipt-divider"></div>
      <div class="receipt-total"><span>TOTAL</span><span>${formatCurrency(inv.total || 0)}</span></div>
      <div class="receipt-footer">
        <p>Status: ${inv.status.toUpperCase()} ${inv.paymentMethod ? `· ${inv.paymentMethod}` : ''}</p>
        <p style="margin-top:8px">${settings.receiptFooter || 'Thank you for your business!'}</p>
      </div>
    </div>`;
  openModal('Invoice Detail', body, {
    showFooter: true,
    confirmText: `${icon('printer', 16)} Print`,
    confirmClass: 'btn-ghost',
    onConfirm: () => { printInvoice(id); closeModal(); }
  });
}

function printInvoice(id) {
  const inv = getInvoices().find(i => i.id === id);
  if (!inv) return;
  const cust = inv.customerId === 'WALKIN' ? { name: 'Walk-in Customer', phone: '' } : getCustomer(inv.customerId);
  const settings = getSettings();
  const isSale = inv.type === 'sale';
  const isMixed = inv.type === 'mixed';
  const root = document.getElementById('print-root');
  root.innerHTML = `
    <div style="font-family:monospace;width:320px;padding:24px;color:#000;background:#fff">
      <div style="text-align:center;margin-bottom:12px">
        <h2 style="margin:0;font-size:1.4rem">${settings.shopName || 'ToolFlow'}</h2>
        <p style="margin:4px 0;font-size:0.8rem">${settings.shopAddress || ''}</p>
        <p style="margin:2px 0;font-size:0.8rem">${settings.shopPhone || ''}</p>
      </div>
      <div style="border-top:1px dashed #000;border-bottom:1px dashed #000;padding:8px 0;margin:8px 0;font-size:0.8rem">
        <div>Invoice: #${inv.id.toUpperCase().slice(0,8)}</div>
        <div>Date: ${new Date(inv.createdAt).toLocaleString()}</div>
        <div>Type: ${isMixed ? 'MIXED' : (isSale ? 'SALE' : 'RENTAL')}</div>
        <div>Customer: ${cust?.name || 'Unknown'}</div>
        <div>Payment: ${inv.paymentMethod || 'Pending'}</div>
      </div>
      <div style="margin:8px 0;font-size:0.8rem">
        ${(inv.items || []).map(it => `
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="flex:1">${it.name}${it.qty > 1 ? ` x${it.qty}` : ''}${it.days ? ` (${it.days}d)` : ''}</span>
            <span>${formatCurrency(it.total || 0)}</span>
          </div>`).join('')}
      </div>
      <div style="border-top:1px dashed #000;padding-top:8px;font-size:0.8rem">
        <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${formatCurrency(inv.subtotal || 0)}</span></div>
        <div style="display:flex;justify-content:space-between"><span>Tax</span><span>${formatCurrency(inv.tax || 0)}</span></div>
        ${inv.deposit && inv.deposit !== 0 ? `<div style="display:flex;justify-content:space-between"><span>Deposit</span><span>${formatCurrency(inv.deposit)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:1rem;margin-top:6px;border-top:1px solid #000;padding-top:6px">
          <span>TOTAL</span><span>${formatCurrency(inv.total || 0)}</span>
        </div>
      </div>
      <div style="text-align:center;margin-top:16px;font-size:0.75rem">
        <svg id="inv-barcode"></svg>
        <p style="margin-top:8px">${settings.receiptFooter || 'Thank you for your business!'}</p>
      </div>
    </div>`;
  try {
    if (typeof JsBarcode !== 'undefined') {
      JsBarcode('#inv-barcode', inv.id.slice(0, 8), { format: 'CODE128', width: 1.5, height: 36, displayValue: true, fontSize: 10 });
    }
  } catch (e) { console.warn('Barcode error', e); }
  const w = window.open('', '', 'width=420,height=700');
  w.document.write('<html><head><title>Invoice</title></head><body style="margin:0">');
  w.document.write(root.innerHTML);
  w.document.write('</body></html>');
  w.document.close();
  setTimeout(() => { w.print(); w.close(); }, 500);
}

function recordPayment(id, container) {
  const inv = getInvoices().find(i => i.id === id);
  const body = `
    <div style="margin-bottom:16px;padding:12px;background:var(--bg-surface);border-radius:8px">
      <div style="display:flex;justify-content:space-between;font-weight:700;font-size:1.1rem">
        <span>Amount Due</span><span style="color:var(--accent-rose)">${formatCurrency(inv?.total || 0)}</span>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Payment Method</label>
      <select class="form-select" id="rp-method">
        <option>Cash</option><option>Card</option><option>UPI</option><option>Bank Transfer</option>
      </select>
    </div>`;
  openModal('Record Payment', body, {
    confirmText: `${icon('check-circle', 16)} Mark as Paid`,
    confirmClass: 'btn-success',
    onConfirm: () => {
      updateInvoice(id, { status: 'paid', paymentMethod: document.getElementById('rp-method').value });
      const inv = getInvoices().find(i => i.id === id);
      notifyPaymentReceived(id.slice(0,8).toUpperCase(), formatCurrency(inv?.total || 0));
      closeModal(); draw(container);
      showToast('Payment recorded successfully', 'success');
    }
  });
}
