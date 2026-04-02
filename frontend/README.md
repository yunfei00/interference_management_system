# Frontend Workspace

This is the Next.js frontend workspace for `django-next-baseline`.

## Stack

- Next.js App Router
- TypeScript
- ESLint
- Same-origin BFF-style route handlers for login, logout, session loading, and backend health checks

## Local Setup

Copy the frontend environment file:

```powershell
Copy-Item .env.example .env.local
```

Install dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Default local URLs:

- Next.js: `http://localhost:3000`
- Django: `http://127.0.0.1:8000`

## Environment Variables

`DJANGO_BASE_URL`

- Server-side URL used by Next.js route handlers to call Django.

`NEXT_PUBLIC_DJANGO_PUBLIC_URL`

- Public URL used for dashboard links to Swagger, ReDoc, and schema pages.

`NEXT_PUBLIC_APP_NAME`

- Display name shown in the frontend shell.

## Available Routes

- `/`: landing page for the baseline
- `/login`: login page that posts to the internal Next.js auth proxy
- `/dashboard`: protected dashboard shell powered by `/api/session`
- `/dashboard/users`: protected user list backed by `/api/admin/users`
- `/dashboard/roles`: protected role list backed by `/api/admin/roles`
- `/dashboard/menus`: protected menu catalog backed by `/api/admin/menus`
- `/dashboard/logs`: protected audit console backed by login-log and operation-log proxies
- `/api/auth/login`: Next.js route handler that exchanges username/password for Django JWT tokens
- `/api/auth/logout`: clears auth cookies
- `/api/session`: loads current user, permissions, and menus from Django
- `/api/admin/login-logs`: authenticated proxy for Django login-log pagination
- `/api/admin/operation-logs`: authenticated proxy for Django operation-log pagination
- `/api/admin/users`: authenticated proxy for Django user pagination
- `/api/admin/roles`: authenticated proxy for Django role pagination
- `/api/admin/menus`: authenticated proxy for Django menu pagination
- `/api/backend/health`: probes Django readiness

## Verification

```powershell
npm run lint
npm run typecheck
npm run build
```
