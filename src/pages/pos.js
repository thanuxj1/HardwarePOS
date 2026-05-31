// ============================================
// TOOLFLOW — POS Terminal Page
// ============================================
import { icon } from '../components/icons.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { getTools, getCustomers, getRentals, addRental, addInvoice, updateRental, updateTool, addCustomer, getTool, getCustomer, getSettings, getToolAvailableCount, getToolRentedCount, findToolByBarcode } from '../store.js';
import { generateId, formatCurrency, calculateRentalCost, calculateOverdueFee, formatDate, daysBetween, daysFromNow } from '../utils/helpers.js';
import { t } from '../utils/i18n.js';
import { notifyRentalCreated, notifySaleCompleted, notifyReturnProcessed, notifyStockLow, notifyCustomerAdded } from '../utils/notifications.js';

let cart = JSON.parse(sessionStorage.getItem('tf_pos_cart')) || [];
let selectedCustomer = JSON.parse(sessionStorage.getItem('tf_pos_customer')) || null;
let activeCategory = 'All';
let searchQuery = '';
let mode = 'rent'; // 'rent' | 'sell' | 'return'

function saveCartState() {
  sessionStorage.setItem('tf_pos_cart', JSON.stringify(cart));
  sessionStorage.setItem('tf_pos_customer', JSON.stringify(selectedCustomer));
}

export function renderPOS(container) {
  // Do NOT reset cart/customer here to preserve state across navigation
  activeCategory = 'All'; searchQuery = ''; mode = 'rent';
  container.innerHTML = buildPOSHTML();
  bindPOSEvents(container);
}

function buildPOSHTML() {
  if (mode === 'return') return buildReturnHTML();
  // Both rent and sell share the same catalog layout
  const tools = getFilteredTools();
  const categories = ['All', ...new Set(getTools().map(tool => tool.category))];

  const activeCatLabel = activeCategory === 'All' ? t('all') : activeCategory;
  return `
    <div class="page-header">
      <div class="page-header-left">
        <p class="page-subtitle">${mode === 'sell' ? t('processSales') : t('processRentals')}</p>
      </div>
      <div class="page-header-actions">
        <div class="pos-mode-toggle">
          <button class="pos-mode-btn ${mode === 'rent' ? 'active' : ''}" data-mode="rent">${icon('shopping-cart', 16)} ${t('rent')}</button>
          <button class="pos-mode-btn ${mode === 'sell' ? 'active' : ''}" data-mode="sell">${icon('tag', 16)} ${t('sell')}</button>
          <button class="pos-mode-btn ${mode === 'return' ? 'active' : ''}" data-mode="return">${icon('rotate-ccw', 16)} ${t('return')}</button>
        </div>
      </div>
    </div>
    <div class="pos-layout">
      <div class="pos-catalog">
        <div class="pos-catalog-header">
          <div class="pos-search-wrapper">
            ${icon('search', 16)}
            <input type="text" class="pos-search" id="pos-search" placeholder="${t('search')}" value="${searchQuery}">
          </div>
          <div class="pos-filter-dropdown" id="pos-filter-dropdown">
            <button class="pos-filter-btn ${activeCategory !== 'All' ? 'has-filter' : ''}" id="pos-filter-btn">
              ${icon('sliders-horizontal', 14)} ${activeCatLabel} ${icon('chevron-down', 12)}
            </button>
            <div class="pos-filter-menu" id="pos-filter-menu" style="display:none">
              ${categories.map(c => `<div class="pos-filter-option ${c === activeCategory ? 'active' : ''}" data-cat="${c}">${c === 'All' ? t('all') : c}</div>`).join('')}
            </div>
          </div>
        </div>
        <div class="pos-tools-grid" id="pos-tools-grid">
          ${tools.map(tl => toolCardHTML(tl)).join('')}
          ${tools.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">${icon('search', 36)}</div><h3>${t('noResults')}</h3></div>` : ''}
        </div>
      </div>
      <div class="pos-cart" id="pos-cart">
        ${renderCartHTML()}
      </div>
    </div>`;
}

function buildReturnHTML() {
  const activeRentals = getRentals().filter(r => r.status === 'active' || r.status === 'overdue');
  let filtered = activeRentals;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = activeRentals.filter(r => {
      const tool = getTool(r.toolId);
      const cust = getCustomer(r.customerId);
      return (tool?.name||'').toLowerCase().includes(q) || (cust?.name||'').toLowerCase().includes(q) || (tool?.serial||'').toLowerCase().includes(q);
    });
  }

  return `
    <div class="page-header">
      <div class="page-header-left">
        <p class="page-subtitle">${t('processReturns')}</p>
      </div>
      <div class="page-header-actions">
        <div class="pos-mode-toggle">
          <button class="pos-mode-btn ${mode === 'rent' ? 'active' : ''}" data-mode="rent">${icon('shopping-cart', 16)} ${t('rent')}</button>
          <button class="pos-mode-btn ${mode === 'sell' ? 'active' : ''}" data-mode="sell">${icon('tag', 16)} ${t('sell')}</button>
          <button class="pos-mode-btn ${mode === 'return' ? 'active' : ''}" data-mode="return">${icon('rotate-ccw', 16)} ${t('return')}</button>
        </div>
      </div>
    </div>
    <div style="margin-bottom:var(--space-lg)">
      <div class="pos-search-wrapper" style="max-width:400px">
        ${icon('search', 16)}
        <input type="text" class="pos-search" id="pos-search" placeholder="${t('searchByName')}" value="${searchQuery}">
      </div>
    </div>
    ${filtered.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">${icon('rotate-ccw', 36)}</div>
        <h3>${activeRentals.length === 0 ? t('noActiveRentals') : t('noMatchingRentals')}</h3>
        <p>${activeRentals.length === 0 ? t('allReturned') : t('tryDifferentSearch')}</p>
      </div>` : `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:var(--space-md)">
        ${filtered.map(r => returnCardHTML(r)).join('')}
      </div>`}
  `;
}

function toolCardHTML(tool) {
  const avail = getToolAvailableCount(tool.id);
  const total = tool.totalStock || 1;
  const isSell = mode === 'sell';
  const isAvail = avail > 0;
  const statusText = avail === total ? t('inStock') : avail > 0 ? t('availOfTotal', {a: avail, t: total}) : t('outOfStock');
  const badgeClass = avail === 0 ? 'badge-overdue' : avail < total ? 'badge-rented' : 'badge-available';
  const price = isSell ? (tool.sellingPrice || null) : tool.dailyRate;
  const priceLabel = isSell
    ? (price ? formatCurrency(price) : `<span style="color:var(--accent-rose);font-size:0.75rem">${t('noSellPriceLabel')}</span>`)
    : `${formatCurrency(tool.dailyRate)} <span>${t('perDay')}</span>`;
  const canAdd = isSell ? (isAvail && price) : isAvail;
  return `
    <div class="tool-card ${!canAdd ? 'unavailable' : ''}" data-tool-id="${tool.id}" id="tool-card-${tool.id}">
      <div class="tool-card-img">${tool.emoji || '🔧'}</div>
      <div class="tool-card-status"><span class="badge ${badgeClass}">${statusText}</span></div>
      <div class="tool-card-name">${tool.name}</div>
      <div class="tool-card-category">${tool.category}${total > 1 ? ` · ${total} ${t('units')}` : ''}</div>
      <div class="tool-card-footer">
        <div class="tool-card-price">${priceLabel}</div>
        ${canAdd ? `<button class="tool-card-add" data-add="${tool.id}">${icon('plus', 16)}</button>` : ''}
      </div>
    </div>`;
}

function renderCartHTML() {
  if (cart.length === 0) {
    const isSell = mode === 'sell';
    return `
      <div class="pos-cart-header">
        <div class="pos-cart-title">${icon(isSell ? 'tag' : 'shopping-cart', 18)} ${isSell ? t('salesCart') : t('rentalCart')} <span class="pos-cart-count">0</span></div>
      </div>
      <div class="pos-cart-items">
        <div class="pos-cart-empty">
          ${icon(isSell ? 'tag' : 'shopping-cart', 40)}
          <p>${t('noResults')}</p>
        </div>
      </div>
      <div class="pos-cart-customer" id="cart-customer-section">
        <div class="pos-cart-customer-select" id="select-customer">
          ${icon('users', 18)}
          <span class="pos-cart-customer-name ${selectedCustomer ? '' : 'placeholder'}">
            ${selectedCustomer ? selectedCustomer.name : t('selectCustomer')}
          </span>
        </div>
      </div>
      <div class="pos-cart-checkout">
        <button class="btn btn-primary btn-lg" disabled style="opacity:0.5">
          ${icon('credit-card', 18)} ${t('checkout')}
        </button>
      </div>`;
  }

  const isSell = mode === 'sell';
  const settings = getSettings();
  const hasRental = cart.some(item => item._mode !== 'sell');
  
  const subtotal = cart.reduce((sum, item) => {
    const isItemSell = item._mode === 'sell';
    if (isItemSell) return sum + (item.sellingPrice || 0) * (item.quantity || 1);
    return sum + calculateRentalCost(item.dailyRate, item.days, settings) * (item.quantity || 1);
  }, 0);
  const tax = subtotal * (settings.taxRate / 100);
  const deposit = cart.reduce((sum, item) => {
    return sum + (item._mode === 'sell' ? 0 : (settings.defaultDeposit || 2000) * (item.quantity || 1));
  }, 0);
  const total = subtotal + tax + deposit;

  return `
    <div class="pos-cart-header">
      <div class="pos-cart-title">${icon(isSell ? 'tag' : 'shopping-cart', 18)} ${isSell ? t('salesCart') : t('rentalCart')} <span class="pos-cart-count">${cart.length}</span></div>
      <button class="btn btn-ghost btn-sm" id="cart-clear">${icon('trash', 14)} ${t('cancel')}</button>
    </div>
    <div class="pos-cart-items">
      ${cart.map((item, i) => {
        const isItemSell = item._mode === 'sell';
        return `
        <div class="pos-cart-item" data-idx="${i}">
          <div class="pos-cart-item-icon">${item.emoji || '🔧'}</div>
          <div class="pos-cart-item-info">
            <div class="pos-cart-item-name">${item.name}</div>
            <div class="pos-cart-item-days" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
              ${t('qty')}:<input type="number" min="1" max="${getToolAvailableCount(item.toolId)}" value="${item.quantity || 1}" data-qty-idx="${i}" class="cart-days-input" style="width:44px">
              ${isItemSell ? '' : `${t('days')}:<input type="number" min="1" max="365" value="${item.days}" data-days-idx="${i}" class="cart-days-input" style="width:50px">`}
            </div>
          </div>
          <div class="pos-cart-item-price">${isItemSell
            ? formatCurrency((item.sellingPrice || 0) * (item.quantity || 1))
            : formatCurrency(calculateRentalCost(item.dailyRate, item.days) * (item.quantity || 1))}</div>
          <button class="pos-cart-item-remove" data-remove="${i}">${icon('x', 14)}</button>
        </div>
      `}).join('')}
    </div>
    <div class="pos-cart-customer" id="cart-customer-section" style="display:flex; align-items:center; gap: 8px;">
      <div class="pos-cart-customer-select" id="select-customer" style="flex:1">
        ${icon('users', 18)}
        <span class="pos-cart-customer-name ${selectedCustomer ? '' : 'placeholder'}">
          ${selectedCustomer ? selectedCustomer.name : t('selectCustomer')}
        </span>
      </div>
      ${selectedCustomer ? `<button class="btn btn-icon btn-ghost" id="clear-customer" title="Remove customer">${icon('x', 16)}</button>` : ''}
    </div>
    <div class="pos-cart-summary">
      <div class="pos-cart-summary-row"><span>${t('subtotal')}</span><span>${formatCurrency(subtotal)}</span></div>
      <div class="pos-cart-summary-row"><span>${t('tax')} (${settings.taxRate}%)</span><span>${formatCurrency(tax)}</span></div>
      ${hasRental ? `<div class="pos-cart-summary-row"><span>${t('deposit')}</span><span>${formatCurrency(deposit)}</span></div>` : ''}
      <div class="pos-cart-summary-row total"><span>${t('total')}</span><span>${formatCurrency(total)}</span></div>
    </div>
    <div class="pos-cart-checkout">
      <button class="btn btn-primary btn-lg" id="btn-checkout" ${(!selectedCustomer && hasRental) ? 'disabled style="opacity:0.5"' : ''}>
        ${icon('credit-card', 18)} ${t('checkout')} — ${formatCurrency(total)}
      </button>
    </div>`;
}

function getFilteredTools() {
  let tools = getTools();
  // Filter by tool type (Rental vs Sale). Fallback for legacy tools without explicit 'type'.
  tools = tools.filter(tl => {
    if (mode === 'sell') return tl.type === 'sale' || (!tl.type && tl.sellingPrice);
    return tl.type === 'rental' || (!tl.type && tl.dailyRate);
  });
  
  if (activeCategory !== 'All') tools = tools.filter(tl => tl.category === activeCategory);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    tools = tools.filter(tl => tl.name.toLowerCase().includes(q) || tl.category.toLowerCase().includes(q));
  }
  return tools;
}

function refreshCart(container) {
  document.getElementById('pos-cart').innerHTML = renderCartHTML();
  bindCartEvents(container);
}

function refreshGrid(container) {
  const tools = getFilteredTools();
  document.getElementById('pos-tools-grid').innerHTML = tools.map(tl => toolCardHTML(tl)).join('') ||
    `<div class="empty-state"><div class="empty-state-icon">${icon('search', 36)}</div><h3>${t('noResults')}</h3></div>`;
  document.querySelectorAll('.tool-card:not(.unavailable)').forEach(card => {
    card.addEventListener('click', () => addToCart(card.dataset.toolId, container));
  });
}

function addToCart(toolId, container) {
  const avail = getToolAvailableCount(toolId);
  if (avail <= 0) { showToast('No units available', 'warning'); return; }
  const tool = getTools().find(tl => tl.id === toolId);
  if (!tool) return;
  // Sell mode validation
  if (mode === 'sell' && !tool.sellingPrice) {
    showToast('No selling price set — edit in Inventory first', 'error'); return;
  }
  const existing = cart.find(c => c.toolId === toolId);
  if (existing) {
    if (existing.quantity >= avail) { showToast(`Only ${avail} unit(s) available`, 'warning'); return; }
    existing.quantity = (existing.quantity || 1) + 1;
  } else {
    cart.push({ ...tool, toolId: tool.id, days: 1, quantity: 1, _mode: mode });
  }
  saveCartState();
  refreshCart(container);
  showToast(`${tool.name} added`, 'success');
}

function returnCardHTML(r) {
  const tool = getTool(r.toolId);
  const cust = getCustomer(r.customerId);
  const remaining = daysFromNow(r.endDate);
  const isOverdue = remaining < 0;
  const overdueDays = Math.abs(Math.min(0, remaining));
  const totalDays = daysBetween(r.startDate, new Date());

  return `
    <div class="glass-card animate-fadeInUp" style="cursor:pointer;border-left:3px solid ${isOverdue ? '#e11d48' : '#2563eb'}" data-return-rental="${r.id}">
      <div style="display:flex;gap:var(--space-md);align-items:flex-start">
        <div style="font-size:2rem;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:var(--bg-surface);border-radius:var(--radius-md);flex-shrink:0">${tool?.emoji || '🔧'}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
            <h3 style="font-size:var(--font-base);font-weight:600">${tool?.name || 'Unknown Tool'}</h3>
            <span class="badge badge-${r.status}">${isOverdue ? `${overdueDays}d overdue` : r.status}</span>
          </div>
          <div style="display:flex;gap:var(--space-lg);font-size:var(--font-sm);color:var(--text-secondary);margin-bottom:8px">
            <span>${icon('users', 14)} ${cust?.name || 'Unknown'}</span>
            <span>${icon('calendar', 14)} ${formatDate(r.startDate)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:var(--font-sm);color:var(--text-muted)">${totalDays} days rented · ${formatCurrency(r.dailyRate)}/day</span>
            <span style="font-weight:700;color:${isOverdue ? '#e11d48' : '#2563eb'}">${formatCurrency(calculateRentalCost(r.dailyRate, totalDays, getSettings()))}</span>
          </div>
        </div>
      </div>
    </div>`;
}

function processReturnFromPOS(rentalId, container) {
  const r = getRentals().find(x => x.id === rentalId);
  if (!r) return;
  const tool = getTool(r.toolId);
  const cust = getCustomer(r.customerId);
  const settings = getSettings();
  const overdueDays = Math.max(0, -daysFromNow(r.endDate));
  const rentalDays = daysBetween(r.startDate, new Date());
  const rentalCost = calculateRentalCost(r.dailyRate, rentalDays, settings);
  const overdueFee = calculateOverdueFee(r.dailyRate, overdueDays, settings);
  const subtotal = rentalCost + overdueFee;
  const tax = subtotal * (settings.taxRate / 100);
  const total = subtotal + tax - r.deposit;

  const body = `
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:20px;padding:12px;background:var(--bg-surface);border-radius:8px">
      <span style="font-size:2rem">${tool?.emoji || '🔧'}</span>
      <div><strong>${tool?.name}</strong><br><span style="color:var(--text-muted);font-size:var(--font-sm)">${cust?.name} · ${cust?.phone}</span></div>
    </div>
    <div style="padding:16px;background:var(--bg-surface);border-radius:8px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;padding:6px 0"><span>Rental (${rentalDays} days × ${formatCurrency(r.dailyRate)})</span><span>${formatCurrency(rentalCost)}</span></div>
      ${overdueDays > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;color:var(--accent-rose)"><span>${icon('alert-triangle', 14)} Late fee (${overdueDays} days)</span><span>${formatCurrency(overdueFee)}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:var(--font-sm);color:var(--text-muted)"><span>Tax (${settings.taxRate}%)</span><span>${formatCurrency(tax)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:var(--font-sm);color:var(--text-muted)"><span>Deposit refund</span><span>-${formatCurrency(r.deposit)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;margin-top:8px;border-top:2px solid var(--border-glass);font-weight:700;font-size:var(--font-lg)">
        <span>Balance Due</span><span style="color:${total>0?'var(--accent-cyan)':'var(--accent-emerald)'}">${formatCurrency(Math.max(0, total))}</span>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Condition on Return</label>
        <select class="form-select" id="ret-cond"><option>Excellent</option><option selected>Good</option><option>Fair</option><option>Poor</option></select></div>
      <div class="form-group"><label class="form-label">Payment Method</label>
        <select class="form-select" id="ret-pay"><option>Cash</option><option>Card</option><option>UPI</option><option>Bank Transfer</option></select></div>
    </div>
    <div class="form-row" style="margin-top:12px;align-items:center">
      <div class="form-group" style="flex:1"><label class="form-label">Notes</label>
        <textarea class="form-textarea" id="ret-notes" placeholder="Any damage or remarks..."></textarea></div>
      <div class="form-group" style="padding-top:24px">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="print-ret-receipt-chk" checked> Print Receipt</label>
      </div>
    </div>`;

  openModal('Process Return', body, {
    confirmText: 'Confirm Return',
    confirmClass: 'btn-success',
    onConfirm: () => {
      const doPrint = document.getElementById('print-ret-receipt-chk').checked;
      
      updateRental(rentalId, { status: 'returned', returnDate: new Date().toISOString(), notes: document.getElementById('ret-notes').value });
      
      // Note: we don't need to updateTool status anymore because availability is computed from rentals
      
      if (total > 0) {
        const invId = generateId();
        const items = [{ name: tool?.name, days: rentalDays, rate: r.dailyRate, total: rentalCost }, ...(overdueDays > 0 ? [{ name: 'Late fee', days: overdueDays, rate: r.dailyRate * 1.5, total: overdueFee }] : [])];
        const invoiceData = { id: invId, rentalId, customerId: r.customerId,
          items, subtotal, tax, deposit: -r.deposit, total: Math.max(0, total), status: 'paid', paymentMethod: document.getElementById('ret-pay').value, createdAt: new Date().toISOString() };
        addInvoice(invoiceData);
        if (doPrint) printReceipt(invoiceData, cust, items, 'return');
      } else if (doPrint) {
         // Print a zero-balance return receipt
         printReceipt({ id: generateId(), subtotal: 0, tax: 0, deposit: -r.deposit, total: 0 }, cust, [{ name: tool?.name, days: rentalDays, rate: r.dailyRate, total: 0 }], 'return');
      }
      
      closeModal();
      container.innerHTML = buildPOSHTML();
      bindPOSEvents(container);
      notifyReturnProcessed(tool?.name || 'Tool');
      showToast(`${tool?.name} returned successfully!`, 'success');
    }
  });
}

function openReturnDisambiguationModal(tool, activeRentals, container) {
  const body = `
    <p style="color:var(--text-secondary);margin-bottom:16px">
      Multiple customers have <strong>${tool.name}</strong> rented. Select who is returning it:
    </p>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${activeRentals.map(r => {
        const cust = getCustomer(r.customerId);
        const days = daysBetween(r.startDate, new Date());
        const isOverdue = daysFromNow(r.endDate) < 0;
        const amount = calculateRentalCost(r.dailyRate, days, getSettings());
        return `
          <div class="pos-cart-item" style="cursor:pointer;border-left:3px solid ${isOverdue ? 'var(--accent-rose)' : 'var(--accent-cyan)'}" data-disambig-rental="${r.id}">
            <div class="pos-cart-item-icon" style="background:var(--gradient-primary);color:white;font-size:0.75rem;font-weight:700">
              ${cust?.name?.split(' ').map(n=>n[0]).join('') || '?'}
            </div>
            <div class="pos-cart-item-info">
              <div class="pos-cart-item-name">${cust?.name || 'Unknown'}</div>
              <div class="pos-cart-item-days">${cust?.phone || ''} · Rented ${days} day(s) · ${isOverdue ? '⚠ Overdue' : 'On time'}</div>
            </div>
            <div class="pos-cart-item-price" style="color:${isOverdue ? 'var(--accent-rose)' : 'var(--accent-cyan)'}">
              ${formatCurrency(amount)}
            </div>
          </div>`;
      }).join('')}
    </div>`;

  openModal(`Return: ${tool.name}`, body, { showFooter: false });

  setTimeout(() => {
    document.querySelectorAll('[data-disambig-rental]').forEach(el => {
      el.addEventListener('click', () => {
        closeModal();
        setTimeout(() => processReturnFromPOS(el.dataset.disambigRental, container), 100);
      });
    });
  }, 50);
}

let barcodeBuffer = '';
let barcodeTimeout = null;

function bindPOSEvents(container) {
  // Global Barcode Scanner Listener
  // Hardware scanners act like rapid keyboards that end with Enter
  const handleKeydown = (e) => {
    // Only capture if we aren't already typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    if (e.key === 'Enter') {
      if (barcodeBuffer.length > 3) {
        const tool = findToolByBarcode(barcodeBuffer);
        if (tool) {
          if (mode === 'rent') {
            addToCart(tool.id, container);
          } else if (mode === 'return') {
            const activeRentals = getRentals().filter(r => r.toolId === tool.id && (r.status === 'active' || r.status === 'overdue'));
            if (activeRentals.length === 0) {
              showToast('This tool has no active rentals', 'warning');
            } else if (activeRentals.length === 1) {
              processReturnFromPOS(activeRentals[0].id, container);
            } else {
              openReturnDisambiguationModal(tool, activeRentals, container);
            }
          }
        } else {
          showToast(`Unknown barcode: ${barcodeBuffer}`, 'error');
        }
      }
      barcodeBuffer = '';
    } else if (e.key.length === 1) {
      barcodeBuffer += e.key;
      clearTimeout(barcodeTimeout);
      barcodeTimeout = setTimeout(() => { barcodeBuffer = ''; }, 50); // Scanner types very fast, manual typing is slower
    }
  };
  
  // Clean up old listener if we re-render
  document.removeEventListener('keydown', window._posKeyHandler);
  window._posKeyHandler = handleKeydown;
  document.addEventListener('keydown', handleKeydown);

  // Mode toggle
  document.querySelectorAll('.pos-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.mode;
      searchQuery = '';
      container.innerHTML = buildPOSHTML();
      bindPOSEvents(container);
    });
  });

  // Search
  document.getElementById('pos-search')?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (mode === 'return') {
      container.innerHTML = buildPOSHTML();
      bindPOSEvents(container);
    } else {
      refreshGrid(container);
    }
  });

  if (mode === 'return') {
    // Return mode: click rental cards to process return
    document.querySelectorAll('[data-return-rental]').forEach(card => {
      card.addEventListener('click', () => processReturnFromPOS(card.dataset.returnRental, container));
    });
    return;
  }

  // Category filter dropdown
  const filterBtn = document.getElementById('pos-filter-btn');
  const filterMenu = document.getElementById('pos-filter-menu');
  if (filterBtn && filterMenu) {
    filterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      filterMenu.style.display = filterMenu.style.display === 'none' ? 'block' : 'none';
    });
    document.querySelectorAll('.pos-filter-option').forEach(opt => {
      opt.addEventListener('click', () => {
        activeCategory = opt.dataset.cat;
        filterMenu.style.display = 'none';
        container.innerHTML = buildPOSHTML();
        bindPOSEvents(container);
      });
    });
    document.addEventListener('click', () => { if(filterMenu) filterMenu.style.display = 'none'; }, { once: true });
  }

  // Tool cards
  document.querySelectorAll('.tool-card:not(.unavailable)').forEach(card => {
    card.addEventListener('click', () => addToCart(card.dataset.toolId, container));
  });

  bindCartEvents(container);
}

function bindCartEvents(container) {
  // Remove items
  document.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      cart.splice(parseInt(btn.dataset.remove), 1);
      saveCartState();
      refreshCart(container);
    });
  });

  // Qty input
  document.querySelectorAll('[data-qty-idx]').forEach(input => {
    input.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.qtyIdx);
      const maxAvail = getToolAvailableCount(cart[idx].toolId);
      const requested = Math.max(1, parseInt(e.target.value) || 1);
      if (requested > maxAvail) {
        showToast(`Only ${maxAvail} unit(s) available`, 'warning');
        e.target.value = maxAvail;
        cart[idx].quantity = maxAvail;
      } else {
        cart[idx].quantity = requested;
      }
      saveCartState();
      refreshCart(container);
    });
  });

  // Days input
  document.querySelectorAll('[data-days-idx]').forEach(input => {
    input.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.daysIdx);
      cart[idx].days = Math.max(1, parseInt(e.target.value) || 1);
      saveCartState();
      refreshCart(container);
    });
  });

  // Clear cart
  document.getElementById('cart-clear')?.addEventListener('click', () => {
    cart = []; selectedCustomer = null;
    saveCartState();
    refreshCart(container);
  });

  // Select / Clear customer
  document.getElementById('select-customer')?.addEventListener('click', () => openCustomerPicker(container));
  document.getElementById('clear-customer')?.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedCustomer = null;
    saveCartState();
    refreshCart(container);
  });

  // Checkout
  document.getElementById('btn-checkout')?.addEventListener('click', () => processCheckout(container));
}

function openCustomerPicker(container) {
  const customers = getCustomers();
  const body = `
    <div class="form-group" style="margin-bottom:16px">
      <input type="text" class="form-input" id="customer-search-modal" placeholder="Search customers...">
    </div>
    <div id="customer-list-modal" style="max-height:300px;overflow-y:auto">
      ${customers.map(c => `
        <div class="pos-cart-item" style="cursor:pointer" data-cid="${c.id}">
          <div class="pos-cart-item-icon" style="background:var(--gradient-primary);color:white;font-size:0.75rem;font-weight:700">${c.name.split(' ').map(n=>n[0]).join('')}</div>
          <div class="pos-cart-item-info">
            <div class="pos-cart-item-name">${c.name}</div>
            <div class="pos-cart-item-days">${c.phone}</div>
          </div>
        </div>`).join('')}
    </div>
    <button class="btn btn-secondary btn-sm" id="add-new-customer-btn" style="margin-top:12px;width:100%">${icon('user-plus', 16)} Add New Customer</button>`;

  openModal('Select Customer', body, { showFooter: false });

  setTimeout(() => {
    document.querySelectorAll('[data-cid]').forEach(el => {
      el.addEventListener('click', () => {
        selectedCustomer = customers.find(c => c.id === el.dataset.cid);
        saveCartState();
        closeModal();
        refreshCart(container);
      });
    });
    document.getElementById('customer-search-modal')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('[data-cid]').forEach(el => {
        const c = customers.find(c => c.id === el.dataset.cid);
        el.style.display = c.name.toLowerCase().includes(q) || c.phone.includes(q) ? '' : 'none';
      });
    });
    document.getElementById('add-new-customer-btn')?.addEventListener('click', () => {
      closeModal();
      openQuickAddCustomer(container);
    });
  }, 50);
}

function openQuickAddCustomer(container) {
  const body = `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Full Name *</label><input type="text" class="form-input" id="new-cust-name" required></div>
      <div class="form-group"><label class="form-label">Phone *</label><input type="text" class="form-input" id="new-cust-phone" required></div>
    </div>
    <div class="form-row" style="margin-top:12px">
      <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="new-cust-email"></div>
      <div class="form-group"><label class="form-label">ID Number</label><input type="text" class="form-input" id="new-cust-id"></div>
    </div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">Address</label><input type="text" class="form-input" id="new-cust-address"></div>`;

  openModal('Add New Customer', body, {
    confirmText: 'Add Customer',
    onConfirm: () => {
      const name = document.getElementById('new-cust-name').value.trim();
      const phone = document.getElementById('new-cust-phone').value.trim();
      if (!name || !phone) { showToast('Name and phone are required', 'error'); return; }
      const newC = {
        id: generateId(), name, phone,
        email: document.getElementById('new-cust-email').value.trim(),
        idNumber: document.getElementById('new-cust-id').value.trim(),
        address: document.getElementById('new-cust-address').value.trim(),
        balance: 0, createdAt: new Date().toISOString()
      };
      addCustomer(newC);
      selectedCustomer = newC;
      saveCartState();
      closeModal();
      refreshCart(container);
      notifyCustomerAdded(name);
      showToast(`Customer "${name}" added`, 'success');
    }
  });
}

function printReceipt(invoice, customer, items, type = 'rental') {
  const s = getSettings();
  const date = new Date().toLocaleString();
  const root = document.getElementById('print-root');
  
  root.innerHTML = `
    <div style="font-family:monospace;width:300px;padding:20px;color:black;background:white">
      <div style="text-align:center;margin-bottom:10px">
        <h2 style="margin:0;font-size:1.5rem">${s.shopName}</h2>
        <p style="margin:0">${s.shopAddress}<br>${s.shopPhone}</p>
      </div>
      <div style="border-top:1px dashed #000;border-bottom:1px dashed #000;padding:10px 0;margin-bottom:10px">
        <div>Date: ${date}</div>
        <div>Receipt #: ${invoice.id.toUpperCase().slice(0,8)}</div>
        <div>Customer: ${customer.name}</div>
        <div>Type: ${type.toUpperCase()}</div>
      </div>
      <div style="margin-bottom:10px">
        ${items.map(i => `<div style="display:flex;justify-content:space-between;margin-bottom:5px">
          <span style="flex:1">${i.name} (x${i.days || 1})</span>
          <span>${formatCurrency(i.total || i.rate)}</span>
        </div>`).join('')}
      </div>
      <div style="border-top:1px dashed #000;padding-top:10px">
        <div style="display:flex;justify-content:space-between"><span>Subtotal:</span><span>${formatCurrency(invoice.subtotal)}</span></div>
        <div style="display:flex;justify-content:space-between"><span>Tax:</span><span>${formatCurrency(invoice.tax)}</span></div>
        ${invoice.deposit ? `<div style="display:flex;justify-content:space-between"><span>Deposit:</span><span>${formatCurrency(invoice.deposit)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-weight:bold;margin-top:5px;font-size:1.2rem"><span>TOTAL:</span><span>${formatCurrency(invoice.total)}</span></div>
      </div>
      <div style="text-align:center;margin-top:20px">
        <svg id="barcode-${invoice.id}"></svg>
        <p style="margin-top:10px;font-size:0.8rem">Thank you for your business!</p>
      </div>
    </div>
  `;
  
  try {
    JsBarcode(`#barcode-${invoice.id}`, invoice.id.slice(0, 8), { format: "CODE128", width: 2, height: 40, displayValue: true });
  } catch(e) { console.error('Barcode generation failed', e); }

  const printWindow = window.open('', '', 'width=400,height=600');
  printWindow.document.write('<html><head><title>Receipt</title></head><body style="margin:0;">');
  printWindow.document.write(root.innerHTML);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
}

function processCheckout(container) {
  const hasRental = cart.some(item => item._mode !== 'sell');
  const hasSale = cart.some(item => item._mode === 'sell');
  
  if (cart.length === 0 || (!selectedCustomer && hasRental)) {
    if (!selectedCustomer && hasRental) showToast('Please select a customer for rentals', 'warning');
    return;
  }
  const settings = getSettings();
  
  const customerName = selectedCustomer ? selectedCustomer.name : 'Walk-in Customer';
  const customerId = selectedCustomer ? selectedCustomer.id : 'WALKIN';
  const pseudoCustomer = selectedCustomer || { id: customerId, name: customerName };

  const items = cart.map(item => {
    const isItemSell = item._mode === 'sell';
    return {
      name: item.name,
      qty: item.quantity || 1,
      days: isItemSell ? null : item.days,
      rate: isItemSell ? item.sellingPrice : item.dailyRate,
      total: isItemSell
        ? (item.sellingPrice || 0) * (item.quantity || 1)
        : calculateRentalCost(item.dailyRate, item.days, settings) * (item.quantity || 1),
      _mode: item._mode
    };
  });

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const tax = subtotal * (settings.taxRate / 100);
  const deposit = cart.reduce((sum, item) => sum + (item._mode === 'sell' ? 0 : (settings.defaultDeposit || 2000) * (item.quantity || 1)), 0);
  const total = subtotal + tax + deposit;

  const body = `
    <div style="margin-bottom:20px">
      <p style="color:var(--text-secondary);margin-bottom:12px"><strong>Customer:</strong> ${customerName}</p>
      <p style="color:var(--text-secondary);margin-bottom:12px"><strong>Type:</strong> ${hasRental && hasSale ? '📦 Mixed' : (hasSale ? '🏷️ Sale' : '📋 Rental')}</p>
      ${items.map(i => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-glass)">
        <span>${i._mode === 'sell' ? '🏷️ ' : '📋 '}${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}${i.days ? ` × ${i.days} days` : ''}</span>
        <span>${formatCurrency(i.total)}</span></div>`).join('')}
      <div style="margin-top:12px;padding-top:12px;border-top:2px solid var(--border-glass)">
        <div style="display:flex;justify-content:space-between;font-size:0.875rem;color:var(--text-secondary)"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:0.875rem;color:var(--text-secondary)"><span>Tax (${settings.taxRate}%)</span><span>${formatCurrency(tax)}</span></div>
        ${hasRental ? `<div style="display:flex;justify-content:space-between;font-size:0.875rem;color:var(--text-secondary)"><span>Security Deposit</span><span>${formatCurrency(deposit)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:1.25rem;font-weight:700;margin-top:8px"><span>Total</span><span class="text-gradient">${formatCurrency(total)}</span></div>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Payment Method</label>
      <select class="form-select" id="pay-method">
        <option>Cash</option><option>Card</option><option>UPI</option><option>Bank Transfer</option>
      </select>
    </div>
    <div class="form-group" style="margin-top:12px">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="print-receipt-chk" checked> Print Receipt</label>
    </div>`;

  openModal(hasRental && hasSale ? 'Complete Checkout' : (hasSale ? 'Complete Sale' : 'Complete Rental'), body, {
    confirmText: `Pay ${formatCurrency(total)}`,
    confirmClass: 'btn-success',
    onConfirm: () => {
      const payMethod = document.getElementById('pay-method').value;
      const doPrint = document.getElementById('print-receipt-chk').checked;

      cart.forEach(item => {
        if (item._mode === 'sell') {
          // SELL: deduct stock
          const qty = item.quantity || 1;
          const currentStock = item.totalStock || 1;
          updateTool(item.toolId, { totalStock: Math.max(0, currentStock - qty) });
          notifySaleCompleted(item.name, customerName);
          const avail = getToolAvailableCount(item.toolId);
          if (avail <= 2 && avail >= 0) notifyStockLow(item.name, avail);
        } else {
          // RENT: create rental records
          const qty = item.quantity || 1;
          const now = new Date();
          const end = new Date(now.getTime() + item.days * 86400000);
          for (let u = 0; u < qty; u++) {
            addRental({
              id: generateId(), toolId: item.toolId, customerId: customerId,
              startDate: now.toISOString(), endDate: end.toISOString(),
              dailyRate: item.dailyRate, status: 'active',
              deposit: settings.defaultDeposit || 2000, notes: ''
            });
          }
          notifyRentalCreated(item.name, customerName);
        }
      });

      const invId = generateId();
      const invoiceType = hasRental && hasSale ? 'mixed' : (hasSale ? 'sale' : 'rental');
      const invoiceData = {
        id: invId, rentalId: '', customerId: customerId,
        type: invoiceType,
        items, subtotal, tax, deposit, total,
        status: 'paid', paymentMethod: payMethod,
        createdAt: new Date().toISOString()
      };
      addInvoice(invoiceData);

      if (doPrint) printReceipt(invoiceData, pseudoCustomer, items, invoiceType);
      closeModal();

      cart = []; selectedCustomer = null;
      saveCartState();
      container.innerHTML = buildPOSHTML();
      bindPOSEvents(container);
      showToast(hasRental && hasSale ? 'Mixed checkout completed!' : (hasSale ? 'Sale completed successfully!' : 'Rental processed successfully!'), 'success');
    }
  });
}
