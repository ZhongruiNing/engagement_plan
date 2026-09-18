import { friendlyError, supabaseClient } from './supabase-client.js';

export const HOST_SCRIPT_ID = '00000000-0000-0000-0000-000000000001';

export function createHostScriptStore(onChange) {
  let content = '';
  let updatedAt = null;
  let alive = true;
  let reading = false;
  let dirty = false;
  let available = false;
  let error = '';
  let realtime = false;

  const emit = () => {
    if (alive) onChange({ content, updatedAt, available, error, realtime });
  };

  async function refresh() {
    dirty = true;
    if (reading || !alive) return;
    reading = true;
    try {
      while (dirty && alive) {
        dirty = false;
        const result = await supabaseClient.from('host_script').select('id,content,updated_at').eq('id', HOST_SCRIPT_ID).maybeSingle();
        if (result.error) throw result.error;
        content = result.data?.content || '';
        updatedAt = result.data?.updated_at || null;
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
    .channel(`host-script-${HOST_SCRIPT_ID}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'host_script' }, payload => {
      if (!payload.new?.id || payload.new.id === HOST_SCRIPT_ID || payload.eventType === 'DELETE') refresh();
    })
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
    get content() {
      return content;
    },
    refresh,
    async save(nextContent) {
      const value = String(nextContent ?? '');
      if (value.length > 100000) throw new Error('主持词不能超过100000个字符');
      const result = await supabaseClient.from('host_script').upsert(
        { id: HOST_SCRIPT_ID, content: value },
        { onConflict: 'id' },
      );
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
