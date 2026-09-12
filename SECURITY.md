# Security Policy

## Reporting a vulnerability

If you find a security issue in this project, please report it privately
rather than opening a public GitHub issue:

- Preferably, use GitHub's [private vulnerability reporting](https://github.com/Devputta/Dosent---Document-AI-/security/advisories/new)
  for this repository (Security tab → "Report a vulnerability").
- If that's not available, open an issue that describes the problem at a
  high level without exploit details, and note that you'd like to discuss
  it privately.

Please include:
- A description of the issue and its potential impact
- Steps to reproduce it (a minimal example, if possible)
- Which part of the app is affected (frontend, backend, a specific endpoint)

There's no formal SLA or bug bounty for this project — it's a personal
build — but reports will be reviewed and addressed as time allows, and
credited in the fix unless you'd prefer otherwise.

## Scope and known limitations

This project has a documented security posture — see
[`README.md#security-considerations`](./README.md#security-considerations)
and the in-app [`/security`](./doc-assistant/src/app/security/page.tsx)
page for what's already handled (per-user data isolation, prompt-injection
resistant retrieval prompts, sanitized Markdown rendering, upload
validation, no leaked stack traces). The same document also lists what's
explicitly **not** production-hardened yet:

- The rate limiter is in-memory and single-instance (not suitable for
  multi-instance deployment without swapping it for a shared store)
- No automated security testing or CI is set up
- No independent security audit has been performed

If you're deploying this beyond local/personal use, review those
limitations first.

## Supported versions

This project does not currently maintain multiple released versions —
security fixes are applied to the `main` branch.
