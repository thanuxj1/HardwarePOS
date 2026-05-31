// ============================================
// TOOLFLOW — Main Entry Point
// ============================================
import './styles/index.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';

import { initStore, getActiveRentals, getOverdueRentals, getSettings, getRentals, getTool, getCustomer, on, updateRental } from './store.js';
import { registerRoute, initRouter } from './router.js';
import { renderSidebar, initSidebarEvents } from './components/sidebar.js';
import { renderTopbar, initTopbarEvents, updateNotifBadge } from './components/topbar.js';
import { icon } from './components/icons.js';
import { initLanguage, t } from './utils/i18n.js';
import { isAuthenticated, logout, getCurrentUser } from './utils/auth.js';
import { renderLoginPage } from './pages/login.js';
import { checkOverdueRentals } from './utils/notifications.js';
import { showToast } from './components/toast.js';

// Page modules
import { renderPOS } from './pages/pos.js';
import { renderInventory } from './pages/inventory.js';
import { renderCustomers } from './pages/customers.js';
import { renderRentals } from './pages/rentals.js';
import { renderInvoices } from './pages/invoices.js';
import { renderReports } from './pages/reports.js';
import { renderSettings } from './pages/settings.js';

// Initialize data store first
initStore();

// Initialize language & currency from saved settings
const _s = getSettings();
window.__TF_CURRENCY__ = localStorage.getItem('tf_currency') || _s.currency || 'LKR';
initLanguage();

// --- Auth gate ---
function startApp() {
  if (!isAuthenticated()) {
    renderLoginPage((user) => {
      // On successful login, boot the main app
      bootMainApp();
    });
    return;
  }
  bootMainApp();
}

function bootMainApp() {
  const app = document.getElementById('app');
  const collapsed = localStorage.getItem('tf_sidebar_collapsed') === 'true';

  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar()}
      <div class="main-wrapper" style="margin-left: ${collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)'}">
        ${renderTopbar()}
        <main class="main-content" id="main-content"></main>
        ${renderFooter()}
      </div>
    </div>`;

  // Initialize sidebar events
  initSidebarEvents();
  initTopbarEvents();

  // Register routes
  registerRoute('/pos', renderPOS);
  registerRoute('/inventory', renderInventory);
  registerRoute('/customers', renderCustomers);
  registerRoute('/rentals', renderRentals);
  registerRoute('/invoices', renderInvoices);
  registerRoute('/reports', renderReports);
  registerRoute('/settings', renderSettings);

  // Start router
  initRouter();

  // Update clock
  updateClock();
  setInterval(updateClock, 30000);

  // Check for overdue rentals and generate notifications
  checkOverdueRentals(getRentals(), getTool, getCustomer, updateRental);

  // Listen for notification updates to refresh badge
  window.addEventListener('tf-notification', () => updateNotifBadge());
}

// Helper to render the footer
function renderFooter() {
  const isOnline = navigator.onLine;
  return `<footer class="statusbar" id="app-footer">
    <div class="statusbar-left">
      <div class="statusbar-item" id="status-connection">
        <span class="dot" style="background: ${isOnline ? 'var(--accent-emerald)' : 'var(--accent-rose)'}"></span> 
        ${isOnline ? t('systemOnline') : 'Offline Mode'}
      </div>
      <div class="statusbar-item">${icon('clock', 12)} <span id="status-time"></span></div>
    </div>
    <div class="statusbar-right">
      <div class="statusbar-item">${icon('clipboard-list', 12)} ${t('active')}: <strong id="status-active">${getActiveRentals().length}</strong></div>
      <div class="statusbar-item" style="color:var(--accent-rose)">${icon('alert-triangle', 12)} ${t('overdue')}: <strong id="status-overdue">${getOverdueRentals().length}</strong></div>
    </div>
  </footer>`;
}

// Online/Offline listeners
window.addEventListener('online', () => updateConnectionStatus(true));
window.addEventListener('offline', () => updateConnectionStatus(false));

function updateConnectionStatus(online) {
  const el = document.getElementById('status-connection');
  if (el) {
    el.innerHTML = `<span class="dot" style="background: ${online ? 'var(--accent-emerald)' : 'var(--accent-rose)'}"></span> ${online ? t('systemOnline') : 'Offline Mode'}`;
    if (!online) {
      showToast('Internet connection lost. Switching to Offline Mode.', 'warning');
    } else {
      showToast('Back online. Syncing data...', 'success');
    }
  }
}

function updateClock() {
  const el = document.getElementById('status-time');
  if (el) el.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// When language changes, re-render ALL shell components + current page
window.addEventListener('tf-language-change', () => {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.outerHTML = renderSidebar();
  initSidebarEvents();

  const topbar = document.querySelector('.topbar');
  if (topbar) topbar.outerHTML = renderTopbar();
  initTopbarEvents();

  const footer = document.getElementById('app-footer');
  if (footer) footer.outerHTML = renderFooter();

  window.dispatchEvent(new Event('hashchange'));
  updateClock();
});

// Re-render shell elements on settings change
on('settings', () => {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.outerHTML = renderSidebar();
    initSidebarEvents();
  }
});

// Logout handler
window.addEventListener('tf-logout-request', () => {
  if (confirm(t('logoutConfirm'))) {
    logout();
    location.hash = '';
    startApp();
  }
});

// --- Boot ---
startApp();

