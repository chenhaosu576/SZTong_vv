# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development commands

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Production build: `npm run build`
- Preview built app: `npm run preview`

## Testing and linting

- Unit tests run via vitest with the `jsdom` environment. From `frontend/`: `npm test` (run once) or `npm test -- --watch`.
- Test files live next to the composables they cover: `src/composables/__tests__/*.test.js`. Mock the `@/api/*` and `@/stores/*` modules with `vi.hoisted` + `vi.mock(...)`.
- There is no lint script in `package.json`; rely on editor feedback and the build’s type-aware transforms. Do not assume ESLint/TS configured.

## Architecture overview

- This is a Vue 3 + Vue Router 4 + Pinia 2 + Vite 6 single-page app for the “收智通” client-facing recycling platform.
- Most domain flows (auth, charity, orders, profile, content, metrics, service centers) now hit real REST endpoints under `src/api/`. Only AI/chat, image-recognition, and geo lookups remain on the backend-as-proxy pattern in `src/mock/{Aiapi,picAI,mapApi}.js` because they wrap third-party keys.

## Application flow

- `src/main.js` creates the Vue app, registers Pinia + the router, imports global CSS, calls `authStore.restoreFromStorage()` before installing the router so guards see the restored session, optionally fires `refreshFromMe()` if a token is present, then mounts.
- `src/App.vue` is intentionally thin: it renders the current route and owns the delayed login-prompt modal logic. Anonymous users are prompted once per browser session unless they are already on `/auth`.
- `src/router/index.js` defines one standalone auth route (`/auth`) plus a nested client site under `ClientLayout`. Route guards read `useAuthStore().isAuthed`, redirect authenticated users away from `/auth`, and redirect anonymous users from `meta.requiresAuth` pages to `/auth?redirect=...`.
- `src/layouts/ClientLayout.vue` is the shared shell for the client site: top navigation, scroll progress bar, route transition wrapper, and footer.

## Data and state model

- Cross-component state lives in Pinia stores under `src/stores/` (`auth`, `content`, `metrics`, `orders`, `serviceCenters`). Pages and components consume these via `useXxxStore()` and let Pinia auto-unwrap refs.
- Authentication state lives in `src/stores/auth.js` and is persisted to `localStorage.szt_token` and `localStorage.szt_user`. The built-in demo account is seeded on the backend (`backend/src/db/seeders/`), not in the browser.
- Per-page UI state stays local: components use `ref`/`computed` and either pass it down via props or hoist it into a composable under `src/composables/`. Cross-page state generally rides the matching Pinia store.
- The typed REST clients under `src/api/` (auth, charity, orders, content, metrics, serviceCenters) wrap axios via `src/utils/request.js` and are the source of truth for backend request/response shapes.

## Routing and navigation conventions

- Route metadata is minimal; only protected pages currently use `meta.requiresAuth`.
- `src/router/siteMap.js` is the source of truth for public nav links, account-menu links, and legacy path redirects.
- Legacy `/c/...` URLs are preserved through redirect mappings plus catch-all redirects back to `/`.
- The navigation component has custom active-link handling: the “环保助手” nav item should remain active for both `/ai-qa` and `/science` via `activePaths` in `siteMap.js`.

## UI patterns worth preserving

- Most client pages use `<script setup>` single-file components and lean on local refs/reactive state, with composables for any state that needs to outlive the component.
- Scroll-reveal animation is standardized through `src/composables/useRevealOnScroll.js`; pages opt in by attaching `data-reveal` markers inside a root ref.
- The homepage (`src/views/client/HomePage.vue`) is the most interaction-heavy page and sets the tone for the rest of the app: typewriter hero copy, hover-based card transforms, stacked scroll effects, and navigation into downstream feature pages.
- The appointment page (`src/views/client/AppointmentPage.vue`) is the clearest example of a form workflow: it hydrates option metadata from the real backend via `src/api/`, derives weight bands from freeform numeric input, validates with `src/utils/appointmentValidation.js`, and submits through `src/api/orders.js`.

## Auth flow details

- The login/register UI under `/auth` calls `authStore.login(payload)` / `authStore.register(payload)`, which POST to `/api/auth/login` and `/api/auth/register` and store the returned `{ token, user }` in Pinia + `localStorage`.
- On every successful auth transition the store writes both keys; on logout only `szt_token` and `szt_user` are cleared. There is no separate registered-user bucket on the client.
- `authStore.refreshFromMe()` is fired best-effort on app boot when a token exists; failures are swallowed so a transient backend outage does not kick the user out.

## Working in this codebase

- New cross-component state belongs in a Pinia store under `src/stores/`. New per-page state belongs in a composable under `src/composables/` named `use<Page><Concern>.js`.
- If a feature appears data-driven, check `src/api/<module>.js` (real REST) and the matching `src/stores/<module>.js` before touching page components. `src/mock/{Aiapi,picAI,mapApi}.js` is reserved for third-party-key proxies.
- When adding or changing a composable, add a vitest file under `src/composables/__tests__/`. Mock the API and store modules with `vi.hoisted` so the mock functions are usable inside `vi.mock(...)`.
- When changing navigation, protected routes, or page URLs, update both `src/router/index.js` and `src/router/siteMap.js` so visible navigation and redirects stay aligned.
- For frontend changes, run the Vite dev server, run `npm test`, and verify the behavior in the browser before considering the task complete.
