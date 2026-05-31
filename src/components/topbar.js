// ============================================
// TOOLFLOW — Topbar Component
// ============================================
import { icon } from './icons.js';
import { t } from '../utils/i18n.js';
import { getCurrentUser, logout } from '../utils/auth.js';
import { getNotifications, getUnreadCount, markAllRead, clearNotifications } from '../utils/notifications.js';
import { confirmDialog, closeModal } from './modal.js';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('notifJustNow');
  if (mins < 60) return t('notifMinAgo', { n: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('notifHrAgo', { n: hrs });
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const typeColors = {
  rental: 'var(--accent-cyan)', return: 'var(--accent-violet)', payment: 'var(--accent-emerald)',
  inventory: 'var(--accent-amber)', overdue: 'var(--accent-rose)', system: 'var(--text-secondary)',
};

export function renderTopbar() {
  const user = getCurrentUser();
  const unread = getUnreadCount();
  
  return `
    <header class="topbar">
      <div class="topbar-left">
        <h2 class="topbar-page-title">
          <span id="page-title-text">${t('pos')}</span>
        </h2>
      </div>
      <div class="topbar-right">
        <div class="notif-wrapper" id="notif-wrapper">
          <button class="topbar-icon-btn" id="btn-notifications" title="${t('notifications')}">
            ${icon('bell', 20)}
            ${unread > 0 ? `<span class="notif-count">${unread > 9 ? '9+' : unread}</span>` : ''}
          </button>
          <div class="notif-panel" id="notif-panel" style="display:none">
            <div class="notif-panel-header">
              <h3>${t('notifications')}</h3>
              <div class="notif-panel-actions">
                <button id="notif-mark-read" title="${t('markAllRead')}">${icon('check-check', 14)}</button>
                <button id="notif-clear" title="${t('clearAll')}">${icon('trash', 14)}</button>
              </div>
            </div>
            <div class="notif-panel-body" id="notif-list">
              ${renderNotifList()}
            </div>
          </div>
        </div>
        <div class="user-menu-wrapper" id="user-menu-wrapper">
          <div class="topbar-user" id="user-menu-trigger">
            <div class="topbar-avatar">${user?.initials || 'AD'}</div>
            <div class="topbar-user-info">
              <span class="topbar-user-name">${user?.name || 'Admin'}</span>
              <span class="topbar-user-role">${user?.role || 'Manager'}</span>
            </div>
            ${icon('chevron-down', 14)}
          </div>
          <div class="user-dropdown" id="user-dropdown" style="display:none">
            <div class="user-dropdown-header">
              <div class="user-dropdown-avatar">${user?.initials || 'AD'}</div>
              <div class="user-dropdown-info">
                <div class="user-dropdown-name">${user?.name || 'Admin'}</div>
                <div class="user-dropdown-email">${user?.role || 'Manager'}</div>
              </div>
            </div>
            <div class="user-dropdown-divider"></div>
            <button class="user-dropdown-item" id="btn-my-settings">
              ${icon('settings', 16)}
              <span>${t('settings')}</span>
            </button>
            <div class="user-dropdown-divider"></div>
            <button class="user-dropdown-item user-dropdown-logout" id="btn-logout">
              ${icon('log-out', 16)}
              <span>${t('logout')}</span>
            </button>
          </div>
        </div>
      </div>
    </header>`;
}

function renderNotifList() {
  const notifs = getNotifications();
  if (notifs.length === 0) {
    return `<div class="notif-empty">
      ${icon('bell-off', 32)}
      <p>${t('noNotifications')}</p>
    </div>`;
  }
  return notifs.slice(0, 20).map(n => {
    const color = typeColors[n.type] || 'var(--text-secondary)';
    const msg = n.messageKey.startsWith('!') ? n.messageKey.slice(1) : t(n.messageKey, n.messageParams);
    return `<div class="notif-item ${n.read ? '' : 'unread'}">
      <div class="notif-item-icon" style="color:${color}">${icon(n.icon || 'bell', 16)}</div>
      <div class="notif-item-content">
        <div class="notif-item-title">${t(n.titleKey)}</div>
        <div class="notif-item-msg">${msg}</div>
        <div class="notif-item-time">${timeAgo(n.createdAt)}</div>
      </div>
      ${!n.read ? '<div class="notif-dot"></div>' : ''}
    </div>`;
  }).join('');
}

export function initTopbarEvents() {
  // Notification bell toggle
  const btn = document.getElementById('btn-notifications');
  const panel = document.getElementById('notif-panel');
  const wrapper = document.getElementById('notif-wrapper');
  
  if (btn && panel) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close user dropdown if open
      const userDropdown = document.getElementById('user-dropdown');
      if (userDropdown) userDropdown.style.display = 'none';
      
      const isOpen = panel.style.display !== 'none';
      panel.style.display = isOpen ? 'none' : 'block';
      if (!isOpen) {
        document.getElementById('notif-list').innerHTML = renderNotifList();
      }
    });

    document.getElementById('notif-mark-read')?.addEventListener('click', (e) => {
      e.stopPropagation();
      markAllRead();
      document.getElementById('notif-list').innerHTML = renderNotifList();
      updateNotifBadge();
    });

    document.getElementById('notif-clear')?.addEventListener('click', (e) => {
      e.stopPropagation();
      clearNotifications();
      document.getElementById('notif-list').innerHTML = renderNotifList();
      updateNotifBadge();
    });
  }

  // User menu dropdown toggle
  const userTrigger = document.getElementById('user-menu-trigger');
  const userDropdown = document.getElementById('user-dropdown');
  const userWrapper = document.getElementById('user-menu-wrapper');

  if (userTrigger && userDropdown) {
    userTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close notification panel if open
      if (panel) panel.style.display = 'none';
      
      const isOpen = userDropdown.style.display !== 'none';
      userDropdown.style.display = isOpen ? 'none' : 'block';
    });
  }

  // Logout button
  document.getElementById('btn-logout')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (userDropdown) userDropdown.style.display = 'none';
    confirmDialog(
      t('logout'),
      t('logoutConfirm'),
      () => {
        closeModal();
        logout();
        location.hash = '';
        location.reload();
      }
    );
  });

  // Settings → go to settings page
  document.getElementById('btn-my-settings')?.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.style.display = 'none';
    location.hash = '#/settings';
  });

  // Close all dropdowns on outside click
  document.addEventListener('click', (e) => {
    if (wrapper && !wrapper.contains(e.target) && panel) {
      panel.style.display = 'none';
    }
    if (userWrapper && !userWrapper.contains(e.target) && userDropdown) {
      userDropdown.style.display = 'none';
    }
  });
}

export function updateNotifBadge() {
  const count = getUnreadCount();
  const btn = document.getElementById('btn-notifications');
  if (!btn) return;
  
  // Update Badge
  const existing = btn.querySelector('.notif-count');
  if (existing) existing.remove();
  if (count > 0) {
    const badge = document.createElement('span');
    badge.className = 'notif-count';
    badge.textContent = count > 9 ? '9+' : count;
    btn.appendChild(badge);
  }

  // Update List if panel is open
  const panel = document.getElementById('notif-panel');
  const list = document.getElementById('notif-list');
  if (panel && list && panel.style.display !== 'none') {
    list.innerHTML = renderNotifList();
  }
}
