# API URL for production

1. Edit **`extension/shared/api-config.js`** — set `API_BASE_URL` to your deployed API (e.g. `https://sizefitai.onrender.com`).

2. Edit **`extension/manifest.json`** → **`host_permissions`** — Chrome only allows `fetch()` to origins listed here. Add a line for your API host, for example:
   - `"https://your-api.onrender.com/*"`
   - `"https://api.yourdomain.com/*"`

3. Reload the extension in `chrome://extensions/`.

`localhost` and `*.onrender.com` are already included for local dev and typical Render URLs.
