import { createTableStore } from './supabase-client.js';
import { createId } from './id.js';

export const MATERIAL_CATEGORIES = [
  ['clothing', '衣物'],
  ['decoration', '装饰摆件'],
  ['copywriting', '文案'],
  ['other', '其他'],
];

export const MATERIAL_STATUS = [
  ['pending', '未完成'],
  ['in_progress', '进行中'],
  ['done', '完成'],
];

const categorySet = new Set(MATERIAL_CATEGORIES.map(([value]) => value));
const statusSet = new Set(MATERIAL_STATUS.map(([value]) => value));

function text(value, maxLength) {
  const result = String(value ?? '').trim();
  if (result.length > maxLength) throw new Error(`内容不能超过${maxLength}个字`);
  return result;
}

export function createMaterialsStore(onChange) {
  const store = createTableStore({
    table: 'materials',
    order: [['category', true], ['created_at', true], ['id', true]],
    onChange,
  });

  return {
    get rows() {
      return store.rows;
    },
    refresh: store.refresh,
    async add(category) {
      if (!categorySet.has(category)) throw new Error('物料分类不正确');
      await store.insert({ id: createId(), category, name: '', remark: '', status: 'pending' });
    },
    async update(id, changes) {
      const payload = {};
      if ('name' in changes) payload.name = text(changes.name, 160);
      if ('remark' in changes) payload.remark = text(changes.remark, 240);
      if ('status' in changes) {
        if (!statusSet.has(changes.status)) throw new Error('物料状态不正确');
        payload.status = changes.status;
      }
      if (Object.keys(payload).length) await store.update(id, payload);
    },
    remove: store.remove,
    destroy: store.destroy,
  };
}
