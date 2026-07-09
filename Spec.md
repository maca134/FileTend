# FileTend

A simple, self-hosted, dockerized web app for editing configs, docker-compose files, and other plain-text files — a file tree + Monaco editor, without the weight of a full IDE.

## Stack

- **Runtime:** Bun + TypeScript, single process
- **Backend framework:** Hono
- **Frontend:** React + Monaco Editor + shadcn/ui (Radix) + Tailwind
- **Bundling:** `Bun.build` (no separate bundler/build tool)
- **Serving:** Single Hono instance serves `/api/*` routes and the built static frontend — one container, one port

## Environment Variables

| Variable | Default | Notes |
|---|---|---|
| `ROOT_DIR` | *(required)* | Folder to browse/edit |
| `PORT` | `3000` | |
| `READ_ONLY` | `false` | If true, overrides all `ALLOW_*` flags below to off, server-side |
| `ALLOW_CREATE` | `true` | New files/folders |
| `ALLOW_DELETE` | `true` | |
| `ALLOW_RENAME` | `true` | |
| `ALLOW_UPLOAD` | `true` | |
| `ALLOW_DOWNLOAD` | `true` | |
| `MAX_FILE_SIZE` | `10485760` (10MB) | Cap for editable/uploadable file size |
| `ALLOWED_EXTENSIONS` | *(empty)* | Optional allow-list, comma-separated. Empty = unrestricted |
| `DENY_EXTENSIONS` | *(empty)* | Optional deny-list, comma-separated |
| `AUTH_PASSWORD` | *(empty)* | Single shared password. Empty = no password set |
| `AUTH_ENABLED` | auto | Defaults to `true` if `AUTH_PASSWORD` is set, else `false`. Can be explicitly overridden (e.g. set `false` to rely on Traefik forwardAuth instead) |
| `BUN_PUBLIC_TAB_PERSISTENCE` | `session` | Frontend-only, inlined at build time. Where unsaved-edit content for open tabs is kept in the browser: `local` (survives browser restarts), `session` (cleared on tab/browser close), or `none` (never written to storage) |

## API Routes

**Auth**
- `GET /api/auth/status` — `{ authEnabled, authed }`
- `POST /api/auth/login` — `{ password }` → sets signed session cookie
- `POST /api/auth/logout`

**Files**
- `GET /api/tree?path=` — list directory contents
- `GET /api/file?path=` — read file content
- `PUT /api/file?path=` — write file content (blocked if `READ_ONLY`)
- `POST /api/file` — `{ parentPath, name, type }` → create file/folder (blocked unless `ALLOW_CREATE`)
- `DELETE /api/file?path=` — delete file/folder (blocked unless `ALLOW_DELETE`)
- `POST /api/rename` — `{ path, name }`, renames within the same directory (blocked unless `ALLOW_RENAME`)

**Upload / Download**
- `POST /api/upload?path=<dir>` — multipart upload (blocked unless `ALLOW_UPLOAD`; respects `MAX_FILE_SIZE`, extension rules; rejects with `409` on a filename conflict)
- `GET /api/download?path=` — stream a single file, or a zipped archive if `path` is a directory (blocked unless `ALLOW_DOWNLOAD`)

## Security Notes (non-negotiable for v1)

- All path params must be resolved against `ROOT_DIR` and checked for containment (block `../` traversal, absolute paths, and symlink escapes via `realpath` comparison) before any filesystem call.
- Auth cookie: HMAC-signed, `httpOnly`, `sameSite=lax`.
- Every write-capable route (`PUT`, `POST /api/file`, `DELETE`, `/api/rename`, `/api/upload`) must check the relevant `ALLOW_*`/`READ_ONLY` flag server-side — not just hide the button in the UI.

## Frontend Notes

- File tree: lazy-load directory children on expand, don't walk the whole tree upfront.
- Editor: Monaco, language mode inferred from file extension.
- shadcn/ui components needed: dialog (rename/delete/new-file confirm), context-menu (file tree right-click), command (optional command palette), toast (save/error feedback).
- Upload: drag-and-drop onto tree + toolbar button.
- Download: context-menu item on files.

## Explicitly Out of Scope (v1)

- Multi-root / multiple mounted folders (single `ROOT_DIR` only)
- Git integration
- Real-time collaborative editing
- Extensions/plugins system
