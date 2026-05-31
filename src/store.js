// ============================================
// TOOLFLOW — Data Store (localStorage)
// ============================================
import { seedTools, seedCustomers, seedRentals, seedInvoices, seedSettings } from './utils/seedData.js';

// Rental status constants
export const STATUS_ACTIVE = 'active';
export const STATUS_OVERDUE = 'overdue';
export const STATUS_RETURNED = 'returned';

const KEYS = { tools: 'tf_tools', customers: 'tf_customers', rentals: 'tf_rentals', invoices: 'tf_invoices', settings: 'tf_settings' };
const listeners = {};

function emit(key) { (listeners[key] || []).forEach(fn => fn()); }
export function on(key, fn) { if (!listeners[key]) listeners[key] = []; listeners[key].push(fn); }
export function off(key, fn) { if (listeners[key]) listeners[key] = listeners[key].filter(f => f !== fn); }

function get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function set(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

export function initStore() {
  if (!get(KEYS.tools)) set(KEYS.tools, seedTools);
  if (!get(KEYS.customers)) set(KEYS.customers, seedCustomers);
  if (!get(KEYS.rentals)) set(KEYS.rentals, seedRentals);
  if (!get(KEYS.invoices)) set(KEYS.invoices, seedInvoices);
  if (!get(KEYS.settings)) set(KEYS.settings, seedSettings);
}

// --- Tools ---
export function getTools() { return get(KEYS.tools) || []; }
export function getTool(id) { return getTools().find(tl => tl.id === id); }
export function addTool(tool) { const arr = getTools(); arr.push(tool); set(KEYS.tools, arr); emit('tools'); }
export function updateTool(id, data) { const arr = getTools().map(tl => tl.id === id ? { ...tl, ...data } : tl); set(KEYS.tools, arr); emit('tools'); }
export function deleteTool(id) {
  const hasActive = getRentals().some(r => r.toolId === id && (r.status === STATUS_ACTIVE || r.status === STATUS_OVERDUE));
  if (hasActive) return { error: 'Cannot delete a tool that is currently rented out.' };
  set(KEYS.tools, getTools().filter(tl => tl.id !== id)); emit('tools');
  return { ok: true };
}

// --- Stock helpers ---
export function getToolRentedCount(toolId) {
  return getRentals().filter(r => r.toolId === toolId && (r.status === 'active' || r.status === 'overdue')).length;
}
export function getToolAvailableCount(toolId) {
  const tool = getTool(toolId);
  if (!tool) return 0;
  const maintenance = tool.maintenanceUnits || 0;
  return Math.max(0, (tool.totalStock || 1) - getToolRentedCount(toolId) - maintenance);
}
export function getToolStatus(toolId) {
  const tool = getTool(toolId);
  if (!tool) return 'unknown';
  if (tool.maintenanceUnits >= (tool.totalStock || 1)) return 'maintenance';
  const avail = getToolAvailableCount(toolId);
  if (avail <= 0) return 'out-of-stock';
  if (getToolRentedCount(toolId) > 0) return 'partial';
  return 'available';
}
export function findToolByBarcode(barcode) {
  return getTools().find(tl => tl.barcode === barcode || tl.serial === barcode);
}

// --- Customers ---
export function getCustomers() { return get(KEYS.customers) || []; }
export function getCustomer(id) { return getCustomers().find(c => c.id === id); }
export function addCustomer(c) { const arr = getCustomers(); arr.push(c); set(KEYS.customers, arr); emit('customers'); }
export function updateCustomer(id, data) { const arr = getCustomers().map(c => c.id === id ? { ...c, ...data } : c); set(KEYS.customers, arr); emit('customers'); }
export function deleteCustomer(id) {
  const hasActive = getRentals().some(r => r.customerId === id && (r.status === STATUS_ACTIVE || r.status === STATUS_OVERDUE));
  if (hasActive) return { error: 'Cannot delete a customer with active rentals.' };
  const hasUnpaid = getInvoices().some(i => i.customerId === id && i.status === 'unpaid');
  if (hasUnpaid) return { error: 'Cannot delete a customer with unpaid invoices.' };
  set(KEYS.customers, getCustomers().filter(c => c.id !== id)); emit('customers');
  return { ok: true };
}

// --- Rentals ---
export function getRentals() { return get(KEYS.rentals) || []; }
export function getRental(id) { return getRentals().find(r => r.id === id); }
export function addRental(r) { const arr = getRentals(); arr.push(r); set(KEYS.rentals, arr); emit('rentals'); }
export function updateRental(id, data) { const arr = getRentals().map(r => r.id === id ? { ...r, ...data } : r); set(KEYS.rentals, arr); emit('rentals'); }

// --- Invoices ---
export function getInvoices() { return get(KEYS.invoices) || []; }
export function getInvoice(id) { return getInvoices().find(i => i.id === id); }
export function addInvoice(inv) { const arr = getInvoices(); arr.push(inv); set(KEYS.invoices, arr); emit('invoices'); }
export function updateInvoice(id, data) { const arr = getInvoices().map(i => i.id === id ? { ...i, ...data } : i); set(KEYS.invoices, arr); emit('invoices'); }

// --- Settings ---
export function getSettings() { return get(KEYS.settings) || seedSettings; }
export function updateSettings(data) { set(KEYS.settings, { ...getSettings(), ...data }); emit('settings'); }

// --- Helpers ---
export function getActiveRentals() { return getRentals().filter(r => r.status === 'active' || r.status === 'overdue'); }
export function getOverdueRentals() { return getRentals().filter(r => r.status === 'overdue'); }
export function getToolCategories() { return [...new Set(getTools().map(tl => tl.category))]; }
export function getCustomerRentals(customerId) { return getRentals().filter(r => r.customerId === customerId); }
export function getTotalStock() { return getTools().reduce((s, tl) => s + (tl.totalStock || 1), 0); }
export function getTotalAvailable() { return getTools().reduce((s, tl) => s + getToolAvailableCount(tl.id), 0); }
export function getTotalRented() { return getTools().reduce((s, tl) => s + getToolRentedCount(tl.id), 0); }

export function resetData() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  initStore();
  Object.keys(KEYS).forEach(k => emit(k));
}
