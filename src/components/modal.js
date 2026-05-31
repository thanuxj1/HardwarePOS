// ============================================
// TOOLFLOW — Modal Component
// ============================================
import { icon } from './icons.js';

let currentOnConfirm = null;

export function openModal(title, bodyHTML, options = {}) {
  const { onConfirm, confirmText = 'Confirm', confirmClass = 'btn-primary', size = '', showFooter = true } = options;
  currentOnConfirm = onConfirm;
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal ${size}">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" id="modal-close">${icon('x', 18)}</button>
        </div>
        <div class="modal-body" id="modal-body">${bodyHTML}</div>
        ${showFooter ? `
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
          ${onConfirm ? `<button class="btn ${confirmClass}" id="modal-confirm">${confirmText}</button>` : ''}
        </div>` : ''}
      </div>
    </div>`;

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modal-backdrop') closeModal();
  });
  if (onConfirm) {
    document.getElementById('modal-confirm').addEventListener('click', () => {
      onConfirm();
    });
  }
  document.addEventListener('keydown', handleEsc);
}

export function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
  document.removeEventListener('keydown', handleEsc);
  currentOnConfirm = null;
}

function handleEsc(e) { if (e.key === 'Escape') closeModal(); }

export function confirmDialog(title, message, onConfirm) {
  const body = `
    <div class="confirm-body">
      ${icon('alert-triangle', 48)}
      <h3>${title}</h3>
      <p>${message}</p>
    </div>`;
  openModal('Confirm Action', body, { onConfirm, confirmText: 'Yes, proceed', confirmClass: 'btn-danger' });
}
