---
name: release
description: >
  Cuts a FileTend release: lint, format, typecheck, unit + e2e tests, commit
  any formatting fixes, then `bun run release` (version bump, tag, push).
  Use when the user says "release", "cut a release" or "/release".
argument-hint: "[patch | minor | major | prerelease]"
disable-model-invocation: true
---

Release type: $ARGUMENTS (default `patch`).

Any step that fails: **STOP**. Don't run later steps or work around the
failure. Report which step failed, the relevant output, and a proposed fix.
Don't apply the fix unless the user says so.

## 1. Preflight

- `git status --short` must be empty. If there are uncommitted changes, stop
  and ask: they are the user's work, not formatting fixes.
- Must be on `main`. `git fetch` and stop if `main` is behind `origin/main`.

## 2. Pick the release type

If the user named one, use it. Otherwise read
`git log $(git describe --tags --abbrev=0)..HEAD --oneline`:

- only `fix:`, `refactor:`, `test:`, `chore:`, docs → `patch`, don't ask;
- any `feat:`, a breaking change (`!:`, `BREAKING CHANGE`), a changed env
  var or default, or a removed/renamed API field → ask the user
  (AskUserQuestion) whether it should be `minor` (or `major`), with your pick
  first;
- no commits since the last tag → stop, there's nothing to release.

## 3. Checks, in this order

```
bun run lint          # eslint --fix: may rewrite code
bun run format        # prettier --write: runs after lint so the result is formatted
bunx tsc --noEmit
bun test
bun run test:e2e      # needs `bunx playwright install chromium` once per machine
```

ESLint errors it can't fix, type errors and test failures all mean stop.

## 4. Commit formatting changes

If `git status --short` shows changes, they came from step 3 (preflight was
clean). Review `git diff`; it should be formatting and lint autofixes only.
Anything else: stop and show it. Otherwise:

```
git add -A
git commit -m "style: lint and format"
```

## 5. Release

`scripts/release.ts` prompts for the release type and whether to push.
There's no TTY here, so pipe the answers in:

```
printf '<type>\ny\n' | bun run release
```

- `bun pm version` bumps `package.json` and creates the `v<version>` commit and
  tag; `y` pushes both. The tag triggers `.github/workflows/docker.yml`
  (tests, e2e, and the GHCR image build).

## Output

Short. On success:

```
released v<version> (<type>) · pushed
style commit: <sha | none>
CI: https://github.com/maca134/FileTend/actions
```

On failure: the failed step, the key error lines, and the proposed fix.
