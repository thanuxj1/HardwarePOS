// ============================================
// TOOLFLOW — Notification System
// ============================================
// Generates real-time notifications based on store events
// (stock changes, rental updates, overdue alerts, etc.)

import { t } from './i18n.js';
import { formatDateTime } from './helpers.js';

const STORAGE_KEY = 'tf_notifications';
const MAX_NOTIFICATIONS = 50;

// --- Persistence ---
function getAll() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveAll(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_NOTIFICATIONS)));
}

// --- Public API ---
export function getNotifications() { return getAll(); }
export function getUnreadCount() { return getAll().filter(n => !n.read).length; }

export function addNotification({ type, titleKey, messageKey, messageParams = {}, icon: iconName = 'bell' }) {
  const list = getAll();
  list.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    type,        // 'rental' | 'inventory' | 'payment' | 'overdue' | 'return' | 'system'
    titleKey,    // i18n key for title
    messageKey,  // i18n key for message (or raw string if starts with '!')
    messageParams,
    icon: iconName,
    read: false,
    createdAt: new Date().toISOString(),
  });
  saveAll(list);
  window.dispatchEvent(new CustomEvent('tf-notification', { detail: { count: getUnreadCount() } }));
}

export function markAllRead() {
  const list = getAll().map(n => ({ ...n, read: true }));
  saveAll(list);
  window.dispatchEvent(new CustomEvent('tf-notification', { detail: { count: 0 } }));
}

export function clearNotifications() {
  saveAll([]);
  window.dispatchEvent(new CustomEvent('tf-notification', { detail: { count: 0 } }));
}

// --- Event-driven notification triggers ---
// Call these from store operations to auto-generate notifications

export function notifyRentalCreated(toolName, customerName) {
  addNotification({
    type: 'rental',
    titleKey: 'notif_newRental',
    messageKey: '!' + `${toolName} → ${customerName}`,
    icon: 'clipboard-list',
  });
}

export function notifyReturnProcessed(toolName) {
  addNotification({
    type: 'return',
    titleKey: 'notif_returned',
    messageKey: '!' + toolName,
    icon: 'rotate-ccw',
  });
}

export function notifySaleCompleted(toolName, customerName) {
  addNotification({
    type: 'payment',
    titleKey: 'notif_sale',
    messageKey: '!' + `${toolName} → ${customerName}`,
    icon: 'tag',
  });
}

export function notifyStockLow(toolName, available) {
  addNotification({
    type: 'inventory',
    titleKey: 'notif_lowStock',
    messageKey: '!' + `${toolName}: ${available}`,
    icon: 'alert-triangle',
  });
}

export function notifyOverdue(toolName, customerName, days) {
  addNotification({
    type: 'overdue',
    titleKey: 'notif_overdue',
    messageKey: '!' + `${toolName} — ${customerName} (${days}d)`,
    icon: 'alert-circle',
  });
}

export function notifyPaymentReceived(invoiceId, amount) {
  addNotification({
    type: 'payment',
    titleKey: 'notif_payment',
    messageKey: '!' + `#${invoiceId} — ${amount}`,
    icon: 'credit-card',
  });
}

export function notifyToolAdded(toolName) {
  addNotification({
    type: 'inventory',
    titleKey: 'notif_toolAdded',
    messageKey: '!' + toolName,
    icon: 'plus',
  });
}

export function notifyCustomerAdded(customerName) {
  addNotification({
    type: 'system',
    titleKey: 'notif_customerAdded',
    messageKey: '!' + customerName,
    icon: 'user-plus',
  });
}

export function notifyCustomerDeleted(customerName) {
  addNotification({
    type: 'system',
    titleKey: 'notif_customerDeleted',
    messageKey: '!' + customerName,
    icon: 'user-minus',
  });
}

export function notifyToolDeleted(toolName) {
  addNotification({
    type: 'inventory',
    titleKey: 'notif_toolDeleted',
    messageKey: '!' + toolName,
    icon: 'trash',
  });
}

// --- Check for overdue rentals (call on app init) ---
export function checkOverdueRentals(rentals, getToolFn, getCustomerFn, updateRentalFn) {
  const today = new Date();
  today.setHours(0,0,0,0);
  
  rentals.forEach(r => {
    const endDate = new Date(r.endDate);
    endDate.setHours(0,0,0,0);
    
    if (r.status === 'active' && endDate < today) {
      // Update status in store
      if (updateRentalFn) {
        updateRentalFn(r.id, { status: 'overdue' });
      }
      
      const tool = getToolFn(r.toolId);
      const cust = getCustomerFn(r.customerId);
      const days = Math.ceil((today - endDate) / 86400000);
      
      // Only notify once per day per rental
      const key = `overdue_${r.id}_${today.toDateString()}`;
      if (!sessionStorage.getItem(key)) {
        notifyOverdue(tool?.name || '?', cust?.name || '?', days);
        sessionStorage.setItem(key, '1');
      }
    }
  });
}
