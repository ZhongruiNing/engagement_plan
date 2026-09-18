import { createClient } from '@supabase/supabase-js';
import { backendConfig } from './config.js';
import { createId } from './id.js';

const supabaseClient = createClient(backendConfig.url, backendConfig.publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: {
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
    },
  },
});

export { supabaseClient };

export function friendlyError(error) {
  if (error?.code === 'PGRST205' || error?.code === '42P01') {
    return '共享数据表尚未启用，请联系筹备人完成数据库设置';
  }
  if (error?.code === '42501' || error?.status === 401 || error?.status === 403) {
    return '暂时没有共享数据访问权限，请联系筹备人';
  }
  if (error?.code === '23514') return '提交内容不符合格式要求，请检查后再试';
  return '暂时无法连接共享数据，请检查网络后重试';
}

export async function fetchAllRows(table, order = []) {
  let query = supabaseClient.from(table).select('*');
  order.forEach(([column, ascending = true]) => {
    query = query.order(column, { ascending });
  });

  const rows = [];
  let offset = 0;
  for (;;) {
    const result = await query.range(offset, offset + 499);
    if (result.error) throw result.error;
    rows.push(...(result.data || []));
    if ((result.data || []).length < 500) break;
    offset += 500;
  }
  return rows;
}

export function createTableStore({ table, order = [], onChange }) {
  let rows = [];
  let alive = true;
  let reading = false;
  let dirty = false;
  let available = false;
  let error = '';
  let realtime = false;

  const emit = () => {
    if (alive) onChange({ rows, available, error, realtime });
  };

  async function refresh() {
    dirty = true;
    if (reading || !alive) return;
    reading = true;
    try {
      while (dirty && alive) {
        dirty = false;
        rows = await fetchAllRows(table, order);
        available = true;
        error = '';
        emit();
      }
    } catch (cause) {
      error = friendlyError(cause);
      available = false;
      emit();
    } finally {
      reading = false;
    }
  }

  const channel = supabaseClient
    .channel(`${table}-${createId()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, () => refresh())
    .subscribe(status => {
      realtime = status === 'SUBSCRIBED';
      emit();
      if (realtime) refresh();
    });

  const timer = setInterval(() => {
    if (!document.hidden) refresh();
  }, 10000);
  const wake = () => {
    if (!document.hidden) refresh();
  };
  window.addEventListener('online', wake);
  document.addEventListener('visibilitychange', wake);
  refresh();

  return {
    get rows() {
      return rows;
    },
    refresh,
    async insert(payload) {
      const result = await supabaseClient.from(table).insert(payload);
      if (result.error) throw new Error(friendlyError(result.error));
      await refresh();
    },
    async update(id, payload) {
      const result = await supabaseClient.from(table).update(payload).eq('id', id);
      if (result.error) throw new Error(friendlyError(result.error));
      await refresh();
    },
    async updateMany(payloads) {
      if (!payloads.length) return;
      const result = await supabaseClient.from(table).upsert(payloads, { onConflict: 'id' });
      if (result.error) throw new Error(friendlyError(result.error));
      await refresh();
    },
    async remove(id) {
      const result = await supabaseClient.from(table).delete().eq('id', id);
      if (result.error) throw new Error(friendlyError(result.error));
      await refresh();
    },
    destroy() {
      alive = false;
      clearInterval(timer);
      window.removeEventListener('online', wake);
      document.removeEventListener('visibilitychange', wake);
      supabaseClient.removeChannel(channel);
    },
  };
}
