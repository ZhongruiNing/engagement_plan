import { supabaseClient as client, friendlyError as sharedFriendlyError, fetchAllRows } from './supabase-client.js';
import { validateGuestName } from './guest-validation.js';
import { createId } from './id.js';
export const friendlyError = sharedFriendlyError;
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
        const next = await fetchAllRows('guests', [['created_at', true], ['id', true]]);
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
