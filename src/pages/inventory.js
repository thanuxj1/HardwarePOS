// ============================================
// TOOLFLOW — Inventory Management Page
// ============================================
import { icon } from '../components/icons.js';
import { openModal, closeModal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { getTools, addTool, updateTool, deleteTool, getToolCategories, getToolAvailableCount, getToolRentedCount, getToolStatus } from '../store.js';
import { generateId, formatCurrency } from '../utils/helpers.js';
import { t } from '../utils/i18n.js';
import { notifyToolAdded, notifyToolDeleted } from '../utils/notifications.js';

let viewMode = 'grid';
let filterCategory = 'All';
let filterStatus = 'All';
let searchQ = '';

export function renderInventory(container) {
  viewMode = 'grid'; filterCategory = 'All'; filterStatus = 'All'; searchQ = '';
  draw(container);
}

function draw(container) {
  const tools = getFilteredTools();
  const categories = ['All', ...getToolCategories()];
  const statuses = ['All', 'available', 'rented', 'maintenance', 'retired'];
  const allTools = getTools();
  const stats = {
    total: allTools.reduce((s, tl) => s + (tl.totalStock || 1), 0),
    available: allTools.reduce((s, tl) => s + getToolAvailableCount(tl.id), 0),
    rented: allTools.reduce((s, tl) => s + getToolRentedCount(tl.id), 0),
    maintenance: allTools.reduce((s, tl) => s + (tl.maintenanceUnits || 0), 0),
  };

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <p class="page-subtitle">${t('manageCatalog')}</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" id="btn-add-tool">${icon('plus', 18)} ${t('addTool')}</button>
      </div>
    </div>
    <div class="stat-cards stagger-children">
      ${statCard(t('totalStock'), stats.total, 'package', 'cyan')}
      ${statCard(t('available'), stats.available, 'check-circle', 'emerald')}
      ${statCard(t('rented'), stats.rented, 'clipboard-list', 'blue')}
      ${statCard(t('maintenance'), stats.maintenance, 'wrench', 'amber')}
    </div>
    <div class="inventory-header-controls" style="margin-bottom:var(--space-lg);display:flex;gap:12px;flex-wrap:wrap;align-items:center">
      <div class="pos-search-wrapper">${icon('search', 16)}<input type="text" class="pos-search" id="inv-search" placeholder="${t('search')}" value="${searchQ}"></div>
      <select class="form-select" id="inv-cat-filter" style="min-width:160px;padding:8px 12px;background:var(--bg-glass);border:1px solid var(--border-glass);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--font-sm)">
        ${categories.map(c => `<option value="${c}" ${c === filterCategory ? 'selected' : ''}>${c === 'All' ? `📦 ${t('allCategories')}` : c}</option>`).join('')}
      </select>
      <select class="form-select" id="inv-status-filter" style="min-width:150px;padding:8px 12px;background:var(--bg-glass);border:1px solid var(--border-glass);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--font-sm)">
        ${statuses.map(s => `<option value="${s}" ${s === filterStatus ? 'selected' : ''}>${s === 'All' ? `🔄 ${t('allStatus')}` : s === 'available' ? `✅ ${t('available')}` : s === 'rented' ? `📋 ${t('rented')}` : s === 'maintenance' ? `🔧 ${t('maintenance')}` : `🚫 ${s}`}</option>`).join('')}
      </select>
      <div class="view-toggle">
        <button class="${viewMode === 'grid' ? 'active' : ''}" data-view="grid">${icon('grid', 18)}</button>
        <button class="${viewMode === 'list' ? 'active' : ''}" data-view="list">${icon('list', 18)}</button>
      </div>
    </div>
    ${viewMode === 'grid' ? renderGridView(tools) : renderListView(tools)}`;

  bindEvents(container);
}

function statCard(label, value, iconName, color) {
  return `<div class="stat-card ${color} animate-fadeInUp">
    <div class="stat-card-content"><div class="stat-card-label">${label}</div><div class="stat-card-value">${value}</div></div>
    <div class="stat-card-icon ${color}">${icon(iconName, 22)}</div>
  </div>`;
}

function renderGridView(tools) {
  if (tools.length === 0) return `<div class="empty-state"><div class="empty-state-icon">${icon('package', 36)}</div><h3>${t('noResults')}</h3></div>`;
  return `<div class="inventory-grid stagger-children">
    ${tools.map(tool => {
      const avail = getToolAvailableCount(tool.id);
      const total = tool.totalStock || 1;
      const rented = getToolRentedCount(tool.id);
      const badgeClass = avail === 0 ? 'badge-overdue' : avail < total ? 'badge-rented' : 'badge-available';
      const badgeText = avail === 0 ? t('outOfStock') : avail === total ? t('available') : `${avail}/${total} ${t('available')}`;
      return `
      <div class="glass-card animate-fadeInUp" style="cursor:pointer" data-tool-id="${tool.id}">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px">
          <div style="font-size:2rem">${tool.emoji || '🔧'}</div>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>
        <h3 style="font-size:var(--font-base);font-weight:600;margin-bottom:4px">${tool.name}</h3>
        <p style="font-size:var(--font-xs);color:var(--text-muted);margin-bottom:4px">${tool.category} · ${tool.condition}</p>
        <p style="font-size:var(--font-xs);color:var(--text-muted);margin-bottom:12px">${total > 1 ? `${total} ${t('units')} · ${rented} ${t('rented')}` : t('available')}</p>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            ${tool.type === 'sale' 
              ? `<span style="font-size:var(--font-md);font-weight:700;color:var(--accent-violet)">${icon('tag', 12)} ${formatCurrency(tool.sellingPrice)}</span><br><span style="font-size:var(--font-xs);color:var(--text-muted);font-weight:400">For Sale</span>`
              : `<span style="font-size:var(--font-md);font-weight:700;color:var(--accent-cyan)">${formatCurrency(tool.dailyRate)}<span style="font-size:var(--font-xs);color:var(--text-muted);font-weight:400">${t('perDay')}</span></span>`
            }
          </div>
          <div class="row-actions">
            <button class="row-action-btn" data-edit="${tool.id}" title="${t('edit')}">${icon('edit', 16)}</button>
            <button class="row-action-btn danger" data-del="${tool.id}" title="${t('delete')}">${icon('trash', 16)}</button>
          </div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function renderListView(tools) {
  if (tools.length === 0) return `<div class="empty-state"><div class="empty-state-icon">${icon('package', 36)}</div><h3>${t('noResults')}</h3></div>`;
  return `<div class="data-table-wrapper">
    <table class="data-table"><thead><tr>
      <th>${t('toolName')}</th><th>${t('category')}</th><th>Price</th><th>${t('totalStock')}</th><th>${t('condition')}</th><th>${t('status')}</th><th>${t('serial')}</th><th>${t('actions')}</th>
    </tr></thead><tbody>
      ${tools.map(tool => {
        const avail = getToolAvailableCount(tool.id);
        const total = tool.totalStock || 1;
        const computedStatus = getToolStatus(tool.id);
        return `<tr>
        <td><div style="display:flex;align-items:center;gap:10px"><span style="font-size:1.2rem">${tool.emoji||'🔧'}</span><strong>${tool.name}</strong></div></td>
        <td>${tool.category}</td><td>${tool.type === 'sale' ? `<span style="color:var(--accent-violet)">${formatCurrency(tool.sellingPrice)} (Sale)</span>` : `${formatCurrency(tool.dailyRate)}/d`}</td>
        <td><span style="color:var(--accent-cyan);font-weight:600">${avail}</span><span style="color:var(--text-muted)"> / ${total}</span></td>
        <td>${tool.condition}</td>
        <td><span class="badge ${avail === 0 ? 'badge-overdue' : avail < total ? 'badge-rented' : 'badge-available'}">${computedStatus}</span></td>
        <td style="color:var(--text-muted)">${tool.serial}</td>
        <td><div class="row-actions">
          <button class="row-action-btn" data-edit="${tool.id}">${icon('edit', 16)}</button>
          <button class="row-action-btn danger" data-del="${tool.id}">${icon('trash', 16)}</button>
        </div></td>
      </tr>`;
      }).join('')}
    </tbody></table>
  </div>`;
}

function getFilteredTools() {
  let tools = getTools();
  if (filterCategory !== 'All') tools = tools.filter(tl => tl.category === filterCategory);
  if (filterStatus !== 'All') tools = tools.filter(tl => getToolStatus(tl.id) === filterStatus);
  if (searchQ) { const q = searchQ.toLowerCase(); tools = tools.filter(tl => tl.name.toLowerCase().includes(q) || tl.serial.toLowerCase().includes(q)); }
  return tools;
}

function openToolForm(tool, container) {
  const isEdit = !!tool;
  const cats = getToolCategories();
  const emojis = ['🔨','⚙️','🪚','🔧','💧','🏗️','💨','⛏️','🔲','⚡','📐','🪵','🌡️','🔥','🦺','🔫'];
  const body = `
    <div class="form-row"><div class="form-group"><label class="form-label">Tool Name *</label><input class="form-input" id="tf-name" value="${tool?.name||''}"></div>
    <div class="form-group"><label class="form-label">Category *</label><input class="form-input" id="tf-cat" list="cat-list" value="${tool?.category||''}"><datalist id="cat-list">${cats.map(c=>`<option value="${c}">`).join('')}</datalist></div></div>
    <div class="form-row" style="margin-top:12px"><div class="form-group"><label class="form-label">Item Type *</label><select class="form-select" id="tf-type"><option value="rental" ${tool?.type!=='sale'?'selected':''}>Rental Item</option><option value="sale" ${tool?.type==='sale'?'selected':''}>Sale Item</option></select></div></div>
    <div class="form-row" style="margin-top:12px">
      <div class="form-group" id="group-rate" style="${tool?.type==='sale'?'display:none':''}"><label class="form-label">Daily Rental Rate (LKR) *</label><input type="number" class="form-input" id="tf-rate" value="${tool?.dailyRate||''}"></div>
      <div class="form-group" id="group-sell" style="${tool?.type==='sale'?'':'display:none'}"><label class="form-label">Selling Price (LKR) *</label><input type="number" class="form-input" id="tf-sell" value="${tool?.sellingPrice||''}"></div>
    </div>
    <div class="form-row" style="margin-top:12px"><div class="form-group"><label class="form-label">Total Units in Stock</label><input type="number" min="1" max="999" class="form-input" id="tf-stock" value="${tool?.totalStock||1}"></div>
    <div class="form-group"><label class="form-label">Condition</label><select class="form-select" id="tf-cond"><option ${tool?.condition==='Excellent'?'selected':''}>Excellent</option><option ${tool?.condition==='Good'||!tool?.condition?'selected':''}>Good</option><option ${tool?.condition==='Fair'?'selected':''}>Fair</option><option ${tool?.condition==='Poor'?'selected':''}>Poor</option></select></div></div>
    <div class="form-row" style="margin-top:12px"><div class="form-group"><label class="form-label">Serial Number</label><input class="form-input" id="tf-serial" value="${tool?.serial||''}"></div>
    <div class="form-group"><label class="form-label">Barcode</label><input class="form-input" id="tf-barcode" value="${tool?.barcode||''}"></div></div>
    <div class="form-row" style="margin-top:12px"><div class="form-group"><label class="form-label">Emoji Icon</label><div style="display:flex;gap:6px;flex-wrap:wrap">${emojis.map(e=>`<button type="button" class="emoji-pick ${(tool?.emoji||'🔧')===e?'selected':''}" data-emoji="${e}">${e}</button>`).join('')}</div></div></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">Description</label><textarea class="form-textarea" id="tf-desc">${tool?.description||''}</textarea></div>`;

  openModal(isEdit ? 'Edit Tool' : 'Add New Tool', body, {
    confirmText: isEdit ? 'Save Changes' : 'Add Tool',
    onConfirm: () => {
      const name = document.getElementById('tf-name').value.trim();
      const cat = document.getElementById('tf-cat').value.trim();
      const type = document.getElementById('tf-type').value;
      const rate = type === 'rental' ? parseFloat(document.getElementById('tf-rate').value) : null;
      const sellPrice = type === 'sale' ? parseFloat(document.getElementById('tf-sell').value) : null;
      
      if (!name || !cat) { showToast('Fill in required fields', 'error'); return; }
      if (type === 'rental' && !rate) { showToast('Daily Rate is required for rentals', 'error'); return; }
      if (type === 'sale' && !sellPrice) { showToast('Selling Price is required for sales', 'error'); return; }
      
      const data = { name, category: cat, type, dailyRate: rate,
        sellingPrice: sellPrice,
        totalStock: Math.max(1, parseInt(document.getElementById('tf-stock').value) || 1),
        serial: document.getElementById('tf-serial').value.trim(),
        barcode: document.getElementById('tf-barcode').value.trim() || tool?.barcode || '',
        condition: document.getElementById('tf-cond').value,
        emoji: document.querySelector('.emoji-pick.selected')?.dataset.emoji || tool?.emoji || '🔧',
        description: document.getElementById('tf-desc').value.trim() };
      if (isEdit) { updateTool(tool.id, data); showToast('Tool updated', 'success'); }
      else { addTool({ id: generateId(), maintenanceUnits: 0, ...data }); notifyToolAdded(data.name); showToast('Tool added', 'success'); }
      closeModal(); draw(container);
    }
  });

  setTimeout(() => {
    document.querySelectorAll('.emoji-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.emoji-pick').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
    document.getElementById('tf-type').addEventListener('change', (e) => {
      const type = e.target.value;
      document.getElementById('group-rate').style.display = type === 'rental' ? 'block' : 'none';
      document.getElementById('group-sell').style.display = type === 'sale' ? 'block' : 'none';
    });
  }, 50);
}

function bindEvents(container) {
  document.getElementById('btn-add-tool')?.addEventListener('click', () => openToolForm(null, container));
  document.getElementById('inv-search')?.addEventListener('input', e => { searchQ = e.target.value; draw(container); });
  document.getElementById('inv-cat-filter')?.addEventListener('change', e => { filterCategory = e.target.value; draw(container); });
  document.getElementById('inv-status-filter')?.addEventListener('change', e => { filterStatus = e.target.value; draw(container); });
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { viewMode = b.dataset.view; draw(container); }));
  document.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); openToolForm(getTools().find(tl=>tl.id===b.dataset.edit), container); }));
  document.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation();
    confirmDialog('Delete Tool', 'Are you sure? This cannot be undone.', () => {
      const tool = getTools().find(tl => tl.id === b.dataset.del);
      const result = deleteTool(b.dataset.del);
      if (result?.error) { showToast(result.error, 'error'); return; }
      notifyToolDeleted(tool?.name || 'Tool');
      closeModal(); draw(container); showToast('Tool deleted', 'info');
    });
  }));
}
