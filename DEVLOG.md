# DEVLOG — Kartas Phase 4

Development log for all Phase 4 changes. Each entry records what was done, which files changed, and the current status.

---

## [2026-07-26] — BL-01 — Hide Completed/Cancelled Stories by Default

- **Author**: Claude
- **PRD Requirement**: BL-01
- **Summary**: Backlog stories with status `done` or `cancelled` cluttered the default view. Added a `showCompleted` local state flag (default `false`) that excludes `done`/`cancelled` stories from `filteredStories` unless enabled. Added a "Show completed stories" checkbox in the Filter Bar's quick-filters row. The toggle is independent of `hasActiveFilters`/`clearAllFilters` — it's a display preference, not a filter criterion, so "Clear All" doesn't silently re-hide stories the user chose to reveal.
- **Files Changed**:
  - `kartas-app/src/pages/Backlog.jsx` — Added `showCompleted` state, filter exclusion, and checkbox UI
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-26] — BL-02 — Blocked Task Indicator

- **Author**: Claude
- **PRD Requirement**: BL-02
- **Summary**: Added a boolean `is_blocked` column to `stories` (migration 007). Exposed as `isBlocked` in the stories API (`getProjectStories`, `getStory`, `updateStory` — with change-history tracking) and in the kanban board API (`getKanbanBoard`). Backlog table rows, the Backlog/Kanban story-details modals, the Kanban card footer, and the Story Detail page header now render a "🚫 Blocked" badge (`.badge-danger`) when set. Users can toggle the flag from a checkbox on the Story Detail form or from a new "Mark as Blocked"/"Unblock" item in the Kanban card's right-click context menu (reuses the existing `PUT /api/stories/:id` endpoint, no new route needed).
- **Files Changed**:
  - `kartas-api/src/migrations/007_add_story_blocked.sql` — New migration adding `stories.is_blocked`
  - `kartas-api/src/controllers/storyController.js` — `isBlocked` in create/list/get/update responses, change tracking, and UPDATE statement
  - `kartas-api/src/controllers/kanbanController.js` — `isBlocked` added to kanban board story mapping
  - `kartas-api/src/routes/stories.js` — `isBlocked` validation on `validateStoryUpdate`
  - `kartas-app/src/pages/Backlog.jsx` — Blocked badge on table row and details modal
  - `kartas-app/src/pages/KanbanBoard.jsx` — Blocked badge on cards and details modal, `handleToggleBlocked`, context menu item
  - `kartas-app/src/pages/StoryDetail.jsx` — Blocked checkbox in form, blocked badge in page title
  - `kartas-api/tests/stories.test.js` — Test asserting `isBlocked` round-trips through `PUT /api/stories/:storyId`
- **Migration**: `007_add_story_blocked.sql`
- **Status**: Done

---

## [2026-07-26] — EP-01 — Story-Based Epic Progress

- **Author**: Claude
- **PRD Requirement**: EP-01
- **Summary**: The epic progress bar previously computed elapsed time between `start_date`/`end_date`, unrelated to actual completion. Replaced with `(done stories / total stories) × 100`, computed server-side. `epicController.getEpics`/`getEpic` now count done stories via `COUNT(s.id) FILTER (WHERE s.status = 'done')` alongside the existing story-count join, and return `progress_percent` (0 when there are no stories). The frontend progress bar now always renders (previously gated on both dates being set) and reads `epic.progress_percent` directly instead of computing time elapsed.
- **Files Changed**:
  - `kartas-api/src/controllers/epicController.js` — `done_story_count` + `progress_percent` computation in `getEpics` and `getEpic`
  - `kartas-app/src/pages/Epics.jsx` — Replaced time-based progress IIFE with `progress_percent`-driven bar
  - `kartas-api/tests/epics.test.js` — New test file covering 0-story (0%) and partial-completion (50%) cases
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-26] — Fix epic_id global collision on creation

- **Author**: Claude
- **PRD Requirement**: N/A (pre-existing bug found while verifying EP-01/EP-02)
- **Summary**: `epics.epic_id` (e.g. `EPIC-0001`) has a global `UNIQUE` constraint across all projects, but `createEpic` generated the next number by counting epics scoped to the current project only. Any project other than the very first one ever created would collide on `EPIC-0001` and fail with a 500 on its first epic. A correctly-designed `generateNextEpicId()` utility (global `MAX`-based lookup) already existed in `ticketPrefix.js` but was never wired up — `createEpic` had its own broken inline logic instead. Fixed by replacing the inline per-project `COUNT(*)` logic with a call to the existing `generateNextEpicId()` utility, matching the pattern already used for story IDs via `generateNextStoryId()`.
- **Files Changed**:
  - `kartas-api/src/controllers/epicController.js` — `createEpic` now calls `generateNextEpicId()` instead of computing `epic_id` inline
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-26] — EP-02 — Hide Completed/Cancelled Epics by Default

- **Author**: Claude
- **PRD Requirement**: EP-02
- **Summary**: Epics with status `completed` or `cancelled` cluttered the Epics management page. Added a `showCompleted` local state flag (default `false`) and a `visibleEpics` derived list that excludes concluded epics unless the "Show completed epics" checkbox (placed next to "+ Create Epic") is checked. The genuine "No Epics Yet" empty state remains keyed off the full `epics` list; a separate "No Epics to Show" message appears when all epics are hidden by the filter.
- **Files Changed**:
  - `kartas-app/src/pages/Epics.jsx` — Added `showCompleted` state, `visibleEpics` filter, checkbox UI, and distinct empty states
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-25] — UI-03 — Fix page blink on navigation

- **Author**: Antigravity AI
- **PRD Requirement**: UI-03
- **Summary**: Introduced a persistent `ProjectLayoutShell` in `App.jsx` using React Router v6 nested routes + `<Outlet>`. All project-scoped routes now share a single mounted layout instance. The shell fetches the project name once via `api.get('/projects/:id')` and passes it to `ProjectLayout`. Removed `<ProjectLayout>` wrapper from all 7 project page components (they now render only their inner content via the Outlet). This eliminates the full header+sidebar remount that caused the visible flash on every navigation.
- **Files Changed**:
  - `kartas-app/src/App.jsx` — Added `ProjectLayoutShell` component; replaced 7 flat project routes with a single nested parent route
  - `kartas-app/src/pages/Backlog.jsx` — Removed `ProjectLayout` import and wrapper
  - `kartas-app/src/pages/Sprints.jsx` — Removed `ProjectLayout` import and wrapper
  - `kartas-app/src/pages/KanbanBoard.jsx` — Removed `ProjectLayout` import and all 3 wrapper instances (loading, no-sprint, main)
  - `kartas-app/src/pages/Epics.jsx` — Removed `ProjectLayout` import and wrapper
  - `kartas-app/src/pages/ProjectView.jsx` — Removed `ProjectLayout` import and wrapper
  - `kartas-app/src/pages/StoryDetail.jsx` — Removed `ProjectLayout` import and all 3 wrapper instances (loading, not-found, main)
  - `kartas-app/src/pages/SprintReports.jsx` — Removed `ProjectLayout` import and all 3 wrapper instances (loading, no-sprints, main)
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-25] — UI-06 — Fix autocomplete white text in "Add Team Member"

- **Author**: Antigravity AI
- **PRD Requirement**: UI-06
- **Summary**: The `UserSelect` component used `className="user-name"` for the user's display name in dropdown results. The `navigation.css` file has `.user-name { color: white !important }` which bled into the dropdown, rendering white text on a white background. Fixed by renaming the class to `user-display-name` and adding a corresponding dark-text rule in `index.css`.
- **Files Changed**:
  - `kartas-app/src/components/UserSelect.jsx` — Renamed `className="user-name"` → `className="user-display-name"`
  - `kartas-app/src/index.css` — Added `.user-display-name` rule with `color: var(--color-neutral-900)`
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-25] — UI-07 & UI-08 — Fix purple-on-purple badge contrast

- **Author**: Antigravity AI
- **PRD Requirement**: UI-07, UI-08
- **Summary**: The `.badge-primary` CSS class used `background: var(--color-primary-light)` (#9D4EFF) with `color: var(--color-primary-dark)` (#6200CC) — both purple tones with approximately 2:1 contrast ratio, well below WCAG AA minimum of 4.5:1. Fixed by switching to the full primary purple (`#7B00FF`) as background with white (`#FFFFFF`) text, achieving approximately 6.6:1 contrast. Both the Owner role badge (UI-07) and ticket prefix badges (UI-08) use `badge-primary` so both are resolved by this single change.
- **Files Changed**:
  - `kartas-app/src/index.css` — Updated `.badge-primary`: `background-color: var(--color-primary)`, `color: #FFFFFF`
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-25] — SR-01 — Freeze sprint metrics after sprint end

- **Author**: Antigravity AI
- **PRD Requirement**: SR-01
- **Summary**: The `track_story_status_change()` PostgreSQL trigger was inserting sprint_metrics rows for all sprints a story belongs to, regardless of sprint status. If a story was in both a completed sprint and an active sprint, changing the story's status retroactively updated the completed sprint's metrics, breaking historical report immutability. Fixed via a new idempotent migration that replaces the trigger function to JOIN against the `sprints` table and only write metrics when `sp.status = 'active'`. Completed sprint data is now frozen at the moment the sprint ends.
- **Files Changed**:
  - `kartas-api/src/migrations/005_freeze_sprint_metrics.sql` — New migration with updated `track_story_status_change()` function and trigger recreation
- **Migration**: `005_freeze_sprint_metrics.sql`
- **Status**: Done

---

## [2026-07-25] — UI-01 — Sprint Management Page Spacing

- **Author**: Antigravity AI
- **PRD Requirement**: UI-01
- **Summary**: Added consistent vertical rhythm to sprint cards. The active sprint card (`SprintWithMetrics`) now has `mb-lg` bottom margin. The planned sprints grid gap was increased from `spacing-md` to `spacing-lg` to match the visual rhythm of other project pages.
- **Files Changed**:
  - `kartas-app/src/pages/Sprints.jsx` — `mb-lg` on active sprint card, `gap: spacing-lg` on planned sprints grid
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-25] — UI-02 — Backlog Bulk Edit Spacing

- **Author**: Antigravity AI
- **PRD Requirement**: UI-02
- **Summary**: Fixed cramped bulk edit toolbar. Increased the outer grid gap from `spacing-sm` (8px) to `spacing-md` (16px). Increased all four control-group inner gaps from `flex-gap-xs` (4px) to `flex-gap-sm` (8px). Inputs and action buttons now have clear separation.
- **Files Changed**:
  - `kartas-app/src/pages/Backlog.jsx` — bulk actions grid and flex gap classes updated
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-25] — UI-04 — Top Bar Scroll Behavior

- **Author**: Antigravity AI
- **PRD Requirement**: UI-04
- **Summary**: No scroll animation exists in the current codebase — the header is a static `position: relative` element. The PRD requirement referred to an animation that was present in a previous version. No change needed; requirement is N/A for this codebase state.
- **Files Changed**: None
- **Migration**: N/A
- **Status**: Done (N/A — no existing animation to fix)

---

## [2026-07-25] — UI-05 — Logo Link → Dashboard

- **Author**: Antigravity AI
- **PRD Requirement**: UI-05
- **Summary**: Wrapped the Kartas logo image in a `<Link to="/">` in `ProjectLayout.jsx`. Clicking the logo now navigates to the project dashboard. The "For You" page does not exist yet; this satisfies the acceptance criteria until FY-01 is implemented.
- **Files Changed**:
  - `kartas-app/src/components/ProjectLayout.jsx` — Added `Link` import; wrapped logo `<img>` in `<Link to="/">`
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-25] — UI-09 — User Management Back Button Placement

- **Author**: Antigravity AI
- **PRD Requirement**: UI-09
- **Summary**: Removed the "← Back to Dashboard" link from inside the top bar header of `UserManagement.jsx`. The header now shows only the page title and the "Invite User" button. A "← Back to Dashboard" button is rendered at the top of the page content area using the standard `btn btn-secondary btn-sm` style, consistent with other standalone pages.
- **Files Changed**:
  - `kartas-app/src/pages/UserManagement.jsx` — Removed back link from header; added it as a content-area button
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-25] — SP-01 — Rename Sprint Progress Bar to "Elapsed Time"

- **Author**: Antigravity AI
- **PRD Requirement**: SP-01
- **Summary**: Changed the progress bar label in the active sprint card from "Sprint Progress" to "Elapsed Time" to clarify that the bar represents elapsed time, not task completion percentage.
- **Files Changed**:
  - `kartas-app/src/pages/Sprints.jsx` — Updated label string in `SprintWithMetrics` component
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-25] — Fix setup.sh: port conflict abort + DB DNS race condition

- **Author**: Antigravity AI
- **Summary**: Fixed two independent bugs in `setup.sh`:
  1. **Port-in-use hard abort** — `set -e` caused the script to exit silently when `docker-compose up -d` failed due to port 3000 already being in use (half-started container from a previous interrupted run). Fixed by removing `set -e` globally and checking the exit code of `docker-compose up -d` explicitly with `if ! ...`. The script now prints a clear error message with instructions to identify and kill the blocking process.
  2. **EAI_AGAIN DNS race condition** — After `docker-compose up -d` the script used a bare `sleep 5` before running migrations. Even though `depends_on: condition: service_healthy` gates container startup, Docker's internal DNS for the `postgres` hostname can be unavailable for a brief period after the api container process starts. The fixed script replaces `sleep 5` with an active polling loop that attempts a real DB query (`SELECT 1`) via `docker-compose exec -T api node --input-type=module` every 3 seconds, up to 60 seconds. Migrations only run once the connection succeeds.
- **Files Changed**:
  - `setup.sh` — Removed `set -e`; replaced blind `sleep 5` with a polling readiness loop; wrapped `docker-compose up -d` and migration commands with explicit error handling
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-25] — SR-01 (Revised) — Sprint report reads live story status instead of frozen snapshot

- **Author**: Antigravity AI
- **PRD Requirement**: SR-01
- **Root Cause**: Migration 005 correctly stopped the `sprint_metrics` trigger from updating completed sprint rows. However, `getSprintReport` in `sprintMetricsController.js` **never read `sprint_metrics` for completion counts** — it joined `sprint_stories` directly against `stories.status` (live), so it always showed current story status regardless of sprint state. Migration 005 was not wrong, just insufficient.
- **Fix**:
  1. **Migration 006** (`006_sprint_story_status_snapshot.sql`) — adds `snapshot_status VARCHAR(50)` to `sprint_stories`. Back-fills existing completed sprints with current story status as a best-approximation.
  2. **`sprintController.js` — `endSprint`** — after marking the sprint `completed`, immediately runs `UPDATE sprint_stories SET snapshot_status = stories.status` for all stories in that sprint. This is the atomic snapshot taken at sprint-end, before any future status changes.
  3. **`sprintMetricsController.js` — `getSprintReport`** — the two queries that counted `WHERE s.status = 'done'` (completion metrics + team contributions) now use `COALESCE(ss.snapshot_status, s.status)`. For completed sprints `snapshot_status` is non-NULL and reflects the moment of sprint-end. For active sprints `snapshot_status` is NULL and the query falls back to live status — no behaviour change.
- **Files Changed**:
  - `kartas-api/src/migrations/006_sprint_story_status_snapshot.sql` — New migration (idempotent)
  - `kartas-api/src/controllers/sprintController.js` — Snapshot write on `endSprint`
  - `kartas-api/src/controllers/sprintMetricsController.js` — Report queries use `COALESCE(ss.snapshot_status, s.status)`
- **Migration**: `006_sprint_story_status_snapshot.sql`
- **Status**: Done

---

## [2026-07-27] — KN-01 & KN-02 — Sprint Info & Elapsed Time Bar in Kanban Header

- **Author**: Claude
- **PRD Requirement**: KN-01, KN-02
- **Summary**: Kanban header now shows sprint name, objective, formatted start/end dates (e.g. "Aug 7, 2026"), and a compact elapsed-time progress bar, reusing the SP-01 elapsed-time calculation from Sprints.jsx. Sprint metadata was already returned by `GET /kanban/project/:projectId` — no backend changes needed.
- **Files Changed**:
  - `kartas-app/src/pages/KanbanBoard.jsx` — Added `formatDate` helper, date range line, and compact elapsed-time bar to the sprint header block
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-27] — ST-01 — Sub-Task Data Model & CRUD API

- **Author**: Claude
- **PRD Requirement**: ST-01
- **Summary**: Extended `sub_tasks` with `story_points` (all other target fields — `story_id`, `title`, `description`, `assignee_id`, `type`, `status`, `created_at`, `updated_at` — already existed). Added full CRUD: `POST /stories/:storyId/sub-tasks` (nested, mirrors the existing `POST /:storyId/comments` pattern), `PUT /sub-tasks/:id`, `DELETE /sub-tasks/:id` (new standalone route, mirrors how `stories.js` itself does flat `PUT/DELETE /:storyId`). Access control mirrors `storyController.addComment`: verify the story/sub-task exists, then verify `project_members` (or admin). `storyController.getStory`'s existing `subTasks` mapping now includes `storyPoints`. Also extended the Kanban board: `getKanbanBoard` now returns individual sub-task rows (not just aggregate counts) for stories in the active sprint, merged into each column's card list and tagged `itemType: 'story' | 'subtask'`, with `parentStoryId`/`parentStoryCode` on sub-task items for the kanban card's parent badge (ST-03). Added `PUT /kanban/subtasks/:id/status` for independent drag-and-drop (parallel to the existing story-only `updateStoryStatus`, since that endpoint hardcodes the `stories` table).
- **Files Changed**:
  - `kartas-api/src/migrations/008_add_subtask_story_points.sql` — New migration adding `sub_tasks.story_points`
  - `kartas-api/src/controllers/subTaskController.js` — New: `createSubTask`, `updateSubTask`, `deleteSubTask`
  - `kartas-api/src/routes/subTasks.js` — New: `PUT/DELETE /:id`, mounted at `/api/sub-tasks`
  - `kartas-api/src/routes/stories.js` — New nested `POST /:storyId/sub-tasks` route + validator
  - `kartas-api/src/index.js` — Mounted `subTaskRoutes`
  - `kartas-api/src/controllers/storyController.js` — `getStory`'s `subTasks` mapping now includes `storyPoints`
  - `kartas-api/src/controllers/kanbanController.js` — `getKanbanBoard` now fetches and merges individual sub-task rows (`itemType` discriminator); new `updateSubTaskStatus`
  - `kartas-api/src/routes/kanban.js` — New `PUT /subtasks/:id/status` route
- **Migration**: `008_add_subtask_story_points.sql`
- **Status**: Done

---

## [2026-07-27] — ST-02 & ST-04 — Sub-Item Management in Story Detail

- **Author**: Claude
- **PRD Requirement**: ST-02, ST-04
- **Summary**: Added a "Sub-items" section to the Story Detail page listing each sub-task/sub-test (title, type icon, status badge, story points, assignee), with Edit and Delete actions. Since ST-02's "edit via modal" requirement is identical to ST-04's lightweight edit modal, built one shared `SubItemEditModal` component (mode: `create`/`edit`) reused for both creation ("+ Add Sub-item") and editing, rather than two separate forms. The modal shell copies the existing overlay+card pattern already used elsewhere in the app (e.g. `Backlog.jsx`'s create-story modal) since no shared `Modal` component exists yet. Assignee field reuses the existing project-members `<select>` pattern already on this page (not `UserSelect`, which searches all users globally rather than project members). `story.subTasks` was already being fetched by the existing `GET /stories/:storyId` call — this only adds the UI to render/mutate it.
- **Files Changed**:
  - `kartas-app/src/components/SubItemEditModal.jsx` — New shared create/edit modal for sub-items, exports `SUBITEM_TYPE_OPTIONS`/`SUBITEM_STATUS_OPTIONS`
  - `kartas-app/src/pages/StoryDetail.jsx` — New "Sub-items" section, modal wiring, create/edit/delete handlers
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-27] — ST-03 — Sub-Tasks on Kanban Board

- **Author**: Claude
- **PRD Requirement**: ST-03
- **Summary**: Sub-tasks of stories in the active sprint now render as their own kanban cards (backend support landed with ST-01: `getKanbanBoard` merges `itemType: 'subtask'` rows into each column alongside stories). Cards are visually distinguished from story cards — smaller font, reduced padding, left-indented, dashed border instead of the solid type-color border — and show a parent-story-code badge (e.g. `PT-0001`), a sub-task/sub-test type icon, assignee, and points. `handleDragEnd` now branches on the `draggableId` prefix (`subtask-` vs `story-`) to call the correct status-update endpoint, so sub-tasks can be dragged between columns independently of their parent story (same optimistic-update/revert-on-error behavior as stories). Clicking a sub-task card opens the shared `SubItemEditModal` directly in edit mode (no intermediate read-only view, since there's no sub-task detail page). Right-click gets a separate, trimmed 3-item context menu (View Parent Story / Move To / Delete) — "Assign"/"Edit" are already covered by click-to-edit.
- **Files Changed**:
  - `kartas-app/src/pages/KanbanBoard.jsx` — `handleDragEnd` branching, sub-task card rendering variant, `getSubtaskTypeIcon`, sub-task context menu + handlers, `SubItemEditModal` wiring
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-27] — UM-01 — Project-Scoped Roles Investigation (Design Decision)

- **Author**: Claude
- **PRD Requirement**: UM-01
- **Summary**: Investigated whether roles should be project-scoped (`project_members.role`) vs. global (`users.role`). Findings: both axes already exist and are already in active, if inconsistent, use. `users.role` (`admin`/`project_owner`/`member`) is checked as a global escape hatch ("...or global admin") in nearly every controller, and gates project *creation* via `requireProjectOwner`. `project_members.role` (`owner`/`member`) was, prior to this phase, only enforced on `projectController.js`'s `updateProject`/`deleteProject`/`addMember`/`removeMember` — i.e. team/project management already had project-scoped permissioning; nothing else did.
  **Decision**: Adopt `project_members.role` as the authority for project-level permission gating on resources explicitly called out for owner-only restriction by this PRD phase (team membership management — already correct; epic management — fixed in RB-02 below). `users.role` remains the system-level escape valve (`admin` bypasses all project-scoped checks) and continues to gate system-wide actions (user management, project creation). Deliberately **not** extended to stories, sprints, kanban cards, or sub-tasks — those are day-to-day work items any project member should be able to create/edit/move; restricting them to owners was never requested by RB-01/RB-02 and would be a regression in usability. Also worth noting for future work: `users.role === 'project_owner'` (global, gates project creation) and `project_members.role === 'owner'` (per-project, gates team/epic management) are separate concepts that share confusingly similar names in the existing codebase — not renamed here since it's out of scope, but flagged for anyone touching this area next.
- **Files Changed**: None (design decision only; implementation lands in RB-01/RB-02 below)
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-27] — RB-01 — Member View-Only Access to Team Members

- **Author**: Claude
- **PRD Requirement**: RB-01
- **Summary**: Investigation found the backend (`projectController.addMember`/`removeMember`) was **already correctly gated** — both require `project_members.role = 'owner'` for that project (or global admin), predating this phase. The actual gap was the frontend: `ProjectView.jsx` rendered "+ Add Member" and "Remove" unconditionally for every viewer regardless of their own role, so a plain member would see the controls and only discover they lacked permission via a 403 after clicking. Fixed by deriving the viewer's own project role from the already-fetched `project.members` array (matching on `user.id` from `AuthContext`) and conditionally rendering both the "+ Add Member" button and the "Actions" column/"Remove" buttons only when the viewer is a project owner or global admin.
- **Files Changed**:
  - `kartas-app/src/pages/ProjectView.jsx` — `canManageMembers` derivation, conditional rendering of Add/Remove UI
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-27] — RB-02 — Member View-Only Access to Epics

- **Author**: Claude
- **PRD Requirement**: RB-02
- **Summary**: Unlike team management, `epicController.createEpic`/`updateEpic`/`deleteEpic` had a genuine backend gap — they only checked project *membership* (any role), not ownership, so any member could create/edit/delete epics. Fixed by changing the access check on all three write methods to require `project_members.role = 'owner'` (or global admin), mirroring the existing pattern already used in `projectController.js`'s project-management endpoints (per the UM-01 decision above). `getEpics`/`getEpic` (read) are unchanged — still membership-only, since all project members should be able to view epics. Frontend `Epics.jsx` now derives the viewer's project role the same way as `ProjectView.jsx` and hides "+ Create Epic", "Edit", and "Delete" for non-owner members.
- **Files Changed**:
  - `kartas-api/src/controllers/epicController.js` — `createEpic`/`updateEpic`/`deleteEpic` now require `project_members.role = 'owner'`
  - `kartas-app/src/pages/Epics.jsx` — `canManageEpics` derivation, conditional rendering of Create/Edit/Delete UI
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-27] — UM-04 — Admin Role Change for Existing Users

- **Author**: Claude
- **PRD Requirement**: UM-04
- **Summary**: Added `PUT /users/:id/role` (admin-only, validates `role` is one of `admin`/`project_owner`/`member`) with a self-demotion safeguard mirroring the existing `deleteUser`'s self-protection pattern — an admin attempting to change their own role gets a 400 before the update runs. `UserManagement.jsx`'s previously-static role badge is now an editable `<select>` per user row (calling the new endpoint on change), except on the currently-logged-in admin's own row, which stays a read-only badge.
- **Files Changed**:
  - `kartas-api/src/controllers/userController.js` — New `updateUserRole` method
  - `kartas-api/src/routes/users.js` — New `PUT /:id/role` route + validator
  - `kartas-app/src/pages/UserManagement.jsx` — Editable role `<select>` per user, `handleChangeRole`, self-row guard, error/success banners
- **Migration**: N/A
- **Status**: Done

---
