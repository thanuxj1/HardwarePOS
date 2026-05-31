// ============================================
// TOOLFLOW — Reports & Analytics Page
// ============================================
import { icon } from '../components/icons.js';
import { createLineChart, createBarChart, createDoughnutChart } from '../components/charts.js';
import { getInvoices, getRentals, getTools, getCustomers, getTotalStock, getTotalAvailable, getTotalRented } from '../store.js';
import { formatCurrency } from '../utils/helpers.js';
import { t } from '../utils/i18n.js';

import { showToast } from '../components/toast.js';

export function renderReports(container) {
  const invoices = getInvoices();
  const rentals = getRentals();
  const tools = getTools();

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const activeRentals = rentals.filter(r => r.status === 'active' || r.status === 'overdue').length;
  const overdueCount = rentals.filter(r => r.status === 'overdue').length;
  const totalStock = getTotalStock();
  const utilization = totalStock > 0 ? Math.round((getTotalRented() / totalStock) * 100) : 0;

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><p class="page-subtitle">${t('businessInsights')}</p></div>
      <div class="page-header-actions">
        <button class="btn btn-secondary" id="btn-gen-report">${icon('file-text', 18)} ${t('generateReport')}</button>
      </div>
    </div>
    <div class="stat-cards stagger-children">
      <div class="stat-card emerald animate-fadeInUp"><div class="stat-card-content"><div class="stat-card-label">${t('totalRevenue')}</div><div class="stat-card-value">${formatCurrency(totalRevenue)}</div><div class="stat-card-trend up">${icon('trending-up', 14)} +12.5%</div></div><div class="stat-card-icon emerald">${icon('dollar-sign', 22)}</div></div>
      <div class="stat-card cyan animate-fadeInUp"><div class="stat-card-content"><div class="stat-card-label">${t('activeRentals')}</div><div class="stat-card-value">${activeRentals}</div></div><div class="stat-card-icon cyan">${icon('clipboard-list', 22)}</div></div>
      <div class="stat-card rose animate-fadeInUp"><div class="stat-card-content"><div class="stat-card-label">${t('overdue')}</div><div class="stat-card-value">${overdueCount}</div></div><div class="stat-card-icon rose">${icon('alert-triangle', 22)}</div></div>
      <div class="stat-card amber animate-fadeInUp"><div class="stat-card-content"><div class="stat-card-label">${t('utilization')}</div><div class="stat-card-value">${utilization}%</div></div><div class="stat-card-icon amber">${icon('bar-chart-3', 22)}</div></div>
    </div>
    <div class="reports-grid">
      <div class="chart-card full-width animate-fadeInUp">
        <div class="chart-card-header"><span class="chart-card-title">${t('revenue30Days')}</span></div>
        <div class="chart-wrapper" style="height:280px"><canvas id="chart-revenue"></canvas></div>
      </div>
      <div class="chart-card animate-fadeInUp">
        <div class="chart-card-header"><span class="chart-card-title">${t('topRentedTools')}</span></div>
        <div class="chart-wrapper" style="height:260px"><canvas id="chart-tools"></canvas></div>
      </div>
      <div class="chart-card animate-fadeInUp">
        <div class="chart-card-header"><span class="chart-card-title">${t('categories')}</span></div>
        <div class="chart-wrapper" style="height:260px"><canvas id="chart-categories"></canvas></div>
      </div>
    </div>
    <div class="reports-section animate-fadeInUp" style="margin-top:24px">
      <div class="chart-card full-width">
        <div class="chart-card-header" style="display:flex;justify-content:space-between;align-items:center">
          <span class="chart-card-title">Recent Transactions (Today)</span>
          <span style="font-size:var(--font-xs);color:var(--text-muted)">Real-time activity</span>
        </div>
        <div class="data-table-wrapper" style="border:none">
          <table class="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody id="reports-recent-tbody">
              <!-- Populated by JS -->
            </tbody>
          </table>
        </div>
      </div>
    </div>`;

  // Populate Recent Activity
  const today = new Date();
  today.setHours(0,0,0,0);
  const recentInvs = invoices.filter(i => new Date(i.createdAt) >= today).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const recentTbody = document.getElementById('reports-recent-tbody');
  if (recentTbody) {
    recentTbody.innerHTML = recentInvs.length === 0 
      ? '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted)">No transactions recorded today yet.</td></tr>'
      : recentInvs.map(i => `
        <tr>
          <td><strong>#${i.id.slice(-6).toUpperCase()}</strong></td>
          <td><span class="badge badge-${i.type === 'rental' ? 'blue' : 'violet'}" style="text-transform:capitalize">${i.type}</span></td>
          <td style="font-weight:600">${formatCurrency(i.total)}</td>
          <td><span class="badge badge-${i.status}">${i.status}</span></td>
          <td style="color:var(--text-muted)">${new Date(i.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
        </tr>
      `).join('');
  }

  // Revenue line chart (Real Data)
  const days = [];
  const revData = [];
  const paidInvs = invoices.filter(i => i.status === 'paid');
  
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    days.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    
    // Sum invoices for this specific day
    const dayTotal = paidInvs.reduce((sum, inv) => {
      const invDate = new Date(inv.createdAt);
      if (invDate >= d && invDate < new Date(d.getTime() + 86400000)) {
        return sum + (inv.total || 0);
      }
      return sum;
    }, 0);
    
    revData.push(dayTotal);
  }
  createLineChart(document.getElementById('chart-revenue'), days, revData);

  // Top tools bar chart
  const toolRentalCounts = {};
  rentals.forEach(r => {
    const tl = tools.find(x => x.id === r.toolId);
    const name = tl?.name || `Tool #${r.toolId}`; // null-safe for deleted tools
    toolRentalCounts[name] = (toolRentalCounts[name] || 0) + 1;
  });
  const sorted = Object.entries(toolRentalCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  createBarChart(document.getElementById('chart-tools'), sorted.map(s => s[0].split(' ').slice(0,2).join(' ')), sorted.map(s => s[1]));

  // Categories doughnut
  const catCounts = {};
  tools.forEach(tl => catCounts[tl.category] = (catCounts[tl.category] || 0) + 1);
  createDoughnutChart(document.getElementById('chart-categories'), Object.keys(catCounts), Object.values(catCounts));

  // Bind report button
  document.getElementById('btn-gen-report')?.addEventListener('click', () => printDailyReport(invoices, rentals, tools));
}

function printDailyReport(invoices, rentals, tools) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const tomorrow = new Date(today.getTime() + 86400000);

  const todayInvoices = invoices.filter(i => {
    const d = new Date(i.createdAt);
    return d >= today && d < tomorrow;
  });

  const todayRentals = rentals.filter(r => {
    const d = new Date(r.startDate);
    return d >= today && d < tomorrow;
  });

  const revenue = todayInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const taxes = todayInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.tax || 0), 0);
  const cashTotal = todayInvoices.filter(i => i.paymentMethod === 'Cash' && i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const cardTotal = todayInvoices.filter(i => i.paymentMethod === 'Card' && i.status === 'paid').reduce((s, i) => s + i.total, 0);

  try {
    const printWindow = window.open('', '', 'width=800,height=800');
    if (!printWindow) {
      showToast('Please allow popups to generate reports', 'error');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(`
    <html>
      <head>
        <title>Daily Report - ${today.toLocaleDateString()}</title>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; margin: 0; color: #0f172a; }
          .subtitle { color: #64748b; margin: 5px 0 0 0; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 40px; }
          .stat-box { padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
          .stat-label { font-size: 14px; color: #64748b; margin-bottom: 5px; }
          .stat-value { font-size: 20px; font-weight: bold; color: #0f172a; }
          .section-title { font-size: 18px; font-weight: bold; margin: 30px 0 15px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { text-align: left; padding: 12px; background: #f1f5f9; font-size: 13px; color: #475569; }
          td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; }
          @media print { body { padding: 20px; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">ToolFlow — Daily Business Report</h1>
          <p class="subtitle">Generated on ${new Date().toLocaleString()}</p>
        </div>

        <div class="grid">
          <div class="stat-box">
            <div class="stat-label">Total Revenue</div>
            <div class="stat-value">${formatCurrency(revenue)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Tax Collected</div>
            <div class="stat-value">${formatCurrency(taxes)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">New Rentals</div>
            <div class="stat-value">${todayRentals.length}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Invoices Issued</div>
            <div class="stat-value">${todayInvoices.length}</div>
          </div>
        </div>

        <div class="section-title">Payment Breakdown</div>
        <div class="grid">
          <div class="stat-box">
            <div class="stat-label">Cash Payments</div>
            <div class="stat-value">${formatCurrency(cashTotal)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Card & Other</div>
            <div class="stat-value">${formatCurrency(cardTotal)}</div>
          </div>
        </div>

        <div class="section-title">Latest Transactions (Today)</div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${todayInvoices.length === 0 ? '<tr><td colspan="6" style="text-align:center">No transactions recorded today.</td></tr>' : 
              todayInvoices.map(i => `
                <tr>
                  <td>#${i.id.slice(-6).toUpperCase()}</td>
                  <td>${i.customerId}</td>
                  <td>${i.type.toUpperCase()}</td>
                  <td>${formatCurrency(i.total)}</td>
                  <td>${i.paymentMethod || '—'}</td>
                  <td>${i.status.toUpperCase()}</td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>

        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ToolFlow POS System. Internal Use Only.</p>
        </div>
      </body>
    </html>
  `);
  
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 500);
  } catch (err) {
    showToast('Failed to generate report', 'error');
    console.error(err);
  }
}
