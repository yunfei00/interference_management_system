# Interference Management System

This repository now includes a production-style `Project Management` module integrated into the existing Django + DRF backend and Next.js frontend.

## Current Structure

- Backend: Django, Django REST Framework, custom user system in `accounts`
- Frontend: Next.js App Router under `frontend/src/app`
- New project module backend: `apps/projects`
- New project module frontend: `frontend/src/components/projects`, `frontend/src/app/dashboard/projects`

## Project Management Module

The module includes:

- Project list, filters, summary cards, create/edit/archive
- Project detail tabs: overview, Kanban, tasks, milestones, attachments, activity
- Task create/edit/detail drawer
- Subtasks and task dependencies
- Stable Kanban drag-and-drop with persisted ordering
- Project activity log
- Project attachments and task attachments
- Permission control based on administrator / owner / member visibility

## Backend Setup

Create or activate the virtual environment, then run:

```powershell
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py create_super_admin --username admin --password Admin12345 --email admin@example.com --real-name "System Administrator"
.\.venv\Scripts\python.exe manage.py seed_project_demo
.\.venv\Scripts\python.exe manage.py runserver
```

Optional bootstrap command:

```powershell
.\.venv\Scripts\python.exe manage.py bootstrap_system
```

## Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

Frontend default local address:

- [http://localhost:3000](http://localhost:3000)

Backend default local address:

- [http://localhost:8000](http://localhost:8000)

## Project Demo Data

The demo seed command creates:

- 3 demo projects
- milestones per project
- 6 tasks per project with mixed status and priority
- demo members based on available approved users

Run it again safely:

```powershell
.\.venv\Scripts\python.exe manage.py seed_project_demo
```

## Verification Flow

1. Sign in with a super admin or any approved account.
2. Open `/dashboard/projects`.
3. Confirm the summary cards and seeded projects are visible.
4. Create a new project and open its detail page.
5. Add a task, then move it across Kanban columns.
6. Create or edit a milestone.
7. Upload an attachment on the `Attachments` tab.
8. Open a task drawer and upload a task attachment.
9. Open the `Activity` tab and confirm project actions are logged.

Shortcut routes also work:

- `/projects`
- `/projects/{id}`

## Database Migrations

New migration:

- `apps/projects/migrations/0001_initial.py`

It creates:

- `Project`
- `Milestone`
- `Task`
- `SubTask`
- `TaskDependency`
- `ProjectAttachment`
- `ProjectActivityLog`

## Quality Checks

Executed locally:

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py test accounts apps.projects
cd frontend
npm run lint
npm run typecheck
npm run build
```

## Notes

- Project deletion is implemented as archive behavior.
- Task deletion is soft delete.
- Activity logging is automatic for core project operations.
- Frontend test infrastructure is not part of the original repository. For this round, `lint`, `typecheck`, and `build` were used as the frontend safety gate.
