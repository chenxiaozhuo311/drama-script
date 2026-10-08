import { renderDocument } from './document-renderer.js';

const documentName = '拆剧本0927.md';
const sourceUrl = `./${encodeURIComponent(documentName)}`;
const status = document.getElementById('document-status');
const refresh = document.getElementById('refresh-document');
const download = document.querySelector('.download');
let currentMarkdown = '';
let downloadUrl = '';
let updating = false;

function safeHtml(html) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const allowed = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'STRONG', 'EM', 'DEL', 'CODE', 'PRE', 'DETAILS', 'SUMMARY', 'DIV', 'A', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'HR', 'BR']);
  for (const node of parsed.body.querySelectorAll('*')) {
    if (!allowed.has(node.tagName)) { node.remove(); continue; }
    for (const attribute of [...node.attributes]) {
      const name = attribute.name.toLowerCase();
      if (!['id', 'class', 'href', 'title', 'start'].includes(name)) node.removeAttribute(attribute.name);
      if (name === 'href' && !/^(https?:|mailto:|#|\.?\.?\/)/i.test(attribute.value)) node.removeAttribute('href');
    }
  }
  return parsed.body.innerHTML;
}

function showMarkdown(markdown) {
  if (!markdown.trim() || !/^#\s/m.test(markdown)) throw new Error('Invalid document response');
  const rendered = renderDocument(markdown);
  document.getElementById('document').innerHTML = safeHtml(rendered.html);
  document.querySelector('.sidebar nav').innerHTML = safeHtml(rendered.navigation);
  currentMarkdown = markdown;
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
  download.href = downloadUrl;
  download.download = documentName;
}

async function loadMarkdown(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally { clearTimeout(timer); }
}

async function updateDocument() {
  if (updating) return;
  updating = true;
  refresh.disabled = true;
  status.textContent = '正在更新文档…';
  try {
    const markdown = await loadMarkdown(`${sourceUrl}?updated=${Date.now()}`);
    showMarkdown(markdown);
    status.textContent = '文档已更新';
  } catch {
    if (!currentMarkdown) {
      try { showMarkdown(await loadMarkdown(`./${encodeURIComponent(documentName)}`)); } catch { /* Keep the embedded document visible. */ }
    }
    status.textContent = '暂时无法获取新版本，显示已保存内容';
  } finally {
    updating = false;
    refresh.disabled = false;
  }
}

document.getElementById('expand-all').addEventListener('click', () => document.querySelectorAll('main details').forEach(detail => { detail.open = true; }));
document.getElementById('collapse-all').addEventListener('click', () => document.querySelectorAll('main details').forEach(detail => { detail.open = false; }));
refresh.addEventListener('click', updateDocument);
updateDocument();
