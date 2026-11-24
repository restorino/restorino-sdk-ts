# Security Policy

Restorino is committed to ensuring the security and privacy of its users, partner restaurants, and customers. We take all potential security vulnerabilities seriously.

---

## Supported Versions

Only the latest release of `@restorino/sdk` receives security updates.

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |
| < 0.0.1 | :x:                |

---

## Reporting a Vulnerability

If you discover a security vulnerability in `@restorino/sdk` or the Restorino platform, please **do not create a public GitHub issue**.

Instead, report it responsibly via our security team:

1. **Email:** Send your report to [security@restorino.com](mailto:security@restorino.com) (or [contact@restorino.com](mailto:contact@restorino.com)).
2. **Details:** Include a proof of concept, affected SDK version, relevant code snippets, and steps to reproduce.
3. **Response Window:** You will receive an initial response acknowledging receipt within **48 hours**.
4. **Remediation & Disclosure:** We will work with you to triage, patch the vulnerability, and coordinate public disclosure once the fix is released.

---

## Security Architecture & Best Practices

- **Zero Storage of Admin Credentials:** `@restorino/sdk` is strictly scoped to public customer storefront APIs. It never interacts with administrative or sensitive staff data.
- **Cookie Security:** The SDK uses `HttpOnly; Secure; SameSite=Strict` cookies by default, preventing cross-site scripting (XSS) token harvesting.
- **Double-Submit CSRF:** Automatic extraction of the `XSRF-TOKEN` cookie to the `X-XSRF-TOKEN` header on all mutating requests.
- **Client-Side Allowlist:** Calls to endpoints outside of customer storefront scopes are blocked immediately with `OUT_OF_SCOPE_ENDPOINT` prior to network dispatch.
