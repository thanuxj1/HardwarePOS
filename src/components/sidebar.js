// ============================================
// TOOLFLOW — Sidebar Component
// ============================================
import { icon } from './icons.js';
import { navigate } from '../router.js';
import { getActiveRentals, getSettings } from '../store.js';
import { t } from '../utils/i18n.js';

export function renderSidebar() {
  const s = getSettings();
  const navItems = [
    { group: t('navMain'), items: [
      { route: '/pos', label: t('pos'), icon: 'monitor' },
      { route: '/rentals', label: t('rentals'), icon: 'clipboard-list', badgeFn: () => getActiveRentals().length },
    ]},
    { group: t('navManagement'), items: [
      { route: '/inventory', label: t('inventory'), icon: 'package' },
      { route: '/customers', label: t('customers'), icon: 'users' },
      { route: '/invoices', label: t('invoices'), icon: 'file-text' },
    ]},
    { group: t('navInsights'), items: [
      { route: '/reports', label: t('reports'), icon: 'bar-chart-3' },
      { route: '/settings', label: t('settings'), icon: 'settings' },
    ]},
  ];

  const collapsed = localStorage.getItem('tf_sidebar_collapsed') === 'true';
  const currentHash = window.location.hash.slice(1) || '/pos';

  const groupsHTML = navItems.map(g => `
    <div class="sidebar-nav-group">
      <div class="sidebar-nav-label">${g.group}</div>
      ${g.items.map(item => {
        const badge = item.badgeFn ? item.badgeFn() : 0;
        return `
          <div class="sidebar-nav-item ${currentHash === item.route ? 'active' : ''}" data-route="${item.route}" id="nav-${item.route.slice(1)}">
            ${icon(item.icon, 20)}
            <span class="nav-label">${item.label}</span>
            ${badge > 0 ? `<span class="nav-badge">${badge}</span>` : ''}
          </div>`;
      }).join('')}
    </div>
  `).join('');

  return `
    <aside class="sidebar ${collapsed ? 'collapsed' : ''}" id="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">${icon('tool', 22)}</div>
        <div class="sidebar-brand">
          <h1>${s.shopName || 'ToolFlow'}</h1>
          <span>${s.shopSubtitle || 'Rental Management'}</span>
        </div>
      </div>
      <nav class="sidebar-nav">${groupsHTML}</nav>
      <div class="sidebar-footer">
        <button class="sidebar-toggle" id="sidebar-toggle" title="Toggle sidebar">
          ${icon('panel-left', 20)}
        </button>
      </div>
    </aside>`;
}

export function initSidebarEvents() {
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const wrapper = document.querySelector('.main-wrapper');
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('tf_sidebar_collapsed', isCollapsed);
    wrapper.style.marginLeft = isCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)';
  });

  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.route));
  });
}
