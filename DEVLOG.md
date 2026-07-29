# DEVLOG — Kartas

Development log for all Kartas changes, across every phase. Each entry records what was done, which files changed, and the current status. This log is continuous — it is not reset when a new phase begins.

---

## [2026-07-29] — HIST-02 — Story Detail History Section

- **Author**: Claude
- **PRD Requirement**: HIST-02
- **Summary**: Added a "History" section to `StoryDetail.jsx` — the last section on the page, below Comments, per the PRD's explicit ordering. Consumes sub-phase 6.1's `HIST-01` endpoint (`GET /stories/:storyId/history`), fetched once on mount alongside the page's other data. Renders each entry via new `describeHistoryEntry()`/`formatRelativeTime()` helpers (new `kartas-app/src/utils/activity.js`) and a "Load more" button appends the next page (`offset = historyItems.length`) when `hasMore` is true. `describeHistoryEntry` is deliberately a lighter function than `ForYou.jsx`'s `describeActivity` — it never needs to describe or link to a *different* entity (the page itself already is the entity), so it skips the cross-entity-type/link branching that function needs. `formatRelativeTime` is genuinely shared logic though, and since this same page's new Comments section (`CMT-02`, below) also needed a relative-time formatter, extracting it now (rather than writing a third near-identical copy alongside `ForYou.jsx`'s and `UserDetail.jsx`'s existing ones) was the natural point to stop compounding that duplication — flagged as worth doing in the PRD's `FY-04` Design Note and in the prior sub-phase's kickoff prompt.
- **Files Changed**:
  - `kartas-app/src/utils/activity.js` — New `formatRelativeTime`, `describeHistoryEntry`
  - `kartas-app/src/pages/StoryDetail.jsx` — History section, `fetchHistory` with offset pagination
- **Migration**: N/A
- **Status**: Done
- **Verification**: `npm run build` clean. Backend endpoint already curl-verified in `HIST-01`'s entry above; no new backend surface here. Manual browser click-through handed off to the user.

---

## [2026-07-29] — CMT-02, CMT-03 — Comment Section UI & @Mention Autocomplete

- **Author**: Claude
- **PRD Requirement**: CMT-02, CMT-03
- **Summary**: Added a "Comments" section to `StoryDetail.jsx`, below Sub-items — the `comments` array `GET /stories/:storyId` already returned (confirmed unused by any frontend before this) is now rendered: avatar (`AssigneeAvatarWithHoverCard`, same component used everywhere else), name, relative timestamp (with "(edited)" when `updatedAt != createdAt`), content, and Edit/Delete controls gated the same way `CMT-01`'s backend permissions are (Edit: author only; Delete: author or global admin). A plain `<textarea>` (not `MarkdownEditor` — deliberately, per the PRD's "simple text input" requirement) composes new comments.
  New `MentionTextarea.jsx` component (mounted for both the new-comment composer and inline comment editing) implements `CMT-03`'s single-`@`-trigger autocomplete: on `@`, a regex (`/@([A-Za-z0-9][\w.\- ]{0,40})$/`) captures the in-progress term from the textarea up to the cursor, debounced 300ms (matching `UserSelect.jsx`'s existing pattern), searching `GET /users/search` and a new `GET /stories/search?projectId=&q=` in parallel and merging results into one dropdown (reusing the existing `.search-dropdown`/`.search-result-item` CSS, no new styling needed). Selecting an entry inserts plain text at the cursor — `@First Last` for a person, the bare ticket code (e.g. `RES-0002`) for a ticket — exactly as typed, no hidden markup.
  **Scope adjustment discovered during implementation**: the PRD's ticket-mention pattern assumed all three entity types (stories/epics/sub-tasks) have a stable short code, but `sub_tasks` has no such column in the schema (only `stories.story_id` and `epics.epic_id` do). Ticket mentions/search are scoped to **stories and epics only** — sub-tasks have no stable, unique, user-facing code to link them by, and inventing one (or a permalink/anchor system for sub-items) was judged out of scope for this already-large sub-phase. New backend `GET /stories/search?projectId=&q=` (`storyController.searchStories`, registered *before* `/:storyId` in `routes/stories.js` — required, since Express would otherwise route `/search` into the `:storyId` wildcard) searches both tables by code/title, mirroring `userController.searchUsers`'s existing `ILIKE`-both-sides pattern.
  Rendering resolved mentions as links: `getStory` now also fetches the project's members and story/epic codes once per request (not once per comment) and attaches a `mentions: { users, tickets }` array to each comment in its response — the frontend trusts this backend-resolved metadata rather than re-deriving it, so a person's name only becomes a link if they're an actual project member and a ticket code only links if it's a real ticket in this project. New `kartas-app/src/utils/mentions.jsx`'s `renderCommentContent()` turns a comment's plain text into text/link segments using that metadata (person mentions link to `UD-02`'s User Details page; story mentions to Story Detail; epic mentions to `/backlog?epic=:id`, matching the existing epic-badge-link convention used elsewhere in the app).
- **Files Changed**:
  - `kartas-api/src/controllers/storyController.js` — New `searchStories`; `getStory`'s comments query extended with `user_role`/`user_email` and per-comment `mentions` metadata
  - `kartas-api/src/routes/stories.js` — New `GET /search` route (before `/:storyId`)
  - `kartas-app/src/components/MentionTextarea.jsx` — New shared mention-autocomplete textarea
  - `kartas-app/src/utils/mentions.jsx` — New `renderCommentContent()`
  - `kartas-app/src/pages/StoryDetail.jsx` — Comments section, compose/edit/delete handlers
- **Migration**: N/A
- **Status**: Done
- **Verification**: `npm run build` clean. `GET /stories/search?projectId=4&q=RES` curl-verified returning both story and epic matches by code/title; `q` under 2 chars returns `[]`. Manual browser click-through (typing `@`, selecting a person/ticket, posting/editing/deleting a comment) handed off to the user.

---

## [2026-07-29] — CMT-01, CMT-04 — Comment Edit/Delete & Mention Notifications

- **Author**: Claude
- **PRD Requirement**: CMT-01, CMT-04
- **Summary**: New `PUT`/`DELETE /stories/:storyId/comments/:commentId` — `PUT` is author-only (403 otherwise); `DELETE` allows the author **or** a global admin (per `nextsteps.txt`'s explicit "only admins should be able to delete any comment" — no project-owner exception). Both follow the existing `addComment`'s access-check shape.
  New `comment_mentions` table (migration `011_add_comment_mentions.sql`) tracks who was `@mentioned` in a comment, deliberately **not** reusing `change_history` — that table's `user_id` column means "who performed the action" everywhere else it's used (activity feeds, story history), and repurposing it for "who was mentioned" would invert that meaning for every other consumer. New `kartas-api/src/utils/mentions.js` exports `resolveMentionedUsers(content, projectId)` (checks project members' `"@First Last"` against the raw comment text — matching `CMT-03`'s plain-text, no-hidden-token approach) and `resolveMentionedTickets(content, projectId)`, used by `addComment` (insert `comment_mentions` rows for each newly-mentioned member, excluding self-mentions) and the new `updateComment` (deletes and fully re-resolves `comment_mentions` for that comment on every edit, rather than diffing — reflects who is *currently* mentioned, so removing an `@mention` by editing stops it from surfacing in that person's future "Latest Activities" feed, `FY-04`, which is a later sub-phase and has no consumer of this table yet). `deleteComment` needs no manual `comment_mentions` cleanup — the FK cascades.
- **Files Changed**:
  - `kartas-api/src/migrations/011_add_comment_mentions.sql` — New `comment_mentions` table
  - `kartas-api/src/utils/mentions.js` — New `resolveMentionedUsers`, `resolveMentionedTickets`
  - `kartas-api/src/controllers/storyController.js` — New `updateComment`, `deleteComment`; `addComment` extended to insert mention rows
  - `kartas-api/src/routes/stories.js` — New `PUT`/`DELETE /:storyId/comments/:commentId` routes
- **Migration**: `011_add_comment_mentions.sql`
- **Status**: Done
- **Verification**: Migration applied cleanly (`docker-compose exec api npm run migrate`). Curl-verified end-to-end via two temp DB-seeded users on a real project: user A posted a comment mentioning user B by name and a ticket by code → `comment_mentions` row created for user B; user B (non-author, non-admin) got 403 on both `PUT` and `DELETE`; user A edited the comment to remove the mention → `comment_mentions` row correctly deleted; user B temporarily promoted to `admin` → successfully deleted user A's comment (200); user A successfully deleted their own separate comment (200). All seeded users, `project_members`/`comments`/`comment_mentions`/`change_history` rows cleaned up afterward — story 4's `comments`/`change_history` counts confirmed back to baseline (0 and 11 respectively).

---

## [2026-07-29] — HIST-01 — Story-Scoped History Endpoint

- **Author**: Claude
- **PRD Requirement**: HIST-01
- **Summary**: New `GET /stories/:storyId/history?limit=&offset=` returns a story's `change_history`, including its sub-tasks' changes (sub-task edits already carry the parent story's `story_id`, so no schema change was needed), paginated with the same `limit+1`-row `hasMore` pattern already used by `forYouController.getMyActivity` (default/initial page size 10, per the PRD, vs. that endpoint's 20). Comment entries are excluded — `HIST-02` (sub-phase 6.2) will show comments in their own section directly above history on the same page, so including them here would duplicate the same event. Filtered on `ch.field_changed != 'comment'` rather than `action_type != 'commented'`, since `field_changed = 'comment'` has always been set as a literal in `addComment`'s INSERT, even on rows predating migration 009's `entity_type`/`action_type` columns — more reliable than a `COALESCE`-derived default. Access-gated the same way as `GET /stories/:storyId` (project membership or global admin). No frontend UI yet — that's `HIST-02`.
- **Files Changed**:
  - `kartas-api/src/controllers/storyController.js` — New `getStoryHistory` method
  - `kartas-api/src/routes/stories.js` — New `GET /:storyId/history` route
- **Migration**: N/A
- **Status**: Done
- **Verification**: Curl-verified end-to-end via a temp DB-seeded test user (bcrypt-hashed, added to a real project's `project_members`, logged in for real via `POST /api/auth/login`): `GET /stories/4/history?limit=5` returned exactly 5 items ordered newest-first with `hasMore: true` against an 11-row story; a throwaway `field_changed='comment'` row inserted directly (newest `changed_at` of all rows for that story) was confirmed absent from the response even at `limit=1`, proving the exclusion filter works regardless of recency; unauthenticated request → 401; nonexistent story → 404. All seeded/inserted rows (temp user, `project_members` row, the throwaway `change_history` row) were deleted afterward — story 4's `change_history` count confirmed back to its original 11.

---

## [2026-07-29] — KAN-01, KAN-02, KAN-03 — Kanban Board Polish

- **Author**: Claude
- **PRD Requirement**: KAN-01, KAN-02, KAN-03
- **Summary**: Three related `KanbanBoard.jsx` fixes/additions, implemented together since all three touch the same modals/cards.
  **KAN-03**: Left-clicking a sub-task card previously opened `SubItemEditModal` directly in edit mode (`setSelectedSubtask`), unlike story cards which open a read-only view first. Changed the click handler to `setViewSubtask(item)` instead, matching story-card behavior — the existing read-only "View Sub-Item" modal (previously only reachable via right-click) is now also the left-click destination.
  **KAN-02**: Added an "Edit Story" link to the read-only Story View modal's footer (navigates to `/project/:projectId/story/:storyId`, same destination as the existing right-click "Edit Story" item) and an "Edit Sub-task" link to the Sub-Item View modal's footer — this one deep-links to `/project/:projectId/story/:parentStoryId?editSubItem=:subItemId`. `StoryDetail.jsx` now reads that `editSubItem` query param (via a new `useSearchParams` hook) once `fetchStory()` resolves, looks up the matching entry in the freshly-fetched `story.subTasks` (not the Kanban-shaped object passed across pages — avoids any cross-page shape mismatch), and opens `SubItemEditModal` in edit mode via the page's existing `openEditSubItem` handler — the same path its own per-row "Edit" button already uses. The query param is stripped immediately after use (`searchParams.delete` + `setSearchParams(..., { replace: true })`) so a later refetch (e.g. after saving) or a manual page refresh doesn't reopen the modal. Together, `KAN-02`+`KAN-03` mean sub-task edit access is preserved after `KAN-03`'s view-first change — just one extra click via the new button.
  **KAN-01**: The active-sprint header's "Elapsed Time" bar was a standalone `maxWidth: 280px` block with no siblings. Added a horizontal avatar row to its right, showing everyone currently assigned to at least one story/sub-task in the active sprint — derived client-side from the already-fetched `columns` board data (`columns.flatMap(col => col.stories)`, deduped by `assigneeId` via a `Map`), no new endpoint needed. Reuses the existing `AssigneeAvatarWithHoverCard` component unmodified, so hovering a participant shows the same name/role/email card used everywhere else in the app. Empty-participant sprints simply omit the avatar row.
- **Files Changed**:
  - `kartas-app/src/pages/KanbanBoard.jsx` — Sub-task card click handler, Edit buttons on both View modals, `participants` derivation + avatar row next to the Elapsed Time bar
  - `kartas-app/src/pages/StoryDetail.jsx` — `useSearchParams`-based auto-open of `SubItemEditModal` from `?editSubItem=`
- **Migration**: N/A
- **Status**: Done
- **Verification**: `npm run build` clean. Manual browser click-through handed off to the user (sub-task card → view not edit; both modals' new Edit buttons navigate correctly, including the deep-link auto-opening the right sub-item's edit modal; sprint header shows participant avatars with working hover cards).

---

## [2026-07-29] — UI-01 — Uniform Lateral Margins

- **Author**: Claude
- **PRD Requirement**: UI-01
- **Summary**: The 1200px-vs-1400px width difference between Story Detail and every other project page was controlled by a single conditional: `App.jsx`'s `ProjectLayoutShell` computed `isStoryDetail` from the URL and passed it as `ProjectLayout`'s `wide` prop, which conditionally applied `maxWidth: '1400px'`. Removed the conditional entirely — `ProjectLayout.jsx`'s container now always uses `maxWidth: '1400px'`, and the now-dead `isStoryDetail`/`wide` plumbing (including the `useLocation` import, since it had no other use in the file) was deleted from both files rather than left as unused code. Every page under `ProjectLayoutShell` (Backlog, Epics, Sprints, Kanban, Reports, Team, For You, Story Detail) now shares the same lateral margins; pages outside a project (`Dashboard.jsx`, `UserManagement.jsx`, `UserProfile.jsx`) are unaffected since they never render `ProjectLayout`.
- **Files Changed**:
  - `kartas-app/src/App.jsx` — Removed `isStoryDetail`/`useLocation`, removed `wide` prop pass
  - `kartas-app/src/components/ProjectLayout.jsx` — Removed `wide` prop, hardcoded `maxWidth: '1400px'`
- **Migration**: N/A
- **Status**: Done
- **Verification**: `npm run build` clean. Manual browser click-through handed off to the user (confirm no layout breakage — overflowing tables, mis-sized modals — across all affected pages at the new width).

---

## [2026-07-29] — Phase 6 Kickoff — PRD Created

- **Author**: Claude
- **PRD Requirement**: N/A (planning)
- **Summary**: Phase 5 is complete (see the summary entry immediately below, and `.planning/PRD_PHASE5.md`, archived from `.planning/PRD.md`). Drafted the Phase 6 PRD (`.planning/PRD.md`) from `.planning/nextsteps.txt`, covering seven areas: Kanban polish (sprint-participant avatars, View/Edit modal parity between stories and sub-tasks, a sub-task-card-click fix), a new story comment system with `@`-mention autocomplete for people and tickets, a story change-history section, a "For You" page overhaul (two new widgets — a bar-graph "Team Workload" view and a "Sprint Countdown" elapsed-time widget — a split activity feed, a grid layout, and full per-user widget customization), a per-user dark mode reachable from a new system-level "Settings" menu, an admin-only system-wide color palette with curated presets, and uniform lateral margins across all project pages. Research pass (three parallel `Explore` agents covering Kanban/For-You internals, comments/history/activity infrastructure, and the theming/layout system) confirmed: `recharts` and `@floating-ui/react` are already dependencies (no new packages needed this phase), the `comments` table and its `POST` endpoint already exist but are completely unwired in the frontend, `change_history` already links sub-task edits to their parent story via `story_id` (no new schema needed for story-scoped history to include sub-item changes), and the app's CSS-custom-property-driven styling (consumed via `var(--color-*)` in both CSS files and inline JS styles) makes a `data-theme`-attribute theme-swap architecturally low-risk. Four design ambiguities were resolved with the user via targeted questions before finalizing: `@`-mentions use a single auto-detected trigger rather than separate syntax for people vs. tickets; "Actions History" (renamed, unchanged data) and "Latest Activities" (new: others' actions on my items + mentions of me) are two separate widgets, not one broadened feed; admin palette customization targets a curated ~9-category set with derived shades rather than every individual CSS token; and the story history section includes sub-task changes, not just story-entity ones. Four migrations anticipated (`011`–`014`, for comment mentions, widget preferences, per-user theme preference, and system-wide theme settings); requirement IDs use new prefixes (`KAN-*`, `CMT-*`, `HIST-*`, `FY-*`, `DM-*`, `PAL-*`, `UI-*`) to avoid colliding with earlier phases'.
- **Files Changed**:
  - `.planning/PRD.md` — Rewritten as the Phase 6 PRD (prior Phase 5 content moved to `.planning/PRD_PHASE5.md`)
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-29] — Phase 5 Complete — All PRD Requirements Delivered

- **Author**: Claude
- **PRD Requirement**: All (`NAV-01`–`NAV-03`, `MD-01`–`MD-06`, `AV-01`–`AV-03`, `UD-01`–`UD-03`)
- **Summary**: Confirmed every requirement in `.planning/PRD.md` is implemented, verified, and logged in this file, across all 5 suggested implementation sub-phases:
  - **5.1 Foundations** — `NAV-01`, `NAV-02`, `AV-01`, `MD-01`
  - **5.2 Navigation Polish** — `NAV-03`
  - **5.3 Markdown Story Editing** — `MD-02`–`MD-06`
  - **5.4 Kanban People** — `AV-02`, `AV-03`
  - **5.5 User Details Page** — `UD-01`–`UD-03`

  Beyond the PRD's original scope, several rounds of user-driven follow-up — all logged individually above — extended and hardened the work: two rounds of markdown/layout polish after `5.3`; a Kanban badge/status/field-grid polish round; a fix for a long-standing bug where unassigning a story or sub-task silently never persisted (`COALESCE`-in-partial-update pattern); Kanban sub-task context-menu parity with the story menu (View/Edit/full Assign To); viewport-edge clamping for both Kanban context menus; and — after `5.5` shipped — extending the `AV-02`/`AV-03` avatar-and-hover-card pattern to three more surfaces (Backlog's Assignee column, Epic "Created by", Story Detail's sub-items list) plus a UI pass converting two "show completed" checkboxes to the app's lever-switch styling and decluttering the Backlog filter bar. User confirmed final testing: "That is it! Everything worked out like planned! We're done!"
  `README.md`'s "Features" and "Development Phases" sections updated with a Phase 5 summary, per the end-of-phase process rule. Phase 5 is complete.
- **Files Changed**:
  - `README.md` — Phase 5 feature summary and development-phases entry
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-29] — Extend avatar + hover card to Backlog assignee, Epic creator, and Story Detail sub-items

- **Author**: Claude
- **PRD Requirement**: N/A (user-requested extension of `AV-02`/`AV-03`'s pattern, post-Phase-5)
- **Summary**: `AssigneeAvatarWithHoverCard.jsx` (built in `AV-03` for the Kanban board only) is now also used in three more places, all reusing the exact same component unmodified — it was already generic enough (props: `assigneeId`/`assigneeName`/`assigneeRole`/`assigneeEmail`/`projectId`), it just needed each surface's data to actually include role/email.
  1. **`Backlog.jsx`'s Assignee column** — replaced the plain `story.assigneeName` text with the avatar+hover-card. The cell's existing `onClick` (opens the row's read-only story modal) required wrapping the avatar in a `<span onClick={(e) => e.stopPropagation()}>` so clicking/hovering it doesn't also pop the modal open.
  2. **`Epics.jsx`'s "Created by"** on each epic card — same treatment. Each epic card is itself wrapped in a `<Link>` (navigates to the backlog filtered by that epic) with an existing `e.target.closest('button')` escape hatch for its Edit/Delete buttons — added the same `stopPropagation()` wrapper so interacting with the creator avatar doesn't trigger that outer navigation. (The floating hover card itself is unaffected either way, since `@floating-ui/react`'s `FloatingPortal` renders it to `document.body`, outside the card's DOM subtree — the stopPropagation is only needed for clicks on the small trigger avatar itself.)
  3. **`StoryDetail.jsx`'s sub-items list** — upgraded from the plain `AssigneeAvatar` (no hover card, from `AV-02`) to `AssigneeAvatarWithHoverCard`, the same component already used on Kanban and now Backlog/Epics.
  **Backend**: none of the three backing endpoints previously selected the assignee's/creator's `role`/`email` (only `AV-03`'s `kanbanController.js` had been extended). Added `u.role as assignee_role, u.email as assignee_email` (or `creator_role`/`creator_email` for epics) to each query, mirroring the exact pattern from `AV-03`:
  - `storyController.js::getProjectStories` (Backlog's list endpoint) — plain SELECT addition, no `GROUP BY` (none exists in this query).
  - `storyController.js::getStory`'s sub-tasks query (Story Detail's endpoint) — same, no `GROUP BY`.
  - `epicController.js::getEpics` — this endpoint, unlike the others, doesn't remap to camelCase; it spreads the raw SQL row (`...epic`) into the response, so the new `creator_role`/`creator_email` columns needed no JS mapping change to appear — just the two SELECT columns, **plus** adding `u.role, u.email` to the existing `GROUP BY e.id, u.first_name, u.last_name` (this query aggregates `COUNT(s.id)`, so it does have one, unlike the story endpoints touched above). The frontend passes `epic.created_by` (the raw FK column, since this endpoint has no `creatorId` camelCase field) as `assigneeId` to the shared component — the prop names say "assignee" but the component is generic; it's just displaying whichever user object it's given.
- **Verification**: Backend curl-verified via a temp project member (no data mutated, pure reads): confirmed `GET /stories/project/4` returns correct `assigneeRole`/`assigneeEmail` for assigned stories, `GET /project/4/epics` returns correct `creator_role`/`creator_email`, and `GET /stories/6` returns correct `assigneeRole`/`assigneeEmail` for an assigned sub-task and `null`/`null` for an unassigned one (LEFT JOIN correctly returns null, not an error). Temp user cleaned up. `npm run build` clean; `docker-compose logs app` showed clean HMR updates for all three touched pages with no resolve errors.
- **Files Changed**:
  - `kartas-api/src/controllers/storyController.js` — `getProjectStories` and `getStory` (sub-tasks) now select/return `assigneeRole`/`assigneeEmail`
  - `kartas-api/src/controllers/epicController.js` — `getEpics` now selects `creator_role`/`creator_email` (`GROUP BY` extended)
  - `kartas-app/src/pages/Backlog.jsx` — Assignee column uses `AssigneeAvatarWithHoverCard`
  - `kartas-app/src/pages/Epics.jsx` — "Created by" uses `AssigneeAvatarWithHoverCard`
  - `kartas-app/src/pages/StoryDetail.jsx` — Sub-items list upgraded from `AssigneeAvatar` to `AssigneeAvatarWithHoverCard`
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-29] — Backlog/Epics "show completed" checkboxes → toggle switch; Backlog filter bar reorganized

- **Author**: Claude
- **PRD Requirement**: N/A (user-requested UI polish)
- **Summary**: Two independent UI requests:
  1. **Checkbox → switch**: `Backlog.jsx`'s "Show completed stories" and `Epics.jsx`'s "Show completed epics" plain `<input type="checkbox">` filters were converted to the same `.switch`/`.switch-track`/`.switch-thumb`/`.switch-text` toggle markup already used by `StoryDetail.jsx`'s "Blocked" field (`MD-03`-era polish round). That existing CSS hardcodes the "on" color to `var(--color-danger)` (red) via `.switch input:checked ~ .switch-track` — semantically right for "Blocked" but wrong for a neutral filter toggle. Added a new `.switch-primary` modifier (`index.css`, same selector shape/specificity so source order — placed after the base rule — decides which wins) that overrides the checked color to `var(--color-primary)`; both new switches use `className="switch switch-primary"`, leaving `StoryDetail.jsx`'s existing red Blocked switch completely untouched.
  2. **Backlog filter bar reorganization**: the "Show completed stories" switch moved out of the "Search and Quick Filters" row (previously a flex sibling of the search input and quick-filter buttons) and into the "Advanced Filters" section below, alongside the 5 dropdown filters (Type/Status/Assignee/Epic/Sprint) — six items total. That section's grid changed from `repeat(auto-fit, minmax(150px, 1fr))` (a variable number of columns depending on viewport width) to a fixed `repeat(3, 1fr)` so it's always exactly 3 per row (2 rows of 3, since 6 divides evenly), with the gap increased from `var(--spacing-sm)` to `var(--spacing-md)` for breathing room — matching the gap already used by `StoryDetail.jsx`'s own "compact fields" grid, for visual consistency between the two pages' denser-grid patterns.
- **Verification**: `npm run build` clean (pure CSS/JSX change, no backend involved). `docker-compose logs app` showed clean HMR updates for `Backlog.jsx`/`Epics.jsx`/`index.css`.
- **Files Changed**:
  - `kartas-app/src/index.css` — New `.switch-primary` modifier
  - `kartas-app/src/pages/Backlog.jsx` — "Show completed stories" checkbox → switch, moved into the Advanced Filters grid; grid changed to fixed 3-column with larger gap
  - `kartas-app/src/pages/Epics.jsx` — "Show completed epics" checkbox → switch
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-29] — UD-02 / UD-03 — "[Name]'s Details" Page + Navigation Into It

- **Author**: Claude
- **PRD Requirement**: UD-02, UD-03
- **Summary**: New project-scoped page at `/project/:projectId/user/:userId` (new `kartas-app/src/pages/UserDetail.jsx`, nested under `ProjectLayoutShell` in `App.jsx` alongside `story/:storyId` — no dedicated `Sidebar.jsx` nav entry, per Section 4). Header block, top to bottom per the PRD's literal ordering: a 56px `AV-01` avatar circle (reuses `.user-avatar`'s shape/color classes with inline size overrides — same technique already used elsewhere for size variants), the page title `"[First Last]'s Details"` (the name lives in the title, no separate repeated heading), then role/email as plain text below (no card chrome — this isn't `AV-03`'s hover card). Profile data (name/role/email) is sourced from `GET /projects/:projectId/members` — deliberately **not** the Kanban DTO's `assigneeRole`/`assigneeEmail` added in `AV-03`, since that's the global `users.role`, while this page (per the PRD's explicit data note) uses the project-scoped `project_members.role` (owner/member) — two different, intentionally different sources, not an inconsistency. Breadcrumb: "Projects / [Project Name] / Team Members / [First Last]'s Details", with "Team Members" linking to `/project/:projectId/team` (a new working intermediate crumb — previous breadcrumbs in this app only ever had project-name as the one non-terminal middle crumb; this is the first 4-level trail).
  Below the header: an assigned-work table and an activity feed, both close copies of `ForYou.jsx`'s existing table/list JSX (status colors/labels, `describeActivity`, `formatRelativeTime` — copied rather than extracted into a shared component, consistent with this codebase's established practice of not extracting shared UI across pages, per the PRD Section 4's "generic reusable Modal" decision and the equivalent already-duplicated `STATUS_OPTIONS` pattern in `KanbanBoard.jsx`/`Backlog.jsx`). Two adaptations from `ForYou.jsx`: empty-state copy is now third-person ("{firstName} doesn't have any tasks assigned...", "{firstName}'s recent actions...") since this is someone else's page, not "my" own; and the activity feed calls `UD-01`'s new endpoint with `?limit=15` and renders **no "Load More" button at all** (hard-capped per the PRD, not paginated like "For You"'s own feed).
  `UD-03`'s two navigation entry points: `ProjectView.jsx`'s Team Members table — member name is now a `<Link>` to `/project/:projectId/user/:userId` (previously plain text); and `AV-03`'s hover card (built in `5.4` against a route that didn't exist yet, by design per that session's PRD-ordering note) — no code change needed there, it already linked to the right URL shape, it just now actually resolves instead of hitting the app's catch-all redirect.
  **Incidental fix**: adding the `Link` import to `ProjectView.jsx` for the new member-name link also fixes the previously-flagged latent bug (`<Link to="/">` used in the "Project Not Found" branch with no `Link` import, which would have crashed if that branch were ever hit) — mentioning this explicitly since it was fixed as a side effect of unrelated work, not silently.
- **Verification**: `npm run build` clean; `docker-compose logs app` showed clean HMR updates for `App.jsx`/`ProjectView.jsx`/`UserDetail.jsx` with no resolve errors. Backend data paths (`GET /for-you/project/:projectId/user/:userId/tasks`/`.../activity`, `GET /projects/:projectId/members`) were already curl-verified in `UD-01`'s entry above and are unmodified here — no new backend surface, so no additional curl pass was needed for this pair. Manual browser click-through handed off to the user.
- **Files Changed**:
  - `kartas-app/src/pages/UserDetail.jsx` — New
  - `kartas-app/src/App.jsx` — New `user/:userId` route under `/project/:projectId`
  - `kartas-app/src/pages/ProjectView.jsx` — `Link` import added (also fixes a pre-existing missing-import bug); member name in the Team Members table is now a link to the new page
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-29] — UD-01 — Per-User, Per-Project Tasks & Activity Endpoints

- **Author**: Claude
- **PRD Requirement**: UD-01
- **Summary**: Generalized `forYouController.js`'s `getMyTasks`/`getMyActivity` (rather than duplicating them, per the PRD's explicit instruction) to accept an optional `:userId` route param — when present, the query targets that user's assigned stories/sub-tasks (`getMyTasks`) or authored activity (`getMyActivity`, keyed on `change_history.user_id`, unchanged semantics — "activity" has always meant "things this user did," not "things affecting this user's items"); when absent, both default to the caller (`req.user.userId`), preserving the existing "For You" page's behavior exactly. The access check is unchanged in spirit but now explicitly separates "caller" from "target": the caller must be a member of `:projectId` (or an admin) — the target user is looked up regardless of their own membership status, per the PRD's explicit note ("the target `:userId` is looked up regardless of the caller's own assignment"). New routes `GET /api/for-you/project/:projectId/user/:userId/tasks` and `.../activity` added alongside the existing `:projectId/tasks`/`:projectId/activity` routes (both point at the same controller methods — no route-level duplication either). `getMyActivity`'s `limit` query param already existed and needs no change — `UD-02` will simply call it with `?limit=15` and skip pagination, per the PRD ("hard cap of 15... not paginated"), which is a frontend concern, not a backend one. No schema changes — `change_history` already carries everything needed (`project_id`/`entity_type`/`action_type` from migration `009`).
- **Verification**: Curl-verified via two temp test users against the real "Reson8" project (project 4): (1) a temp project member's own tasks correctly returned `[]` (no assignments); (2) the same caller fetching `GET /for-you/project/4/user/2/tasks` correctly returned the *target* user's real assigned stories (`RES-0001`, `RES-0002`), not the caller's own (empty) set; (3) `GET /for-you/project/4/user/2/activity?limit=15` returned a correctly-shaped activity entry; (4) a second temp user who is *not* a project member got `403` when attempting the same `user/2/tasks` call, confirming the caller-membership gate still applies regardless of who the target is. Both temp users (and their `project_members`/`refresh_tokens` rows) cleaned up afterward — no story/sub-task data was created or mutated, only read. `npm run migrate` not needed (no migration).
- **Files Changed**:
  - `kartas-api/src/controllers/forYouController.js` — `getMyTasks`/`getMyActivity` now resolve an optional `req.params.userId` (defaulting to the caller) as the query target, separately from the caller-membership access check
  - `kartas-api/src/routes/forYou.js` — New `GET /project/:projectId/user/:userId/tasks` and `.../activity` routes
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-29] — Kanban context menus: viewport-edge clamping (flip up/left near screen edges)

- **Author**: Claude
- **PRD Requirement**: N/A (bug found by the user while testing the sub-task context menu enhancements below, fixed before continuing Phase 5)
- **Summary**: Both `KanbanBoard.jsx` context menus (story right-click, sub-task right-click) rendered at a fixed `top`/`left` equal to the raw cursor coordinates, with no viewport-edge awareness — right-clicking a card near the bottom (or right) of the screen rendered the menu partially or fully off-screen. Added a small shared `useClampedMenuPosition(x, y, visible)` hook: on open, it renders the menu invisible for one frame, measures its actual rendered size via `getBoundingClientRect()` in a `useLayoutEffect` (runs synchronously before the browser paints, so there's no flash at the wrong position), and flips the menu above/left of the cursor whenever it would overflow the bottom or right edge of the viewport (clamped to `0` as a floor, in case the menu is taller/wider than the viewport itself). Resets to unmeasured/hidden whenever the menu closes, so reopening at a new position never briefly shows a stale prior placement. Applied to both menus via their existing `ref`/`top`/`left` style props — no change to menu contents or any other behavior.
- **Verification**: `npm run build` clean. Pure frontend, no backend involved — user confirmed via manual click-through: "Everything tested and all is working perfectly."
- **Files Changed**:
  - `kartas-app/src/pages/KanbanBoard.jsx` — New `useClampedMenuPosition` hook; both context menus wired to use it instead of raw cursor coordinates
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-29] — Kanban sub-task context menu: View/Edit actions + full "Assign To" list

- **Author**: Claude
- **PRD Requirement**: N/A (user-requested follow-up after the unassign-bug fix, for parity with the story context menu)
- **Summary**: The sub-task right-click context menu only had "View Parent Story" / "Remove Assignee" (single conditional item, added in the unassign-bug fix above) / "Move To" / "Delete" — missing the "View"/"Edit" pair and the full "Assign To" member list that the story context menu already had. Added: a new read-only "👁️ View Sub-Item" quick-view modal (new `viewSubtask` state), mirroring the existing story quick-view modal's layout (Status/Story Points/Assignee badges + `MarkdownRenderer`'d description, no Blocked/Sub-tasks fields since those don't apply to sub-items) — this is a genuinely new surface, since sub-tasks previously had no read-only view, only the edit form (click-to-edit opens `SubItemEditModal` directly). A new "✏️ Edit Sub-Item" item reuses the existing `setSelectedSubtask` state (same action as clicking the card). The "Assign To" section was expanded from a single conditional "Remove Assignee" item into the full pattern already used by the story menu: header, conditional "🚫 Remove Assignee" (only when currently assigned), then the full project-members list — each member wired to the already-existing `handleAssignSubtask` handler. Deliberately did not add this same "View"/full-"Assign To" treatment to the "Move To" submenu or restructure the sub-task card's own click behavior (still opens edit directly) — out of scope, user only asked about the context menu.
- **Verification**: `npm run build` clean. Pure frontend, no backend involved (reuses the already-fixed `PUT /sub-tasks/:id` endpoint). User confirmed via manual click-through.
- **Files Changed**:
  - `kartas-app/src/pages/KanbanBoard.jsx` — New `viewSubtask` state + read-only view modal; new "View Sub-Item"/"Edit Sub-Item" context menu items; "Assign To" expanded to the full member list
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-29] — Fix: unassigning a story/sub-task assignee was silently a no-op

- **Author**: Claude
- **PRD Requirement**: N/A (bug found by the user while testing `AV-03`, fixed before continuing Phase 5)
- **Root Cause**: `storyController.updateStory` and `subTaskController.updateSubTask` both built their `UPDATE` statements with `assignee_id = COALESCE($n, assignee_id)`. `COALESCE` can't distinguish "field omitted from the request" (should keep the existing value) from "field explicitly sent as `null`" (should clear it) — both collapse to a bound SQL `NULL` parameter, so an explicit unassign silently fell back to the old value. This affected every existing "Unassigned" UI (Story Detail's assignee `<select>`, Backlog's bulk-assign toolbar, `SubItemEditModal`'s assignee field) even though all three already sent `assigneeId: null` correctly — the bug was entirely on the write path, not missing UI, for those three surfaces. Separately, the Kanban board's right-click "Assign To" submenu (story cards) had no "remove" option at all — only a list of members to assign *to* — and the sub-task context menu had no assignee-related actions whatsoever (by original design, per `ST-03`, since sub-tasks are click-to-edit).
- **Fix (backend)**: Both controllers now resolve `assigneeId` in JS before the query — `assigneeId !== undefined ? assigneeId : <current row's assignee_id>` — and bind that resolved value to a plain `assignee_id = $n` assignment instead of wrapping it in `COALESCE`. All other fields in both statements are untouched (still `COALESCE`-based partial updates) — this fix is scoped to `assignee_id` only, the field actually reported broken. Also updated the (currently unenforced — no `validationResult()` call exists anywhere in `kartas-api`, confirmed via search) `assigneeId` validators in `stories.js`/`subTasks.js` from `.optional().isInt()` to `.optional({ nullable: true }).isInt()` across all four occurrences, so an explicit `null` isn't rejected if validation enforcement is ever added later — a defensive fix for the same bug class, not a behavior change today.
- **Fix (frontend)**: Added a "🚫 Remove Assignee" item to `KanbanBoard.jsx`'s story right-click context menu, inside the existing "Assign To" block (above the member list), conditionally rendered only when the story currently has an assignee — reuses the existing `handleAssignStory(storyId, null)` call, which already forwarded whatever `assigneeId` it was given. Added a new `handleAssignSubtask(id, assigneeId)` handler (mirrors `handleAssignStory`, hits `PUT /sub-tasks/:id`) and a matching conditional "🚫 Remove Assignee" item in the sub-task context menu — deliberately just the one action (not a full "Assign To" member list), consistent with that menu's existing intentionally-trimmed scope (`ST-03`), since assigning *to* someone still happens via click-to-edit (`SubItemEditModal`), which already had a working "Unassigned" option once the backend fix landed.
- **Verification**: Backend verified via the temp-test-user pattern, using a throwaway story + sub-task (not any real data) to avoid touching anything the user might have open: created both assigned to a temp user, confirmed `PUT /stories/:id { assigneeId: null }` and `PUT /sub-tasks/:id { assigneeId: null }` each set `assignee_id` to `NULL` in the DB (previously silently kept the old value). Also confirmed no regression — a `PUT` that omits `assigneeId` entirely still leaves the existing assignee untouched. Cleaned up all temp rows (story, sub-task, project membership, refresh tokens, user) and confirmed zero orphaned `change_history` rows afterward. `npm run build` clean.
- **Files Changed**:
  - `kartas-api/src/controllers/storyController.js` — `updateStory`'s `assignee_id` handling no longer uses `COALESCE`
  - `kartas-api/src/controllers/subTaskController.js` — `updateSubTask`'s `assignee_id` handling no longer uses `COALESCE`
  - `kartas-api/src/routes/stories.js` — `assigneeId` validators accept explicit `null` (defensive, currently unenforced)
  - `kartas-api/src/routes/subTasks.js` — same
  - `kartas-app/src/pages/KanbanBoard.jsx` — New "Remove Assignee" item in the story context menu; new `handleAssignSubtask` handler + "Remove Assignee" item in the sub-task context menu
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-29] — AV-03 — User Hover Card

- **Author**: Claude
- **PRD Requirement**: AV-03
- **Summary**: Hovering a Kanban assignee avatar (`AV-02`) now shows a floating card — avatar, full name, role, email, and a copy-to-clipboard button — built on a new `@floating-ui/react` dependency (no existing tooltip/popover precedent anywhere in the app to reuse). Backend: `kanbanController.js`'s `getKanbanBoard` story and sub-task query paths now also select `role`/`email` from the already-joined `users` table (aliased `u1` for stories, `u` for sub-tasks) and expose them as `assigneeRole`/`assigneeEmail`, matching the existing `assigneeId`/`assigneeName` camelCase convention — the story query's existing `GROUP BY` had to gain `u1.role, u1.email` since it has aggregates (subtask counts); the sub-task query has no `GROUP BY` so the addition was a plain SELECT change. This means the hover card needs no per-hover round-trip, per the PRD's explicit goal. A pre-implementation ambiguity was resolved with the user: the codebase has two different "role" concepts for the same person (global `users.role`: admin/project_owner/member, vs. project-scoped `project_members.role`: owner/member, used by Team Members/planned `UD-02`) — the PRD's "joined from users" wording was confirmed to mean the global role, not the project-scoped one.
  Frontend: new presentational `UserHoverCard.jsx` (prop-driven, no internal fetch) and a new `AssigneeAvatarWithHoverCard.jsx` wrapper that composes `AV-02`'s existing `AssigneeAvatar` as the floating-ui reference/trigger and `UserHoverCard` as the floating content, using `useFloating` + `useHover({ handleClose: safePolygon(), delay: { open: 150, close: 0 } })` + `useDismiss` + `useInteractions`. `safePolygon()` is what satisfies the AC's "moving the cursor from the avatar toward the card must not cause it to vanish mid-transit" — it keeps the card open while the cursor crosses the triangular gap between trigger and card, which a plain `useHover` would not. Chose reference-anchored placement (`right-start` + `offset`/`flip`/`shift({ padding: 8 })`) over true cursor-coordinate tracking — the avatar is only 18px, so the two approaches are visually indistinguishable, and virtual-element cursor tracking would complicate `safePolygon()`'s bounding-box-based logic for no real benefit. The floating card renders via `FloatingPortal` (mounted at `document.body`) at `zIndex: 1000`, matching the app's existing floating-overlay tier (`.modal-overlay`, `.user-dropdown-menu`). The wrapper is used **only** at `KanbanBoard.jsx`'s two call sites (story cards, sub-task cards) — `AssigneeAvatar.jsx` itself and its separate `StoryDetail.jsx` sub-items usage are untouched, so Story Detail does not silently gain hover-card/navigate-away behavior. Unassigned items (`assigneeName` falsy) render the same plain dashed "?" circle as before with zero hover wiring attached. Clicking the avatar/name inside the card (only that block, not the whole card) links to `/project/:projectId/user/:userId` — `UD-02` (the target page) doesn't exist yet, so this currently falls through to the app's catch-all route and redirects to `/`, which is expected per the PRD's own suggested implementation order (5.4 before 5.5), not a bug.
  Installed `@floating-ui/react` following this project's established container-volume-sync procedure (host `npm install`, then `docker-compose exec -T app npm install`, clear `node_modules/.vite`, `docker-compose restart app`) — confirmed via container logs (`✨ new dependencies optimized: @floating-ui/react`, clean reload, no unresolved-import errors) and a direct `curl` of the new module (`200`).
- **Verification**: Backend verified via the temp-test-user pattern — seeded a temp member on the real "Reson8" project (no need to change any story's assignee; existing assigned stories/sub-tasks in the active sprint already had real assignees), logged in for real, confirmed `GET /kanban/project/4` returned correct `assigneeRole`/`assigneeEmail` for both a story and a sub-task assignee, matching the DB exactly. Cleaned up all temp `project_members`/`refresh_tokens`/`users` rows. `npm run build` clean. User confirmed full manual click-through: "Tested and everything worked out great!"
- **Files Changed**:
  - `kartas-api/src/controllers/kanbanController.js` — Story/sub-task queries + JS mapping extended with `assigneeRole`/`assigneeEmail`
  - `kartas-app/package.json` — Added `@floating-ui/react`
  - `kartas-app/src/components/UserHoverCard.jsx` — New
  - `kartas-app/src/components/AssigneeAvatarWithHoverCard.jsx` — New
  - `kartas-app/src/components/navigation.css` — New `.user-hover-card*` styles
  - `kartas-app/src/pages/KanbanBoard.jsx` — Both assignee-avatar call sites upgraded to `AssigneeAvatarWithHoverCard`
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-28] — AV-02 — Kanban Assignee Avatars (+ Story Detail sub-items extension)

- **Author**: Claude
- **PRD Requirement**: AV-02
- **Summary**: `KanbanBoard.jsx` rendered assignees on story cards and sub-task cards as raw `@FirstName` text (`item.assigneeName.split(' ')[0]`), with no visual distinction for unassigned items. Replaced both sites with a small (18px) avatar circle showing initials, using `AV-01`'s `getAvatarColor(seed)` for a per-user color keyed on `assigneeId` (stable even if a name is later edited) and a new `getInitialsFromFullName(fullName)` helper (`avatar.js`) that splits the API's single `"First Last"` string before delegating to the existing `getInitials(firstName, lastName)`. Unassigned items show a distinct muted, dashed-outline circle (`?` glyph) rather than a solid colored one, per the PRD's explicit "must remain visually distinct" requirement. No backend change was needed — `GET /kanban/project/:projectId` already returns `assigneeId` for both stories and sub-tasks.
  After initial verification, the user pointed out that the Story Detail (Edit Story) page's Sub-items list had the exact same `@FirstName` pattern (not originally in AV-02's PRD scope, which only named "Kanban... story cards and sub-task cards", but a direct extension of the same fix requested live). Since the avatar markup was now needed in two files, extracted it into a new shared `kartas-app/src/components/AssigneeAvatar.jsx` (`{ assigneeId, assigneeName }` props) instead of duplicating the JSX — `KanbanBoard.jsx` was refactored to consume the shared component (its local copy removed), and `StoryDetail.jsx`'s sub-items row now uses it too. The two supporting CSS classes were renamed from `.kanban-assignee-avatar`/`.kanban-assignee-unassigned` to generic `.assignee-avatar-sm`/`.assignee-avatar-sm-unassigned` (`navigation.css`, already imported by both consumers) since they're no longer Kanban-specific.
  The avatar is wrapped in a `<span data-assignee-id={...}>` with no hover/click handlers yet — deliberately left as a plain, distinct DOM node for `AV-03` (hover card) to attach to later, per the PRD's "avatar is the hover/click target for AV-03" note.
- **Verification**: `npm run build` clean (both before and after the sub-items extension). Manual browser click-through confirmed by the user: colored initials circles render correctly on Kanban story/sub-task cards and the Story Detail sub-items list; unassigned items show the dashed muted circle, clearly distinct from an assigned avatar; different assignees show different colors, consistent for the same assignee across surfaces; hover tooltip shows the full name; drag-and-drop unaffected. User confirmed "Everything worked out great!"
- **Files Changed**:
  - `kartas-app/src/utils/avatar.js` — New `getInitialsFromFullName(fullName)` export
  - `kartas-app/src/components/AssigneeAvatar.jsx` — New shared component
  - `kartas-app/src/components/navigation.css` — New `.assignee-avatar-sm`/`.assignee-avatar-sm-unassigned` styles
  - `kartas-app/src/pages/KanbanBoard.jsx` — Story card and sub-task card assignee text replaced with `AssigneeAvatar`
  - `kartas-app/src/pages/StoryDetail.jsx` — Sub-items list assignee text replaced with `AssigneeAvatar`
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-28] — Post-5.3 UI polish, round 2: field grid, Blocked switch, description containment, Kanban badges/status

- **Author**: Claude
- **PRD Requirement**: N/A (follow-up UI polish from user testing, on top of `MD-02`–`MD-06`)
- **Summary**: Four more issues reported after browser-testing `5.3`:
  1. **Story Detail compact fields row**: `repeat(auto-fit, minmax(160px, 1fr))` packed all six fields (Type, Status, Story Points, Assignee, Epic, Blocked) onto one line at the page's new 1400px width, reading as cramped. Changed to a fixed `1fr 1fr` grid, so fields now flow two per row across three rows.
  2. **Blocked field**: replaced the plain checkbox with a toggle switch (track + thumb, `--color-danger` when on, matching the existing "Blocked" badge's color language elsewhere in the app) built from a visually-hidden native checkbox plus CSS sibling selectors for state — keeps keyboard/focus-visible behavior without JS beyond the existing `onChange`. Label now sits above the control like every other field in the row, with the switch and its status text (`Blocked`/`Not blocked`) flex-aligned so they're vertically centered.
  3. **Description containment**: added a bordered, padded box around the description's rendered/edit content on `StoryDetail.jsx`, and — since the user asked for it to extend to "the Kanban view's 'view story' modal" — applied the same treatment to both `KanbanBoard.jsx`'s and `Backlog.jsx`'s quick-view modals (built together in `MD-04`, so kept in sync) for consistency. Iterated once within this round: the border initially wrapped the "Description" label + "Edit Description" button along with the content, which the user found visually redundant — moved the border to wrap only the content itself, with the label/button row sitting above it in normal flow.
  4. **Kanban polish** (unplanned, called out directly during this round): the Blocked/Story-Points/Sub-tasks badge row on Kanban story cards read as glued together — root cause was `.flex-gap-xs`, used in `KanbanBoard.jsx` but never actually defined in `index.css` (only `.flex-gap-sm`/`.flex-gap-md` existed), so the gap silently applied nothing. Added the missing utility class (fixes spacing everywhere else `.flex-gap-xs` is used too, not just this one spot). Separately, the Kanban quick-view modal rendered `selectedStory.status` as a raw enum string (e.g. `in_development`) — added a `STATUS_OPTIONS` array to `KanbanBoard.jsx` (same value→label→color mapping already used by `Backlog.jsx`'s status filter) and now render it as a colored badge, matching the rest of the app's status presentation.
- **Files Changed**:
  - `kartas-app/src/pages/StoryDetail.jsx` — Compact fields grid → `1fr 1fr`; Blocked checkbox → switch; description border scoped to content only
  - `kartas-app/src/pages/KanbanBoard.jsx` — New `STATUS_OPTIONS`; status rendered as colored badge; description border scoped to content-only scrollable region
  - `kartas-app/src/pages/Backlog.jsx` — Same description border/scroll treatment as `KanbanBoard.jsx`, for consistency
  - `kartas-app/src/index.css` — New `.switch`/`.switch-track`/`.switch-thumb`/`.switch-text` toggle styles; new `.flex-gap-xs` utility (previously referenced but undefined)
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-28] — Post-5.3 UI polish, round 1: markdown rendering spacing & modal scroll containment

- **Author**: Claude
- **PRD Requirement**: N/A (follow-up UI polish from user testing, on top of `MD-01`–`MD-06`)
- **Summary**: First round of issues reported after browser-testing `MD-02`–`MD-06`:
  1. **Markdown spacing**: `index.css`'s global `* { margin: 0; padding: 0; }` reset strips all default block spacing, but `.markdown-content` (from `MD-01`) only had rules for `code`/`pre`/`table` — headings, paragraphs, and lists rendered with zero spacing and lists lost their `padding-left`, so bullets sat flush against the left edge. Added a full rule set: sized/weighted headings, paragraph margins, list `padding-left` (fixing the left-margin issue) plus nested-list and task-list-checkbox spacing, blockquotes, links, `hr`, and table header styling.
  2. **`MarkdownEditor` Preview tab never scrolled**: it used `minHeight` on the preview container, which just grows to fit content instead of ever triggering `overflow`. Changed to a fixed `height` (matching the `rows` prop, same as the Write tab's textarea) so long previews now scroll inside a bounded box; also added a "Nothing to preview yet" placeholder for empty content.
  3. **Kanban/Backlog quick-view modals scrolled as one unit**: the whole `.card` had `maxHeight`/`overflowY: auto`, so the header and fields scrolled along with the description instead of staying put. Restructured both modals into a flex column — header and fields grid `flexShrink: 0`, only the description region `flex: 1; minHeight: 0; overflowY: auto`, footer pinned at the bottom.
- **Files Changed**:
  - `kartas-app/src/index.css` — Comprehensive `.markdown-content` spacing rules
  - `kartas-app/src/components/MarkdownEditor.jsx` — Preview tab fixed height + scroll, empty-state placeholder
  - `kartas-app/src/pages/KanbanBoard.jsx` — Quick-view modal restructured to flex column, description-only scroll region
  - `kartas-app/src/pages/Backlog.jsx` — Same restructure for its own quick-view modal
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-28] — Fix stale container node_modules after MD-01's `npm install` (react-markdown unresolved)

- **Author**: Claude
- **PRD Requirement**: N/A (infrastructure fix, same class of bug as the prior `nodemailer` incident)
- **Root Cause**: `MD-01` (Session 1) ran `npm install react-markdown remark-gfm` directly on the host inside `kartas-app/`, which correctly updated the host's `package.json`/`package-lock.json`/`node_modules`. But `docker-compose.yml`'s `app` service mounts `./kartas-app:/app` **plus a separate anonymous volume at `/app/node_modules`** — deliberately shadowing the bind mount so host-installed (possibly wrong-OS/arch) `node_modules` never leak into the container. That means the container's own `node_modules` volume never received the new packages, even though the bind-mounted `package.json` already listed them. Vite inside the container then failed with `Failed to resolve import "react-markdown" from "src/components/MarkdownRenderer.jsx"` the first time a page actually rendered `MarkdownRenderer`/`MarkdownEditor` (Session 1 verified with `npm run build` on the **host**, which uses the host's already-correct `node_modules` — so the mismatch went undetected until real browser click-through in Session 4).
- **Fix**: `docker-compose exec -T app npm install` (reads the bind-mounted `package.json`, installs into the container's own anonymous `node_modules` volume), then cleared Vite's dependency pre-bundle cache (`rm -rf node_modules/.vite`) and `docker-compose restart app` to force a clean re-optimization. Verified via `curl http://localhost:5173/src/components/MarkdownRenderer.jsx` that the transformed module now imports `react-markdown`/`remark-gfm` from `/node_modules/.vite/deps/...` successfully, and confirmed clean logs after restart (no more unresolved-import errors).
- **Takeaway for future sessions**: any `npm install <package>` run on the host for `kartas-app` (or `kartas-api`, which has the identical anonymous-volume pattern) must be mirrored with `docker-compose exec -T <service> npm install` before the dev container will actually have the new dependency — running the host install alone is not sufficient, and `npm run build` on the host will misleadingly still pass since it doesn't touch the container at all.
- **Files Changed**: None (no source changes — container state fix only)
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-28] — MD-02 — Story Creation Modal Revamp

- **Author**: Claude
- **PRD Requirement**: MD-02
- **Summary**: The create-story modal (`Backlog.jsx`, `showCreateModal`/`newStory`) stacked Type → Title → a plain `rows={5}` description textarea → Story Points vertically, capped at `max-width: 600px`, with description getting no more visual weight than any other field. Widened the modal to `850px`. Reordered so Title sits alone as a full-width row at the top, Type + Story Points sit together in a 2-column row directly below it (visually separated by a bottom border), and description — now the `MD-01` `MarkdownEditor` (Write/Preview tabs) instead of a plain textarea — takes the remaining space below with clearly more room (`rows={10}`). `handleCreateStory`'s `POST /api/stories` call is untouched — `MarkdownEditor`'s `onChange` already hands back a plain string, so `newStory.description` flows through exactly as before, just authored via markdown now.
- **Files Changed**:
  - `kartas-app/src/pages/Backlog.jsx` — Create-story modal widened and restructured; description field now `MarkdownEditor`
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-28] — MD-03 — Story Edit Page Revamp

- **Author**: Claude
- **PRD Requirement**: MD-03
- **Summary**: `StoryDetail.jsx` previously packed Title/Description/Type/Status/Blocked into a left column and Story Points/Assignee/Epic/Sprints into a right column of one tall 2-column grid, with description as just another `rows="6"` textarea among them, and inherited exactly the shared 1200px `.container` width from `ProjectLayout.jsx` like every other project page. Reorganized per the PRD: Title is now its own full-width row at the top; Type, Status, Story Points, Assignee, Epic, and Blocked sit in one denser `repeat(auto-fit, minmax(160px, 1fr))` row directly below it; the existing Sprint management block (current-sprint chips + add/remove UI, functionally unchanged) sits right after that row as its own section — kept intact rather than squeezed into the compact grid, since it's a whole mini-UI, not a simple field (resolved with the user before implementation). Description is below the Sprint block, **view-mode by default** (`MarkdownRenderer` of `formData.description`) with an "Edit Description" button; clicking it swaps in the `MarkdownEditor` pre-filled with the current text, plus its own Save/Cancel. This reuses the page's single existing `handleSave`/`formData` flow rather than adding a second save path — the edit toggle is purely a display concern, `formData.description` is still the one source of truth submitted by the page's normal "Save Changes" button. "Cancel" explicitly reverts `formData.description` back to the last-fetched `story.description` (not just hiding the editor) so an abandoned edit can't be silently included in a later full-page save. For the width increase (PRD: "enlarged relative to today's inherited container width"), confirmed via research that nesting a `.container-fluid` div (as `KanbanBoard.jsx` does) does **not** actually exceed the ancestor's cap — that class is `width: 100%`, it fills the parent, it doesn't escape it; `KanbanBoard.jsx`'s own past "full width" fix only removed a redundant *inner* 1200px wrapper, it never exceeded `ProjectLayout`'s outer 1200px either. Added a new optional `wide` boolean prop to `ProjectLayout.jsx` (inline `maxWidth: '1400px'` override on its container div when set — inline style beats the class rules regardless of CSS specificity, no new CSS needed) and had `App.jsx`'s `ProjectLayoutShell` detect the Story Detail route via `useLocation().pathname.includes('/story/')` and pass `wide` accordingly — scoped to this one page, no effect on any other project route's width.
- **Files Changed**:
  - `kartas-app/src/pages/StoryDetail.jsx` — Field regrouping, Sprint block repositioned, description view/edit toggle
  - `kartas-app/src/components/ProjectLayout.jsx` — New optional `wide` prop, inline max-width override
  - `kartas-app/src/App.jsx` — `ProjectLayoutShell` detects the Story Detail route and passes `wide`
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-28] — MD-04 — Kanban & Backlog Quick-View Modal Revamp

- **Author**: Claude
- **PRD Requirement**: MD-04
- **Summary**: Both `KanbanBoard.jsx`'s story-card-click modal and `Backlog.jsx`'s row-click modal (`selectedStory`, `max-width: 700px` each) rendered `description` as a plain `whiteSpace: 'pre-wrap'` paragraph, positioned *above* the Status/Blocked/Points/Assignee grid rather than below it, with no height cap — a long description could overflow the viewport. For both modals: widened to `850px` (matching `MD-02`), added `maxHeight: '85vh'` + `overflowY: 'auto'` directly on the card itself (previously only the outer fixed overlay scrolled, the card had no cap at all), reordered so the small-properties grid renders first and the description sits below it (correcting the pre-existing reversed order, to actually satisfy "grouped near the top, visually separated from description"), and swapped the plain paragraph for `<MarkdownRenderer content={selectedStory.description} />`. Both modals remain pure view-only, per the PRD — editing still only happens via `MD-03`'s Story Detail page; no Edit affordance was added to either.
- **Files Changed**:
  - `kartas-app/src/pages/KanbanBoard.jsx` — Quick-view modal widened, scrollable, reordered, markdown-rendered description
  - `kartas-app/src/pages/Backlog.jsx` — Same treatment for its own quick-view modal
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-28] — MD-05 — Epic Description Markdown

- **Author**: Claude
- **PRD Requirement**: MD-05
- **Summary**: `Epics.jsx`'s create/edit form used a plain `rows="4"` textarea for `formData.description`, and the epic card list rendered `epic.description` as a plain `<p className="text-muted">`. Swapped the form field for `MarkdownEditor` (no other layout changes — per the PRD, this is a lighter-touch swap, not a `MD-03`-style redesign) and the card's read-only display for `<MarkdownRenderer content={epic.description} className="text-muted" />`, preserving the existing muted visual tone by passing the class straight through. No other read-only epic-description surface exists elsewhere in the app (confirmed via research — there's no separate epic detail page).
- **Files Changed**:
  - `kartas-app/src/pages/Epics.jsx` — Create/edit textarea → `MarkdownEditor`; card description → `MarkdownRenderer`
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-28] — MD-06 — Sub-Item Description Markdown

- **Author**: Claude
- **PRD Requirement**: MD-06
- **Summary**: The shared `SubItemEditModal.jsx` (used from both `StoryDetail.jsx` and `KanbanBoard.jsx`) used a plain `rows={4}` textarea for `form.description`. Swapped it for `MarkdownEditor`, a clean drop-in — confirmed via research that the modal's `mode` prop (`create`/`edit`) never branches on this field, so no conditional logic was needed. Bumped the modal's `max-width` from `600px` to `650px`, a modest increase per the PRD (explicitly not matching `MD-02`'s full widening, since sub-item descriptions are typically shorter). Confirmed via research that no page renders a sub-item's description read-only anywhere else (`StoryDetail.jsx`'s Sub-items list only shows title/status/points/assignee) — so there was nothing else to update.
- **Files Changed**:
  - `kartas-app/src/components/SubItemEditModal.jsx` — Description textarea → `MarkdownEditor`; modal width `600px` → `650px`
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-28] — NAV-03 — Sidebar Project Identity Header

- **Author**: Claude
- **PRD Requirement**: NAV-03
- **Summary**: `NAV-01` moved the project name out of the top bar with a promise it would get a new home; this is that home. The sidebar's header (`Sidebar.jsx`) previously contained only the collapse-toggle button. Added a project-identity block directly below it: a square 2-letter project avatar (`border-radius: var(--radius-md)`, not a circle, per the PRD — distinct from the circular user avatars), the project name in bold, and the description in smaller muted text below it (omitted entirely, no empty gap, when the project has no description). The avatar reuses `AV-01`'s `getAvatarColor(seed)` (seeded on `projectId`, same hashed-palette convention as user avatars) plus a new `getProjectInitials(name)` export added to `avatar.js` — a project needs "first two characters of the name, uppercase" (e.g. "Reson8" → "RE"), a different extraction rule than the existing person-shaped `getInitials(firstName, lastName)`, so it's a small sibling function rather than a reuse of the same one. `GET /projects/:projectId` already returned `description` in its response (no backend change needed, unlike `NAV-02`'s `defaultLandingPage` addition) — `App.jsx`'s `ProjectLayoutShell` now also captures it into state and threads it through `ProjectLayout.jsx` as a new `projectDescription` prop down into `Sidebar.jsx`. Since `ProjectLayoutShell`'s fetch effect is already keyed on `[projectId]`, switching projects re-fetches and re-renders the whole block correctly with no stale-data risk. Per user preference, the collapsed sidebar keeps just the avatar visible (centered, name/description hidden) rather than hiding the whole block, matching how the existing nav items already collapse to icon-only.
- **Verification**: `npm run build` clean. No backend change, so no curl verification needed. Dev stack is running (`docker-compose up -d`, hot-reload) for the user's manual click-through — open a project, confirm the sidebar shows avatar/name/description below the collapse button, switch projects to confirm it updates (not stale), and collapse the sidebar to confirm only the avatar remains.
- **Files Changed**:
  - `kartas-app/src/utils/avatar.js` — New `getProjectInitials(name)` export
  - `kartas-app/src/App.jsx` — `ProjectLayoutShell` fetches/passes `projectDescription`
  - `kartas-app/src/components/ProjectLayout.jsx` — Passes `projectDescription` through to `Sidebar`
  - `kartas-app/src/components/Sidebar.jsx` — New project-identity block in `.sidebar-header`
  - `kartas-app/src/components/navigation.css` — New `.sidebar-project*` styles + collapsed-state override
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-28] — AV-01 — Shared Avatar Utility

- **Author**: Claude
- **PRD Requirement**: AV-01
- **Summary**: Avatar-initials markup was reimplemented independently in `UserDropdown.jsx` (a `getInitials()` local helper) and `UserSelect.jsx` (inline `user.firstName[0]}{user.lastName[0]`, no null-safety — would throw on an empty-string name), both rendering on a single fixed background color (`.user-avatar`'s CSS gradient, `.user-avatar-placeholder`'s solid `--color-primary`). New `kartas-app/src/utils/avatar.js` (first file in a new `utils/` directory — none existed in the frontend before) exports `getInitials(firstName, lastName)` (null-safe, matches original two-letter behavior) and `getAvatarColor(seed)`, a deterministic djb2-derived string hash mapping any seed (e.g. a user or project id) to one of 7 on-brand, white-text-contrast-safe palette colors (`--color-primary`, `--color-secondary`, `--color-success`, `--color-warning`, `--color-danger`, `--color-info`, `--color-primary-light`) — same seed always yields the same color, no `Math.random`. Both `UserDropdown.jsx` and `UserSelect.jsx` now call the shared utility and apply the per-user color via an inline `style={{ backgroundColor: getAvatarColor(user.id) }}` (previously not overridable — color was baked into the CSS class). `.user-avatar` (`navigation.css`) and `.user-avatar-placeholder` (`index.css`) had their hardcoded `background`/`background-color` declarations removed, keeping size/shape/font unchanged.
- **Files Changed**:
  - `kartas-app/src/utils/avatar.js` — New: `getInitials`, `getAvatarColor`
  - `kartas-app/src/components/UserDropdown.jsx` — Uses shared utility instead of local `getInitials()`; per-user avatar color
  - `kartas-app/src/components/UserSelect.jsx` — Uses shared utility (fixes null-safety gap); per-user avatar color
  - `kartas-app/src/components/navigation.css` — `.user-avatar` no longer hardcodes a background
  - `kartas-app/src/index.css` — `.user-avatar-placeholder` no longer hardcodes a background-color
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-28] — NAV-01 — Persistent "Kartas" App Identity in Top Bar

- **Author**: Claude
- **PRD Requirement**: NAV-01
- **Summary**: The top bar previously showed the Kartas logo, a `|` separator, and the current project's name (`<h2>{projectName}</h2>`) in `ProjectLayout.jsx` (project-scoped pages only); `Dashboard.jsx`, `UserManagement.jsx`, and `UserProfile.jsx` showed just the logo. Removed the project name and separator from `ProjectLayout.jsx`'s header entirely (the project identity moves to `NAV-03`'s sidebar header, not yet built) and added a plain "Kartas" text label next to the logo, in all four files, so the top bar now shows a consistent app-identity lockup everywhere. Per user preference, the logo and "Kartas" text share a single `<Link>` (whole lockup navigates together) rather than only the logo being clickable — each file's existing link destination is unchanged (`ProjectLayout.jsx` → `/project/:id/for-you`, the other three → `/`).
- **Files Changed**:
  - `kartas-app/src/components/ProjectLayout.jsx` — Removed project name/separator; logo+"Kartas" now a single link
  - `kartas-app/src/pages/Dashboard.jsx` — Logo+"Kartas" now a single link
  - `kartas-app/src/pages/UserManagement.jsx` — Logo+"Kartas" now a single link
  - `kartas-app/src/pages/UserProfile.jsx` — Logo+"Kartas" now a single link
- **Migration**: N/A
- **Status**: Done

---

## [2026-07-28] — NAV-02 — Breadcrumb Navigation

- **Author**: Claude
- **PRD Requirement**: NAV-02
- **Summary**: No breadcrumb trail existed anywhere in the app — `StoryDetail.jsx` had only a plain "← Back to Backlog" button. Added a new shared `Breadcrumb.jsx` (`items={[{label, to?}]}` prop; non-terminal items with a `to` render as `<Link>`s, the terminal item is always plain text) plus `.breadcrumb*` styles appended to `navigation.css`, and wired it into every page: Dashboard (single "Projects" crumb), the 8 project-scoped pages (`ForYou`, `Backlog`, `Epics`, `Sprints`, `KanbanBoard` — both its no-active-sprint and loaded branches, `SprintReports` — all 3 branches, `ProjectView`, `ProjectSettings`) each showing "Projects / [ProjectName] / [PageName]", `StoryDetail.jsx` showing "Projects / [ProjectName] / [StoryID] / Edit Story" (its old back-button removed entirely, replaced by the breadcrumb, per the PRD's "no duplicate back affordance"), and the unscoped system pages `UserManagement.jsx`/`UserProfile.jsx` showing a single crumb with their own page name and no "Projects" prefix — both keep their existing "← Go back to My Projects" link alongside the new breadcrumb (kept, not replaced, per user preference — the breadcrumb's terminal-only crumb has no link back to `/`, so removing the old link would have been a net navigation regression).
  Per user preference, the project-name crumb links to the project's actual per-user default landing page (not a hardcoded page), which required extending the backend: `projectController.getProject` (`GET /projects/:projectId`) now `LEFT JOIN`s `project_user_settings` (scoped to the requesting user, mirroring the existing pattern already used in `getUserProjects`) and returns `defaultLandingPage` (falling back to `'backlog'`, same convention as the existing list endpoint). `App.jsx`'s `ProjectLayoutShell` now captures `defaultLandingPage` alongside `projectName` and exposes both to nested project pages via `useOutletContext` (previously unused anywhere in the app) instead of each page re-fetching independently — several project pages (`Backlog`, `Sprints`, `KanbanBoard`, `StoryDetail`) had their own vestigial `/projects/:id` fetch whose result (`project` state) was never actually read anywhere in the file; those fetches were left in place (out of scope for this task) but are now redundant with the new context, worth flagging for future cleanup.
- **Verification**: `npm run build` clean. Backend change verified via the temp-test-user pattern: seeded a temp member on the real "Reson8" project with `project_user_settings.default_landing_page = 'kanban'` (a deliberately non-default value), logged in for real, confirmed `GET /projects/4` returned `"defaultLandingPage":"kanban"` (not the `'backlog'` fallback, proving the join actually reads the per-user row) — cleaned up all temp data (`project_user_settings`, `project_members`, `refresh_tokens`, `users` rows) afterward. Manual click-through of the rendered breadcrumb across all page types is still pending — dev stack is up (`docker-compose up -d`) for hands-on verification.
- **Files Changed**:
  - `kartas-app/src/components/Breadcrumb.jsx` — New shared component
  - `kartas-app/src/components/navigation.css` — New `.breadcrumb*` styles
  - `kartas-api/src/controllers/projectController.js` — `getProject` now returns `defaultLandingPage`
  - `kartas-app/src/App.jsx` — `ProjectLayoutShell` exposes `projectName`/`defaultLandingPage` via `useOutletContext`
  - `kartas-app/src/pages/Dashboard.jsx`, `ForYou.jsx`, `Backlog.jsx`, `Epics.jsx`, `Sprints.jsx`, `KanbanBoard.jsx`, `SprintReports.jsx`, `ProjectView.jsx`, `ProjectSettings.jsx`, `StoryDetail.jsx`, `UserManagement.jsx`, `UserProfile.jsx` — Breadcrumb wired in; `StoryDetail.jsx`'s old back button removed
- **Migration**: N/A (existing `project_user_settings` table from `010_project_user_settings.sql`)
- **Status**: Done

---

## [2026-07-28] — MD-01 — Markdown Editing/Rendering Infrastructure

- **Author**: Claude
- **PRD Requirement**: MD-01
- **Summary**: No markdown library existed in `kartas-app` (confirmed: no `react-markdown`/`marked`/`remark` in `package.json`). Added `react-markdown` + `remark-gfm` as new frontend dependencies. New `MarkdownRenderer.jsx` renders markdown read-only via `ReactMarkdown` with the GFM plugin (tables/strikethrough/task lists) — no `rehype-raw`, no `dangerouslySetInnerHTML`, so raw HTML embedded in a description is never executed (stored-XSS prevention, per PRD). New `MarkdownEditor.jsx` is a controlled component (`value`/`onChange`) with a Write/Preview tab pair: the Write tab is a full-width `<textarea>` (reusing the existing `.form-textarea` class); the Preview tab renders the same `value` through `MarkdownRenderer`, read-only — both tabs share the single `value` prop as their source of truth, so switching tabs never loses in-progress edits. No existing tab-switcher pattern existed anywhere in the app to reuse; built the toggle from two `.btn.btn-sm` buttons (`.btn-primary` for the active tab, `.btn-secondary` for the inactive one). Added baseline `.markdown-content` styling (headings/lists/code/pre/table) to `index.css` so rendered markdown isn't bare-unstyled-browser-default, especially for GFM tables. This requirement is infrastructure only — neither component is wired into any page yet; that starts with `MD-02` (Backlog create-modal) next. No backend changes needed — `stories.description` (and the other description-bearing columns) are already `TEXT` with no length cap, and `storyController.js` passes the field through untouched already.
- **Files Changed**:
  - `kartas-app/package.json` — Added `react-markdown`, `remark-gfm`
  - `kartas-app/src/components/MarkdownRenderer.jsx` — New
  - `kartas-app/src/components/MarkdownEditor.jsx` — New
  - `kartas-app/src/index.css` — New `.markdown-content` baseline styles
- **Migration**: N/A
- **Status**: Done

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
