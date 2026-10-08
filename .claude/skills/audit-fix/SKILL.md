---
name: audit-fix
description: >
  Runs the security-reviewer agent and /ponytail:ponytail-audit over the whole
  repo, then fixes what they find. Use when the user says "audit and fix",
  "audit-fix" or "/audit-fix". Edits code; does not commit.
disable-model-invocation: true
---

Two audits, one merged list, then fixes.

## 1. Audit

1. Start two agents in one message so they run in parallel, with
   `run_in_background: false`:
   - a `security-reviewer` agent, target: the whole repo (`src/`, `scripts/`,
     excluding `src/frontend/components/ui` and
     `src/frontend/lib/seti-icons.generated.ts`; plus `Dockerfile`,
     `compose.yaml`, `.dockerignore`, `.env.example`, `.github/workflows`).
     Return its findings verbatim;
   - a `general-purpose` agent that runs the `ponytail:ponytail-audit` skill
     and returns its list verbatim.

   Tell both: read-only, change no files, return only the list.
2. Merge into one list: security findings first (CRITICAL → LOW), numbered
   `S1…`, then ponytail, numbered `P1…`. Drop duplicates. Check each finding
   against the code before you fix it.

## 2. Resolve conflicts

Security wins. Skip a ponytail cut that would remove a check, validation,
`resolveSafePath` call, `ALLOW_*`/`READ_ONLY` gate, auth/session check,
extension/size limit or test the security audit relies on.

## 3. Ask

Before fixing anything, ask the user (AskUserQuestion) about every ambiguous
finding:

- unclear whether it's a real issue, or the two audits disagree;
- more than one reasonable fix;
- the fix needs a product decision: new dependency, a changed or new env var
  or default (`src/lib/env.ts`, documented in `README.md` and
  `.env.example`), a breaking API change (the frontend consumes `AppType`
  from `src/api/index.ts`), or a change that logs existing users out
  (cookie name/format, `SECRET_KEY` derivation).

Batch the questions, up to 4 per call, recommended option first. Skip what the
user declines, marked `skipped (user)`. If a fix turns up a new ambiguity
partway through, stop and ask.

## 4. Fix

- One finding at a time, most severe first. Smallest change that resolves it.
- Follow `CLAUDE.md`: match the code style around it, don't touch unrelated
  code, and add or adjust tests under `test/` (`test/api/*.test.ts` for
  routes, `test/unit/*.test.ts` for `src/lib`, helpers in `test/helpers.ts`)
  when the behavior changes.
- Chmod/chown and symlink behavior differs on Windows; if a test can't
  exercise a fix here, say so for that fix.
- If a fix breaks typecheck or tests and the cause isn't obvious, revert it
  and mark it `skipped`.

## 5. Verify

From the repo root (run `bun install` first if `node_modules` is missing),
both must pass:

```
bunx tsc --noEmit && bun test
```

Don't use `bun run lint` (`eslint --fix` rewrites files) or `bun run format`
(rewrites files) — run `bunx eslint` without `--fix` if you want lint output.

Then run the `security-reviewer` agent on `git diff` so the fixes get a
security review too. Fix anything it confirms, then run the checks again.

## Output

The reader is dyslexic: keep it short. One line per finding, keeping the audit
numbering:

```
S<N>. fixed|skipped <finding, ≤10 words>. [path:line] — <reason if skipped>
P<N>. fixed|skipped ...
```

End with:

```
test: <N pass / M fail | none> · typecheck: <ok|fail>
reviewer: <clean | N issues>
```

Don't commit. The user reviews the diff.
