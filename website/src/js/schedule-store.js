import { createTableStore } from './supabase-client.js';
import { createId } from './id.js';

function text(value, maxLength) {
  const result = String(value ?? '').trim();
  if (result.length > maxLength) throw new Error(`内容不能超过${maxLength}个字`);
  return result;
}

export function createScheduleStore(onChange) {
  const store = createTableStore({
    table: 'schedules',
    order: [['sort_order', true], ['created_at', true], ['id', true]],
    onChange,
  });

  return {
    get rows() {
      return store.rows;
    },
    refresh: store.refresh,
    async add() {
      const maxOrder = store.rows.reduce((max, row) => Math.max(max, Number(row.sort_order) || 0), 0);
      await store.insert({ id: createId(), time: '', content: '', remark: '', sort_order: maxOrder + 1 });
    },
    async update(id, changes) {
      const payload = {};
      if ('time' in changes) payload.time = text(changes.time, 20);
      if ('content' in changes) payload.content = text(changes.content, 200);
      if ('remark' in changes) payload.remark = text(changes.remark, 240);
      if (Object.keys(payload).length) await store.update(id, payload);
    },
    async reorder(ids) {
      const currentIds = new Set(store.rows.map(row => row.id));
      if (ids.length !== currentIds.size || ids.some(id => !currentIds.has(id))) {
        throw new Error('议程顺序已发生变化，请刷新后再试');
      }
      await store.updateMany(ids.map((id, index) => ({ id, sort_order: index + 1 })));
    },
    remove: store.remove,
    destroy: store.destroy,
  };
}
