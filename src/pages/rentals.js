// ============================================
// TOOLFLOW — Rental Management Page
// ============================================
import { icon } from '../components/icons.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { getRentals, updateRental, updateTool, addInvoice, getTool, getCustomer, getSettings } from '../store.js';
import { generateId, formatCurrency, formatDate, daysBetween, daysFromNow, calculateRentalCost, calculateOverdueFee } from '../utils/helpers.js';
import { t } from '../utils/i18n.js';
import { notifyReturnProcessed } from '../utils/notifications.js';

let statusFilter = 'All';

export function renderRentals(container) {
  statusFilter = 'All';
  draw(container);
}

function draw(container) {
  const allRentals = getRentals();
  let rentals = statusFilter === 'All' ? allRentals : allRentals.filter(r => r.status === statusFilter);
  const active = allRentals.filter(r => r.status === 'active').length;
  const overdue = allRentals.filter(r => r.status === 'overdue').length;
  const returned = allRentals.filter(r => r.status === 'returned').length;

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><p class="page-subtitle">${t('trackRentals')}</p></div>
    </div>
    <div class="stat-cards stagger-children">
      <div class="stat-card cyan animate-fadeInUp"><div class="stat-card-content"><div class="stat-card-label">${t('activeRentals')}</div><div class="stat-card-value">${active}</div></div><div class="stat-card-icon cyan">${icon('clipboard-list', 22)}</div></div>
      <div class="stat-card rose animate-fadeInUp"><div class="stat-card-content"><div class="stat-card-label">${t('overdue')}</div><div class="stat-card-value">${overdue}</div></div><div class="stat-card-icon rose">${icon('alert-triangle', 22)}</div></div>
      <div class="stat-card violet animate-fadeInUp"><div class="stat-card-content"><div class="stat-card-label">${t('returned')}</div><div class="stat-card-value">${returned}</div></div><div class="stat-card-icon violet">${icon('check-circle', 22)}</div></div>
      <div class="stat-card emerald animate-fadeInUp"><div class="stat-card-content"><div class="stat-card-label">${t('total')}</div><div class="stat-card-value">${allRentals.length}</div></div><div class="stat-card-icon emerald">${icon('bar-chart-3', 22)}</div></div>
    </div>
    <div class="rentals-filters" style="display:flex; gap:12px; margin-bottom: 24px;">
      <select class="form-select" id="rental-status-dropdown" style="width:200px">
        <option value="All" ${statusFilter === 'All' ? 'selected' : ''}>${t('allRentals')}</option>
        <option value="active" ${statusFilter === 'active' ? 'selected' : ''}>${t('active')}</option>
        <option value="overdue" ${statusFilter === 'overdue' ? 'selected' : ''}>${t('overdue')}</option>
        <option value="returned" ${statusFilter === 'returned' ? 'selected' : ''}>${t('returned')}</option>
      </select>
    </div>
    <div class="data-table-wrapper animate-fadeInUp"><table class="data-table"><thead><tr>
      <th>${t('toolName')}</th><th>${t('customers')}</th><th>${t('period')}</th><th>${t('progress')}</th><th>${t('dailyRate')}</th><th>${t('status')}</th><th>${t('actions')}</th>
    </tr></thead><tbody>
      ${rentals.length === 0 ? `<tr><td colspan="7"><div class="data-table-empty">${icon('clipboard-list', 48)}<p>${t('noResults')}</p></div></td></tr>` :
        rentals.map(r => {
          const tool = getTool(r.toolId);
          const cust = getCustomer(r.customerId);
          const totalDays = daysBetween(r.startDate, r.endDate);
          const elapsed = daysBetween(r.startDate, new Date());
          const pct = Math.min(100, Math.round((elapsed / totalDays) * 100));
          const remaining = daysFromNow(r.endDate);
          const progressClass = r.status === 'overdue' ? 'overdue' : remaining <= 1 ? 'warning' : 'normal';
          return `<tr style="${r.status==='overdue'?'background:rgba(244,63,94,0.03)':''}">
            <td><div style="display:flex;align-items:center;gap:8px"><span style="font-size:1.2rem">${tool?.emoji||'🔧'}</span><strong>${tool?.name||'Unknown'}</strong></div></td>
            <td>${cust?.name||'Unknown'}</td>
            <td><div style="font-size:var(--font-sm)">${formatDate(r.startDate)}<br><span style="color:var(--text-muted)">→ ${formatDate(r.endDate)}</span></div></td>
            <td><div class="rental-timeline"><div class="rental-progress"><div class="rental-progress-fill ${progressClass}" style="width:${pct}%"></div></div>
              <span>${r.status === 'returned' ? t('done') : r.status === 'overdue' ? t('dLate', {n: Math.abs(remaining)}) : t('dLeft', {n: remaining})}</span></div></td>
            <td>${formatCurrency(r.dailyRate)}</td>
            <td><span class="badge badge-${r.status}">${r.status === 'active' ? t('active') : r.status === 'overdue' ? t('overdue') : t('returned')}</span></td>
            <td><div class="row-actions">
              ${r.status !== 'returned' ? `<button class="row-action-btn" data-return="${r.id}" title="${t('processReturn')}">${icon('rotate-ccw', 16)}</button>` : ''}
              ${r.status === 'active' ? `<button class="row-action-btn" data-extend="${r.id}" title="${t('extend')}">${icon('calendar', 16)}</button>` : ''}
              <button class="row-action-btn" data-view-rental="${r.id}" title="${t('view')}">${icon('eye', 16)}</button>
            </div></td></tr>`;
        }).join('')}
    </tbody></table></div>`;

  const drop = document.getElementById('rental-status-dropdown');
  if (drop) { drop.addEventListener('change', (e) => { statusFilter = e.target.value; draw(container); }); }
  document.querySelectorAll('[data-return]').forEach(b => b.addEventListener('click', () => processReturn(b.dataset.return, container)));
  document.querySelectorAll('[data-extend]').forEach(b => b.addEventListener('click', () => extendRental(b.dataset.extend, container)));
  document.querySelectorAll('[data-view-rental]').forEach(b => b.addEventListener('click', () => viewRental(b.dataset.viewRental)));
}

function processReturn(rentalId, container) {
  const r = getRentals().find(x => x.id === rentalId);
  if (!r) return;
  const tool = getTool(r.toolId);
  const cust = getCustomer(r.customerId);
  const settings = getSettings();
  const overdueDays = Math.max(0, -daysFromNow(r.endDate));
  const rentalDays = Math.max(1, daysBetween(r.startDate, new Date()));
  const depositPaid = r.deposit || 0;
  const rentalCost = calculateRentalCost(r.dailyRate, rentalDays, settings);
  const overdueFee = overdueDays > 0 ? calculateOverdueFee(r.dailyRate, overdueDays, settings) : 0;
  const subtotal = rentalCost + overdueFee;
  const tax = subtotal * ((settings.taxRate || 0) / 100);
  const total = subtotal + tax - depositPaid;

  const body = `
    <div style="margin-bottom:16px"><strong>${tool?.name || 'Tool'}</strong> · <span style="color:var(--text-muted)">${cust?.name || 'Customer'}</span></div>
    <div style="padding:12px;background:var(--bg-surface);border-radius:8px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Rental (${rentalDays} day${rentalDays !== 1 ? 's' : ''})</span><span>${formatCurrency(rentalCost)}</span></div>
      ${overdueDays > 0 ? `<div style="display:flex;justify-content:space-between;color:var(--accent-rose)"><span>${t('lateFee')} (${overdueDays} ${t('days')})</span><span>${formatCurrency(overdueFee)}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:var(--font-sm);color:var(--text-muted)"><span>${t('tax')} (${settings.taxRate || 0}%)</span><span>${formatCurrency(tax)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:var(--font-sm);color:var(--text-muted)"><span>Deposit refund</span><span style="color:var(--accent-emerald)">-${formatCurrency(depositPaid)}</span></div>
      <div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid var(--border-glass);font-weight:700;font-size:var(--font-lg)"><span>${t('balanceDue')}</span><span style="color:${total > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'}">${total > 0 ? formatCurrency(total) : 'Rs. 0.00 (Refund)'}</span></div>
    </div>
    <div class="form-group"><label class="form-label">${t('conditionReturn')}</label>
      <select class="form-select" id="ret-cond"><option>Excellent</option><option selected>Good</option><option>Fair</option><option>Poor — Flag for maintenance</option></select></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">${t('paymentMethod')}</label>
      <select class="form-select" id="ret-pay"><option>Cash</option><option>Card</option><option>UPI</option><option>Bank Transfer</option></select></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">${t('notes')}</label><textarea class="form-textarea" id="ret-notes" placeholder="Any damage or notes..."></textarea></div>`;

  openModal(t('processReturn'), body, {
    confirmText: t('confirmReturn'),
    confirmClass: 'btn-success',
    onConfirm: () => {
      const condRaw = document.getElementById('ret-cond').value;
      const cond = condRaw.includes('Poor') ? 'Poor' : condRaw;
      const isPoor = cond === 'Poor';
      const payMethod = document.getElementById('ret-pay')?.value || 'Cash';

      updateRental(rentalId, { status: 'returned', returnDate: new Date().toISOString(), notes: document.getElementById('ret-notes').value });

      if (isPoor && tool) {
        const currentMaint = tool.maintenanceUnits || 0;
        const totalStock = tool.totalStock || 1;
        updateTool(r.toolId, { condition: cond, maintenanceUnits: Math.min(totalStock, currentMaint + 1) });
        showToast(`${tool.name} flagged for maintenance`, 'warning');
      } else if (tool) {
        updateTool(r.toolId, { condition: cond });
      }

      if (total > 0) {
        addInvoice({
          id: generateId(), rentalId, customerId: r.customerId, type: 'rental',
          items: [
            { name: tool?.name || 'Tool', days: rentalDays, rate: r.dailyRate, total: rentalCost },
            ...(overdueDays > 0 ? [{ name: `Late fee (${overdueDays}d)`, days: overdueDays, rate: r.dailyRate * (settings.lateFeeMultiplier || 1.5), total: overdueFee }] : [])
          ],
          subtotal, tax, deposit: -depositPaid, total: Math.max(0, total),
          status: 'unpaid', paymentMethod: payMethod, createdAt: new Date().toISOString()
        });
      }
      
      printReturnReceipt({
        rental: r, tool, cust: getCustomer(r.customerId),
        cond: condRaw, rentalDays, rentalCost, overdueDays, overdueFee,
        subtotal, tax, depositPaid, total, settings
      });

      closeModal(); draw(container);
      notifyReturnProcessed(tool?.name || 'Tool');
      showToast(`${tool?.name || 'Tool'} returned successfully`, 'success');
    }
  });
}

function extendRental(rentalId, container) {
  const body = `<div class="form-group"><label class="form-label">Extend by (days)</label><input type="number" class="form-input" id="ext-days" value="3" min="1" max="90"></div>`;
  openModal('Extend Rental', body, {
    confirmText: 'Extend',
    onConfirm: () => {
      const days = parseInt(document.getElementById('ext-days').value) || 3;
      const r = getRentals().find(x => x.id === rentalId);
      if (r) {
        const newEnd = new Date(new Date(r.endDate).getTime() + days * 86400000);
        updateRental(rentalId, { endDate: newEnd.toISOString(), status: 'active' });
        closeModal(); draw(container);
        showToast(`Rental extended by ${days} days`, 'success');
      }
    }
  });
}

function viewRental(rentalId) {
  const r = getRentals().find(x => x.id === rentalId);
  if (!r) return;
  const tool = getTool(r.toolId);
  const cust = getCustomer(r.customerId);
  const body = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div><label style="color:var(--text-muted);font-size:var(--font-xs)">Tool</label><p style="font-weight:600">${tool?.emoji || '🔧'} ${tool?.name || 'Deleted Tool'}</p></div>
      <div><label style="color:var(--text-muted);font-size:var(--font-xs)">Customer</label><p style="font-weight:600">${cust?.name || 'Deleted Customer'}</p></div>
      <div><label style="color:var(--text-muted);font-size:var(--font-xs)">Start Date</label><p>${formatDate(r.startDate)}</p></div>
      <div><label style="color:var(--text-muted);font-size:var(--font-xs)">End Date</label><p>${formatDate(r.endDate)}</p></div>
      <div><label style="color:var(--text-muted);font-size:var(--font-xs)">Daily Rate</label><p>${formatCurrency(r.dailyRate)}</p></div>
      <div><label style="color:var(--text-muted);font-size:var(--font-xs)">Deposit</label><p>${formatCurrency(r.deposit)}</p></div>
      <div><label style="color:var(--text-muted);font-size:var(--font-xs)">Status</label><p><span class="badge badge-${r.status}">${r.status}</span></p></div>
      ${r.returnDate ? `<div><label style="color:var(--text-muted);font-size:var(--font-xs)">Returned</label><p>${formatDate(r.returnDate)}</p></div>` : ''}
    </div>
    ${r.notes ? `<div style="margin-top:16px;padding:12px;background:var(--bg-surface);border-radius:8px"><label style="color:var(--text-muted);font-size:var(--font-xs)">Notes</label><p>${r.notes}</p></div>` : ''}`;
  openModal('Rental Details', body, { showFooter: false });
}

function printReturnReceipt(data) {
  const { rental, tool, cust, cond, rentalDays, rentalCost, overdueDays, overdueFee, subtotal, tax, depositPaid, total, settings } = data;
  const root = document.getElementById('print-root');
  if (!root) return;
  root.innerHTML = `
    <div style="font-family:monospace;width:320px;padding:24px;color:#000;background:#fff">
      <div style="text-align:center;margin-bottom:12px">
        <h2 style="margin:0;font-size:1.4rem">${settings.shopName || 'ToolFlow'}</h2>
        <p style="margin:4px 0;font-size:0.8rem">${settings.shopAddress || ''}</p>
        <p style="margin:2px 0;font-size:0.8rem">${settings.shopPhone || ''}</p>
        <p style="margin:8px 0;font-size:1rem;font-weight:bold">RETURN RECEIPT</p>
      </div>
      <div style="border-top:1px dashed #000;border-bottom:1px dashed #000;padding:8px 0;margin:8px 0;font-size:0.8rem">
        <div>Rental ID: #${rental.id.toUpperCase()}</div>
        <div>Date: ${new Date().toLocaleString()}</div>
        <div>Customer: ${cust?.name || 'Unknown'}</div>
        <div>Tool: ${tool?.name || 'Unknown'}</div>
        <div>Condition: ${cond}</div>
      </div>
      <div style="margin:8px 0;font-size:0.8rem">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span>Rental (${rentalDays}d)</span><span>${formatCurrency(rentalCost)}</span>
        </div>
        ${overdueDays > 0 ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;color:red">
          <span>Late Fee (${overdueDays}d)</span><span>${formatCurrency(overdueFee)}</span>
        </div>` : ''}
      </div>
      <div style="border-top:1px dashed #000;padding-top:8px;font-size:0.8rem">
        <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
        <div style="display:flex;justify-content:space-between"><span>Tax</span><span>${formatCurrency(tax)}</span></div>
        <div style="display:flex;justify-content:space-between"><span>Deposit Paid</span><span>-${formatCurrency(depositPaid)}</span></div>
        <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:1rem;margin-top:6px;border-top:1px solid #000;padding-top:6px">
          <span>${total > 0 ? 'BALANCE DUE' : 'REFUND DUE'}</span><span>${formatCurrency(Math.abs(total))}</span>
        </div>
      </div>
      <div style="text-align:center;margin-top:16px;font-size:0.75rem">
        <p style="margin-top:8px">Thank you for returning the equipment!</p>
      </div>
    </div>`;
  const w = window.open('', '', 'width=420,height=600');
  w.document.write('<html><head><title>Return Receipt</title></head><body style="margin:0">');
  w.document.write(root.innerHTML);
  w.document.write('</body></html>');
  w.document.close();
  setTimeout(() => { w.print(); w.close(); }, 500);
}
