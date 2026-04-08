# Project Manifest - Team Section Module

## 1. Project Goal
Implement the "Team Section" module to transition the workspace directory into a collaborative environment. This involves schema updates for assignee support on notes, redesigning the team directory to show the workspace head and members, enforcing creator-scoped privacy and edit access, adding entity attribution rows, and preventing circular workspace invites.

## 2. Actionable Task List
- [x] Phase 1 — Schema Updates (Role enum, Notes assignees, Workspace description) [TASK-ID: 1]
- [x] Phase 2 — Store & Sidebar Updates (Access to /team, store support for new schema) [TASK-ID: 2]
- [x] Phase 3 — Note Form (Member picker for collaborative notes) [TASK-ID: 3]
- [x] Phase 4 — Team Page Redesign (Workspace Directory view, Head UI, member grids) [TASK-ID: 4]
- [x] Phase 5 — Attribution Rows (UI for showing creator, assigning, parsing isPrivate) [TASK-ID: 5]
- [x] Phase 6 — Invite Guard (Anti-circular invite loop, default "member" role check) [TASK-ID: 6]
- [x] Verify builds without errors [TASK-ID: 7]

## 3. Dependency Map
- TASK-ID: 1 -> Prerequisite for all other changes.
- TASK-ID: 2 -> Requires TASK-ID: 1.
- TASK-ID: 3 -> Requires TASK-ID: 1.
- TASK-ID: 4 -> Requires TASK-ID: 1.
- TASK-ID: 5 -> Requires TASK-ID: 1, 4.
- TASK-ID: 6 -> Requires understanding of Firebase logic in the app.

## 4. Contingency Plan (Plan B)
- **Problem:** Data migrations for existing notes lacking `assigneeIds`.
- **Recovery:** Handled by falling back to empty arrays in the normalization logic (`default-data.ts`).

## 5. Error Handling Rules
- Type errors in TS are addressed immediately by refining schema definitions.

## 6. Execution Log
- [2026-04-08] Commenced work on Team Section Module.
- [2026-04-08] Completed Phases 1 through 4 (Schema, Sidebar, Note Form, Team Page).
- [2026-04-08] Completed Phase 5 (Attribution Rows on Task, Project, Note cards) and creator privacy logic.
- [2026-04-08] Completed Phase 6 (Anti-circular Invites).
- [2026-04-08] Verified TypeScript compilation successful.
