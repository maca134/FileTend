# FileTend

A simple, self-hosted, dockerized web app for editing configs, docker-compose files, and other plain-text files — a file tree + Monaco editor, without the weight of a full IDE.

Single container, single port, no database. Point it at a folder and go.

## Features

- File tree with lazy-loaded directories, [seti-ui](https://github.com/jesseweed/seti-ui) file icons
- Monaco editor (VS Code's editor) with language mode inferred from file extension
- Create, rename, delete, upload, download (zipped for folders)
- Properties dialog: view size/timestamps, and edit permissions (chmod) and owner/group (chown)
- Optional single-password auth with a signed session cookie
- Every write action is individually toggleable (or shut off entirely with `READ_ONLY`) — enforced server-side, not just hidden in the UI

## Quick start (Docker Compose)

```yaml
services:
    filetend:
        image: ghcr.io/maca134/filetend:latest
        container_name: filetend
		restart: unless-stopped
        ports:
            - "3000:3000"
        volumes:
            - /path/to/your/folder:/srv
```

Point `volumes:` at the folder you want to browse/edit — it's mounted into the container at `/srv`. No `.env` is needed for this: the container already runs as the baked-in `bun` user (uid 1000), and auth is off by default.

To customize — match `PUID`/`PGID` to the host folder's owner (run `id -u` / `id -g` on the host), require a login with `AUTH_PASSWORD`, or change any other setting — copy [`.env.example`](.env.example) to `.env`, add `env_file: .env` to the service above, and (if overriding `PUID`/`PGID`) add `user: "${PUID:-1000}:${PGID:-1000}"`.

Then:

```bash
docker compose up -d
```

Open `http://localhost:3000`.

## Configuration

All variables below are read from the environment (`.env` when using Compose). See [`.env.example`](.env.example) for a ready-to-copy template.

| Variable | Default | Notes |
|---|---|---|
| `ROOT_DIR` | `/srv` | Folder to browse/edit |
| `PORT` | `3000` | |
| `READ_ONLY` | `false` | If true, overrides all `ALLOW_*` flags below to off, server-side |
| `ALLOW_CREATE` | `true` | New files/folders |
| `ALLOW_DELETE` | `true` | |
| `ALLOW_RENAME` | `true` | |
| `ALLOW_UPLOAD` | `true` | |
| `ALLOW_DOWNLOAD` | `true` | |
| `ALLOW_CHMOD` | `true` | Editing permissions from the Properties dialog |
| `ALLOW_CHOWN` | `false` | Editing owner/group from the Properties dialog. Off by default — usually requires the container to run as root. **No uid/gid restriction**: enabling this lets any authenticated user chown any file under `ROOT_DIR` to any uid/gid, including root |
| `MAX_FILE_SIZE` | `10MB` | Cap for editable/uploadable file size |
| `ALLOWED_EXTENSIONS` | *(empty)* | Optional allow-list, comma-separated. Empty = unrestricted |
| `DENY_EXTENSIONS` | *(empty)* | Optional deny-list, comma-separated |
| `AUTH_PASSWORD` | *(empty)* | Single shared password. Empty = no password set |
| `AUTH_ENABLED` | auto | Defaults to `true` if `AUTH_PASSWORD` is set, else `false`. Can be explicitly overridden (e.g. set `false` to rely on a reverse-proxy's auth instead) |
| `SECRET_KEY` | auto | Signs the session cookie. If unset, derived from `AUTH_PASSWORD` (stable across restarts). Falls back to a random per-process key if neither is set. Can be explicitly overridden |
| `PUID` / `PGID` | `1000` | Docker Compose only, not read by the app itself — the uid/gid the container runs as. Match these to the owner of the host folder mounted at `/srv` |
| `BUN_PUBLIC_TAB_PERSISTENCE` | `session` | Frontend-only, inlined at build time. Where unsaved editor changes are kept in the browser: `local`, `session`, or `none` |

## Development

Requires [Bun](https://bun.com).

```bash
bun install
bun dev          # dev server with HMR, at http://localhost:3000
bun test         # test suite
bun run lint     # eslint
bun run format   # prettier
```

`ROOT_DIR` defaults to `/srv`, which won't exist outside a container — set it in a local `.env` (copy `.env.example`) to point at a real folder for local development.

File icons (`src/frontend/lib/seti-icons.generated.ts`) are generated from the vendored [seti-ui](https://github.com/jesseweed/seti-ui) package. Re-run `bun run generate-icons` after a `seti-ui` upgrade.
