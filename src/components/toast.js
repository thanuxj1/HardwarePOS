// ============================================
// TOOLFLOW — Toast Notification Component
// ============================================
import { icon } from './icons.js';

const iconMap = { success: 'check-circle', error: 'alert-circle', warning: 'alert-triangle', info: 'info' };

export function showToast(message, type = 'success', title = '') {
  const root = document.getElementById('toast-root');
  if (!root.querySelector('.toast-container')) {
    root.innerHTML = '<div class="toast-container"></div>';
  }
  const container = root.querySelector('.toast-container');
  const id = 'toast-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
  const titles = { success: 'Success', error: 'Error', warning: 'Warning', info: 'Info' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.id = id;
  toast.innerHTML = `
    <div class="toast-icon">${icon(iconMap[type], 20)}</div>
    <div class="toast-content">
      <div class="toast-title">${title || titles[type]}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" data-id="${id}">${icon('x', 14)}</button>
    <div class="toast-progress"></div>`;

  container.appendChild(toast);

  toast.querySelector('.toast-close').addEventListener('click', () => removeToast(id));
  setTimeout(() => removeToast(id), 4500);
}

function removeToast(id) {
  const el = document.getElementById(id);
  if (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateX(100%)';
    el.style.transition = 'all 0.3s ease';
    setTimeout(() => el.remove(), 300);
  }
}
