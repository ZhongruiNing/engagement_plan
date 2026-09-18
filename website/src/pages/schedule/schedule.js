import Sortable from 'sortablejs';
import template from './schedule.html?raw';
import './schedule.css';
import { setupDeleteDialog } from '../../components/delete-dialog/delete-dialog.js';
import { createScheduleStore } from '../../js/schedule-store.js';

export function renderSchedule(container) {
  container.innerHTML = template;
  let disposed = false;
  const tbody = container.querySelector('#schedule-rows');
  const feedback = container.querySelector('#schedule-feedback');
  const drafts = new Map();
  const timers = new Map();

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
        if (!draft.pending.size) drafts.delete(id);
      } catch (cause) {
        draft.error = cause.message;
        input.setAttribute('aria-invalid', 'true');
      }
    }, 700));
  }

  function bindRow(row, item) {
    row.querySelectorAll('[data-field]').forEach(input => {
      const field = input.dataset.field;
      input.addEventListener('input', () => {
        const draft = getDraft(item.id);
        draft.values[field] = input.value;
        draft.pending.add(field);
        draft.error = '';
        input.removeAttribute('aria-invalid');
        scheduleSave(item.id, field, input);
      });
    });
    row.querySelector('.row-action').addEventListener('click', () => deleteDialog.open({ id: item.id, label: item.content || '未命名议程' }));
  }

  function renderState(state) {
    if (disposed) return;
    container.querySelector('#schedule-summary').textContent = state.available ? `${state.rows.length} 项议程` : '— 项';
    container.querySelector('#schedule-connection').textContent = state.error || (state.available
      ? state.realtime ? '共享议程已连接 · 实时同步' : '共享议程已连接 · 每10秒更新'
      : '正在连接共享议程…');
    container.querySelector('.workspace-status').classList.toggle('is-error', !!state.error);
    container.querySelector('#schedule-retry').hidden = !state.error;
    container.querySelector('#add-schedule').disabled = !state.available;
    const existing = new Map([...tbody.children].map(row => [row.dataset.id, row]));
    state.rows.forEach((item, index) => {
      let row = existing.get(item.id);
      if (!row) {
        row = document.createElement('tr');
        row.className = 'schedule-row';
        row.dataset.id = item.id;
        row.innerHTML = '<td class="row-number"><button class="drag-handle" type="button" aria-label="拖动调整议程顺序">⠿</button><span></span></td><td><input class="schedule-time-input" data-field="time" type="time" aria-label="议程时间"></td><td><input data-field="content" type="text" maxlength="200" placeholder="输入议程内容" aria-label="议程内容"><span class="row-save-state" aria-live="polite"></span></td><td><input data-field="remark" type="text" maxlength="240" placeholder="可填写备注" aria-label="议程备注"></td><td class="action-cell"><button class="row-action" type="button" aria-label="移除议程"><span aria-hidden="true">−</span></button></td>';
        bindRow(row, item);
      }
      const draft = drafts.get(item.id);
      row.querySelector('.row-number span').textContent = String(index + 1);
      row.querySelectorAll('[data-field]').forEach(input => {
        const field = input.dataset.field;
        if (draft?.pending.has(field)) input.value = draft.values[field];
        else if (document.activeElement !== input) input.value = item[field] || '';
      });
      row.querySelector('.row-save-state').textContent = draft?.error || (draft?.pending.size ? '保存中…' : '');
      row.querySelector('.row-action').disabled = !state.available;
      if (tbody.children[index] !== row) tbody.insertBefore(row, tbody.children[index] || null);
      existing.delete(item.id);
    });
    existing.forEach(row => row.remove());
  }

  const store = createScheduleStore(renderState);
  const deleteDialog = setupDeleteDialog(container, async id => {
    await store.remove(id);
    drafts.delete(id);
    feedback.textContent = '已移除议程';
  });
  const sortable = new Sortable(tbody, {
    animation: 180,
    handle: '.drag-handle',
    ghostClass: 'schedule-row-ghost',
    chosenClass: 'schedule-row-chosen',
    onEnd: async event => {
      if (event.oldIndex === event.newIndex || !event.item) return;
      const ids = [...tbody.children].map(row => row.dataset.id);
      try {
        await store.reorder(ids);
        feedback.textContent = '议程顺序已保存';
      } catch (cause) {
        feedback.textContent = cause.message;
        await store.refresh();
      }
    },
  });
  container.querySelector('#add-schedule').addEventListener('click', async event => {
    event.currentTarget.disabled = true;
    try {
      await store.add();
      feedback.textContent = '已增加一项议程';
    } catch (cause) {
      feedback.textContent = cause.message;
    } finally {
      event.currentTarget.disabled = false;
    }
  });
  container.querySelector('#schedule-retry').addEventListener('click', () => store.refresh());

  return () => {
    disposed = true;
    timers.forEach(timer => clearTimeout(timer));
    sortable.destroy();
    deleteDialog.destroy();
    store.destroy();
  };
}
