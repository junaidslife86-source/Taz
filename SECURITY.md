# Security Policy

## Supported versions

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |

## Reporting a vulnerability

MyFinancePal is a client-side application. Security issues may affect all users of the hosted build or the import/backup flows.

**Please do not** open public GitHub issues for undisclosed vulnerabilities.

Instead:

1. Open a [GitHub Security Advisory](https://github.com/junaidslife86-source/myfinancepal/security/advisories/new) (preferred), or
2. Contact the maintainer via GitHub with a private description of the issue.

Include steps to reproduce, impact, and any suggested fix if you have one.

## Scope

In scope:

- Backup import/export validation bypass
- Cross-site scripting in the static app
- Sensitive data exposure (API keys, transaction data)
- Denial-of-service via malicious import files
- Dependency vulnerabilities in production dependencies

Out of scope:

- Issues that require physical access to an unlocked device
- User sharing their own backup file or API key
- Optional AI Assist sending data to Google when the user explicitly enabled it

## Backup export modes

| Mode | Purpose | Restorable |
| ------ | --------- | ------------ |
| Full encrypted backup | Personal restore on another device | Yes (password required) |
| Stripped diagnostic backup | Support / debugging without PII | No |
| Statement template export | Community parser metadata sharing | No |

Encrypted backups use PBKDF2 (310k iterations, SHA-256) and AES-GCM in the browser. Gemini API keys are excluded by default and are never restored from any backup on import.

## User security practices

- Do **not** include your Gemini API key in backups unless necessary; never share backup files publicly.
- Use **stripped diagnostic** or **template** exports when sharing with others; they are not suitable for restore.
- Do **not** attach real bank statements to public GitHub issues.
- Review imported transactions before saving.
- Keep dependencies updated (`npm audit`).

## Response expectations

We aim to acknowledge reports within 7 days and provide a fix or mitigation plan when possible.
