import { createClient } from '@supabase/supabase-js';
import { backendConfig } from './config.js';
import { validateGuestName } from './guest-validation.js';
import { createId } from './id.js';
const client = createClient(backendConfig.url, backendConfig.publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: (url, options = {}) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
  } },
});
export function friendlyError(error) {
  if (error.code === 'PGRST205' || error.code === '42P01') return '共享名单尚未启用，请联系筹备人完成设置';
  if (error.code === '42501' || error.status === 401 || error.status === 403) return '暂时没有名单访问权限，请联系筹备人';
  return '暂时无法连接共享名单，请检查网络后重试';
}
export function createGuestStore(onChange) {
  let rows = [], alive = true, reading = false, dirty = false, available = false, error = '', realtime = false;
  const emit = () => { if (alive) onChange({ rows, available, error, realtime }); };
  async function refresh() {
    dirty = true;
    if (reading || !alive) return;
    reading = true;
    try {
      while (dirty && alive) {
        dirty = false;
        // Read pages so a long guest list is not silently truncated by the API row cap.
        let next = [], offset = 0;
        for (;;) {
          const result = await client.from('guests').select('*').order('created_at').order('id').range(offset, offset + 499);
          if (result.error) throw result.error;
          next.push(...result.data);
          if (result.data.length < 500) break;
          offset += 500;
        }
        rows = [...new Map(next.map(row => [row.id, row])).values()]; available = true; error = ''; emit();
      }
    } catch (cause) { error = friendlyError(cause); available = false; emit(); }
    finally { reading = false; }
  }
  const channel = client.channel(`guests-${createId()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'guests' }, refresh)
    .subscribe(status => {
      realtime = status === 'SUBSCRIBED'; emit();
      if (realtime) refresh();
    });
  const timer = setInterval(() => { if (!document.hidden) refresh(); }, 10000);
  const wake = () => { if (!document.hidden) refresh(); };
  window.addEventListener('online', wake); document.addEventListener('visibilitychange', wake);
  refresh();
  return {
    refresh,
    async add({ id, name, side }) {
      name = validateGuestName(name);
      if (!['groom', 'bride'].includes(side)) throw new Error('请选择宾客归属');
      const { error: cause } = await client.from('guests').insert({ id, name, side });
      if (cause && cause.code !== '23505') throw new Error(friendlyError(cause));
      // A duplicate ID is possible when retrying a write whose response was lost.
      if (cause?.code === '23505') {
        const result = await client.from('guests').select('name,side').eq('id', id).single();
        if (result.error || result.data.name !== name || result.data.side !== side) throw new Error('这次保存状态不确定，请刷新核对后再试');
      }
      await refresh();
    },
    async remove(id) {
      const { error: cause } = await client.from('guests').delete().eq('id', id);
      if (cause) throw new Error(friendlyError(cause));
      await refresh();
    },
    destroy() { alive = false; clearInterval(timer); window.removeEventListener('online', wake); document.removeEventListener('visibilitychange', wake); client.removeChannel(channel); },
  };
}
