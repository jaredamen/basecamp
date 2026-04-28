// Basecamp browser extension — service worker
//
// Two entry points:
//   1. Toolbar action click → captures active tab URL → opens Basecamp with it
//   2. Right-click context menu on selected text → captures the selection →
//      opens Basecamp with the selection as the source content
//
// The web app reads ?source=ext&url=...&selection=... from the URL and
// auto-submits the generation flow.

const DEFAULT_BASE_URL = 'https://basecamp-pink.vercel.app';

async function resolveBaseUrl() {
  const { baseUrl } = await chrome.storage.local.get('baseUrl');
  return baseUrl || DEFAULT_BASE_URL;
}

function buildOpenUrl(baseUrl, { url, selection }) {
  const target = new URL(baseUrl);
  target.searchParams.set('source', 'ext');
  if (url) target.searchParams.set('url', url);
  if (selection) target.searchParams.set('selection', selection);
  return target.toString();
}

async function openInBasecamp(params) {
  const baseUrl = await resolveBaseUrl();
  const openUrl = buildOpenUrl(baseUrl, params);
  await chrome.tabs.create({ url: openUrl });
}

// 1. Toolbar click — Basecamp the current tab's URL
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.url || !/^https?:/i.test(tab.url)) {
    // Don't try to send chrome:// pages, file:// pages, etc.
    return;
  }
  await openInBasecamp({ url: tab.url });
});

// 2. Context menu setup on install/update
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'basecamp-selection',
    title: 'Basecamp this selection',
    contexts: ['selection'],
  });
  chrome.contextMenus.create({
    id: 'basecamp-page',
    title: 'Basecamp this page',
    contexts: ['page'],
  });
});

// 3. Context menu click handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'basecamp-selection' && info.selectionText) {
    await openInBasecamp({
      url: tab?.url,
      selection: info.selectionText.slice(0, 8000),
    });
    return;
  }
  if (info.menuItemId === 'basecamp-page' && tab?.url) {
    await openInBasecamp({ url: tab.url });
  }
});
