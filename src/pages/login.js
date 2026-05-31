// ============================================
// TOOLFLOW — Login Page
// ============================================
import { icon } from '../components/icons.js';
import { t, initLanguage } from '../utils/i18n.js';
import { login } from '../utils/auth.js';

export function renderLoginPage(onSuccess) {
  initLanguage();
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="login-page">
      <div class="login-bg">
        <div class="login-bg-shape shape-1"></div>
        <div class="login-bg-shape shape-2"></div>
        <div class="login-bg-shape shape-3"></div>
      </div>
      <div class="login-card animate-fadeInUp">
        <div class="login-header">
          <div class="login-logo">
            <div class="login-logo-icon">${icon('tool', 28)}</div>
            <h1>ToolFlow</h1>
          </div>
          <h2>${t('loginTitle')}</h2>
          <p>${t('loginSubtitle')}</p>
        </div>
        <form id="login-form" class="login-form" autocomplete="on">
          <div id="login-error" class="login-error" style="display:none">
            ${icon('alert-circle', 16)}
            <span>${t('loginError')}</span>
          </div>
          <div class="login-field">
            <label>${t('username')}</label>
            <div class="login-input-wrap">
              ${icon('user', 18)}
              <input type="text" id="login-username" name="username" placeholder="admin" autocomplete="username" required />
            </div>
          </div>
          <div class="login-field">
            <label>${t('password')}</label>
            <div class="login-input-wrap">
              ${icon('lock', 18)}
              <input type="password" id="login-password" name="password" placeholder="••••••••" autocomplete="current-password" required />
              <button type="button" class="login-eye" id="toggle-pw" tabindex="-1">${icon('eye', 16)}</button>
            </div>
          </div>
          <div class="login-options">
            <label class="login-checkbox">
              <input type="checkbox" id="login-remember" />
              <span>${t('rememberMe')}</span>
            </label>
          </div>
          <button type="submit" class="login-btn" id="login-btn">
            ${icon('log-in', 18)}
            <span>${t('login')}</span>
          </button>
        </form>
        <div class="login-footer">
          <div class="login-credentials">
            <span style="font-size:0.7rem;opacity:0.5">Demo: admin / admin123</span>
          </div>
        </div>
      </div>
    </div>`;

  // --- Events ---
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  const pwInput = document.getElementById('login-password');
  const togglePw = document.getElementById('toggle-pw');

  // Toggle password visibility
  togglePw.addEventListener('click', () => {
    const isPassword = pwInput.type === 'password';
    pwInput.type = isPassword ? 'text' : 'password';
    togglePw.innerHTML = icon(isPassword ? 'eye-off' : 'eye', 16);
  });

  // Submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const remember = document.getElementById('login-remember').checked;

    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.innerHTML = `<span class="login-spinner"></span> <span>${t('login')}...</span>`;

    // Simulate slight delay for UX
    setTimeout(() => {
      const result = login(username, password, remember);
      if (result.error) {
        errorEl.style.display = 'flex';
        errorEl.classList.add('shake');
        setTimeout(() => errorEl.classList.remove('shake'), 500);
        btn.disabled = false;
        btn.innerHTML = `${icon('log-in', 18)} <span>${t('login')}</span>`;
      } else {
        // Success animation
        btn.innerHTML = `${icon('check-circle', 18)} <span>✓</span>`;
        btn.classList.add('login-btn-success');
        setTimeout(() => onSuccess(result.user), 500);
      }
    }, 600);
  });

  // Focus username field
  setTimeout(() => document.getElementById('login-username')?.focus(), 100);
}
