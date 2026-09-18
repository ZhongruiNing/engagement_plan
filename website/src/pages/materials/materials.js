import template from './materials.html?raw';
import './materials.css';
import { setupDeleteDialog } from '../../components/delete-dialog/delete-dialog.js';
import { createMaterialsStore, MATERIAL_CATEGORIES, MATERIAL_STATUS } from '../../js/materials-store.js';

function setStatusClass(select) {
  select.className = `status-select status-${select.value}`;
}

export function renderMaterials(container) {
  container.innerHTML = template;
  let disposed = false;
  const cards = [...container.querySelectorAll('.material-card')];
  const feedback = container.querySelector('#materials-feedback');
  const drafts = new Map();
  const timers = new Map();
  const statusLabels = new Map(MATERIAL_STATUS);
  const categoryLabels = new Map(MATERIAL_CATEGORIES);

  function getDraft(id) {
    if (!drafts.has(id)) drafts.set(id, { values: {}, pending: new Set(), error: '' });
    return drafts.get(id);
  }

  function scheduleSave(id, field, input) {
    const key = `${id}:${field}`;
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(async () => {
      const draft = drafts.get(id);
      if (!draft || !draft.pending.has(field)) return;
      try {
        await store.update(id, { [field]: draft.values[field] });
        draft.pending.delete(field);
        draft.error = '';
        if (!draft.pending.size && !draft.values.status) drafts.delete(id);
      } catch (cause) {
        draft.error = cause.message;
        input.setAttribute('aria-invalid', 'true');
      }
    }, 700));
  }

  function bindRow(row, item) {
    const name = row.querySelector('.material-name');
    const remark = row.querySelector('.material-remark');
    const status = row.querySelector('.material-status');
    const remove = row.querySelector('.row-action');
    [name, remark].forEach(input => {
      const field = input === name ? 'name' : 'remark';
      input.addEventListener('input', () => {
        const draft = getDraft(item.id);
        draft.values[field] = input.value;
        draft.pending.add(field);
        draft.error = '';
        input.removeAttribute('aria-invalid');
        scheduleSave(item.id, field, input);
      });
    });
    status.addEventListener('change', async () => {
      status.disabled = true;
      try {
        await store.update(item.id, { status: status.value });
        feedback.textContent = '已保存物料状态';
      } catch (cause) {
        feedback.textContent = cause.message;
        status.value = item.status;
        setStatusClass(status);
      } finally {
        status.disabled = false;
      }
    });
    remove.addEventListener('click', () => deleteDialog.open({ id: item.id, label: item.name || '未命名物料' }));
  }

  function renderState(state) {
    if (disposed) return;
    const total = state.rows.length;
    container.querySelector('#materials-summary').textContent = state.available ? `${total} 项物料` : '— 项';
    container.querySelector('#materials-connection').textContent = state.error || (state.available
      ? state.realtime ? '共享物料已连接 · 实时同步' : '共享物料已连接 · 每10秒更新'
      : '正在连接共享物料…');
    container.querySelector('.workspace-status').classList.toggle('is-error', !!state.error);
    container.querySelector('#materials-retry').hidden = !state.error;
    cards.forEach(card => {
      const category = card.dataset.category;
      const rows = state.rows.filter(item => item.category === category);
      const tbody = card.querySelector('tbody');
      const existing = new Map([...tbody.children].map(row => [row.dataset.id, row]));
      card.querySelector('.add-row-button').disabled = !state.available;
      rows.forEach((item, index) => {
        let row = existing.get(item.id);
        if (!row) {
          row = document.createElement('tr');
          row.className = 'material-row';
          row.dataset.id = item.id;
          row.innerHTML = '<td class="row-number"></td><td><input class="material-name" type="text" maxlength="160" placeholder="输入物品名称" aria-label="物品名称"><span class="row-save-state" aria-live="polite"></span></td><td><input class="material-remark" type="text" maxlength="240" placeholder="可填写备注" aria-label="备注"></td><td><select class="material-status" aria-label="物料完成状态"></select></td><td class="action-cell"><button class="row-action" type="button" aria-label="移除物料"><span aria-hidden="true">−</span></button></td>';
          const select = row.querySelector('.material-status');
          MATERIAL_STATUS.forEach(([value, label]) => select.add(new Option(label, value)));
          bindRow(row, item);
        }
        const draft = drafts.get(item.id);
        const name = row.querySelector('.material-name');
        const remark = row.querySelector('.material-remark');
        if (document.activeElement !== name && !draft?.pending.has('name')) name.value = item.name || '';
        if (document.activeElement !== remark && !draft?.pending.has('remark')) remark.value = item.remark || '';
        if (draft?.pending.has('name')) name.value = draft.values.name;
        if (draft?.pending.has('remark')) remark.value = draft.values.remark;
        const status = row.querySelector('.material-status');
        status.value = item.status || 'pending';
        setStatusClass(status);
        row.querySelector('.row-number').textContent = String(index + 1);
        row.querySelector('.row-save-state').textContent = draft?.error || (draft?.pending.size ? '保存中…' : '');
        row.querySelector('.row-action').disabled = !state.available;
        if (tbody.children[index] !== row) tbody.insertBefore(row, tbody.children[index] || null);
        existing.delete(item.id);
      });
      existing.forEach(row => row.remove());
    });
  }

  const store = createMaterialsStore(renderState);
  const deleteDialog = setupDeleteDialog(container, async id => {
    await store.remove(id);
    drafts.delete(id);
    feedback.textContent = '已移除物料';
  });
  cards.forEach(card => card.querySelector('.add-row-button').addEventListener('click', async () => {
    const button = card.querySelector('.add-row-button');
    button.disabled = true;
    try {
      await store.add(card.dataset.category);
      feedback.textContent = `已在“${categoryLabels.get(card.dataset.category)}”添加一行`;
    } catch (cause) {
      feedback.textContent = cause.message;
    } finally {
      button.disabled = false;
    }
  }));
  container.querySelector('#materials-retry').addEventListener('click', () => store.refresh());

  return () => {
    disposed = true;
    timers.forEach(timer => clearTimeout(timer));
    deleteDialog.destroy();
    store.destroy();
  };
}
