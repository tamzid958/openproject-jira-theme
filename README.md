# Opira

> **OpenProject Jira theme** — reimagined as a standalone, modern UI.

A modern, opinionated UI for [OpenProject](https://www.openproject.org/) — sprint planning, drag-and-drop boards, a focused backlog, timeline, reports, and a documents reader, served by a Next.js app that talks to your existing OpenProject instance over OAuth.

> Opira is a front-end. It does not host an OpenProject server for you — point it at any v3 instance you already operate.

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149eca?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

---

## What you get

- **Drag-and-drop board** scoped per sprint, with status-aware columns and search/assignee/type/tag filters.
- **Backlog** with bulk move, bulk assign, bulk delete, sub-task expansion, and one-click sprint sync (align dates, roll up points).
- **Sprint lifecycle** — create, edit, start, complete, lock, unlock, reopen — surfaced as native OpenProject `open / locked / closed` statuses.
- **Timeline** view with sprint-grouped date bands.
- **Reports** — burndown and velocity per sprint.
- **Documents** — a two-pane reader for OpenProject documents, with embedded attachment URLs proxied through a server route so they actually render.
- **Tags** browser, **Members** management with role chips and invite/remove flows.
- **Command palette** (⌘K · Ctrl+K) for fast jumps across projects, work packages, and people.
- **Rich text** for descriptions and comments via Tiptap, sanitised on render.
- **Notifications** with mark-all-read.
- **Permission-aware UI** — every action button reflects the live `_links` permissions returned per resource, so users only see what they can actually do.
- **JSON import** — drop a tree of work packages into a sprint with one click.

The data model is OpenProject's. There is no shadow database here. Every screen is built from live API responses, every mutation is round-tripped to your server, and the access control you configure in OpenProject is the access control your team experiences in this UI.

## How it's built

- Each view is its own Next.js route segment under `/projects/[projectId]/…`. Page state lives in URL search parameters, so deep links and back/forward behave like the rest of the web.
- Reads and mutations go through TanStack Query. Mutations are optimistic with proper rollback so the UI stays snappy.
- Authentication is OAuth 2.0 (Authorization Code with PKCE) against your OpenProject instance, brokered by NextAuth v5. Refresh tokens rotate transparently.
- API requests reach OpenProject through server-side proxy routes that inject the OAuth bearer. The access token never lands in the browser.
- Forms use `react-hook-form` + `zod` for both validation and shape inference.
- Styling is Tailwind v4 with design tokens declared once in `app/globals.css`.

## Quick start

```bash
git clone https://github.com/tamzid958/opira.git opira
cd opira
npm install
cp .env.local.example .env.local        # fill the four required values
npm run dev
```

Open <http://localhost:3000>. The first request bounces through OpenProject for sign-in.

### Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_OPENPROJECT_URL` | yes | Base URL of your OpenProject instance, e.g. `https://op.example.com`. Used by both server (OAuth + proxy) and client (account deep-link). |
| `OPENPROJECT_OAUTH_CLIENT_ID` | yes | Client ID of the OAuth application you register in OpenProject. |
| `OPENPROJECT_OAUTH_CLIENT_SECRET` | yes | Matching client secret. |
| `AUTH_SECRET` | yes | 32+ byte secret signing NextAuth cookies. Generate with `openssl rand -base64 32`. |
| `AUTH_URL` | prod | Public origin. Auto-detected in dev; set explicitly in production. |
| `OPENPROJECT_STORY_POINTS_FIELD` | optional | Field that carries story points on your work packages. Top-level numeric (`storyPoints`) or a custom-field key (`customField7`). Defaults to `storyPoints`. |

### Registering the OAuth client in OpenProject

1. Sign in to your OpenProject as an administrator.
2. **Administration → Authentication → OAuth applications → Add**.
3. Set:
   - **Name:** anything memorable.
   - **Redirect URI:** `<AUTH_URL>/api/auth/callback/openproject` (locally: `http://localhost:3000/api/auth/callback/openproject`).
   - **Confidential:** yes.
   - **Scopes:** `api_v3`.
4. Save and copy the Client ID and Client Secret into `.env.local`.

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Redirects to `/projects`. |
| `/projects` | Bounces to your last-visited project, or the first one you can access. |
| `/projects/<id>/board` | Sprint board with filters and switcher. |
| `/projects/<id>/backlog` | Sprint sections with bulk operations. |
| `/projects/<id>/timeline` | Calendar-style timeline. |
| `/projects/<id>/reports` | Burndown + velocity. |
| `/projects/<id>/overview` | Project dashboard. |
| `/projects/<id>/tags` | Categories browser. |
| `/projects/<id>/members` | Project memberships. |
| `/projects/<id>/documents` | Documents reader. |
| `/account` | Your identity + deep-link to OpenProject account settings. |

Modal state rides URL params (`?wp=<id>` opens a work-package, `?create=1` opens the create dialog, `?s=<id>` selects a board sprint), so links are shareable and the back button works.

## Project layout

```
app/
  layout.jsx                              root server layout
  loading.jsx · error.jsx · not-found.jsx Next.js status pages
  page.jsx                                redirect to /projects
  projects/
    page.jsx                              project picker
    [projectId]/
      layout.jsx                          chrome + cross-page modals
      <view>/page.jsx                     per-view client pages
  api/openproject/*                       authenticated proxy routes
  account/page.jsx                        account surface

components/
  ui/                                     shared primitives (Avatar, Menu, …)
  …                                       feature components

lib/
  hooks/                                  TanStack Query wrappers, URL helpers
  openproject/                            mappers, OAuth client, route utils
```

## Tech stack

- [Next.js 16](https://nextjs.org/) · [React 19](https://react.dev/) · [Tailwind CSS v4](https://tailwindcss.com/)
- [TanStack Query v5](https://tanstack.com/query) · [NextAuth.js v5](https://authjs.dev/)
- [Tiptap](https://tiptap.dev/) · [react-hook-form](https://react-hook-form.com/) · [zod](https://zod.dev/)
- [dnd-kit](https://dndkit.com/) · [date-fns](https://date-fns.org/) · [lucide-react](https://lucide.dev/) · [sonner](https://sonner.emilkowal.ski/)

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server with Turbopack. |
| `npm run build` | Production build. |
| `npm run start` | Run the production build locally. |
| `npm run lint` | ESLint via `eslint-config-next`. |

## Roadmap

A non-binding list of things on the back burner:

- Server Actions for mutations.
- Real-time updates (SSE or polling fan-out).
- Offline-friendly mutation queue.
- Mobile board polish.
- Dark mode and high-contrast themes.

If any of these excite you, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Contributing

Issues, ideas, and pull requests are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a PR — it covers the dev loop, branch conventions, and review expectations. Everyone participating in the project's spaces is expected to follow the [Code of Conduct](./CODE_OF_CONDUCT.md). Suspected security issues should be reported privately as described in [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE) © Tamzid Ahmed
