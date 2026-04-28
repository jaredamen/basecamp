# Basecamp Chrome Extension

Phase 1 thin-redirect extension. Click the toolbar button (or right-click → "Basecamp this") on any webpage to open Basecamp with that URL pre-filled and generation auto-started.

## Load locally for testing

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select this `extension/` directory
4. Pin the extension to the toolbar
5. Visit any article (e.g. https://en.wikipedia.org/wiki/Stoicism), click the Basecamp icon

## Local dev against `localhost:5173`

The extension hits `https://basecamp-pink.vercel.app` by default. To point it at a local dev server, open the extension's service-worker console (`chrome://extensions` → "Service worker") and run:

```js
chrome.storage.local.set({ baseUrl: 'http://localhost:5173' })
```

Reset to default with:

```js
chrome.storage.local.remove('baseUrl')
```

## Before publishing to the Chrome Web Store

- [ ] Add icon files at `icons/icon-{16,32,48,128}.png` and re-add the `"icons"` block to `manifest.json`
- [ ] Bump version in `manifest.json`
- [ ] Record store-listing screenshots + the Pause-and-Quiz hero clip
- [ ] Privacy disclosures: declare what `activeTab` + `scripting` are used for
- [ ] Test on a fresh Chrome profile (no logged-in Google accounts) to verify the auth-required path works end-to-end
