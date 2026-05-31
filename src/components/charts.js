// ============================================
// TOOLFLOW — Charts wrapper (Chart.js)
// ============================================

import { formatCurrency } from '../utils/helpers.js';

const chartDefaults = {
  color: '#a5b4c8',
  borderColor: 'rgba(255,255,255,0.06)',
  font: { family: 'Inter, sans-serif' }
};

export function createLineChart(canvas, labels, data, label = 'Revenue') {
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label,
        data,
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56,189,248,0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#38bdf8',
        pointRadius: 3,
        pointHoverRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { ...chartDefaults }, grid: { color: chartDefaults.borderColor } },
        y: { ticks: { ...chartDefaults, callback: v => formatCurrency(v) }, grid: { color: chartDefaults.borderColor } }
      }
    }
  });
}

export function createBarChart(canvas, labels, data, label = 'Rentals') {
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label,
        data,
        backgroundColor: ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#60a5fa', '#f472b6', '#2dd4bf'],
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { ...chartDefaults }, grid: { display: false } },
        y: { ticks: { ...chartDefaults }, grid: { color: chartDefaults.borderColor } }
      }
    }
  });
}

export function createDoughnutChart(canvas, labels, data) {
  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#60a5fa', '#f472b6'],
        borderWidth: 0,
        spacing: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: { legend: { position: 'bottom', labels: { ...chartDefaults, padding: 16, usePointStyle: true, pointStyle: 'circle' } } }
    }
  });
}
