export function setupDeleteDialog(root, onDelete) {
  const dialog = root.querySelector('[data-delete-dialog]');
  const description = dialog.querySelector('[data-delete-description]');
  const error = dialog.querySelector('[data-delete-error]');
  const confirm = dialog.querySelector('[data-confirm-delete]');
  const cancel = dialog.querySelector('[data-cancel-delete]');
  let pending = null;
  let deleting = false;

  function close() {
    if (!deleting) dialog.close();
  }

  async function confirmDelete() {
    if (!pending || deleting) return;
    deleting = true;
    confirm.disabled = true;
    cancel.disabled = true;
    error.textContent = '';
    try {
      await onDelete(pending.id);
      pending = null;
      dialog.close();
    } catch (cause) {
      error.textContent = cause.message || '删除失败，请稍后再试';
    } finally {
      deleting = false;
      confirm.disabled = false;
      cancel.disabled = false;
    }
  }

  cancel.addEventListener('click', close);
  confirm.addEventListener('click', confirmDelete);
  dialog.addEventListener('cancel', event => {
    if (deleting) event.preventDefault();
  });

  return {
    open(item) {
      pending = item;
      description.textContent = `“${item.label}”将从共享数据中移除，其他人也会看到这一变更。`;
      error.textContent = '';
      dialog.showModal();
      cancel.focus();
    },
    destroy() {
      dialog.close();
      pending = null;
    },
  };
}
