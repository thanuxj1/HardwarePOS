// ============================================
// TOOLFLOW — Customer Management Page
// ============================================
import { icon } from '../components/icons.js';
import { openModal, closeModal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer, getCustomerRentals, getTool } from '../store.js';
import { generateId, formatCurrency, formatDate } from '../utils/helpers.js';
import { t } from '../utils/i18n.js';
import { notifyCustomerAdded, notifyCustomerDeleted } from '../utils/notifications.js';

let searchQ = '';

export function renderCustomers(container) {
  searchQ = '';
  draw(container);
}

function draw(container) {
  let customers = getCustomers();
  if (searchQ) {
    const q = searchQ.toLowerCase();
    customers = customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q));
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><p class="page-subtitle">${t('manageCustomers')}</p></div>
      <div class="page-header-actions">
        <div class="pos-search-wrapper">${icon('search', 16)}<input type="text" class="pos-search" id="cust-search" placeholder="${t('search')}" value="${searchQ}"></div>
        <button class="btn btn-primary" id="btn-add-cust">${icon('user-plus', 18)} ${t('addCustomer')}</button>
      </div>
    </div>
    <div class="stat-cards stagger-children">
      <div class="stat-card cyan animate-fadeInUp"><div class="stat-card-content"><div class="stat-card-label">${t('totalCustomers')}</div><div class="stat-card-value">${getCustomers().length}</div></div><div class="stat-card-icon cyan">${icon('users', 22)}</div></div>
      <div class="stat-card emerald animate-fadeInUp"><div class="stat-card-content"><div class="stat-card-label">${t('activeRenters')}</div><div class="stat-card-value">${getCustomers().filter(c => getCustomerRentals(c.id).some(r => r.status === 'active' || r.status === 'overdue')).length}</div></div><div class="stat-card-icon emerald">${icon('check-circle', 22)}</div></div>
      <div class="stat-card rose animate-fadeInUp"><div class="stat-card-content"><div class="stat-card-label">${t('outstandingBalance')}</div><div class="stat-card-value">${formatCurrency(getCustomers().reduce((s,c)=>s+c.balance,0))}</div></div><div class="stat-card-icon rose">${icon('dollar-sign', 22)}</div></div>
    </div>
    <div class="data-table-wrapper animate-fadeInUp">
      <table class="data-table"><thead><tr><th>${t('customers')}</th><th>${t('phone')}</th><th>${t('email')}</th><th>${t('activeRentals')}</th><th>${t('balance')}</th><th>${t('since')}</th><th>${t('actions')}</th></tr></thead>
      <tbody>${customers.length === 0 ? `<tr><td colspan="7"><div class="data-table-empty">${icon('users', 48)}<p>${t('noResults')}</p></div></td></tr>` :
        customers.map(c => {
          const rentals = getCustomerRentals(c.id);
          const active = rentals.filter(r => r.status === 'active' || r.status === 'overdue').length;
          return `<tr>
            <td><div style="display:flex;align-items:center;gap:10px">
              <div style="width:36px;height:36px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;color:white;flex-shrink:0">${c.name.split(' ').map(n=>n[0]).join('')}</div>
              <div><strong>${c.name}</strong><div style="font-size:var(--font-xs);color:var(--text-muted)">${c.address||'—'}</div></div>
            </div></td>
            <td>${c.phone}</td><td style="color:var(--text-secondary)">${c.email||'—'}</td>
            <td>${active > 0 ? `<span class="badge badge-active">${active} ${t('active')}</span>` : `<span style="color:var(--text-muted)">${t('none')}</span>`}</td>
            <td>${c.balance > 0 ? `<span style="color:var(--accent-rose);font-weight:600">${formatCurrency(c.balance)}</span>` : `<span style="color:var(--text-muted)">Rs. 0.00</span>`}</td>
            <td style="color:var(--text-muted)">${formatDate(c.createdAt)}</td>
            <td><div class="row-actions">
              <button class="row-action-btn" data-view-cust="${c.id}" title="${t('view')}">${icon('eye', 16)}</button>
              <button class="row-action-btn" data-edit-cust="${c.id}" title="${t('edit')}">${icon('edit', 16)}</button>
              <button class="row-action-btn danger" data-del-cust="${c.id}" title="${t('delete')}">${icon('trash', 16)}</button>
            </div></td></tr>`;
        }).join('')}
      </tbody></table>
    </div>`;

  document.getElementById('cust-search')?.addEventListener('input', e => { searchQ = e.target.value; draw(container); });
  document.getElementById('btn-add-cust')?.addEventListener('click', () => openCustForm(null, container));
  document.querySelectorAll('[data-edit-cust]').forEach(b => b.addEventListener('click', () => openCustForm(getCustomers().find(c=>c.id===b.dataset.editCust), container)));
  document.querySelectorAll('[data-del-cust]').forEach(b => b.addEventListener('click', () => {
    confirmDialog('Delete Customer', 'This will remove the customer permanently.', () => {
      const customer = getCustomers().find(c => c.id === b.dataset.delCust);
      const result = deleteCustomer(b.dataset.delCust);
      if (result?.error) { showToast(result.error, 'error'); return; }
      notifyCustomerDeleted(customer?.name || 'Customer');
      closeModal(); draw(container); showToast('Customer deleted', 'info');
    });
  }));
  document.querySelectorAll('[data-view-cust]').forEach(b => b.addEventListener('click', () => viewCustomer(b.dataset.viewCust)));
}

function openCustForm(cust, container) {
  const isEdit = !!cust;
  const body = `
    <div class="form-row"><div class="form-group"><label class="form-label">Full Name *</label><input class="form-input" id="cf-name" value="${cust?.name||''}"></div>
    <div class="form-group"><label class="form-label">Phone *</label><input class="form-input" id="cf-phone" value="${cust?.phone||''}"></div></div>
    <div class="form-row" style="margin-top:12px"><div class="form-group"><label class="form-label">Email</label><input class="form-input" id="cf-email" value="${cust?.email||''}"></div>
    <div class="form-group"><label class="form-label">ID Number</label><input class="form-input" id="cf-id" value="${cust?.idNumber||''}"></div></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">Address</label><textarea class="form-textarea" id="cf-address">${cust?.address||''}</textarea></div>`;
  openModal(isEdit ? 'Edit Customer' : 'Add New Customer', body, {
    confirmText: isEdit ? 'Save' : 'Add Customer',
    onConfirm: () => {
      const name = document.getElementById('cf-name').value.trim();
      const phone = document.getElementById('cf-phone').value.trim();
      if (!name || !phone) { showToast('Name and phone required', 'error'); return; }
      const data = { name, phone, email: document.getElementById('cf-email').value.trim(), idNumber: document.getElementById('cf-id').value.trim(), address: document.getElementById('cf-address').value.trim() };
      if (isEdit) { updateCustomer(cust.id, data); showToast('Customer updated', 'success'); }
      else {
        const newCust = { id: generateId(), ...data, balance: 0, createdAt: new Date().toISOString() };
        addCustomer(newCust);
        notifyCustomerAdded(newCust.name);
        showToast('Customer added', 'success');
      }
      closeModal(); draw(container);
    }
  });
}

function viewCustomer(id) {
  const c = getCustomers().find(x => x.id === id);
  if (!c) return;
  const rentals = getCustomerRentals(c.id);
  const body = `
    <div class="customer-info-header">
      <div class="customer-avatar-lg">${c.name.split(' ').map(n=>n[0]).join('')}</div>
      <div><h3 style="font-size:var(--font-lg);font-weight:700">${c.name}</h3><p style="color:var(--text-secondary)">${c.phone} · ${c.email||'No email'}</p><p style="color:var(--text-muted);font-size:var(--font-sm)">${c.address||'No address'}</p></div>
    </div>
    <div class="customer-stats">
      <div class="customer-stat"><div class="customer-stat-value">${rentals.length}</div><div class="customer-stat-label">Total Rentals</div></div>
      <div class="customer-stat"><div class="customer-stat-value">${rentals.filter(r=>r.status==='active'||r.status==='overdue').length}</div><div class="customer-stat-label">Active</div></div>
      <div class="customer-stat"><div class="customer-stat-value" style="color:${c.balance>0?'var(--accent-rose)':'var(--accent-emerald)'}">${formatCurrency(c.balance)}</div><div class="customer-stat-label">Balance</div></div>
    </div>
    <h4 style="margin-bottom:12px;font-weight:600">Rental History</h4>
    ${rentals.length === 0 ? '<p style="color:var(--text-muted)">No rentals yet</p>' :
      rentals.map(r => {
        const tool = getTool(r.toolId);
        return `<div style="display:flex;justify-content:space-between;padding:10px;background:var(--bg-surface);border-radius:8px;margin-bottom:8px">
          <div><strong>${tool?.name||'Unknown'}</strong><div style="font-size:var(--font-xs);color:var(--text-muted)">${formatDate(r.startDate)} → ${formatDate(r.endDate)}</div></div>
          <span class="badge badge-${r.status}">${r.status}</span></div>`;
      }).join('')}`;
  openModal('Customer Details', body, { showFooter: false, size: 'lg' });
}
