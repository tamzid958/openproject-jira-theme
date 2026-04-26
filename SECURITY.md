# Security Policy

## Reporting a vulnerability

If you believe you've found a security vulnerability in this project, please **do not** open a public GitHub issue. Public reports give attackers a head start.

Instead, report privately:

- Email the maintainer directly at the address listed on the maintainer's GitHub profile, or
- Use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) on this repository.

A useful report contains:

- A clear description of the issue and its impact.
- Concrete steps to reproduce, ideally with a minimal proof of concept.
- The version (commit SHA) you tested against, and your OpenProject server version if relevant.
- Any patches or mitigations you'd suggest.

We aim to acknowledge new reports within **3 business days** and to ship a fix or a clearly communicated workaround within **30 days** for issues we accept as in-scope.

## In scope

- The Next.js application in this repository (the front-end and its proxy API routes).
- The way it handles OpenProject OAuth tokens, sessions, and cookies.
- Anything that could lead to:
  - Cross-site scripting in the rendered work-package HTML.
  - Bypassing OpenProject's permission model from this UI.
  - Leaking OAuth access or refresh tokens to the browser.
  - Server-side request forgery via attachment URL rewriting.
  - Authentication bypass on the proxy routes.

## Out of scope

- Vulnerabilities in your OpenProject instance — those should be reported upstream to the OpenProject team.
- Vulnerabilities in third-party dependencies that don't affect how this project uses them.
- Issues that require physical access to the user's device, or non-default browser configurations that disable web platform protections.
- Best-practice hardening that doesn't have a demonstrable exploit (e.g. *"this header could be stricter"* without a path to abuse).

## Disclosure

Once a fix is released, we'll publish a brief advisory crediting the reporter (unless you'd rather stay anonymous). For high-severity issues we'll push an out-of-band release rather than waiting for the regular cadence.

## Hardening notes for operators

A few defaults you should keep in mind when deploying this UI:

- Always run behind HTTPS. NextAuth's secure-cookie behaviour depends on it.
- Set a strong `AUTH_SECRET` (≥ 32 bytes from `openssl rand -base64 32`).
- Keep your OpenProject instance up to date — most exploits in the work-package HTML surface land there first.
- Restrict the OAuth application's redirect URI to your real production origin.
- Don't expose the dev server to the internet.

Thanks for helping keep the project safe.
