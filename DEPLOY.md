# Deploying SizeFit AI (e.g. Render)

## Backend

1. **Python** — Use 3.12+ (set in Render dashboard or add `runtime.txt` with `python-3.12.x`).

2. **Start command**

   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

3. **Environment variables** (Render → Environment)

   | Variable | Example |
   |----------|---------|
   | `DATABASE_URL` | `sqlite+aiosqlite:///./data/sizefitai.db` (use a persistent disk mount at `./data` if available) |
   | `OPENAI_API_KEY` | your key |
   | `OPENAI_MODEL` | `gpt-4o-mini` |
   | `CORS_ORIGINS` | `*` (current default; extension + any site) |
   | `DEMO_MODE` | `true` or `false` |

4. **SQLite on Render** — Ephemeral filesystem: DB resets on redeploy unless you attach a **disk** and point `DATABASE_URL` to a path on that disk.

5. **CORS** — With `CORS_ORIGINS=*`, the app uses `allow_origins=["*"]` and `allow_credentials=False` (required by browsers).

## Chrome extension (partner testing)

1. Set **`extension/shared/api-config.js`** → `API_BASE_URL` to your deployed API URL.
2. Add that host to **`extension/manifest.json`** → `host_permissions` if not already covered (e.g. custom domain).
3. Reload the extension in Chrome.

See **`extension/shared/API_URL.md`** for details.
