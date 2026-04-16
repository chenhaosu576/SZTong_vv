# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development commands

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Production build: `npm run build`
- Preview built app: `npm run preview`

## Testing and linting

- There is currently no test runner or lint script in `package.json`.
- Do not assume Vitest, Jest, ESLint, or TypeScript are configured.
- There is no single-test command available in the current repo state.

## Architecture overview

- This is a Vue 3 + Vue Router + Vite single-page app for the “收智通” client-facing recycling platform.
- The app is currently a frontend prototype: core flows are powered by mock data and browser storage rather than a backend.

## Application flow

- `src/main.js` bootstraps the app, installs the router, imports global CSS, and calls `initAuthSeed()` before mount so demo accounts exist in `localStorage`.
- `src/App.vue` is intentionally thin in layout terms: it renders the current route and owns the delayed login-prompt modal logic. Anonymous users are prompted once per browser session unless they are already on `/auth`.
- `src/router/index.js` defines one standalone auth route (`/auth`) plus a nested client site under `ClientLayout`. Route guards redirect authenticated users away from `/auth`, and redirect anonymous users from `meta.requiresAuth` pages to `/auth?redirect=...`.
- `src/layouts/ClientLayout.vue` is the shared shell for the client site: top navigation, scroll progress bar, route transition wrapper, and footer.

## Data and state model

- There is no centralized state library. State is kept locally in components/composables and synchronized through browser APIs.
- Authentication state lives in `src/utils/auth.js` and is stored in `localStorage` under `szt_user` and `szt_users`.
- Many components refresh auth UI by re-reading `getCurrentUser()` and listening for the `storage` event instead of using a global store.
- Business data is mocked in `src/mock/clientApi.js`. That file acts as the app’s fake backend and contains async fetch/submit helpers for home content, appointments, orders, profile data, FAQ content, AI Q&A, image analysis, and service-center lookup.

## Routing and navigation conventions

- Route metadata is minimal; only protected pages currently use `meta.requiresAuth`.
- `src/router/siteMap.js` is the source of truth for public nav links, account-menu links, and legacy path redirects.
- Legacy `/c/...` URLs are preserved through redirect mappings plus catch-all redirects back to `/`.
- The navigation component has custom active-link handling: the “环保助手” nav item should remain active for both `/ai-qa` and `/science` via `activePaths` in `siteMap.js`.

## UI patterns worth preserving

- Most client pages use `<script setup>` single-file components and lean on local refs/reactive state instead of extracted abstractions.
- Scroll-reveal animation is standardized through `src/composables/useRevealOnScroll.js`; pages opt in by attaching `data-reveal` markers inside a root ref.
- The homepage (`src/views/client/HomePage.vue`) is the most interaction-heavy page and sets the tone for the rest of the app: typewriter hero copy, hover-based card transforms, stacked scroll effects, and navigation into downstream feature pages.
- The appointment page (`src/views/client/AppointmentPage.vue`) is the clearest example of a form workflow: it hydrates option metadata from the mock API, derives weight bands from freeform numeric input, validates with `src/utils/appointmentValidation.js`, and submits through the mock API.

## Auth flow details

- Demo login data is seeded automatically; the built-in demo account is defined in `src/utils/auth.js`.
- Registration writes directly into `localStorage` and does not auto-login; instead it flips the UI back to login mode with the new credentials prefilled.
- Logout only clears `szt_user`; persistent registered users remain in `szt_users`.

## Working in this codebase

- Prefer updating existing mock API helpers and utility modules over introducing new state-management layers.
- If a feature appears data-driven, check `src/mock/clientApi.js` and related utility files before changing page components.
- When changing navigation, protected routes, or page URLs, update both `src/router/index.js` and `src/router/siteMap.js` so visible navigation and redirects stay aligned.
- For frontend changes, run the Vite dev server and verify the behavior in the browser before considering the task complete.
