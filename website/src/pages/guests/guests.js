import template from './guests.html?raw';
import './guests.css';
import { createGuestStore } from '../../js/guest-store.js';
import { validateGuestName } from '../../js/guest-validation.js';
import { createId } from '../../js/id.js';
export function renderGuests(container) {
  container.innerHTML = template;
  let disposed = false, pendingGuest = null, deleting = false, latestRows = [], loaded = false;
  const cards = [...container.querySelectorAll('.guest-card')];
  const dialog = container.querySelector('dialog');
  const feedback = container.querySelector('#guest-feedback');
  const confirm = container.querySelector('#confirm-delete');
  const cancel = container.querySelector('#cancel-delete');
  const store = createGuestStore(state => {
    if (disposed) return;
    latestRows = state.rows;
    if (state.available) loaded = true;
    container.querySelector('#total-count').textContent = loaded ? state.rows.length : '—';
    container.querySelector('#connection').textContent = state.error || (state.available ? state.realtime ? '共享名单已连接 · 实时同步' : '共享名单已连接 · 每10秒更新' : '正在连接共享名单…');
    container.querySelector('.connection-bar').classList.toggle('is-error', !!state.error);
    container.querySelector('#retry').hidden = !state.error;
    cards.forEach(card => {
      const sideRows = state.rows.filter(g => g.side === card.dataset.side);
      card.querySelector('.side-count').textContent = loaded ? `${sideRows.length} 位` : '— 位';
      card.querySelector('.add-guest').disabled = !state.available;
      const empty = card.querySelector('.empty-list');
      empty.hidden = sideRows.length > 0;
      empty.textContent = state.error ? '名单暂时不可用，恢复连接后再试' : loaded ? '静候亲友赴约，添加第一位宾客吧' : '正在读取名单…';
      const list = card.querySelector('ul');
      const existing = new Map([...list.children].map(row => [row.dataset.id, row]));
      sideRows.forEach(guest => {
        let row = existing.get(guest.id);
        if (!row) {
          row = document.createElement('li'); row.className = 'guest-row'; row.dataset.id = guest.id;
          row.innerHTML = '<span class="guest-bullet" aria-hidden="true"></span><span class="guest-name"></span><button class="remove-guest" type="button"><span aria-hidden="true">−</span></button>';
          row.querySelector('button').addEventListener('click', () => {
            pendingGuest = latestRows.find(g => g.id === row.dataset.id);
            if (!pendingGuest) return;
            container.querySelector('#delete-description').textContent = `“${pendingGuest.name}”将从共享名单中移除，其他人也会看到这一变更。`;
            container.querySelector('.delete-error').textContent = '';
            dialog.showModal(); cancel.focus();
          });
        }
        row.querySelector('.guest-name').textContent = guest.name;
        row.querySelector('button').setAttribute('aria-label', `移除${guest.name}`);
        row.querySelector('button').disabled = !state.available;
        // Preserve focused controls on periodic refreshes; move only if ordering changed.
        const position = sideRows.indexOf(guest);
        if (list.children[position] !== row) list.insertBefore(row, list.children[position] || null);
        existing.delete(guest.id);
      });
      existing.forEach(row => row.remove());
    });
  });
  container.querySelector('#retry').addEventListener('click', () => store.refresh());
  cards.forEach(card => card.querySelector('.add-guest').addEventListener('click', () => {
    const drafts = card.querySelector('.drafts');
    if (drafts.firstElementChild) { drafts.querySelector('input').focus(); return; }
    const form = document.createElement('form'); form.className = 'guest-draft';
    form.innerHTML = '<div class="draft-line"><span class="guest-bullet" aria-hidden="true"></span><input type="text" autocomplete="off" maxlength="80" placeholder="输入宾客姓名" /><button class="text-button save-guest" type="submit">保存</button><button class="text-button cancel-draft" type="button" aria-label="取消添加">×</button></div><p class="draft-error" role="alert"></p>';
    const input = form.querySelector('input'); input.setAttribute('aria-label', `${card.dataset.side === 'groom' ? '男' : '女'}方宾客姓名`);
    const message = form.querySelector('.draft-error');
    let saving = false, draftId = createId(), lastName = null;
    form.querySelector('.cancel-draft').addEventListener('click', () => { if (!saving) { form.remove(); card.querySelector('.add-guest').focus(); } });
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.isComposing || e.keyCode === 229)) e.preventDefault(); });
    form.addEventListener('submit', async e => {
      e.preventDefault(); if (saving) return;
      let name;
      try { name = validateGuestName(input.value); } catch (error) { message.textContent = error.message; input.focus(); return; }
      if (lastName !== null && lastName !== name) draftId = createId();
      lastName = name; saving = true; message.textContent = '';
      const controls = [...form.querySelectorAll('input,button')]; controls.forEach(c => c.disabled = true);
      form.querySelector('.save-guest').textContent = '保存中';
      try {
        await store.add({ id: draftId, name, side: card.dataset.side });
        if (disposed) return;
        form.remove(); feedback.textContent = `已保存 ${name}`; card.querySelector('.add-guest').focus();
      } catch (error) { if (!disposed) { message.textContent = error.message; controls.forEach(c => c.disabled = false); input.focus(); } }
      finally { saving = false; form.querySelector('.save-guest').textContent = '保存'; }
    });
    drafts.append(form); input.focus();
  }));
  cancel.addEventListener('click', () => { if (!deleting) dialog.close(); });
  dialog.addEventListener('cancel', e => { if (deleting) e.preventDefault(); });
  confirm.addEventListener('click', async () => {
    if (!pendingGuest || deleting) return;
    deleting = true; confirm.disabled = true; cancel.disabled = true;
    try { await store.remove(pendingGuest.id); if (!disposed) { feedback.textContent = `已移除 ${pendingGuest.name}`; dialog.close(); } }
    catch (error) { if (!disposed) container.querySelector('.delete-error').textContent = error.message; }
    finally { deleting = false; confirm.disabled = false; cancel.disabled = false; }
  });
  return () => { disposed = true; dialog.close(); store.destroy(); };
}
