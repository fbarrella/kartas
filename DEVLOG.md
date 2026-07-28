# DEVLOG — Kartas

Development log for all Kartas changes, across every phase. Each entry records what was done, which files changed, and the current status. This log is continuous — it is not reset when a new phase begins.

---

## [2026-07-28] — Phase 5 Kickoff — PRD Created

- **Author**: Claude
- **PRD Requirement**: N/A (planning)
- **Summary**: Phase 4 is complete (see the summary entry immediately below, and `.planning/PRD_PHASE4.md`, archived from `.planning/PRD.md`). Drafted the Phase 5 PRD (`.planning/PRD.md`) from `.planning/nextsteps.txt`, covering three pillars: a navigation overhaul (persistent "Kartas" app-name top bar, a new breadcrumb system, a sidebar project-identity header), story descriptions as markdown (new shared editor/renderer, applied to the create modal, the story edit page, and the Kanban quick-view modal), and people-centric Kanban (avatar-based assignees with a hover card, plus a new per-project "user details" page reachable from Team Members and the hover card). Research pass (three parallel `Explore` agents) confirmed: no markdown library exists yet in `kartas-app` (`react-markdown` + `remark-gfm` are new deps), no breadcrumb or hover-card/popover component exists anywhere in the app today, avatar initials are reimplemented independently in three places with no per-user color variation, and `forYouController.js`'s existing tasks/activity queries are already shaped correctly to generalize from "me" to an arbitrary `:userId` for the new user-details page — no new schema needed for that part. No database migrations are anticipated for this phase; requirement IDs use new prefixes (`NAV-*`, `MD-*`, `AV-*`, `UD-*`) to avoid colliding with Phase 4's IDs.
- **Files Changed**:
  - `.planning/PRD.md` — Rewritten as the Phase 5 PRD (prior Phase 4 content moved to `.planning/PRD_PHASE4.md`)
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-28] — Phase 5 PRD Review — Open Decisions Resolved

- **Author**: Claude
- **PRD Requirement**: N/A (planning)
- **Summary**: Reviewed the draft Phase 5 PRD's open design notes/assumptions with the user before starting implementation. Resolved: `MD-01`'s "markdown mode" is a Write/Preview tab pair (not a split-pane or WYSIWYG editor); `AV-01` avatars get per-user hashed colors (not a single fixed color); `AV-03`'s hover card is built on a new `@floating-ui/react` dependency (not hand-rolled positioning); `NAV-02` breadcrumbs use explicit per-page items (not URL-derived); `UD-02`'s user-details page gets no dedicated sidebar nav entry (links only). Also pulled two items out of Section 6 (out of scope) into active scope: new `MD-05` (epic description markdown, in `Epics.jsx`) and `MD-06` (sub-item description markdown, in `SubItemEditModal.jsx`), both lightweight extensions of `MD-01`'s shared editor/renderer. A generic reusable `Modal` shell component was considered and explicitly declined for this phase. `.planning/PRD.md` Section 4 was rewritten from "assumptions to confirm" into a resolved decisions log for future reference.
- **Files Changed**:
  - `.planning/PRD.md` — `MD-01` acceptance criteria rewritten for tabbed mode; new `MD-05`/`MD-06` requirements added; `AV-03` updated for `@floating-ui/react`; Section 4 rewritten as resolved decisions; Sections 5/6/8/9 updated accordingly
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-28] — Phase 4 Complete — All PRD Requirements Delivered

- **Author**: Claude
- **PRD Requirement**: All (UI-01 through FY-01b)
- **Summary**: Confirmed every requirement in `.planning/PRD.md` is implemented, verified, and logged in this file, across all 8 suggested implementation phases:
  - **4.1 Critical Fixes** — `UI-03`, `UI-06`, `UI-07`, `UI-08`, `SR-01`
  - **4.2 UI Polish** — `UI-01`, `UI-02`, `UI-04` (N/A, no matching code existed), `UI-05`, `UI-09`, `SP-01`
  - **4.3 Backlog & Epic Improvements** — `BL-01`, `BL-02`, `EP-01`, `EP-02`
  - **4.4 Kanban Enhancements** — `KN-01`, `KN-02`
  - **4.5 Sub-Tasks System** — `ST-01`–`ST-04`
  - **4.6 Access Control** — `RB-01`, `RB-02`, `UM-01` (design decision), `UM-04`
  - **4.7 User Management** — `UM-02`, `UM-03`
  - **4.8 "For You" Page** — `FY-01a`, `FY-01b`
  
  Beyond the PRD's original scope, several follow-up rounds — all driven directly by user feedback after browser-testing the delivered features, and already individually logged above — extended the work: reworking "For You" from a cross-project dashboard into a per-project page; a new per-project, per-user Settings page (default landing-page preference); email-invitation failure-reason specificity; several infrastructure fixes (`setup.sh` `.env` application, first-run session-recovery bugs); and a round of navigation/UX polish (sticky header, Kanban board width, heading hierarchy consistency). Phase 4 is complete.
- **Files Changed**: None (summary entry)
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-28] — Fix sticky header, Kanban column regression, User Management heading hierarchy

- **Author**: Claude
- **PRD Requirement**: N/A (follow-up UX fixes from browser testing)
- **Summary**: Three fixes after browser-testing the prior session's UX polish work:
  1. **Sticky header**: `ProjectLayout.jsx`'s header used `position: 'relative'`, so it scrolled away with the page — but `.sidebar` (`navigation.css`) is `position: fixed; top: 64px`, a hardcoded assumption that the header always occupies the viewport's top 64px. Once the header scrolled off, the sidebar stayed pinned at `top: 64px` regardless, leaving a blank gap above it. Changed the header to genuinely `position: fixed; top/left/right: 0`, making the sidebar's existing assumption true again, and added `padding-top: 64px` to `.page-content` to compensate for the header no longer occupying space in normal document flow (matches the same `64px` figure already baked into the sidebar's own offset, rather than introducing a new one).
  2. **Kanban columns regressed**: the previous session's width fix changed columns from a fixed `minWidth: 300px, maxWidth: 350px` (a hard floor, never shrinks) to `flex: '1 1 320px', maxWidth: 420px` — the `flex-shrink: 1` let columns shrink *below* 320px to fit the default 5 visible columns inside the container, making them smaller than before rather than bigger. Reverted columns to the original fixed `minWidth`/`maxWidth` (no flex-shrink), and instead addressed the actual ask — "make the board occupy more of the screen" — by trimming the board's own lateral padding (`padding: '0 var(--spacing-sm)'`, down from the `.container-fluid` class's default `var(--spacing-md)`), scoped to `KanbanBoard.jsx` only via an inline override, not the shared class.
  3. **User Management heading hierarchy**: the page title ("User Management") and its two section headings ("Pending Invites", "Active Users") were all plain `<h2>` — visually identical weight. Demoted both section headings to `<h3>` (confirmed via `index.css`: `h2` = `--font-size-xl`, `h3` = `--font-size-lg`, one tier down), so they now read as clearly subordinate to the page title.
- **Files Changed**:
  - `kartas-app/src/components/ProjectLayout.jsx` — Header `position: fixed`
  - `kartas-app/src/components/navigation.css` — `.page-content` gains `padding-top: 64px`
  - `kartas-app/src/pages/KanbanBoard.jsx` — Columns reverted to fixed `minWidth`/`maxWidth`; board wrapper padding reduced
  - `kartas-app/src/pages/UserManagement.jsx` — "Pending Invites"/"Active Users" demoted to `<h3>`
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-27] — Project UX polish: settings page, title/header consistency, Kanban width

- **Author**: Claude
- **PRD Requirement**: N/A (post-Phase-4 UX polish, user-requested)
- **Summary**: Four independent UX improvements:
  1. **Per-project, per-user Settings page**: new `project_user_settings` table (composite `PRIMARY KEY (project_id, user_id)`, both FKs `ON DELETE CASCADE`, mirroring `project_members`'s key shape but kept as its own dedicated table rather than bolting a UI-preference column onto a membership/role table — deliberately future-proof for more per-user-per-project settings later) stores `default_landing_page` (default `'backlog'`). New `GET/PUT /api/projects/:projectId/settings` (plain membership access check — any role, since this is a personal preference, not an owner-gated setting), upserted via the same `ON CONFLICT` idiom already used by `addMember`. `getUserProjects` now `LEFT JOIN`s this table so the Dashboard gets each project's `defaultLandingPage` in the same response (no extra round-trip) and its project-card links now route to `` `/project/${id}/${defaultLandingPage}` `` instead of the previously hardcoded `/team`. New `ProjectSettings.jsx` page (plain project-scoped content, matching `Backlog.jsx`'s shape) with a single `<select>` + Save button; new "Settings" sidebar entry (gear icon, placed last) at `/project/:projectId/settings`. Verified per-user isolation with two temp test users in the same project: each independently defaults to `backlog`, one user's update to `kanban` persisted and did not affect the other's setting.
  2. **Reports page title**: `SprintReports.jsx` had no page-level heading at all (confirmed by reading the full file) — added `<h2>Reports</h2>` in the same `flex flex-between mb-md` wrapper used by `Epics.jsx`/`ProjectView.jsx`, across all three of its render branches (loading, empty, and main) so the title doesn't disappear depending on state.
  3. **Header consistency — My Profile & User Management**: both previously had bespoke top bars (title and, for User Management, action buttons baked into the header). Replaced both with the standard app header (`Dashboard.jsx`'s exact pattern: logo linking to `/`, `UserDropdown`, nothing else). Title/back-button/actions moved into the content area following the same rhythm already established by `StoryDetail.jsx`: back button first (own wrapper), then a title row with any action buttons on the right. `UserProfile.jsx`'s previous back button (`navigate(-1)`, unstyled, in the header) is now a standard `.btn .btn-secondary .btn-sm` "← Go back to My Projects" link in the content area; `UserManagement.jsx`'s existing back link (previously "← Back to Dashboard", added in a past `UI-09` fix) was relabeled and moved to be the first content element, with "+ Create User"/"+ Invite User" now living in the title row instead of the header.
  4. **Kanban board width**: root cause was the board's own `.container` wrapper nested inside `ProjectLayout`'s `.container` — both capped at 1200px, so Kanban was doubly constrained to the same width as every other page, while its columns (`minWidth: 300px, maxWidth: 350px`, no `flex` grow) didn't stretch to fill whatever space they did get. Swapped the board's wrapper to the existing `.container-fluid` utility (full width, no cap) and changed columns to `flex: '1 1 320px', maxWidth: '420px'` so they grow to fill available width instead of leaving blank space — both changes scoped to `KanbanBoard.jsx` only, no shared CSS class touched.
- **Files Changed**:
  - `kartas-api/src/migrations/010_project_user_settings.sql` — New table
  - `kartas-api/src/controllers/projectController.js` — New `getProjectSettings`/`updateProjectSettings`; `getUserProjects` now joins settings
  - `kartas-api/src/routes/projects.js` — New settings routes + validator
  - `kartas-app/src/pages/ProjectSettings.jsx` — New page
  - `kartas-app/src/App.jsx` — New `settings` route
  - `kartas-app/src/components/Sidebar.jsx` — New "Settings" nav item
  - `kartas-app/src/pages/Dashboard.jsx` — Project card link uses `defaultLandingPage`
  - `kartas-app/src/pages/SprintReports.jsx` — Added title to all render branches
  - `kartas-app/src/pages/UserProfile.jsx` — Standard header; back button + title moved to content
  - `kartas-app/src/pages/UserManagement.jsx` — Standard header; back button + title + actions moved to content
  - `kartas-app/src/pages/KanbanBoard.jsx` — `.container-fluid` + flexible column widths
- **Migration**: `010_project_user_settings.sql`
- **Status**: Done

---

## [2026-07-27] — Rework FY-01: "For You" becomes project-scoped

- **Author**: Claude
- **PRD Requirement**: FY-01a/FY-01b (rework, per user feedback)
- **Summary**: The user tested the cross-project "For You" page and found the "all projects at once" model confusing to navigate. Reworked it into a per-project feature — exactly like Backlog/Epics/Sprints/Kanban/Reports/Team — instead of a standalone cross-project dashboard. This is an explicit, authorized rollback of several pieces added in the prior two sessions:
  - **Backend**: `forYouController.getMyTasks`/`getMyActivity` now take `projectId` from the route (`GET /api/for-you/project/:projectId/tasks`, `/activity`) instead of aggregating across every project the user belongs to. Added the standard `project_members` access check (403 for non-members) matching every other project-scoped controller, and simplified both queries from a `JOIN project_members` cross-project shape down to a plain `WHERE project_id = $1 AND assignee_id = $2` — the access check now does the membership gating, so the query itself no longer needs to. Dropped `projectName` from both responses (redundant once every row is implicitly the current project). No migration needed — `change_history.project_id` already existed from `009_activity_log.sql`.
  - **Routing**: `ForYou.jsx` moved from a top-level `/for-you` route to a nested `for-you` route under `/project/:projectId`, alongside the other project pages.
  - **`ForYou.jsx`**: rewritten from a `Dashboard.jsx`-style standalone page (own header, own sidebar render, own `page-content` wrapping) into a plain project-scoped content component (`Backlog.jsx`-style) that reads `projectId` via `useParams()`. Removed the project-filter dropdown and the "Project" column/"in {project}" text from the tasks table and activity feed (both redundant now that the page is inherently scoped to one project).
  - **`Sidebar.jsx`**: reverted the "global nav" branch added last session solely to support standalone `ForYou.jsx` (My Projects / User Management / conditional Exit Project) — back to a single, always-project-scoped `navItems` list, with "For You" added as the first item. "Exit Project" is unconditional again.
  - **`navigation.css`**: removed the now-unused `.sidebar-divider` rule.
  - **`ProjectLayout.jsx`**: logo now links to `` `/project/${projectId}/for-you` `` (the current project's For You page) instead of the old global `/for-you`.
  - **`Dashboard.jsx`**: logo reverted from `/for-you` back to `/` (self-link) — there's no project context on the dashboard to send it into anymore. `UserDropdown.jsx`'s "My Projects" item (added last session) needed no change.
- **Verification**: As a temp test user in two separate temp projects (each with an assigned story), confirmed `GET /api/for-you/project/:projectId/tasks` and `/activity` for project A returned only project A's data and vice versa (no cross-contamination), and confirmed a 403 for a project the user doesn't belong to (tested against the real admin's own project). `npm run build` clean. All temp test data cleaned up.
- **Files Changed**:
  - `kartas-api/src/routes/forYou.js` — Routes now take `:projectId`
  - `kartas-api/src/controllers/forYouController.js` — Project-scoped access check + simplified queries
  - `kartas-app/src/App.jsx` — `for-you` route moved under `/project/:projectId`
  - `kartas-app/src/pages/ForYou.jsx` — Rewritten as a project-scoped content component
  - `kartas-app/src/components/Sidebar.jsx` — Reverted to project-only; "For You" added as first nav item
  - `kartas-app/src/components/navigation.css` — Removed unused `.sidebar-divider`
  - `kartas-app/src/components/ProjectLayout.jsx` — Logo links to the project-specific For You page
  - `kartas-app/src/pages/Dashboard.jsx` — Logo reverted to self-link (`/`)
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-27] — Post-FY-01 fixes: activity feed null bug, sidebar navigation, dropdown, spacing

- **Author**: Claude
- **PRD Requirement**: FY-01a/FY-01b (follow-up fixes from user testing)
- **Summary**: Four issues reported after testing the "For You" page:
  1. **Null old_value bug**: `kanbanController.updateStoryStatus` (the drag-and-drop status endpoint) selected only `project_id` from the story before logging the change, never `status` — so `story.status` was `undefined` when used as `old_value`, stored as SQL `NULL`, and rendered as the literal string "null" in the activity feed (e.g. "Moved RES-0001 from null to in_development"). Fixed the `SELECT` to also fetch `status`. Also hardened `ForYou.jsx`'s `describeActivity` so both "moved" branches (story and sub-task) gracefully omit the "from X" clause if `oldValue` is ever null/undefined for any other reason, and switched both branches to render human-readable status labels (e.g. "Ready" instead of "ready") instead of raw enum values.
  2. **Sidebar navigation**: `ForYou.jsx` had no left sidebar at all (it copied `Dashboard.jsx`'s minimal header-only shell), and the per-project `Sidebar.jsx` had no way back to "For You" except the logo click. Rather than building a second divergent sidebar, generalized `Sidebar.jsx` to work with or without a `projectId`: within a project, it now shows one new "For You" link above the existing 6 project items (a divider separates the two groups); outside a project (currently only `ForYou.jsx`), it shows "My Projects", "For You", and — admin-only, mirroring `UserDropdown.jsx`'s existing gate — "User Management" instead, since there's no other nav affordance there and "Exit Project" (which already covers "back to projects" within a project) doesn't apply. The "Exit Project" footer button is now conditional on `projectId` being present. Extracted the sidebar-collapsed-state localStorage-polling logic (previously inlined in `ProjectLayout.jsx`, and documented as a gotcha in `CLAUDE.md`) into a shared `useSidebarCollapsed` hook, used by both `ProjectLayout.jsx` (no behavior change) and the new usage in `ForYou.jsx`, which now replicates `ProjectLayout`'s sidebar + `page-content` DOM structure.
  3. **"My Projects" in the user dropdown**: Added a new top item in `UserDropdown.jsx`'s menu (above "My Profile") linking to `/`, with a 16×16 filled folder icon matching that component's existing icon convention.
  4. **Activity section spacing**: `ForYou.jsx` used `className="mt-xl"`/`className="mb-xl"`-shaped spacing, but `index.css` only ever defined `.mt-lg`/`.mb-lg` and smaller — `.mt-xl`/`.mb-xl` didn't exist, so the class silently resolved to zero margin, causing the "glued together" look between the tasks table and the "Activity" heading. Added both missing utility classes (32px, matching the existing `--spacing-xl` variable) to `index.css`'s existing spacing-utility block — no `ForYou.jsx` change needed, since it already referenced the (now real) class name.
- **Verification**: Reproduced the exact reported scenario (Ready → In Development via the kanban drag endpoint) with a temp test user; confirmed the activity feed now shows `oldValue: "ready"` instead of `null`. `npm run build` clean. Cleaned up all temp test data.
- **Files Changed**:
  - `kartas-api/src/controllers/kanbanController.js` — `updateStoryStatus`'s `SELECT` now includes `status`
  - `kartas-app/src/pages/ForYou.jsx` — Null-safe `describeActivity` "moved" branches with human-readable status labels; wired in `Sidebar`/`page-content` layout via the new hook
  - `kartas-app/src/components/Sidebar.jsx` — Generalized to accept an optional `projectId`; new global nav section (For You / My Projects / User Management) with new icons; "Exit Project" footer now conditional
  - `kartas-app/src/components/ProjectLayout.jsx` — Switched to the new shared `useSidebarCollapsed` hook (no behavior change)
  - `kartas-app/src/hooks/useSidebarCollapsed.js` — New shared hook
  - `kartas-app/src/components/navigation.css` — New `.sidebar-divider` rule
  - `kartas-app/src/components/UserDropdown.jsx` — New "My Projects" menu item
  - `kartas-app/src/index.css` — New `.mt-xl`/`.mb-xl` utility classes
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-27] — FY-01b — Activity History ("For You" Page, Part 2)

- **Author**: Claude
- **PRD Requirement**: FY-01b
- **Summary**: Added a paginated, cross-project activity feed to the "For You" page. `change_history` (previously a story-only field-diff log with exactly 2 write sites in the whole codebase) is generalized via migration `009_activity_log.sql`, adding nullable `entity_type`, `entity_id`, `project_id`, and `action_type` columns — purely additive, no backfill needed, since the read query (`getMyActivity`) `COALESCE`s sensible defaults for pre-migration rows (`entity_type` → `'story'`, `action_type` → `'moved'`/`'edited'` based on `field_changed`). Per the user's explicit direction (full scope, not a reduced subset), added new logging call sites everywhere the PRD's acceptance criteria requires: story creation and comments (`storyController.createStory`/`addComment`), sub-task creation/edits/moves (`subTaskController.js`, `kanbanController.updateSubTaskStatus`), and epic/sprint creation and updates (`epicController.js`, `sprintController.js` — `createSprint`/`updateSprint`/`startSprint`/`endSprint`), on top of extending the two pre-existing story-edit/status-change sites. New `GET /api/for-you/activity?limit=&offset=` returns `{ items, hasMore }`, fetching `limit+1` rows to compute `hasMore` without a second `COUNT` query — this establishes the first pagination convention in the codebase (none existed before, frontend or backend). `ForYou.jsx` gained an "Activity" section below "My Tasks": a human-readable description per action/entity-type combination, relative timestamps, and a "Load More" button (no infinite-scroll observer — no precedent existed, and the PRD explicitly allows either). Verified end-to-end via a temp test user: exercised all 13 instrumented action/entity combinations (story create/edit/move/comment, epic create/update, sub-task create/update/move, sprint create/start/update/end), confirmed every entry logged with correct shape and latest-first ordering, and confirmed pagination boundaries across 3 pages (`limit=5`) with no gaps or overlaps and correct `hasMore` transitions. Cleaned up afterward — cascade deletes via both `story_id` and the new `project_id` FK correctly removed all activity rows, including entity types (epic/sprint) that have no `story_id` to cascade through.
- **Files Changed**:
  - `kartas-api/src/migrations/009_activity_log.sql` — New: adds `entity_type`/`entity_id`/`project_id`/`action_type` to `change_history` + supporting indexes
  - `kartas-api/src/controllers/storyController.js` — Logging added to `createStory`, `addComment`; existing `updateStory` diff-loop extended with the new columns
  - `kartas-api/src/controllers/kanbanController.js` — Existing `updateStoryStatus` insert extended; new logging added to `updateSubTaskStatus`
  - `kartas-api/src/controllers/epicController.js` — Logging added to `createEpic`, `updateEpic`
  - `kartas-api/src/controllers/sprintController.js` — Logging added to `createSprint`, `updateSprint`, `startSprint`, `endSprint`
  - `kartas-api/src/controllers/subTaskController.js` — Logging added to `createSubTask`, `updateSubTask`
  - `kartas-api/src/controllers/forYouController.js` — New `getMyActivity` method
  - `kartas-api/src/routes/forYou.js` — New `GET /activity`
  - `kartas-app/src/pages/ForYou.jsx` — New "Activity" section: `describeActivity`/`activityLink`/`formatRelativeTime` helpers, paginated state, "Load More" button
- **Migration**: `009_activity_log.sql`
- **Status**: Done

---

## [2026-07-27] — FY-01a — Assigned Tasks List ("For You" Page, Part 1)

- **Author**: Claude
- **PRD Requirement**: FY-01a
- **Summary**: New personal, cross-project "For You" page listing every story/sub-task assigned to the logged-in user across all projects they belong to. New `GET /api/for-you/tasks` (optionally `?projectId=` filtered) runs two queries — stories and sub-tasks, each joined through `project_members` for authorization/`project_name` and `LEFT JOIN epics` for epic context — then batch-resolves each story's "current" sprint via `SELECT DISTINCT ON (story_id) ... ORDER BY (status = 'active') DESC, start_date DESC` (no `is_current` flag exists in the schema, so this is the tie-break for stories that have been added to more than one sprint over time). Results are merged in JS and sorted by an explicit status rank (`in_development` → `review` → `test` → `ready` → `refining` → `backlog` → `done` → `cancelled`) then `updatedAt` descending, per "in-progress first, then by updated date." Sub-task rows carry their parent story's code/id so the frontend can link to the parent's detail page (sub-tasks have no detail page of their own, per `ST-02`/`ST-04`). New `ForYou.jsx` mirrors `Dashboard.jsx`'s non-`ProjectLayout` page shell (own header, no sidebar), with a project-filter `<select>` and a task table (epic/sprint/status badges, story points). Also completes `UI-05`'s deferred follow-up: the Kartas logo in `ProjectLayout.jsx` now links to `/for-you` instead of `/` (its "until FY-01 is implemented" placeholder), and `Dashboard.jsx`'s own header logo — previously not a link at all — now does too, for consistency. Verified end-to-end via a temp test user with two temp projects, an epic, an active sprint, and a sub-task: confirmed cross-project aggregation, correct epic/sprint resolution, correct sort order, and the `?projectId=` filter, all via the running API; cleaned up afterward.
- **Files Changed**:
  - `kartas-api/src/controllers/forYouController.js` — New: `getMyTasks`
  - `kartas-api/src/routes/forYou.js` — New: `GET /tasks`, mounted at `/api/for-you`
  - `kartas-api/src/index.js` — Mounted `forYouRoutes`
  - `kartas-app/src/pages/ForYou.jsx` — New page
  - `kartas-app/src/App.jsx` — New top-level `/for-you` route
  - `kartas-app/src/components/ProjectLayout.jsx` — Logo link `/` → `/for-you`
  - `kartas-app/src/pages/Dashboard.jsx` — Logo now wrapped in a `/for-you` link
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-27] — Fix setup.sh not reliably applying .env changes

- **Author**: Claude
- **PRD Requirement**: N/A (infrastructure fix, follow-up to UM-02)
- **Root Cause**: The user set `EMAIL_PROVIDER=gmail` (plus Gmail credentials) in the root `.env` but the frontend still reported `smtp`. `setup.sh` never explicitly recreates containers to apply `.env` changes — it just calls plain `docker-compose up -d`, which usually (but isn't guaranteed to) detect config drift and recreate affected containers. More concretely misleading: the script's own "Useful commands" output at the end suggested `docker-compose restart` for restarting services — `restart` does **not** re-read `.env` or recreate containers at all; it only restarts the existing container process with whatever environment was already baked in at creation time. Confirmed the underlying container-recreation behavior (root-caused in the prior session's fix) is what actually applies `.env` changes, by explicitly force-recreating and checking `docker exec kartas-api printenv`.
- **Fix**: `setup.sh` now runs `docker-compose up -d --force-recreate` instead of plain `docker-compose up -d`, guaranteeing every run picks up the current `.env` values regardless of prior container state (safe — `postgres`'s data lives in the named `postgres_data` volume, not in the container itself, so recreating it doesn't lose data). The "Useful commands" section no longer presents `docker-compose restart` as a generic restart instruction without qualification — it's now labeled "Restart (no .env)" alongside a new "Apply .env changes" line pointing at `docker-compose up -d --force-recreate` (or re-running the script), plus an explicit warning that `restart` doesn't re-read `.env`.
- **Verification**: Set `EMAIL_PROVIDER=gmail` with test credentials in `.env`, ran `docker-compose up -d --force-recreate` (what `setup.sh` now does), confirmed via `docker exec kartas-api printenv` that the container picked up `EMAIL_PROVIDER=gmail`, and confirmed end-to-end via a temp admin test user that `POST /api/invites/generate` correctly used the Gmail transport (`emailReason: "send_failed"` with the real Gmail auth-rejection message, as expected for test credentials). Reverted `.env` back to blank afterward and cleaned up all temp test data.
- **Files Changed**:
  - `setup.sh` — `docker-compose up -d --force-recreate`; corrected "Useful commands" guidance around `.env` changes vs. `restart`
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-27] — Specific invite-email failure reasons (follow-up to UM-02)

- **Author**: Claude
- **PRD Requirement**: UM-02 (follow-up)
- **Summary**: After configuring real SMTP/Gmail credentials, the invite modal still only showed a generic "either not configured or send failed" message, giving no way to tell which case actually occurred or why. `sendInviteEmail()` now returns a `reason` (`not_configured` | `send_failed`) plus a `detail` string in both cases: for `not_configured`, `config/email.js` now computes exactly which required env vars are missing for the active provider (e.g. `"EMAIL_PROVIDER=smtp but missing: SMTP_HOST, SMTP_USER, SMTP_PASSWORD"`); for `send_failed`, `detail` is the underlying nodemailer error message (e.g. an SMTP auth rejection), surfaced since this endpoint is already admin-only. `generateInvite`'s response now includes `emailReason`/`emailDetail` alongside the existing `emailSent`, and `UserManagement.jsx`'s invite modal renders one of three distinct banners (sent / not configured, with detail / send failed, with detail) instead of the previous single ambiguous fallback message. Verified via a temp admin test user against the current (still-blank) env: response correctly returns `emailReason: "not_configured"`, `emailDetail: "EMAIL_PROVIDER=smtp but missing: SMTP_HOST, SMTP_USER, SMTP_PASSWORD"`.
- **Separately flagged (not a code bug)**: the user reported email still not sending after filling in real credentials in the root `.env`. Confirmed via `docker exec kartas-api printenv` that the running `api` container's env still showed the old blank values — Docker Compose only bakes `environment:` values into a container at creation time, so editing `.env` while the container is already running has no effect until it's recreated (`docker-compose up -d api`). This is expected Docker Compose behavior, not an application defect; flagged to the user as the likely explanation.
- **Files Changed**:
  - `kartas-api/src/config/email.js` — Computes and exports `emailConfigStatus` (missing-vars detail) alongside `isEmailConfigured`
  - `kartas-api/src/utils/mailer.js` — `sendInviteEmail` returns `detail` for both `not_configured` and `send_failed`
  - `kartas-api/src/controllers/inviteController.js` — `generateInvite` response includes `emailReason`/`emailDetail`
  - `kartas-app/src/pages/UserManagement.jsx` — Invite modal shows a distinct banner per case with the specific detail message
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-27] — Fix broken first-run/session-recovery flow (stale session shown as "logged in"; fresh DB stuck on Login instead of Admin Setup)

- **Author**: Claude
- **PRD Requirement**: N/A (regression introduced/uncovered while implementing UM-02)
- **Root Cause (primary, acute)**: Installing `nodemailer` for UM-02 via `docker-compose exec -T api npm install nodemailer` only wrote it into the running `api` container's anonymous `node_modules` Docker volume, not into the image itself. Recreating that container afterward (done to pick up the new `docker-compose.yml` env vars) attached a **stale pre-existing anonymous volume** from an earlier container instance (Docker does not refresh anonymous volumes with new image content once they already have data), losing the `nodemailer` install and crash-looping the `api` container (`ERR_MODULE_NOT_FOUND: Cannot find package 'nodemailer'`) from that point on — silently, since nothing polls container health after the fact. With the API entirely unreachable, `check-admin` and every other request failed outright.
- **Root Cause (contributing, in application code)**: Two real defects in `AuthContext.jsx` made the API-down symptom far more confusing than a normal "can't reach server" error, and independently are latent bugs regardless of what triggers them:
  1. `checkExistingAuth()` restored `user` from `localStorage` purely by parsing cached JSON, with no server-side validation. Any stale/invalid token (API down, or a token surviving a DB reset) rendered the app as fully "logged in" with a stale cached identity while every real data call failed — exactly the "logged in but empty, no users showing" symptom.
  2. The mount effect fired `checkAdminExists()` (real network call) and `checkExistingAuth()` (purely synchronous `localStorage` reads, no real `await`) without waiting for both — `loading` cleared as soon as the synchronous one finished, guaranteed to be before the network one resolved. `AppRoutes` only special-cases `adminExists === false`; while it sat at its unresolved default, the app fell through to the normal Login/Dashboard routes instead of Admin Setup. Combined with no retry on a failed `check-admin` call, a single failed attempt (e.g. the API being down) left `adminExists` stuck at its default forever, permanently stranding first-run setup on the Login page with no in-app recovery.
- **Fix (infrastructure)**: Rebuilt the `api` image (`docker-compose up -d --build api`) so `nodemailer` installs at build time via the Dockerfile's `RUN npm install`, then removed the stale anonymous `node_modules` volume and let a fresh one populate from the rebuilt image (`docker rm -f kartas-api && docker volume rm <anon-volume-id> && docker-compose up -d api`) — confirms healthy against a genuinely fresh, empty DB (`GET /health` → `200`, `GET /api/auth/check-admin` → `{"adminExists":false}`).
- **Fix (application code)**:
  - `checkExistingAuth()` now validates any cached session against `GET /users/profile` before trusting it. A server-confirmed-invalid session (has a response, e.g. 401) clears all three `localStorage` keys instead of rendering a broken "logged in" shell. A pure network failure (no response) still falls back to the cached session optimistically, so a brief connectivity blip doesn't force a logout.
  - The mount effect now `Promise.all`s both `checkAdminExists()` and `checkExistingAuth()` before clearing `loading`, closing the race where routing decisions were made against `adminExists`'s unresolved default.
  - `checkAdminExists()` now retries up to 2 additional times (1s apart) before giving up, so a transient backend hiccup during app boot no longer permanently blocks reaching `/admin/setup`.
  - `api.js`'s response interceptor now also clears the cached `'user'` key on refresh failure (previously only cleared the two token keys), for consistency with the above.
- **Files Changed**:
  - `kartas-app/src/contexts/AuthContext.jsx` — Combined loading gate, server-validated session restore, retry on `checkAdminExists`
  - `kartas-app/src/services/api.js` — Response interceptor also clears cached `user` on refresh failure
- **Migration**: N/A
- **Status**: Done

## [2026-07-27] — UM-02 — Email-Based Invitations

- **Author**: Claude
- **PRD Requirement**: UM-02
- **Summary**: `POST /api/invites/generate` now attempts to send the invite link via email, on top of the existing link-only behavior. Added a dual-provider email backend selectable via a new `EMAIL_PROVIDER` env var (`smtp`, the default, or `gmail`) — an admin picks generic SMTP or a Gmail account (via nodemailer's `service: 'gmail'`, requiring a Google App Password rather than the account's real login password) without code changes. Email sending is best-effort and never fails the request: if the selected provider's credentials aren't set, or the send throws, the response still returns the invite link with a new `emailSent: false` field. `UserManagement.jsx`'s invite-success modal now shows "Invitation email sent to X" when `emailSent` is true, or a "share this link manually" fallback banner when false — the copyable invite-link input is shown unconditionally in both cases. Also fixed a pre-existing gap found while wiring this up: `FRONTEND_URL` (used by `inviteController.js` to build the invite link, and by `index.js` for CORS) was referenced in code but never actually passed through `docker-compose.yml`'s `api.environment` block, so it silently fell back to the hardcoded `localhost:5173` default even if set in `.env` — added it there alongside the new `EMAIL_PROVIDER`/`SMTP_*`/`GMAIL_*`/`EMAIL_FROM` vars, since without that fix the new email vars would have had the same silent no-op problem under the normal `docker-compose up` dev setup. Verified with SMTP/Gmail both unconfigured: `POST /api/invites/generate` returns `200` with `emailSent: false` and a working link, via a temp DB-seeded admin test user, cleaned up afterward.
- **Files Changed**:
  - `kartas-api/package.json` — Added `nodemailer` dependency
  - `kartas-api/src/config/email.js` — New: `emailConfig`, `isEmailConfigured`, `transporter`, branching on `EMAIL_PROVIDER` (`smtp` default / `gmail`)
  - `kartas-api/src/utils/mailer.js` — New `sendInviteEmail()` best-effort sender
  - `kartas-api/src/controllers/inviteController.js` — `generateInvite` calls `sendInviteEmail` and returns `emailSent`
  - `.env.example` / `.env` — Documented `FRONTEND_URL` (previously undocumented) and new `EMAIL_PROVIDER`/`SMTP_*`/`GMAIL_*`/`EMAIL_FROM` vars
  - `docker-compose.yml` — `api.environment` now passes through `FRONTEND_URL` and all new email vars (previously missing, so `.env` values never reached the container)
  - `kartas-app/src/pages/UserManagement.jsx` — `inviteEmailSent` state, conditional success/fallback banner in the invite modal
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-27] — UM-03 — Admin Direct User Registration

- **Author**: Claude
- **PRD Requirement**: UM-03
- **Summary**: Admins can now create user accounts directly (email, first/last name, role, temporary password) without going through the invite-link flow. New `POST /api/users` (admin-only, inline role check matching the rest of `userController.js`) pre-checks for a duplicate email, hashes the temp password with bcrypt, and inserts with `first_login = true` — reusing the existing `first_login` boolean that's already wired into the real force-password-change flow (`authController.changePassword` clears it to `false`; `Login.jsx` checks it after login to show the in-page password-change screen instead of navigating away). New users appear immediately in `UserManagement.jsx` since `getAllUsers` already orders by `created_at DESC` and the create handler re-fetches the list on success. Verified end-to-end: 201 on create, 400 on duplicate email, 403 for a non-admin caller, and a real login as the created user confirming `firstLogin: true` in the response — all via temp DB-seeded test users, cleaned up afterward.
- **Files Changed**:
  - `kartas-api/src/controllers/userController.js` — New `createUser` method
  - `kartas-api/src/routes/users.js` — New `POST /` route + `validateUserCreation` validator
  - `kartas-app/src/pages/UserManagement.jsx` — New "+ Create User" button, `showCreateUserModal`/`createUserForm` state, `handleCreateUser`/`closeCreateUserModal`, single-phase create-user modal
- **Migration**: N/A
- **Status**: Done
- **Note**: While researching this, found a separate, unused `userController.changePassword` method (wired to the dead route `PUT /users/password`, never called by the frontend) that references a `must_change_password` column which does not exist anywhere in the schema — pre-existing bug, left unfixed as out of scope for UM-03.

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
