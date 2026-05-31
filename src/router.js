// ============================================
// TOOLFLOW — Hash-based SPA Router
// ============================================
import { t } from './utils/i18n.js';

const routes = {};
let currentRoute = null;

export function registerRoute(path, renderFn) {
  routes[path] = renderFn;
}

export function navigate(path) {
  window.location.hash = path;
}

export function getCurrentRoute() {
  return currentRoute;
}

export function initRouter() {
  const handleRoute = () => {
    const hash = window.location.hash.slice(1) || '/pos';
    currentRoute = hash;
    const content = document.getElementById('main-content');
    if (!content) return;

    const renderFn = routes[hash];
    if (renderFn) {
      content.innerHTML = '';
      content.className = 'main-content page-enter';
      renderFn(content);
    }

    // Update sidebar active state
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.route === hash);
    });

    // Update topbar title
    const titleMap = {
      '/pos': 'pos',
      '/inventory': 'inventory',
      '/customers': 'customers',
      '/rentals': 'rentals',
      '/invoices': 'invoices',
      '/reports': 'reports',
      '/settings': 'settings',
    };
    const titleEl = document.getElementById('page-title-text');
    if (titleEl && titleMap[hash]) {
      titleEl.textContent = t(titleMap[hash]);
    }
  };

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

