// ============================================
// TOOLFLOW — Data Store (localStorage + Postgres Sync)
// ============================================
import { seedTools, seedCustomers, seedRentals, seedInvoices, seedSettings } from './utils/seedData.js';

// Backend API URL configurations
const API_URL = import.meta.env.VITE_API_URL || 'https://hardwarepos-backend.onrender.com/api';

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

// Background API request utility
function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return fetch(`${API_URL}${endpoint}`, options)
    .then(res => {
      if (!res.ok) throw new Error(`API error: ${res.statusText}`);
      return res.json();
    })
    .catch(err => {
      console.warn(`Sync request to ${endpoint} failed (offline or waking up):`, err.message);
      return null;
    });
}

export function initStore() {
  // Ensure local storage has fallback data immediately
  if (!get(KEYS.tools)) set(KEYS.tools, seedTools);
  if (!get(KEYS.customers)) set(KEYS.customers, seedCustomers);
  if (!get(KEYS.rentals)) set(KEYS.rentals, seedRentals);
  if (!get(KEYS.invoices)) set(KEYS.invoices, seedInvoices);
  if (!get(KEYS.settings)) set(KEYS.settings, seedSettings);

  // Background boot-sync with Postgres DB
  apiCall('/all')
    .then(data => {
      if (data && data.tools && data.customers && data.rentals && data.invoices && data.settings) {
        set(KEYS.tools, data.tools);
        set(KEYS.customers, data.customers);
        set(KEYS.rentals, data.rentals);
        set(KEYS.invoices, data.invoices);
        set(KEYS.settings, data.settings);
        
        // Notify frontend to refresh layout and view
        Object.keys(KEYS).forEach(k => emit(k));
        console.log('Postgres Neon database loaded and synchronized with local cache.');
      }
    });
}

// --- Tools ---
export function getTools() { return get(KEYS.tools) || []; }
export function getTool(id) { return getTools().find(tl => tl.id === id); }
export function addTool(tool) { 
  const arr = getTools(); 
  arr.push(tool); 
  set(KEYS.tools, arr); 
  emit('tools'); 
  apiCall('/tools', 'POST', tool);
}
export function updateTool(id, data) { 
  const arr = getTools().map(tl => tl.id === id ? { ...tl, ...data } : tl); 
  set(KEYS.tools, arr); 
  emit('tools'); 
  const updated = arr.find(tl => tl.id === id);
  if (updated) apiCall(`/tools/${id}`, 'PUT', updated);
}
export function deleteTool(id) {
  const hasActive = getRentals().some(r => r.toolId === id && (r.status === STATUS_ACTIVE || r.status === STATUS_OVERDUE));
  if (hasActive) return { error: 'Cannot delete a tool that is currently rented out.' };
  set(KEYS.tools, getTools().filter(tl => tl.id !== id)); 
  emit('tools'); 
  apiCall(`/tools/${id}`, 'DELETE');
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
export function addCustomer(c) { 
  const arr = getCustomers(); 
  arr.push(c); 
  set(KEYS.customers, arr); 
  emit('customers'); 
  apiCall('/customers', 'POST', c);
}
export function updateCustomer(id, data) { 
  const arr = getCustomers().map(c => c.id === id ? { ...c, ...data } : c); 
  set(KEYS.customers, arr); 
  emit('customers'); 
  const updated = arr.find(c => c.id === id);
  if (updated) apiCall(`/customers/${id}`, 'PUT', updated);
}
export function deleteCustomer(id) {
  const hasActive = getRentals().some(r => r.customerId === id && (r.status === STATUS_ACTIVE || r.status === STATUS_OVERDUE));
  if (hasActive) return { error: 'Cannot delete a customer with active rentals.' };
  const hasUnpaid = getInvoices().some(i => i.customerId === id && i.status === 'unpaid');
  if (hasUnpaid) return { error: 'Cannot delete a customer with unpaid invoices.' };
  set(KEYS.customers, getCustomers().filter(c => c.id !== id)); 
  emit('customers'); 
  apiCall(`/customers/${id}`, 'DELETE');
  return { ok: true };
}

// --- Rentals ---
export function getRentals() { return get(KEYS.rentals) || []; }
export function getRental(id) { return getRentals().find(r => r.id === id); }
export function addRental(r) { 
  const arr = getRentals(); 
  arr.push(r); 
  set(KEYS.rentals, arr); 
  emit('rentals'); 
  apiCall('/rentals', 'POST', r);
}
export function updateRental(id, data) { 
  const arr = getRentals().map(r => r.id === id ? { ...r, ...data } : r); 
  set(KEYS.rentals, arr); 
  emit('rentals'); 
  const updated = arr.find(r => r.id === id);
  if (updated) apiCall(`/rentals/${id}`, 'PUT', updated);
}

// --- Invoices ---
export function getInvoices() { return get(KEYS.invoices) || []; }
export function getInvoice(id) { return getInvoices().find(i => i.id === id); }
export function addInvoice(inv) { 
  const arr = getInvoices(); 
  arr.push(inv); 
  set(KEYS.invoices, arr); 
  emit('invoices'); 
  apiCall('/invoices', 'POST', inv);
}
export function updateInvoice(id, data) { 
  const arr = getInvoices().map(i => i.id === id ? { ...i, ...data } : i); 
  set(KEYS.invoices, arr); 
  emit('invoices'); 
  const updated = arr.find(i => i.id === id);
  if (updated) apiCall(`/invoices/${id}`, 'PUT', updated);
}

// --- Settings ---
export function getSettings() { return get(KEYS.settings) || seedSettings; }
export function updateSettings(data) { 
  const updated = { ...getSettings(), ...data };
  set(KEYS.settings, updated); 
  emit('settings'); 
  apiCall('/settings', 'PUT', updated);
}

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
  apiCall('/reset', 'POST');
}
