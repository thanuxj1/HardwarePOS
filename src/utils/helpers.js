// ============================================
// TOOLFLOW — Utility Helpers
// ============================================

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function formatCurrency(amount) {
  try {
    const currency = window.__TF_CURRENCY__ || 'LKR';
    if (currency === 'LKR') {
      return 'Rs. ' + Number(amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0);
  } catch {
    return 'Rs. ' + Number(amount || 0).toFixed(2);
  }
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(date) {
  return new Date(date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function daysBetween(d1, d2) {
  const oneDay = 86400000;
  return Math.ceil(Math.abs(new Date(d2) - new Date(d1)) / oneDay);
}

export function calculateRentalCost(dailyRate, days, settings = null) {
  if (settings) {
    const weekly = (settings.weeklyDiscount || 0) / 100;
    const monthly = (settings.monthlyDiscount || 0) / 100;
    if (days >= 30) return dailyRate * days * (1 - monthly);
    if (days >= 7) return dailyRate * days * (1 - weekly);
  } else {
    // Legacy fallback
    if (days >= 30) return dailyRate * days * 0.7;
    if (days >= 7) return dailyRate * days * 0.85;
  }
  return dailyRate * days;
}

export function calculateOverdueFee(dailyRate, overdueDays, settings = null) {
  const multiplier = settings ? (settings.lateFeeMultiplier || 1.5) : 1.5;
  return dailyRate * multiplier * overdueDays;
}

export function daysFromNow(date) {
  const now = new Date();
  const target = new Date(date);
  return Math.ceil((target - now) / 86400000);
}

export function getStatusColor(status) {
  const map = {
    available: 'emerald', rented: 'blue', maintenance: 'amber', retired: 'text-tertiary',
    active: 'cyan', overdue: 'rose', returned: 'violet',
    paid: 'emerald', unpaid: 'rose', partial: 'amber'
  };
  return map[status] || 'text-secondary';
}

export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

export function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
