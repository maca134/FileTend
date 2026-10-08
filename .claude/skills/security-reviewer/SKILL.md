---
name: security-reviewer
description: Security review of FileTend changes or a given path/area using the security-reviewer agent. Use when asked to security review, audit for vulns, or check path traversal/auth/permission-flag safety.
argument-hint: "[path | area | commit range]"
context: fork
agent: security-reviewer
---

Security review target: $ARGUMENTS

If no target given, review uncommitted changes (fall back to `main...HEAD`). Follow your threat model and output format exactly.
