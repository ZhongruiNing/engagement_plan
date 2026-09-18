import { marked } from 'marked';
import DOMPurify from 'dompurify';
import template from './host-script.html?raw';
import './host-script.css';
import { createHostScriptStore } from '../../js/host-script-store.js';

marked.setOptions({ gfm: true, breaks: true, html: false });

function renderMarkdown(source) {
  if (!source.trim()) return '';
  const html = marked.parse(source, { gfm: true, breaks: true, html: false });
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

export function renderHostScript(container) {
  container.innerHTML = template;
  let disposed = false;
  let localContent = '';
  let lastSavedContent = '';
  let saveTimer = null;
  let saving = false;
  let remoteChangedWhileEditing = false;
  const editor = container.querySelector('#host-script-editor');
  const preview = container.querySelector('#host-script-preview');
  const saveState = container.querySelector('#script-save-state');
  const feedback = container.querySelector('#script-feedback');

  function resizeEditor() {
    editor.style.height = 'auto';
    editor.style.height = `${Math.max(280, editor.scrollHeight)}px`;
  }

  function updatePreview() {
    const rendered = renderMarkdown(editor.value);
    preview.innerHTML = rendered || '<p class="script-empty-preview">在左侧编辑后，这里会显示主持词预览。</p>';
    resizeEditor();
  }

  async function save() {
    if (disposed || !editor.value.trim() && editor.value !== '') return;
    const value = editor.value;
    if (value === lastSavedContent || saving) return;
    saving = true;
    saveState.textContent = '保存中…';
    try {
      await store.save(value);
      lastSavedContent = value;
      localContent = value;
      remoteChangedWhileEditing = false;
      if (!disposed) {
        saveState.textContent = '已保存';
        feedback.textContent = '';
      }
    } catch (cause) {
      if (!disposed) {
        saveState.textContent = '保存失败';
        feedback.textContent = cause.message;
      }
    } finally {
      saving = false;
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveState.textContent = '等待保存…';
    saveTimer = setTimeout(save, 800);
  }

  function applyRemote(content) {
    if (editor.value !== lastSavedContent && editor.value !== content) {
      remoteChangedWhileEditing = true;
      saveState.textContent = '其他人有新的修改，停止编辑后将以当前内容保存';
      return;
    }
    localContent = content;
    lastSavedContent = content;
    editor.value = content;
    updatePreview();
  }

  function renderState(state) {
    if (disposed) return;
    container.querySelector('#script-connection').textContent = state.error || (state.available
      ? state.realtime ? '共享主持词已连接 · 实时同步' : '共享主持词已连接 · 每10秒更新'
      : '正在连接共享主持词…');
    container.querySelector('.workspace-status').classList.toggle('is-error', !!state.error);
    container.querySelector('#script-retry').hidden = !state.error;
    if (state.error) {
      saveState.textContent = '暂时无法保存';
      return;
    }
    applyRemote(state.content || '');
    if (!state.available) editor.disabled = true;
    else editor.disabled = false;
  }

  const store = createHostScriptStore(renderState);
  editor.addEventListener('input', () => {
    localContent = editor.value;
    remoteChangedWhileEditing = false;
    updatePreview();
    scheduleSave();
  });
  editor.addEventListener('blur', () => {
    if (remoteChangedWhileEditing) feedback.textContent = '检测到其他人的更新；当前编辑内容将在自动保存时覆盖它。';
  });
  container.querySelector('#script-retry').addEventListener('click', () => store.refresh());
  updatePreview();

  return () => {
    disposed = true;
    clearTimeout(saveTimer);
    store.destroy();
  };
}
