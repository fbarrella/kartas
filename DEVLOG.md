# DEVLOG — Kartas

Development log for all Kartas changes, across every phase. Each entry records what was done, which files changed, and the current status. This log is continuous — it is not reset when a new phase begins.

---

## [2026-08-02] — KFA-01/ICON-01/KW-01 — Kanban Assignee Filter, Gear Settings Icon, Wider Columns

- **Author**: Claude
- **PRD Requirement**: KFA-01, ICON-01, KW-01
- **Summary**: The final three requirements of Phase 8 — small, independent UI changes with no backend/schema involved, closing out the phase. `KFA-01`: the previously decorative sprint-participant avatar row in `KanbanBoard.jsx` (next to the elapsed-time bar) is now clickable — a new `assigneeFilter` state, toggled per-avatar (click again to clear), with a highlighted ring (`box-shadow`) on the active avatar and a "Show all users" button appearing alongside the row whenever a filter is active. Implemented by wrapping each `AssigneeAvatarWithHoverCard` in a plain clickable `<div>` rather than modifying that shared component (it's reused elsewhere — Backlog, Story Detail — with no reason to touch its interface for a Kanban-only behavior). The existing `filterStories(stories)` helper (already shared by the type/search filter bar) gained one more predicate (`story.assigneeId !== assigneeFilter`), so it applies uniformly to both story and sub-task cards, and every column's count badge (already `filteredStories.length`) reflects the filter with no separate change needed. `ICON-01`: `UserDropdown.jsx`'s Settings link icon (a sun, left over from when Settings held only dark mode) is now the same gear/cog `<path>` `Sidebar.jsx` already uses for "Project Settings" — reused verbatim, just rescaled (`viewBox="0 0 24 24"` at this menu's existing `16×16` render size) rather than redrawn, for visual consistency between the app's two "settings" concepts. `KW-01`: Kanban column width bumped `300–350px → 360–410px` (flat +60px on both bounds, keeping the existing 50px spread) — a pure sizing tweak, same inline-style location `KFA-01` and this both touch.
- **Files Changed**:
  - `kartas-app/src/pages/KanbanBoard.jsx` — `assigneeFilter` state, clickable participant avatars, "Show all users" button, `filterStories` predicate, wider column `minWidth`/`maxWidth`
  - `kartas-app/src/components/UserDropdown.jsx` — sun icon replaced with the gear path
  - `kartas-app/src/locales/{en,es,pt-BR}/kanban.json` — new `showAllUsers` key
- **Migration**: N/A
- **Status**: Done — `cd kartas-app && npm run build` clean, dev server HMR picked up every change with no errors, all three edited locale JSON files validated as parseable. `KFA-01`'s click/toggle/highlight interaction and `KW-01`'s visual sizing weren't click-through verified by the agent (no browser-automation tool available this session, consistent with every prior frontend requirement this phase) — handed off for manual verification. `ICON-01` self-verified by confirming the pasted path is character-for-character identical to `Sidebar.jsx`'s source.

**Phase 8 is now complete** (`TFA-01`–`TFA-09`, `CAPTCHA-01`/`CAPTCHA-02`, `KFA-01`/`ICON-01`/`KW-01`) — see the `README.md` update logged separately below/above per this phase's process rules.

---

## [2026-08-02] — CAPTCHA-01/CAPTCHA-02 — Google reCAPTCHA v2 on Login, Register & Admin Setup

- **Author**: Claude
- **PRD Requirement**: CAPTCHA-01, CAPTCHA-02
- **Summary**: reCAPTCHA v2 checkbox verification on all three of the app's token-issuing entry points, per the resolved design decision (PRD Section 4) to use v2's unambiguous pass/fail over v3's score-threshold model, and to cover all three pages rather than just the literal sign-in form. `CAPTCHA-01`: new `RECAPTCHA_SITE_KEY`/`RECAPTCHA_SECRET_KEY` env vars (no database-backed admin settings — this PRD scopes CAPTCHA as env-var-only, like `JWT_SECRET`, not a runtime-editable settings card like `MAIL-01`/`BKP-01`). New `src/utils/recaptcha.js`'s `verifyRecaptcha(token, remoteIp)`: a no-op (`{success: true, skipped: true}`) when `RECAPTCHA_SECRET_KEY` is unset — mirrors `config/email.js`'s "unconfigured means the feature is silently off" convention, so local dev needs zero Google setup — otherwise a real `POST` to Google's `siteverify` endpoint via Node 18's built-in `fetch` (no new HTTP client dependency). Wired into `authController.login`, `authController.createAdmin`, and `inviteController.registerWithInvite`, each now reading an optional `recaptchaToken` from the request body and rejecting `400` on a failed/missing-when-required check, before any other logic in the handler runs. `CAPTCHA-02`: new `RecaptchaWidget.jsx` — no new npm dependency, per this codebase's established preference for avoiding unnecessary wrapper packages (same reasoning as the declined generic `Modal` shell); loads Google's plain `recaptcha/api.js` script once and renders the checkbox via `grecaptcha.render()`. Renders nothing when `VITE_RECAPTCHA_SITE_KEY` is unset, mirroring the backend's skip-when-unconfigured fallback. Mounted above the submit button on `Login.jsx`, `Register.jsx`, and `AdminSetup.jsx`; each page's submit button stays disabled until a token exists (only when the widget is actually configured/rendered), and each resets the widget (via a `resetKey` counter bump) on any failed submission so a stale or already-consumed token can't be silently resubmitted. `AuthContext.jsx`'s `login`/`createAdmin` gained a `recaptchaToken` parameter, forwarded straight through to their respective endpoints. `docker-compose.yml` maps the root `.env`'s `RECAPTCHA_SECRET_KEY` into the `api` service and `RECAPTCHA_SITE_KEY` into the `app` service as `VITE_RECAPTCHA_SITE_KEY` (mirroring how `VITE_API_URL` is already passed through) — both left blank in this dev environment's `.env`, so the feature is currently a no-op here, by design.
- **Files Changed**:
  - `kartas-api/src/utils/recaptcha.js` (new) — `verifyRecaptcha`
  - `kartas-api/src/controllers/authController.js` — `login`/`createAdmin` gated
  - `kartas-api/src/controllers/inviteController.js` — `registerWithInvite` gated
  - `kartas-app/src/components/RecaptchaWidget.jsx` (new) — the v2 checkbox widget + `isRecaptchaConfigured` export
  - `kartas-app/src/pages/Login.jsx`, `Register.jsx`, `AdminSetup.jsx` — widget mounted, submit gated, reset-on-failure
  - `kartas-app/src/contexts/AuthContext.jsx` — `login`/`createAdmin` accept and forward `recaptchaToken`
  - `docker-compose.yml` — `RECAPTCHA_SECRET_KEY` (api), `VITE_RECAPTCHA_SITE_KEY` (app)
  - `.env` / `.env.example` — new blank `RECAPTCHA_SITE_KEY`/`RECAPTCHA_SECRET_KEY` vars
- **Migration**: N/A
- **Status**: Done — `cd kartas-app && npm run build` clean, dev server HMR picked up every file with no errors. Backend verified via curl: with `RECAPTCHA_SECRET_KEY` unset (this environment's actual current state), `login`/`admin/setup`/`invites/register` all pass straight through to their real business logic with no `recaptchaToken` at all. The "configured but check fails" path was verified directly against Google's real `siteverify` endpoint (not mocked) by invoking `verifyRecaptcha` with a bogus secret+token via a one-off env override — confirmed `{success: false}` for both a missing token and an invalid token/secret pair, without needing a real Google key pair for this half of the verification. **Not verified**: an actual successful/passing reCAPTCHA round-trip, which requires a real site/secret key pair from the user for this dev domain — noted as a distinct, explicit ask rather than assumed; the app works correctly without it since the feature is a clean no-op when unconfigured, exactly as designed.

---

## [2026-08-02] — TFA-08/TFA-09 — Two-Factor Authentication (gating destructive actions & admin settings)

- **Author**: Claude
- **PRD Requirement**: TFA-08, TFA-09
- **Summary**: The last piece of the 2FA feature — gating specific actions behind the *actor's own* 2FA being enabled, per `nextsteps.txt`'s explicit ask, now that a real user has confirmed the enable/login-challenge/disable flow works end-to-end (manually verified by the user after sub-phase 8.2). `TFA-08` added an inline `!req.user.twoFactorEnabled` check (after the existing role/ownership check, matching each controller's existing style rather than introducing route-level middleware for these three specific endpoints) to `userController.deleteUser`, `projectController.deleteProject`, and `projectController.removeMember` — each returns `403 {error, code: 'TWO_FACTOR_REQUIRED'}`. The check applies to the *requester*, not the target, and fires regardless of whether they qualified via project ownership or global admin role. On the frontend, the existing delete-user button (`UserManagement.jsx`) and remove-member button (`ProjectView.jsx`) render disabled with a `title` tooltip when `!user.twoFactorEnabled` — a UX backstop, not the real enforcement. **No frontend trigger for project deletion exists anywhere in the codebase** (confirmed via investigation — the backend route works, nothing in the app calls it), so there was nothing to add a disabled state to there; flagged as a pre-existing gap, not something this requirement created or is expected to fix. `TFA-09` wired the `requireTwoFactor` middleware (built but unused since `TFA-01`) into `routes/systemSettings.js`, chained after `requireAdmin` on every *mutating* admin route: `PUT /theme`, `PUT /email`, `PUT /backup`, `POST /backup/run`, `POST /backup/restore` — deliberately including the backup run/restore actions, not just the three literal "settings" PUTs, since they're at least as consequential (see PRD Section 4's Design Decisions for the reasoning). Read-only `GET`s stay ungated. `Settings.jsx`'s Admin tab now shows a per-visit-dismissible banner when the admin viewing it lacks 2FA, and the Save/"Back up now"/Restore buttons in `AdminPaletteEditor.jsx`, `AdminEmailSettings.jsx`, and `AdminBackupSettings.jsx` (including the preset-thumbnail buttons, which persist immediately on click — not just the "Save custom palette" button) render disabled under the same condition.
- **Files Changed**:
  - `kartas-api/src/controllers/userController.js` — `deleteUser` 2FA check
  - `kartas-api/src/controllers/projectController.js` — `deleteProject`/`removeMember` 2FA checks
  - `kartas-api/src/routes/systemSettings.js` — `requireTwoFactor` chained onto every mutating route
  - `kartas-app/src/pages/UserManagement.jsx` — delete-user button disabled state
  - `kartas-app/src/pages/ProjectView.jsx` — remove-member button disabled state
  - `kartas-app/src/pages/Settings.jsx` — Admin-tab 2FA-required banner
  - `kartas-app/src/components/AdminPaletteEditor.jsx` — preset/save buttons gated (incl. `PresetThumbnail`'s new `disabled` prop)
  - `kartas-app/src/components/AdminEmailSettings.jsx` — save button gated
  - `kartas-app/src/components/AdminBackupSettings.jsx` — save/run/restore buttons gated
  - `kartas-app/src/locales/{en,es,pt-BR}/common.json` — shared `twoFactorRequiredTooltip` key
  - `kartas-app/src/locales/{en,es,pt-BR}/settings.json` — `page.twoFactorBanner` key
- **Migration**: N/A
- **Status**: Done — curl-verified end-to-end with the temp-test-user pattern: seeded a 2FA-less admin and confirmed `PUT /theme`/`POST /backup/run`/`DELETE /users/:id` all `403` with `code: TWO_FACTOR_REQUIRED`, confirmed `GET /theme` (read-only) is unaffected; enrolled a second temp admin in real TOTP (setup → generated a real code via a throwaway `otplib` script → confirm), then confirmed the identical requests succeed once 2FA is active, including a real login through the `/auth/2fa/verify` challenge. One real side effect from verification: the `PUT /theme` test round-tripped the actual palette (unchanged values) but stamped `system_theme_settings.updated_by` with the temp admin's id, which would have orphaned as a dangling FK reference on cleanup — caught and fixed by nulling `updated_by` before deleting the temp admin, rather than leaving a broken reference or falsely attributing it to a real admin. All seeded users and their cascaded rows cleaned up; the one real backup file/history row produced by the `POST /backup/run` test was left in place (a legitimate artifact, not test pollution, consistent with how Phase 7's `BKP-02` verification treated real backup runs). Frontend: `npm run build` clean.

---

## [2026-08-02] — TFA-06/TFA-07 — Two-Factor Authentication (frontend)

- **Author**: Claude
- **PRD Requirement**: TFA-06, TFA-07
- **Summary**: The 2FA frontend, wired to sub-phase 8.1's backend. `TFA-06` added a new "Two-Factor Authentication" card (`TwoFactorSettings.jsx`) to `Settings.jsx`'s **Personal** tab — deliberately not admin-gated, since every user manages their own 2FA regardless of role. Disabled state offers a method-choice modal ("Authenticator App" always enabled; "Email" disabled with a tooltip unless `GET /system-settings/email/status` reports `isConfigured: true`); each path's setup/confirm flow ends in a backup-codes-once modal (10 codes, copy-all action, a mandatory "I've saved these" checkbox gating the close button — the overlay's own click-outside-to-close is also suppressed until acknowledged). Enabled state offers "Regenerate backup codes" and "Disable", both password-re-entry modals. Every modal reuses `CloneStoryModal.jsx`'s existing fixed-overlay + `.card` pattern (no generic `Modal` shell exists in this codebase by design) via a small local `ModalShell` wrapper. `TFA-07` added the login-page challenge step to `Login.jsx` — mirrors the existing first-login password-change inline-swap pattern (`showPasswordChange`): when `login()` returns `{requiresTwoFactor, method, challengeId}` instead of a session, the form swaps to a code-entry screen with a "Use a backup code instead" toggle and, for the email method, a 60-second-cooldown "Resend code" action. `AuthContext.jsx` gained `establishSession()` (extracted from `login()`'s success path, mirroring the backend's `issueSession` split so the non-2FA and 2FA-verified login paths can never diverge in behavior), `verifyTwoFactor()`, `resendTwoFactorCode()`, and `setTwoFactorState()` (syncs the cached/in-memory user after Settings enables or disables 2FA without a second round-trip to `/users/profile`). Both new pages read/write namespaced i18n keys (`settings:twoFactor.*`, `auth:twoFactor.*`) across all three locales (`en`/`es`/`pt-BR`), matching this codebase's post-`I18N-02` convention that all new UI ships translated from day one rather than needing a second extraction pass later.
- **Small backend fix included**: `userController.getProfile` (used by `AuthContext.checkExistingAuth` to validate/refresh the cached session on every page load) didn't return `two_factor_enabled`/`two_factor_method` — added them, matching `themePreference`/`languagePreference`'s existing precedent, so a pre-2FA cached session correctly picks up 2FA state on refresh instead of showing it as permanently unknown.
- **Files Changed**:
  - `kartas-app/src/contexts/AuthContext.jsx` — extracted `establishSession`; new `verifyTwoFactor`, `resendTwoFactorCode`, `setTwoFactorState`; `login` branches on `requiresTwoFactor`
  - `kartas-app/src/pages/Login.jsx` — new inline 2FA challenge step, shared `handleAuthSuccess` helper
  - `kartas-app/src/components/TwoFactorSettings.jsx` (new) — full enable/manage/disable UI
  - `kartas-app/src/pages/Settings.jsx` — new card on the Personal tab
  - `kartas-app/src/locales/{en,es,pt-BR}/settings.json` — `page.twoFactor` + `twoFactor.*` keys
  - `kartas-app/src/locales/{en,es,pt-BR}/auth.json` — `twoFactor.*` keys
  - `kartas-api/src/controllers/userController.js` — `getProfile` returns `twoFactorEnabled`/`twoFactorMethod`
- **Migration**: N/A
- **Status**: Done — `cd kartas-app && npm run build` clean, dev server (Vite HMR) picked up every change with no compile errors across all edited files, all six new/edited locale JSON files validated as parseable. No browser-automation tool available this session, so interactive click-through (enable TOTP via the actual UI, log out and back in through the challenge screen, use a backup code, disable) was not performed by the agent — handed off for manual verification, consistent with this phase's established practice for anything screen-navigable. Backend contract (endpoint shapes, error codes) was already curl-verified end-to-end in the prior `TFA-01`–`TFA-05` entry, so this UI is wired against a proven-correct API.

---

## [2026-08-02] — TFA-01/TFA-02/TFA-03/TFA-04/TFA-05 — Two-Factor Authentication (backend foundation)

- **Author**: Claude
- **PRD Requirement**: TFA-01, TFA-02, TFA-03, TFA-04, TFA-05
- **Summary**: Full backend for Phase 8's per-user, opt-in two-factor authentication — the first sub-phase (8.1) of the new Phase 8 PRD. Supports two methods: TOTP (authenticator app, always available) and email-delivered codes (only offerable when the system's email settings are actually working, checked via a new non-admin-gated `GET /system-settings/email/status`). `TFA-01` added the schema (`users.two_factor_enabled/two_factor_method/totp_secret/totp_secret_pending`, new `two_factor_backup_codes` and `two_factor_challenges` tables) and extended `authenticateToken` to expose `req.user.twoFactorEnabled`, plus a new `requireTwoFactor` middleware (not wired into any route yet — that's `TFA-09` in sub-phase 8.3). `TFA-02`/`TFA-03` added TOTP and email enrollment (`twoFactorController.js`, new `/api/users/2fa/*` routes) — both follow a pending-then-confirmed pattern: nothing activates until one real code is verified. `TFA-04` added backup-code generation (`utils/twoFactor.js`'s `generateBackupCodes`, 10 single-use codes, bcrypt-hashed, shown once) and a password-re-auth-gated regenerate endpoint. `TFA-05` is the login step-up itself: `authController.login`'s token-issuing logic was extracted into a shared `issueSession(user)` helper (used by both the non-2FA path and the new verify endpoint, so their response shapes can't drift); a 2FA-enabled user's login now returns `{requiresTwoFactor, method, challengeId}` instead of tokens, completed via new unauthenticated `POST /api/auth/2fa/verify` (TOTP, email, or backup code — 5-attempt lockout per challenge, generic failure message that never reveals which check failed) and `POST /api/auth/2fa/resend`. Also added a `disable` endpoint (password re-auth, clears the method/secret/backup codes) since `TFA-06`'s Settings UI (sub-phase 8.2) needs it and it was trivial to build alongside `TFA-04`'s identical re-auth pattern.
- **Bug found and fixed during verification**: `issueSession`'s refresh-token `jwt.sign` call was deterministic per wall-clock second (HS256, no random payload component), so two logins for the same user within the same second produced an identical token string and hit `refresh_tokens.token`'s unique constraint, 500ing the request. Pre-existing in the original `login`/`createAdmin` code, never triggered before since a human wouldn't normally log in twice in one second — surfaced directly by curl-testing the new login→verify sequence back-to-back. Fixed by adding a random `jti` to the refresh token's payload in `issueSession`.
- **otplib version pin, worth remembering**: `otplib@latest` resolves to v13, a rewrite that removes the classic `authenticator` export this implementation (and the PRD's acceptance criteria) depends on. Pinned to `otplib@^12.0.1`, confirmed working via `authenticator.generateSecret()/keyuri()/verify()`. `qrcode@^1.5.4` had no surprises.
- **Files Changed**:
  - `kartas-api/src/migrations/020_add_two_factor_auth.sql` — `users` gains `two_factor_enabled`, `two_factor_method`, `totp_secret`, `totp_secret_pending`
  - `kartas-api/src/migrations/021_add_two_factor_backup_codes.sql` — new `two_factor_backup_codes` table
  - `kartas-api/src/migrations/022_add_two_factor_challenges.sql` — new `two_factor_challenges` table
  - `kartas-api/package.json` — added `otplib`, `qrcode`
  - `kartas-api/src/middleware/auth.js` — `authenticateToken` exposes `req.user.twoFactorEnabled`; new `requireTwoFactor` export
  - `kartas-api/src/utils/twoFactor.js` (new) — `generateBackupCodes`, `createEmailChallenge`, `resendEmailChallenge`
  - `kartas-api/src/utils/mailer.js` — new `sendTwoFactorCodeEmail`, same never-throws contract as `sendInviteEmail`
  - `kartas-api/src/controllers/twoFactorController.js` (new) — TOTP/email setup+confirm+resend, backup-code regeneration, disable
  - `kartas-api/src/routes/twoFactor.js` (new) — mounted at `/api/users/2fa`
  - `kartas-api/src/controllers/systemSettingsController.js` — new `getEmailStatus` (no admin gate)
  - `kartas-api/src/routes/systemSettings.js` — new `GET /email/status` route
  - `kartas-api/src/controllers/authController.js` — extracted `issueSession`; `login` branches on `two_factor_enabled`; new `verifyTwoFactor`/`resendTwoFactorChallenge`
  - `kartas-api/src/routes/auth.js` — new `POST /2fa/verify`, `POST /2fa/resend` (unauthenticated)
  - `kartas-api/src/index.js` — mounted `twoFactorRoutes`
- **Migration**: `020_add_two_factor_auth.sql`, `021_add_two_factor_backup_codes.sql`, `022_add_two_factor_challenges.sql`
- **Status**: Done — curl-verified end-to-end against a temp test user (TOTP setup/confirm, login challenge, wrong-code rejection, 5-attempt lockout, backup-code consumption + reuse rejection, disable with wrong/correct password, email setup/wrong-code/resend-cooldown). Email path's full success round-trip (entering a real received code) not verified — this dev environment sends through a real Gmail account with no inbox access from this session; the failure/throttle logic and the send-success signal (`emailSent: true`) were confirmed, and the success path reuses the same `bcrypt.compare` pattern already proven correct elsewhere (TOTP confirm, backup codes, password re-auth). All seeded rows (user, refresh tokens, backup codes, challenges) cleaned up via cascade delete.

---

## [2026-07-31] — I18N-01/I18N-02/I18N-03/I18N-04 — Internationalization (English, Spanish, Brazilian Portuguese)

- **Author**: Claude
- **PRD Requirement**: I18N-01, I18N-02, I18N-03, I18N-04
- **Summary**: Full i18n support across three locales (`en`/`es`/`pt-BR`), a per-user (not per-project) preference, matching `DM-03`'s theme-preference architecture almost exactly. `I18N-01` wired up `i18next`/`react-i18next`: eager-loaded namespace JSON files (`src/locales/{en,es,pt-BR}/*.json`, 13 namespaces — `common` plus one per feature area), no lazy backend/language-detector given the app's size, `src/i18n.js` initializes synchronously at module-import time reading `localStorage.getItem('language')` (same "no flash of wrong content before first paint" approach as theme's raw `data-theme` read). `I18N-03` added `users.language_preference` (mirrors `theme_preference` field-for-field: same migration shape, same `getProfile`/`createAdmin`/`login` response wiring, same `PUT /users/language` validation/update shape, same `applyLanguage()` helper in `AuthContext.jsx` called at all 5 of `applyTheme`'s call sites). `I18N-04` added a language `<select>` to Settings' Personal tab, right below the theme toggle, not admin-gated. `I18N-02` — the actual string-extraction sweep, by far the largest requirement in this phase — converted every hardcoded user-facing string across 19 pages and 24 components (43 files with real translatable content; 4 more — `ProjectLayout.jsx`, `MarkdownRenderer.jsx`, `MentionTextarea.jsx`, `AssigneeAvatarWithHoverCard.jsx` — were checked and correctly left untouched, no user-facing text of their own) to `t()` calls, populated with real (not machine-literal) translations in all three locales. Executed as 8 disjoint, file-partitioned groups running as parallel background agents directly against the shared working directory (a first retry after an earlier attempt failed: the initial launch mistakenly used `isolation: "worktree"`, which checks out each agent from the last *committed* state and so silently excluded all of `I18N-01`/`I18N-03`/`I18N-04`'s uncommitted infrastructure — combined with an unrelated session-limit outage that killed all 8 agents outright, nothing from that attempt landed; the two worktrees that had begun reconstructing infrastructure from scratch were discarded as not worth salvaging, and the sweep was relaunched without `isolation` so every group inherited the real infrastructure directly). Every group followed the same `{value, label}`-array rule established for `STATUS_OPTIONS`/`TYPE_OPTIONS`-style arrays elsewhere in the app: only the `label`/display text is ever translated, `value` fields (stable API/DB identifiers) are never touched — several groups converted module-level label maps into `t()`-driven lookups or `getXOptions(t)` factory functions where the array lived outside a component (where hooks aren't callable). One cross-cutting gap surfaced after all 8 groups finished: `src/utils/activity.js` (`formatRelativeTime`/`describeHistoryEntry`/`describeLatestActivity`) is a shared plain-function util consumed by files split across two different groups' scope (`dashboard`/`storyDetail`), so no single group owned it — patched directly afterward by threading `t` through as a parameter from each call site, with its relative-time/field-label strings added to `common.json` (genuinely cross-cutting) and its two message-template sets added to `dashboard.json`/`storyDetail.json` respectively.
- **Files Changed**:
  - `kartas-api/src/migrations/019_add_user_language_preference.sql` (new) — `users.language_preference`
  - `kartas-api/src/controllers/authController.js`, `userController.js` — `languagePreference` in profile/login/admin-setup responses, new `updateLanguagePreference`
  - `kartas-api/src/routes/users.js` — `PUT /users/language`
  - `kartas-app/package.json` — `i18next`, `react-i18next`
  - `kartas-app/src/i18n.js` (new), `kartas-app/src/locales/{en,es,pt-BR}/*.json` (new, 39 files)
  - `kartas-app/src/main.jsx` — side-effect `import './i18n'`
  - `kartas-app/src/contexts/AuthContext.jsx` — `applyLanguage()`, `updateLanguagePreference()`
  - `kartas-app/src/pages/Settings.jsx` — language `<select>` in the Personal/Appearance card
  - `kartas-app/src/utils/activity.js` — `t`-parameterized after the sweep, to cover the cross-group gap
  - 43 page/component files across the 8 sweep groups (19 pages, 24 components) converted to `useTranslation()` + `t()`
- **Migration**: `019_add_user_language_preference.sql`
- **Status**: Done
- **Verification**: `npm run build` clean after every group finished and again after the final `activity.js` patch (1279 modules, no errors). All 39 locale JSON files validated as parseable, with matching per-namespace key counts across all three locales (structural parity — no locale silently missing keys another has). A repo-wide heuristic grep for un-translated title-case JSX text turned up nothing beyond two intentional `<Trans>` fallback strings in `Sprints.jsx`. `I18N-03`'s endpoint re-verified end-to-end with a temporary seeded admin (real bcrypt hash, real login) after both containers needed restarting following an unrelated host-level outage: `PUT /api/users/language` round-tripped `pt-BR` correctly, rejected an invalid `fr` value with `400`, and `GET /api/users/profile` reflected the change; temp user deleted afterward. No browser-automation tool was available this session (`claude-in-chrome` reported not connected) — a full visual click-through across pages in Spanish and Portuguese is handed to the user, consistent with `I18N-04`'s precedent and this session's established pattern for manual-only verification steps.

---

## [2026-07-31] — BKP-01/BKP-02/BKP-03/BKP-04 — Backup & Restore

- **Author**: Claude
- **PRD Requirement**: BKP-01, BKP-02, BKP-03, BKP-04
- **Summary**: No backup, cron, or S3 functionality existed anywhere in this codebase before this work. New singleton `system_backup_settings` table (same `id=1` convention as `system_theme_settings`/`system_email_settings`) plus a `backup_history` audit table. Unlike `MAIL-01`'s fields, nothing here has an env-var fallback — every field is always editable; the S3 secret still follows the never-echoed masking convention (`{configured: boolean}`). New `backupService.js` runs `pg_dump -Fc` via `execFile` (array-args, never string-interpolated `exec`) against `DATABASE_URL` to a temp file, then uploads to the configured destination (local `fs.copyFile`, or a single S3 `PutObjectCommand` — true multipart wasn't needed at this app's realistic dump sizes), records a `backup_history` row, and prunes beyond `retention_count`. A module-level `node-cron` task is torn down and rebuilt from scratch whenever settings change (`rescheduleBackupJob`, mirroring `MAIL-02`'s "resolve fresh, no caching" philosophy applied to a cron task instead of a transporter) and re-initializes from persisted settings at server startup (`initScheduler()`, called from `index.js`'s `app.listen` callback) so a restart doesn't silently drop the schedule. `kartas-api/Dockerfile` now installs `postgresql16-client` via `apk` (confirmed directly against the running image: `node:18-alpine` already resolves to Alpine 3.21.3, which has this package available — no base-image pin needed) so `pg_dump`/`pg_restore` exist in the container, matching the `postgres:16-alpine` server's major version. New `AdminBackupSettings.jsx` (mirrors `AdminEmailSettings.jsx`'s structure) provides the settings form, a "Back up now" button, and a paginated history table (the same `{items, hasMore}`/"Load more" convention as `forYouController.js`/`SearchResults.jsx`) with a blob-based download handler (necessary since auth is JWT-in-header, not cookie-based — a plain `<a href>` can't carry it). `BKP-04` (restore) — the highest-blast-radius requirement in the whole Phase 7 PRD per the user's own resolved design decision — added `POST /api/system-settings/backup/restore`, accepting either a `multer`-uploaded file (explicit disk storage, not multer's memory-storage default, since `pg_restore` needs a real file path) or an existing `backupHistoryId` (resolving local files in place, or downloading an S3 object to a temp file first), running `pg_restore --clean --if-exists` via a manual callback-wrapped `execFile` that reliably captures `exitCode`/`stdout`/`stderr` on both outcomes. The frontend gates the restore button behind a literal `"RESTORE"` confirmation-phrase input (the first such pattern in this codebase — every prior destructive action just used a plain `window.confirm()`) plus an explicit warning about the single-process, brief-downtime nature of a restore.
- **Design note beyond the PRD's literal column list**: `backup_history.file_path` — added to reliably resolve a local backup's actual location for download/restore, since `system_backup_settings.local_path` can change after a backup was already written; re-deriving from *current* settings at download/restore time would silently break older rows.
- **Files Changed**:
  - `kartas-api/src/migrations/018_add_system_backup_settings.sql` — new `system_backup_settings` + `backup_history` tables
  - `kartas-api/src/services/backupService.js` (new) — `runBackup`, `pruneOldBackups`, `restoreBackup`, S3 helpers, cron scheduler
  - `kartas-api/src/controllers/backupController.js` (new) — `getSettings`/`updateSettings`/`getHistory`/`runNow`/`downloadBackup`/`restore`
  - `kartas-api/src/routes/systemSettings.js` — six new `/backup*` routes, `multer` disk-storage config
  - `kartas-api/src/index.js` — `initScheduler()` call in the `app.listen` callback
  - `kartas-api/Dockerfile` — `apk add postgresql16-client`
  - `kartas-api/package.json` — `@aws-sdk/client-s3`, `multer` (bumped to `^2.0.0` after `npm install` initially resolved a deprecated, known-vulnerable `1.x` patch), `node-cron`
  - `.gitignore` — `kartas-api/backups/` (real DB dumps must never be committed)
  - `kartas-app/src/components/AdminBackupSettings.jsx` (new) — settings form, history table, restore section
  - `kartas-app/src/pages/Settings.jsx` — renders the new "Backups" card under the Admin tab
- **Migration**: `018_add_system_backup_settings.sql`
- **Status**: Done
- **Verification**: Extensive curl verification with temporary seeded admins (bcrypt-hashed, real login for real JWTs, all deleted afterward along with their `refresh_tokens` rows): all five `updateSettings` validation guards (`400` for bad `destinationType`, missing S3 fields, malformed `scheduleTime`, missing `scheduleDayOfWeek` on weekly, non-positive `retentionCount`); S3 secret masking and "blank submit = leave unchanged" round-trip; a real manual backup produced an actual `.dump` file on the host (via the existing `./kartas-api:/app` bind mount — no new docker-compose volume needed) with a matching `backup_history` row; retention pruning verified by lowering `retention_count` and running several more backups, confirming both the DB rows and the files on disk were pruned correctly; the download endpoint returned a genuine, valid PostgreSQL custom-format dump with the correct `Content-Disposition` header; the scheduler survived a full API container restart (settings persisted, correctly rescheduled with no errors). One real bug caught and fixed during verification: `updateSettings` was nulling out the `NOT NULL` `local_path` column whenever the destination was `'s3'` and `localPath` wasn't submitted — fixed to fall back to the current value. `npm run build` clean for the frontend; both containers restart cleanly with no import/module errors (one transient `ERR_MODULE_NOT_FOUND` for `multer` immediately after the Dockerfile rebuild was the same "anonymous `node_modules` volume didn't get recreated" issue already known from the frontend — resolved via `docker-compose exec api npm install` inside the running container, not a real bug). Non-admin access confirmed `403` on both settings and restore endpoints. `BKP-04`'s restore path was verified in two stages, per the plan's explicit safety requirement never to run a real restore without a separate go-ahead: first, every failure path was proven safe (missing input → `400`; nonexistent `backupHistoryId` → `404`; an invalid dump file upload correctly reached `pg_restore` via `multer`'s disk storage and failed cleanly with a captured exit code/stderr, without touching any real data, since `pg_restore` validates the archive header before executing anything destructive); then, with the user's explicit go-ahead, one real end-to-end restore was performed as a true no-op (take a fresh backup of the live dev DB, then restore from that exact same backup) — confirmed successful (`{success: true}`), the connection pool reconnected automatically with no app restart needed, and the DB's actual state (project count, theme settings) was identical before and after. All backup files, history rows, and temporary users from every verification pass were cleaned up afterward, and `system_backup_settings` was reset to its disabled, local-destination defaults.

---

## [2026-07-31] — MAIL-03 — Admin Email Settings UI

- **Author**: Claude
- **PRD Requirement**: MAIL-03
- **Summary**: New `AdminEmailSettings.jsx`, mirroring `AdminPaletteEditor.jsx`'s structure (own `loading`/`error`/`saving`/`successMessage` state, fetch-on-mount, `api.get`/`api.put`, matching `alert alert-success` styling) so the two admin cards on the Settings page stay visually consistent. Fetches `GET /system-settings/email` (`MAIL-01`) and renders a form: Provider select (SMTP/Gmail), conditional field groups for whichever provider is selected (SMTP: host/port/TLS toggle/user/password; Gmail: address/app password), From address, a plain `<textarea>` for the custom invite message (no markdown editor — matches `CMT-02`'s "no visual changes on plain text" precedent), and invite expiry in days. Every field disables and shows a "Set via environment variable" hint when its `source` is `'env'`. Password fields use a dedicated `PasswordField`: env-locked shows a masked, disabled `••••••••`; DB-sourced starts blank (never pre-filled with a fake placeholder) with a `configured`-aware placeholder — submitting blank means "leave unchanged," enforced by only including a password key in the `PUT` payload when it's non-empty. The submit payload itself only includes keys that are actually `editable`, so an env-locked field's draft value (a disabled input's displayed value) is never sent, even though the backend's own `pick()` logic would silently ignore it anyway. Wired into `Settings.jsx`'s existing Admin tab (from `SET-01`), replacing the placeholder comment left there.
- **Files Changed**:
  - `kartas-app/src/components/AdminEmailSettings.jsx` (new)
  - `kartas-app/src/pages/Settings.jsx` — imports and renders `AdminEmailSettings` inside the Admin tab's "Email Configuration" card
- **Migration**: N/A
- **Status**: Done
- **Verification**: `npm run build` clean; confirmed via `docker-compose logs app` that the dev container picked up the change with no import/resolution errors after a fresh restart (one stale error in the log predates this change — the already-documented `SET-01` premature-import incident, confirmed by timestamp, not a new issue). No browser-automation tool available this session — manual click-through (confirm env-locked fields — `provider`/`gmailUser`/`emailFrom`, all real in this dev environment — render disabled with the env hint and the real secret is never visible; confirm SMTP fields can be edited and saved; confirm the custom invite message and expiry fields round-trip) handed off to the user, consistent with `MAIL-01`'s backend already being curl-verified against this exact live configuration and `MAIL-02`/`MAIL-04`'s real end-to-end invite-send regression check.

---

## [2026-07-31] — MAIL-04 — Customizable Invite Message & Expiry

- **Author**: Claude
- **PRD Requirement**: MAIL-04
- **Summary**: `inviteController.js`'s `generateInvite` now calls `getEmailConfig()` and uses `emailConfig.inviteExpiryDays` (admin-configurable via `MAIL-01`'s settings, default 7) instead of the previously hardcoded `7 * 24 * 60 * 60 * 1000`. `emailConfig.inviteMessage`, when set, is passed through to `sendInviteEmail` and spliced into both the plain-text and HTML invite email bodies as a lead paragraph ahead of the standard "You've been invited..." copy — the invite link and expiry lines are always present regardless of customization. The message is not HTML-escaped: only admins can set it, matching the same trust level already given to the unescaped `role` interpolation in the same template — an accepted low-risk choice, not a gap.
- **Files Changed**:
  - `kartas-api/src/controllers/inviteController.js` — `generateInvite` uses `getEmailConfig()` for expiry + message
  - `kartas-api/src/utils/mailer.js` — `sendInviteEmail` accepts `inviteMessage`, splices it as a lead paragraph in both text/HTML bodies
- **Migration**: N/A (uses `MAIL-01`'s existing `system_email_settings` columns)
- **Status**: Done
- **Verification**: Set `inviteMessage`/`inviteExpiryDays` via `PUT /api/system-settings/email` to `"We would love to have you on the team!"` / `3`, then called `POST /api/invites/generate` — confirmed `expiresAt` landed exactly 3 days out (custom value, not the old hardcoded 7) and `emailSent: true` (send succeeded with the custom message spliced in via the same live Gmail relay). All test settings/invite rows/temp user cleaned up afterward (see `MAIL-02` entry below — same verification pass covered both).

---

## [2026-07-31] — MAIL-02 — Runtime Nodemailer Reconfiguration

- **Author**: Claude
- **PRD Requirement**: MAIL-02
- **Summary**: Fixed the actual bug this requirement targets: `kartas-api/src/config/email.js` previously computed `transporter`/`isEmailConfigured`/`emailConfigStatus` once at module load time (frozen by Node's ES-module caching), so admin edits to `system_email_settings` (via `MAIL-01`'s new endpoints) would never take effect without a full server restart. Replaced with an async `getEmailConfig()` that queries `system_email_settings` fresh on every call and resolves each field env-wins-else-database (identical precedence to `systemSettingsController.js`'s per-field logic), plus a pure `buildTransporter(cfg)` that takes an already-resolved config rather than re-querying — so a single send only reads the DB once. Deliberately no caching: invite volume is tiny, `nodemailer.createTransport()` is cheap (no connection opens until `.sendMail()` runs), and a cache would need its own invalidation-on-settings-change logic that "just rebuild every time" gets for free. `kartas-api/src/utils/mailer.js`'s `sendInviteEmail` updated to `await getEmailConfig()` once and pass the result to `buildTransporter()`.
- **Files Changed**:
  - `kartas-api/src/config/email.js` — replaced frozen module-load-time consts with async `getEmailConfig()` + pure `buildTransporter(cfg)`
  - `kartas-api/src/utils/mailer.js` — `sendInviteEmail` updated to the new async API
- **Migration**: N/A
- **Status**: Done
- **Verification**: Since this refactor touches the real invite-email send path (flagged explicitly in the sub-phase plan as needing more than curl), triggered two genuine end-to-end sends through the live Gmail relay using a temporary seeded admin (deleted afterward along with its refresh token) — targeted at disposable-inbox addresses (`@mailinator.com`) rather than any real person's mailbox, so no third party was affected. Confirmed `POST /api/invites/generate` returns `emailSent: true` with no `emailReason`/`emailDetail`, proving the refactored `getEmailConfig()`/`buildTransporter()` path builds a working transporter and sends successfully against the live env-configured Gmail credentials, immediately after a full API container restart (ruling out any stale-module-cache false positive). All test invite rows, the temp admin user, and its refresh token were deleted afterward; `system_email_settings` reset to its pre-test defaults.

---

## [2026-07-31] — MAIL-01 — System Email Settings Backend

- **Author**: Claude
- **PRD Requirement**: MAIL-01
- **Summary**: New `system_email_settings` singleton table (same `id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1)` pattern as `PAL-01`'s `system_theme_settings`) holds admin-configurable SMTP/Gmail credentials, the `From` address, and the invite message/expiry-days that `MAIL-04` will consume. Every credential field follows an env-wins-else-database precedence: `systemSettingsController.js`'s new `getEmail`/`updateEmail` methods check a fixed list of env vars (`EMAIL_PROVIDER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM`) per field; if set, that field reports `source: "env"` and `editable: false` and any submitted value for it is silently discarded server-side on `PUT` (never persisted over the DB value), even though a disabled frontend input would submit its displayed value on a plain form POST. Secret fields (`smtpPassword`, `gmailAppPassword`) never echo their real value in either direction — only `{source, editable, configured}` — matching this session's established secret-masking convention. Both endpoints are admin-only (`requireAdmin`), unlike `PAL-01`'s public `GET /theme`, since email config is operational/sensitive with no non-admin read need. Manual validation guard (`provider` must be `smtp`/`gmail`, `smtpPort`/`inviteExpiryDays` must be valid integers in range) follows the same hand-written pattern as `updateTheme`, since `validationResult()` is never enforced anywhere in this codebase.
- **Files Changed**:
  - `kartas-api/src/migrations/017_add_system_email_settings.sql` — new table + seed row
  - `kartas-api/src/controllers/systemSettingsController.js` — `EMAIL_FIELDS` descriptor list, `getEmail`, `updateEmail`
  - `kartas-api/src/routes/systemSettings.js` — `GET`/`PUT /api/system-settings/email`, both `requireAdmin`
- **Migration**: `017_add_system_email_settings.sql` — idempotent (`CREATE TABLE IF NOT EXISTS` + `ON CONFLICT (id) DO NOTHING`), ran via `docker-compose exec -T api npm run migrate`
- **Status**: Done
- **Verification**: Curl-verified end-to-end against the real dev environment's live Gmail env configuration using a temporary seeded admin user (bcrypt-hashed password, real login for a real JWT, deleted afterward along with its `refresh_tokens` row). Confirmed: (1) `GET /api/system-settings/email` returns `source: "env"`/`editable: false` for `provider`/`gmailUser`/`emailFrom` (the real env-configured fields) without ever exposing `GMAIL_APP_PASSWORD`'s value; (2) `PUT` with DB-only fields (`smtpHost`, `smtpUser`, `smtpPassword`, `inviteMessage`, `inviteExpiryDays`) correctly persisted and were reflected on a subsequent `GET`, with the password field showing only `configured: true`; (3) a `PUT` attempting to override `provider`/`gmailUser` (env-locked fields) was correctly ignored — the response still showed the real env values, confirming the env-lock-preservation logic in `updateEmail`'s `pick()` helper; (4) invalid `provider` (`"yahoo"`), out-of-range `smtpPort` (`999999`), and non-positive `inviteExpiryDays` (`0`) each correctly returned `400` with a descriptive error. All test data cleaned up afterward: `system_email_settings` row reset to its pre-test state (all credential/message columns back to `NULL`, `invite_expiry_days` back to `7`), temp admin user and its refresh token deleted, temp token file removed.

---

## [2026-07-31] — SET-01 — Two-Tab Settings Page

- **Author**: Claude
- **PRD Requirement**: SET-01
- **Summary**: `Settings.jsx` gains "Personal"/"Admin" tabs, using the same ad hoc `useState` + `btn-primary`/`btn-secondary`-toggling mechanic already established by `MarkdownEditor.jsx`'s Write/Preview toggle (no dedicated `.tab` CSS class exists anywhere in this codebase, confirmed via grep — not worth inventing one for this single use). The entire tab bar — including the "Personal" button — only renders for admins (`isAdmin`); a non-admin sees no tab affordance at all and the existing "Appearance" card renders directly, matching the PRD's explicit "a non-admin sees only a single unlabeled settings view." The existing admin-only "System Color Palette" card is now the Admin tab's content, unchanged internally. Content container widened from `600px` to `760px` to comfortably fit `MAIL-03`'s upcoming email settings form.
- **Files Changed**:
  - `kartas-app/src/pages/Settings.jsx` — new `activeTab`/`isAdmin` state, tab bar, content gating
- **Migration**: N/A
- **Status**: Done
- **Verification**: `npm run build` clean; confirmed via `docker-compose logs app` that the final file state loads with no errors (one transient error appeared mid-edit from a premature `AdminEmailSettings` import added ahead of its own requirement, `MAIL-03` — reverted immediately, confirmed absent from the final file). No browser-automation tool available this session — manual click-through (confirm a non-admin sees no tab bar at all, confirm an admin sees both tabs and can switch between them, confirm the System Color Palette card still works unchanged under the Admin tab) handed off to the user.

---

## [2026-07-31] — Fix: Sub-Task Search Results Didn't Open the Sub-Item Modal (follow-up to SRCH-02)

- **Author**: Claude
- **PRD Requirement**: N/A (user-reported gap after a second round of manual testing)
- **Summary**: Clicking a sub-task search result correctly landed on the parent story's page (after the previous fix) but stopped there — the sub-item itself never opened. `StoryDetail.jsx` already has exactly this signal built in from an earlier phase (`KAN-02`): it reads a `?editSubItem=<id>` query param on mount and, once `fetchStory()` resolves, opens that sub-item's edit modal automatically. `navigateToResult` was navigating to the plain story URL for `sub_task` results without ever passing this param. Fixed by appending `?editSubItem=${item.id}` (the sub-task's own numeric id — distinct from `item.storyId`, the parent story's id used for the base URL) specifically for the `sub_task` case, reusing the existing mechanism rather than building a new one.
- **Files Changed**:
  - `kartas-app/src/components/ProjectSearch.jsx` — `navigateToResult`'s `sub_task` case now appends `?editSubItem=<id>`
- **Migration**: N/A
- **Status**: Done
- **Verification**: `npm run build` clean; confirmed via `docker-compose logs app` that the dev container picked up the change (one harmless, already-noted dev-only Vite Fast Refresh limitation on this file, unrelated to correctness). Manual re-check (click a sub-task search result, confirm the story page loads with that sub-item's edit modal already open) handed off to the user.

---

## [2026-07-30] — Fix: Search Results Linked to the Wrong Story URL + Top-Bar Layout (follow-up to SRCH-01/SRCH-02)

- **Author**: Claude
- **PRD Requirement**: N/A (user-reported bugs after browser-testing `7.4`)
- **Summary**: Two issues reported together after manual testing.
  1. **Broken story/sub-task links**: clicking a story or sub-task search result navigated to `/project/4/story/RES-0002` instead of the real route shape `/project/4/story/5`. Root cause: `SRCH-01`'s uniform row shape exposed a `storyCode` field (the human-readable code) that `navigateToResult` used directly for navigation — but the `/story/:storyId` route actually keys on the story's **numeric** id, not its code (an established convention already documented in `MIG-01`'s DEVLOG entry, missed here). Worse, for a `sub_task` row there was no numeric id available at all for the *parent* story (only its code) — a sub-task has no page of its own, so navigation needs the parent's numeric id, which `searchController.js` never selected. Fixed by adding a proper `story_id_num` column to every arm of the search UNION (the story's own numeric id for `story` rows, the parent's numeric id — via the existing join — for `sub_task` rows, `NULL` for epic/user), exposed to the frontend as `storyId`, and updated `navigateToResult` to use it instead of the code.
  2. **Top-bar layout**: the new search input rendered visually centered in the header instead of next to the user dropdown on the right, since the header's outer container uses `justify-content: space-between` and the search input had been added as a third top-level child (logo / search / dropdown), which space-between spreads evenly rather than grouping the last two together. Fixed by wrapping `ProjectSearch`/`UserDropdown` in one shared flex sub-container, so the outer container goes back to exactly two children (logo group, and the search+dropdown group) — search now sits immediately left of the dropdown, both flush right.
- **Files Changed**:
  - `kartas-api/src/controllers/searchController.js` — every section query gains a `story_id_num` column; `toRow()` exposes it as `storyId`
  - `kartas-app/src/components/ProjectSearch.jsx` — `navigateToResult` uses `item.storyId` instead of the removed `item.storyCode`
  - `kartas-app/src/components/ProjectLayout.jsx` — `ProjectSearch`/`UserDropdown` now share one flex wrapper on the right side of the header
- **Migration**: N/A
- **Status**: Done
- **Verification**: Curl-verified with a temp project member: a story result for `RES-0002` (numeric id 5) now returns `storyId: 5`; a sub-task result belonging to story `RES-0003` (numeric id 6) returns `storyId: 6` — the parent's id, not the sub-task's own id (3); epic/user results correctly carry `storyId: null` (unused for those types, and the mixed-type `UNION ALL` resolves cleanly with an explicit `NULL::integer` cast on those arms); full/paginated mode re-verified unaffected. `npm run build` clean; both containers reloaded with no errors (one harmless dev-only Vite Fast Refresh notice on `ProjectSearch.jsx`, since it mixes a default component export with plain utility exports — falls back to a full module reload instead of true hot-swap, doesn't affect correctness or the production build). All seeded test data cleaned up.

---

## [2026-07-30] — SRCH-03 — Full Search Results Page

- **Author**: Claude
- **PRD Requirement**: SRCH-03
- **Summary**: New `/project/:projectId/search?q=` page for when the top-bar dropdown's 4-result cap isn't enough — reads `q` from `useSearchParams()`, renders four independently-paginated sections (Epics/Stories/Sub-tasks/Team Members), each following the established `{items, hasMore}` + "Load more" pattern already used by `StoryDetail.jsx`'s history section and the `ForYou` widgets (offset passed on click is simply `items.length`, no separately-tracked offset state). Reuses `ProjectSearch.jsx`'s exported `SearchResultRow`/`navigateToResult` so result rendering and per-type navigation aren't duplicated between the dropdown and this page.
- **Files Changed**:
  - `kartas-app/src/pages/SearchResults.jsx` — new page
  - `kartas-app/src/App.jsx` — new `search` route + import
- **Migration**: N/A
- **Status**: Done
- **Verification**: `npm run build` clean; confirmed via `docker-compose logs app` that Vite HMR picked up both files with no errors. No browser-automation tool available this session — manual click-through (click "See more results" from the top-bar dropdown, confirm all four sections load independently, confirm each section's own "Load more" only extends that section, confirm each result type navigates the same way it does from the dropdown) handed off to the user. **This completes sub-phase 7.4** (`EPD-01`, `EPD-02`, `SRCH-01`, `SRCH-02`, `SRCH-03`).

---

## [2026-07-30] — SRCH-02 — Top-Bar Search Input & Dropdown

- **Author**: Claude
- **PRD Requirement**: SRCH-02
- **Summary**: New `ProjectSearch.jsx`, mirroring `UserSelect.jsx`'s exact, already-proven pattern (300ms-debounced `useEffect`, `wrapperRef` + `mousedown`-outside-click-close), added as a new sibling between the logo and `UserDropdown` in `ProjectLayout.jsx`'s header — kept as its own component rather than inline state in `ProjectLayout.jsx`, which is a deliberately stateless shared shell mounted across every project page (matching the existing precedent that `UserDropdown` is also its own file, not inlined). Dropdown shows up to 4 results (type icon + code/title + context line, new hand-authored inline SVGs per type since no icon library or magnifying-glass icon exists anywhere in this codebase) reusing the existing `.search-container`/`.search-dropdown`/`.search-result-item`/`.user-info` CSS classes verbatim (built for `UserSelect.jsx`, already theme-aware). Selecting a story or sub-task navigates to the parent story's page; an epic navigates to `EPD-02`'s new Epic Detail page; a user navigates to their User Details page. A "See more results" row appears exactly when `hasMore === true` from `SRCH-01`'s capped response, navigating to `/project/:projectId/search?q=<text>` (`SRCH-03`, next). `navigateToResult`/`TypeIcon`/`SearchResultRow` are exported from this file so `SearchResults.jsx` can reuse the identical rendering/navigation logic without duplicating it.
- **Files Changed**:
  - `kartas-app/src/components/ProjectSearch.jsx` — new component
  - `kartas-app/src/components/ProjectLayout.jsx` — renders `<ProjectSearch projectId={projectId} />` in the header
- **Migration**: N/A
- **Status**: Done
- **Verification**: `npm run build` clean; confirmed via `docker-compose logs app` that Vite HMR picked up both files with no errors. No browser-automation tool available this session — manual click-through (type a query in the top bar on any project page, confirm the debounced dropdown appears with correct type icons/context, confirm selecting each result type navigates correctly, confirm "See more results" appears only when there are genuinely more than 4 matches, confirm outside-click closes the dropdown) handed off to the user.

---

## [2026-07-30] — SRCH-01 — Combined Project Search Backend

- **Author**: Claude
- **PRD Requirement**: SRCH-01
- **Summary**: New `GET /api/search/project/:projectId?q=` — a single, project-scoped, relevance-ranked search across epics, stories, sub-tasks, and users (project members only), blended into one list capped at 4 total (per the resolved design decision — not 4 per category). Deliberately new and separate from `storyController.js`'s existing `searchStories` (still used by `CMT-03`'s @mention autocomplete) and `userController.js`'s existing `searchUsers` (still used elsewhere, and not project-scoped) — neither existing endpoint was touched. New migration `016_add_search_trigram_indexes.sql` adds `pg_trgm` (first use in this codebase) plus GIN trigram indexes on `stories.title`/`epics.title`/`sub_tasks.title` and an **expression** index on `users`' concatenated full name (a plain per-column index can't accelerate a query matching the concatenated expression). `similarity()` drives relevance ranking (with a boost so an exact/prefix code match on `story_id`/`epic_id` always outranks a fuzzy title hit), fetching one extra row past the cap to derive `hasMore` without a second `COUNT(*)` round-trip — response shape `{ items, hasMore }`, matching the codebase's established pagination convention. A `full=true&section=<type>` mode (required `section` since `SRCH-03`'s results are grouped-by-type with independent per-section pagination, not one shared offset across the blend) serves the full search-results page, mirroring exactly how `ActionsHistoryWidget.jsx`/`LatestActivitiesWidget.jsx` already do independent per-widget "Load more."
- **Bug found and fixed during verification**: initially used `pg_trgm`'s `%` operator (whole-string similarity threshold) as the match filter — this incorrectly excluded valid substring matches like `q="DEV"` against `"[DEV] Modal de aviso de canal de texto +18"`, since a 3-character query's *overall* similarity against a 40+-character title falls well below the default 0.3 threshold despite being a clear, obvious substring hit. Fixed by matching with `title ILIKE '%q%'` (accelerated by the new GIN trigram indexes — this is what trigram indexes are actually for, per the original PRD research) and using `similarity()` only in `ORDER BY` for ranking, never as the inclusion filter.
- **Files Changed**:
  - `kartas-api/src/migrations/016_add_search_trigram_indexes.sql` — new
  - `kartas-api/src/controllers/searchController.js` — new
  - `kartas-api/src/routes/search.js` — new
  - `kartas-api/src/index.js` — mounted `/api/search`
- **Migration**: `016_add_search_trigram_indexes.sql`
- **Status**: Done
- **Verification**: Migration applied cleanly (`pg_trgm` extension + all 4 indexes confirmed present via `psql`). Curl-verified extensively against real project data (temp members, not seeded fixtures): epic title match, story code-prefix match, sub-task match (with correct parent-story context and correct project-scoping — a same-titled sub-task belonging to a different project's story was correctly excluded), user name match, the `full=true` per-section paginated mode (including `hasMore` across a page boundary), missing/invalid `section` `400`s, a non-project-member `403`s, and a sub-2-character query returns an empty result with no error. All seeded test data cleaned up afterward. Frontend (`SRCH-02`/`SRCH-03`) not yet built.

---

## [2026-07-30] — EPD-02 — Epic Detail Frontend

- **Author**: Claude
- **PRD Requirement**: EPD-02
- **Summary**: New `EpicDetail.jsx` page at `/project/:projectId/epic/:epicId`, modeled closely on `StoryDetail.jsx`: editable Title/Status/Start-End Date/Color (disabled for non-managers, matching the existing `canManageEpics` gate), a description field using the exact `StoryDetail.jsx` view/edit-toggle pattern (`MarkdownEditor` when editing, `MarkdownRenderer` when viewing, Cancel discards local changes without an API call), and a read-only "Associated Stories" table (code, title, status, points, assignee avatar) sourced from `EPD-01`'s new `epic.stories` array — each row links to that story's own detail page, no create/edit/delete affordance on this list per the explicit "just for visualization" scope. Saves reuse the existing `PUT /api/epics/:epicId` unchanged. Deliberately excludes a comments/history section — not requested, and building one would need genuinely new backend work (`updateEpic` doesn't do per-field diffing the way `updateStory` does). `Epics.jsx`'s card now links to this new page instead of a filtered Backlog view (superseded by the page's own story list); the redundant "Edit" button is removed since the whole card already opens the page where editing happens; the create/edit modal narrows to create-only, with its dead edit-mode branch removed rather than left unreachable.
- **Files Changed**:
  - `kartas-app/src/pages/EpicDetail.jsx` — new page
  - `kartas-app/src/App.jsx` — new `epic/:epicId` route + import
  - `kartas-app/src/pages/Epics.jsx` — card `<Link>` repointed to the new page; "Edit" button removed; modal/`handleOpenModal`/`handleSubmit` narrowed to create-only, `editingEpic` state removed entirely
- **Migration**: N/A
- **Status**: Done
- **Verification**: `npm run build` clean; confirmed via `docker-compose logs app` that Vite HMR picked up all files with no errors. Curl-verified the exact `PUT` body shape `EpicDetail.jsx`'s Save sends against a temporary test epic — confirmed every field (title, description, status, dates, color) updates correctly and a follow-up `GET` reflects them alongside the enriched `creator_role`/`creator_email`/`stories` fields from `EPD-01`; confirmed the date format returned (`2026-08-01T00:00:00.000Z`) is compatible with `<input type="date">` via the page's `.substring(0,10)` handling. Temp epic/user cleaned up afterward. No browser-automation tool available this session — manual click-through (open an epic from the Epics list, confirm it lands on the new page instead of filtered Backlog, edit each field as an owner/admin and confirm Save persists, confirm a non-manager sees read-only fields and no Edit-Description button, confirm the associated stories list links correctly to each story) handed off to the user.

---

## [2026-07-30] — EPD-01 — Epic Detail Backend

- **Author**: Claude
- **PRD Requirement**: EPD-01
- **Summary**: New requirement, added mid-`7.4` design: while designing `SRCH-02` (the top search bar's epic-navigation), it became clear epics had nowhere dedicated to link to — no `epic/:epicId` route or detail page exists, only a flat list with an edit modal. The user chose to build a real Epic Detail page (`EPD-02`, next), so this extends the existing `getEpic` (`GET /api/epics/:epicId`) rather than adding a new endpoint: gained `creator_role`/`creator_email` (parity with `getEpics`, which already selects these for its own card's `AssigneeAvatarWithHoverCard`) and a new unpaginated `stories` array (each associated story's code, title, status, points, and assignee info) for the detail page's read-only story list. `updateEpic` needed no changes — it already supports partial updates to every editable field via `COALESCE`.
- **Files Changed**:
  - `kartas-api/src/controllers/epicController.js` — `getEpic` gains `creator_role`/`creator_email` in its query, plus a second query attaching `epic.stories`
- **Migration**: N/A
- **Status**: Done
- **Verification**: Curl-verified with a temp project member against a real epic with 3 real associated stories: confirmed `creator_role`/`creator_email` present and the `stories` array correctly populated (code, title, status, points, assignee name/role/email per story). Nonexistent epic still `404`s (unchanged code path). Temp user/membership cleaned up afterward. Frontend (`EPD-02`) not yet built.

---

## [2026-07-30] — Fix: generateNextStoryId Miscounts After a Migration (follow-up to MIG-01)

- **Author**: Claude
- **PRD Requirement**: N/A (user-reported `500` while manually testing `MIG-01`/`MIG-02`)
- **Summary**: Migrating a story into a project could 500 with a Postgres `duplicate key value violates unique constraint "stories_story_id_key"`. Root cause: `generateNextStoryId(projectId)` found "the last story" via `SELECT story_id FROM stories WHERE project_id = $1 ORDER BY id DESC LIMIT 1`, assuming the row with the highest internal `id` always holds the highest sequence number for that project — true for `createStory`, but **not** after `migrateStory` (`MIG-01`), which moves a story into a project while keeping its original (possibly much older/lower) internal `id`. Once a migrated row's `id` isn't the project's max `id`, `ORDER BY id DESC LIMIT 1` can return a *different* row whose number is lower than the true highest number in use, so the "next" number computed collides with an existing story. Confirmed on real data: project 9 ("Zarpe") had `id=21` → `ZAR-0002` and `id=22` → `ZAR-0001` (the lower `id` held the higher number, from an earlier migration) — the next `generateNextStoryId(9)` call kept re-deriving `ZAR-0002` from `id=22`'s row, colliding with `id=21`'s existing code every time. The user's specific failing migration (story 27, `/api/stories/27/migrate`) rolled back cleanly thanks to `MIG-01`'s transaction — no data corruption, story 27 stayed exactly as it was in its source project. Fixed by scanning **every** `story_id` for the project and taking the true max parsed number, rather than trusting internal `id` order — the actual root-cause fix, not a workaround, and it also incidentally makes number generation robust against any other future `id`/sequence-number decoupling, not just migration's.
- **Files Changed**:
  - `kartas-api/src/utils/ticketPrefix.js` — `generateNextStoryId` now computes the max sequence number across all of a project's `story_id`s instead of trusting the row with the highest internal `id`
- **Migration**: N/A
- **Status**: Done
- **Verification**: Curl-verified against the exact real data that produced the bug (project 9's existing `id`/number inversion): created a new story there and confirmed it correctly got `ZAR-0003` (not another collision), then replayed the user's exact failing request (migrating story 27 into project 9) and confirmed it now succeeds (`200`, new code `ZAR-0004`, avoiding every existing code). Migrated the story back to its original project immediately afterward to restore the user's real data exactly as it was, and deleted the two `change_history` "migrated" rows my verification round-trip created on the user's real story so their history stays clean. All temp users/memberships/test stories cleaned up. **Known, still-accepted limitation**: the underlying query is still not row-locked, so a genuine concurrent-request race (two simultaneous creates/clones/migrates into the same project) remains theoretically possible — unchanged from the pre-existing, already-documented risk; only the migration-triggered *deterministic* miscount is what's fixed here.

---

## [2026-07-30] — SPR-04 — Drag Stories Into/Out of Sprint Blocks

- **Author**: Claude
- **PRD Requirement**: SPR-04
- **Summary**: Dragging a row from the Backlog table into a sprint block (or back) now moves it, using `@hello-pangea/dnd` (migrated from `react-beautiful-dnd` in `DND-01`) applied to table rows — `Droppable` wraps each `StoryTable`'s `<tbody>`, each row is a `Draggable`, mirroring `KanbanBoard.jsx`'s existing structure but for table semantics instead of divs, a documented-supported pattern for this library. A single shared `DragDropContext` wraps every sprint block plus the general Backlog table. `handleDragEnd` optimistically patches just the dragged story's `sprints` field in local state — block membership is a *derived* view (`storiesForSprint`/`generalStories`), so a story visually "moves" automatically once its source array entry is patched, no per-column array splicing needed (simpler than `KanbanBoard.jsx`'s approach, which does maintain separate per-column arrays). On failure, reverts via a full `fetchStories()` refetch, same pattern as Kanban. Dragging directly between two different sprint blocks is explicitly a no-op per the PRD's stated scope limit — `SPR-01`'s backend constraint would reject it anyway, so the client skips the API call rather than firing a doomed request; moving a story between two sprints still works, just as two steps (drag to Backlog, then into the target block). Also fixed a real table-specific drag-and-drop artifact: a dragged `<tr>`'s column widths could visually collapse mid-drag as the table's auto layout recomputes while other rows reflow — mitigated by capturing each row's rendered cell widths at rest (via a ref callback) and reapplying them as explicit inline styles, imperatively via the DOM (not React state, to avoid a re-render on every drag frame), only while that row is actively being dragged.
- **Files Changed**:
  - `kartas-app/src/pages/Backlog.jsx` — `StoryTable` gains a `droppableId` prop and internal `Droppable`/`Draggable` wiring plus the column-width-preservation ref logic; new `handleDragEnd`; the sprint-blocks-plus-Backlog render now wrapped in a single `DragDropContext`
- **Migration**: N/A
- **Status**: Done
- **Verification**: `npm run build` clean (one transient mid-edit JSX syntax warning appeared in `docker-compose logs app` from an intermediate save state — a stray duplicate closing brace introduced by an earlier edit — confirmed fixed in the final file and by a clean rebuild + fresh HMR update with no further warnings). No browser-automation tool available this session — manual click-through (drag a Backlog row into a sprint block and confirm it moves and calls the right endpoint, drag a sprint-block row back to Backlog, confirm dragging between two different sprint blocks is a no-op, confirm column widths don't visibly jump mid-drag, and re-verify `KanbanBoard.jsx`'s own drag-and-drop still works unaffected since both pages now share the same `@hello-pangea/dnd` surface) handed off to the user — this completes sub-phase 7.3 (`SPR-01`–`SPR-04`).

---

## [2026-07-30] — SPR-03 — Create Story Into Sprint

- **Author**: Claude
- **PRD Requirement**: SPR-03
- **Summary**: Each sprint block (`SPR-02`) now has a "+ Create story into sprint" button. Backend: `createStory` accepts an optional `sprintId` — validated (sprint exists, belongs to the same project, isn't completed) before any writes — then the story insert and its `sprint_stories` row run inside a real transaction (`BEGIN`/`COMMIT`/`ROLLBACK` via `pool.connect()`), unlike `cloneStory`'s non-transactional style: a partial failure here would silently strand a brand-new story in the general backlog when the user explicitly asked for it to land in a sprint, the same class of "state nothing else expects" problem `migrateStory`'s transaction already guards against. Frontend: new `createStorySprintId` state, set by the sprint block's own button (vs. `null` for the general "+ Create Story" button) before opening the same, unchanged Create Story modal — no new modal or visible field, exactly matching the PRD's "hidden/pre-filled" instruction. Since `createStory`'s response has no `sprints` array (unlike the list endpoint's shape), a create-into-sprint story is picked up via a `fetchStories()` refetch instead of the cheaper local-splice path used for a plain create, so it correctly renders inside its sprint's block immediately rather than the general table until reload.
- **Files Changed**:
  - `kartas-api/src/controllers/storyController.js` — `createStory` accepts `sprintId`, validates it, wraps the insert + optional `sprint_stories` insert + `change_history` insert in a transaction
  - `kartas-api/src/routes/stories.js` — `validateStoryCreation` gains an optional `sprintId` validator
  - `kartas-app/src/pages/Backlog.jsx` — new `createStorySprintId` state; general and per-sprint "Create Story" buttons set it differently before opening the modal; `handleCreateStory` conditionally includes it and chooses refetch vs. local splice accordingly; reset on modal cancel/close
- **Migration**: N/A
- **Status**: Done
- **Verification**: Curl-verified with a temp project owner across two real projects (one active sprint, one planned, one in a different project, one completed): creating a story with `sprintId` pointing at the active sprint succeeded and the `sprint_stories` row was confirmed; a nonexistent sprint `404`'d; a sprint belonging to a different project `400`'d ("Sprint does not belong to this project"); a completed sprint `400`'d; and a plain create with no `sprintId` still succeeded unaffected (regression check). All seeded test data cleaned up afterward. `npm run build` clean, `docker-compose logs app` confirmed no HMR errors. No browser-automation tool available this session — manual click-through (click "+ Create story into sprint" on a block, confirm the modal opens with no visible sprint field, confirm the new story appears inside that sprint's block and not the general table) handed off to the user.

---

## [2026-07-30] — SPR-02 — Per-Sprint Backlog Blocks

- **Author**: Claude
- **PRD Requirement**: SPR-02
- **Summary**: The Backlog page's single monolithic stories table is now one table per active/planned sprint (showing only that sprint's stories) plus a "Backlog" table for everything else. Extracted a new local `StoryTable` component (same file, not exported — every row's markup, callbacks, and styling copied verbatim from the previous single table, no visual/behavioral change to an individual row) so the ~140-line row-rendering block isn't duplicated per table; confirmed via grep that the row JSX now exists exactly once regardless of how many sprint blocks render. The general table now excludes any story currently in an active/planned sprint (`!story.sprints?.some(s => s.status === 'active' || s.status === 'planned')`) — a story with only completed-sprint history, or none at all, is unaffected. `fetchSprints` now fetches the full unfiltered sprint list (`allSprints`) instead of discarding completed sprints client-side, deriving `activeOrPlannedSprints` (the blocks) and `completedSprints` (now the only meaningful options in the filter-bar "Sprint" dropdown, alongside "No Sprint" — every active/planned sprint's stories live in their own block now, so filtering the general table by one would always return empty). Also fixed a related correctness issue found during the refactor: the page's old `handleToggleAll` operated on the *entire* `stories` array regardless of which table's checkbox triggered it — harmless with one table, but would have let any sprint block's "select all" checkbox select every story on the whole page. Replaced with a table-scoped `handleToggleAllInTable` that only ever touches the stories actually passed to that specific `StoryTable` instance, while `selectedStories` stays one shared array across all tables (consistent with the single, shared bulk-actions toolbar). Also fixed `handleAddToSprint` (the bulk "Add to Sprint" action), which was the only bulk handler that didn't refetch stories after success — without this, a story moved via that action would incorrectly stay visible in the general table (stale `story.sprints`) until a manual reload, directly undermining this requirement's whole premise.
- **Files Changed**:
  - `kartas-app/src/pages/Backlog.jsx` — new `StoryTable` component; `sprints` state renamed `allSprints` with `activeOrPlannedSprints`/`completedSprints` derived; `filteredStories` no longer opt-in-filters by sprint (that predicate now only matters for "No Sprint"/completed-sprint values); new `storiesForSprint`/`generalStories` derivations; sprint blocks + Backlog block rendered via `StoryTable`; `handleToggleAllInTable` replaces `handleToggleAll`; `handleAddToSprint` now calls `fetchStories()` on success
- **Migration**: N/A
- **Status**: Done
- **Verification**: `npm run build` clean; confirmed via `docker-compose logs app` that Vite HMR picked up the change with no errors; confirmed via grep that the row-rendering JSX (the `navigate` click handlers) appears exactly twice in the file (once for the ID cell, once for the title cell — i.e. the row template is defined once, not duplicated per block). No browser-automation tool available this session — manual click-through (confirm each active/planned sprint gets its own block showing only its stories, confirm the general Backlog table no longer shows those stories, confirm an empty sprint block renders as an empty table with no placeholder, confirm each table's own "select all" checkbox only selects its own rows, confirm the bulk "Add to Sprint" action immediately moves a story out of the general table with no reload needed) handed off to the user.

---

## [2026-07-30] — SPR-01 — Single Active/Planned Sprint Constraint

- **Author**: Claude
- **PRD Requirement**: SPR-01
- **Summary**: `addStoriesToSprint` (`POST /:sprintId/stories`) previously had no check preventing a story from joining a second non-completed sprint — `sprint_stories`' composite PK only prevents a duplicate row for the *same* sprint, not across sprints. Added a pre-insert guard that rejects (`400`, naming the conflicting sprint) any story in the batch already associated with a **different** sprint whose status is `active` or `planned`. Confirmed `endSprint` never deletes `sprint_stories` rows (only stamps `snapshot_status`), so the check explicitly joins `sprints` and filters on status rather than just checking row existence — a story with only completed-sprint history is correctly unaffected. The check runs as one query before the batched `INSERT`, so a rejection never results in a partial write. This is foundational for `SPR-02`'s Backlog sprint blocks (a story visually "belongs" to at most one active/planned sprint's block at a time) and `SPR-04`'s drag-and-drop.
- **Files Changed**:
  - `kartas-api/src/controllers/sprintController.js` — new conflict check in `addStoriesToSprint`
- **Migration**: N/A
- **Status**: Done
- **Verification**: Curl-verified with a temp project owner and two real sprints (one active, one planned): adding a story to the active sprint succeeded, then adding the *same* story to the planned sprint correctly `400`'d naming the conflicting sprint; a separate story whose only sprint association was a **completed** sprint was correctly allowed into the planned sprint (confirming completed-sprint history doesn't block). All seeded test data cleaned up afterward.

---

## [2026-07-30] — CLONE-01 — Clone Story Backend

- **Author**: Claude
- **PRD Requirement**: CLONE-01
- **Summary**: New `POST /stories/:storyId/clone`, body `{ includeSubtasks }`. Creates a new story in the same project — `title` prefixed `"[CLONE] "`, `description`/`type`/`storyPoints`/`assigneeId` copied, `epicId`/`status`/`isBlocked` reset to defaults (`NULL`/`'backlog'`/`false`), a fresh `story_id` generated via the existing `generateNextStoryId`, and `creatorId` set to whoever clicked Clone (not carried over from the source, matching `createStory`'s own precedent). Tags carry over (first-ever `INSERT INTO story_tags` in the codebase — only reads existed before). When `includeSubtasks` is true, every sub-task is copied with its status reset to `backlog`. No sprint/comment/history rows carry over — the clone gets its own fresh `change_history` "created" row instead, exactly like any other new story. `isBlocked` is deliberately included in the response, correcting a pre-existing inconsistency where `createStory`'s own response omits it despite the column existing.
- **Files Changed**:
  - `kartas-api/src/controllers/storyController.js` — new `cloneStory` method
  - `kartas-api/src/routes/stories.js` — new `POST /:storyId/clone` route + `validateStoryClone`
- **Migration**: N/A
- **Status**: Done
- **Verification**: Curl-verified end-to-end with a temp project member: cloned a real story (with a sub-task and a tag attached) with `includeSubtasks: true` — confirmed the new story's fields, the sub-task copied with status reset to `backlog`, the tag copied, and a fresh `creation` `change_history` row, with no `sprint_stories` rows. Also verified `includeSubtasks: false` skips the sub-task copy, an invalid `includeSubtasks` type correctly `400`s (the manual guard, not the non-functional `validationResult()` pipeline), a nonexistent story `404`s, and a non-project-member `403`s. All seeded test data (2 temp users, 3 temp stories, 1 temp tag) cleaned up afterward. Known pre-existing `generateNextStoryId` race condition (no row lock) is inherited as-is, consistent with `createStory`'s existing risk — not addressed in this requirement. Frontend UI (`CLONE-02`) not yet built — no browser click-through possible yet for this piece.

---

## [2026-07-30] — CLONE-02 — Clone Story UI

- **Author**: Claude
- **PRD Requirement**: CLONE-02
- **Summary**: New shared `CloneStoryModal.jsx` — a Yes/No prompt ("include sub-tasks?") calling `CLONE-01`'s endpoint, with two explicit choice buttons rather than a checkbox + single confirm, per the PRD's "not a silent default." Reused across both trigger points rather than duplicating the modal in two already-large page files. Added a "Clone" button to `StoryDetail.jsx`'s existing actions toolbar (next to "Save Changes") and to `Backlog.jsx`'s existing Story Details Modal footer (next to "Close") — the latter avoids adding a new table column or action menu, neither of which exists anywhere in the app today, and mirrors the Phase 6 `KAN-02` precedent of adding an action to an existing quick-view modal. Post-clone behavior differs correctly by context: from `Backlog.jsx` (same route), the new `[CLONE]` story is prepended directly into local `stories` state — mirroring `handleCreateStory`'s existing exact pattern — with zero refetch or navigation; from `StoryDetail.jsx` (different route), `navigate()`s to the Backlog page, which mounts fresh and fetches the new clone automatically.
- **Files Changed**:
  - `kartas-app/src/components/CloneStoryModal.jsx` — new component
  - `kartas-app/src/pages/StoryDetail.jsx` — "Clone" button + modal wiring
  - `kartas-app/src/pages/Backlog.jsx` — "Clone" button in the Story Details Modal footer + modal wiring, prepends the new story into local state on success
- **Migration**: N/A
- **Status**: Done
- **Verification**: `npm run build` clean; confirmed via `docker-compose logs app` that Vite HMR picked up all files with no errors. No browser-automation tool available this session — manual click-through (clone from both Story Detail and a Backlog row's quick-view modal, confirm the Yes/No sub-task prompt, confirm the new `[CLONE]` story lands in the Backlog's general table in both cases) handed off to the user.

---

## [2026-07-30] — MIG-01 — Migrate Story to Another Project Backend

- **Author**: Claude
- **PRD Requirement**: MIG-01
- **Summary**: New `POST /stories/:storyId/migrate`, body `{ targetProjectId }`. Confirmed via prior investigation that `updateStory` never reads/writes `project_id` — this is genuinely new ground, not extending existing logic. Requires the requester to be `project_owner`/`admin` of the **source** project (the same project-scoped owner-check pattern already established in `epicController.js`'s `createEpic`/`updateEpic`/`deleteEpic`) and a plain member of the **target** project. On success: generates a new `story_id` under the target's ticket prefix (the old code is meaningless there), resets `epic_id` to `NULL`, deletes all `sprint_stories` rows for the story (sprints are project-scoped), and writes a `change_history` audit row (`field_changed: 'project'`, old/new project names, `action_type: 'migrated'`) — using the **target** project's id on that row, so the migration event surfaces in the destination's activity feed going forward (`forYouController.js`'s feed prefers the stored `change_history.project_id` via `COALESCE`). Prior `change_history` rows keep their original source `project_id`, per the requirement's explicit "leave history untouched" — an accepted side effect is that the source project's own activity feed keeps showing this story's pre-migration history indefinitely, even after it's moved. `sub_tasks`/`comments`/prior history stay correctly attached since they key on the story's numeric `id`, not its project-scoped code. Unlike every other multi-statement flow in this codebase (which are all un-transacted), the three mutating statements here run inside a real `BEGIN`/`COMMIT`/`ROLLBACK` transaction — a deliberate, scoped exception, since a partial failure here (e.g. the project move succeeding but the sprint cleanup failing) would leave a materially worse cross-project inconsistency than anything else in the app risks today.
- **Files Changed**:
  - `kartas-api/src/controllers/storyController.js` — new `migrateStory` method, new `pool` import (for the transaction)
  - `kartas-api/src/routes/stories.js` — new `POST /:storyId/migrate` route + `validateStoryMigrate`
- **Migration**: N/A
- **Status**: Done
- **Verification**: Curl-verified end-to-end with two temp users across two real projects: successful migration confirmed the new story code under the target's prefix, `epicId` reset, `sprint_stories` cleared, and both the untouched original `creation` history row (source project_id) and the new `migrated` row (target project_id) present. Verified rejections: same-project migration (`400`), missing `targetProjectId` (`400`), nonexistent story (`404`), nonexistent target project (`404`), a plain member (not owner) of the source project (`403`), and an owner of the source who isn't a member of the target (`403`). All seeded test data (3 temp users, 2 temp stories, project memberships) cleaned up afterward. Frontend UI (`MIG-02`) not yet built. Note: the response's `storyId` field is the new human-readable code, **not** the identifier the frontend should navigate with — the URL route needs the unchanged numeric `id` field instead, flagged here for whoever implements `MIG-02` next.

---

## [2026-07-30] — MIG-02 — Migrate Story to Another Project UI

- **Author**: Claude
- **PRD Requirement**: MIG-02
- **Summary**: New "Migrate to another project" button in `StoryDetail.jsx`'s actions toolbar, visible only when `canMigrate` — the current user is `owner`/`admin` of the current project (same `myRole`/`canManageMembers` idiom already used in `ProjectView.jsx`/`Epics.jsx`, reusing `project.members` already fetched by the page's existing `fetchProject()`, no new per-project fetch needed) **and** belongs to at least one other project (a new `fetchOtherProjects()` call added to the page's existing initial-fetch `useEffect`, hitting `GET /projects` and filtering out the current one). The modal (inline state, matching this page's existing convention of keeping its own modals local rather than extracted components) offers a target-project `<select>`, an explicit warning that epic assignment and sprint membership will be cleared, and a disabled-until-selected "Migrate" button. On success, navigates using the response's `id` (the unchanged numeric primary key) and `projectId` (the new target) — **not** the response's `storyId` field, which is the new human-readable code and not what the `/project/:projectId/story/:storyId` route actually expects in its `:storyId` segment (flagged explicitly in `MIG-01`'s own DEVLOG entry as a gotcha for this piece).
- **Files Changed**:
  - `kartas-app/src/pages/StoryDetail.jsx` — new `otherProjects`/`showMigrateModal`/`migrateTargetId`/`migrating`/`migrateError` state, `fetchOtherProjects()`, `handleMigrate()`, `myRole`/`canMigrate` gate, conditional toolbar button, and the migrate modal
- **Migration**: N/A
- **Status**: Done
- **Verification**: `npm run build` clean; confirmed via `docker-compose logs app`/`api` that both containers picked up all changes with no errors. No browser-automation tool available this session — manual click-through (confirm the button is hidden for a plain member or for an owner with only one project, confirm it appears for a qualifying owner/admin, pick a target project, confirm the warning text, confirm a successful migrate lands on the story's new URL under the target project) handed off to the user.

---

## [2026-07-30] — Fix: CLONE-01 Assignee Not Reset (follow-up to CLONE-01)

- **Author**: Claude
- **PRD Requirement**: N/A (user-reported spec gap after browser-testing `7.2`)
- **Summary**: The user found that cloning a story kept the original assignee on both the cloned story and any cloned sub-tasks. This traced back to a gap in the original `CLONE-01` requirement itself (the user's own oversight when it was written) — the PRD explicitly said the story's `assigneeId` should be copied and sub-task assignees carried over, rather than reset. Confirmed with the user this should be unassigned across the board: both the cloned story and every cloned sub-task now come out with no assignee, a genuine "clean slate" clone rather than a partial one. `.planning/PRD.md`'s `CLONE-01` acceptance criteria updated to match the corrected behavior, so the planning doc stays accurate.
- **Files Changed**:
  - `kartas-api/src/controllers/storyController.js` — `cloneStory`'s story INSERT now hardcodes `assignee_id` to `NULL` instead of binding the source's value; the sub-task copy's `SELECT` list does the same for its `assignee_id` column
  - `.planning/PRD.md` — `CLONE-01`'s acceptance criteria corrected
- **Migration**: N/A
- **Status**: Done
- **Verification**: Curl-verified with a temp user: created a source story with an assignee and an assigned sub-task, cloned with `includeSubtasks: true`, confirmed the response's `assigneeId` is `null` and the cloned sub-task's `assignee_id` is `NULL` in the database. All seeded test data cleaned up afterward.

---

## [2026-07-30] — Fix: Migrate Modal Stuck Open After Success (follow-up to MIG-02)

- **Author**: Claude
- **PRD Requirement**: N/A (user-reported bug after browser-testing `7.2`)
- **Summary**: The user reported that after a successful migration, the page correctly navigated to the story's new URL under the target project, but the "Migrating..." modal stayed stuck open on top of it, requiring a manual page refresh. Root cause: `handleMigrate`'s post-success `navigate()` call only changes the `:projectId`/`:storyId` **params** of the same route (`/project/:projectId/story/:storyId` → `<StoryDetail />`) — React Router does not unmount/remount a component when only its own route's params change, it just re-renders with new `useParams()` values. This component's local state (`showMigrateModal`, `migrating`) therefore survived the navigation untouched, since nothing had ever reset it (the assumption in the original implementation was that navigating to a "different" URL would remount the page, which is only true when the *route itself* differs — as it correctly does for `CLONE-02`'s clone-then-navigate-to-Backlog case, an unrelated route). Fixed by explicitly resetting `showMigrateModal`/`migrating`/`migrateTargetId` right before the `navigate()` call in the success branch, rather than relying on a remount that was never actually happening.
- **Files Changed**:
  - `kartas-app/src/pages/StoryDetail.jsx` — `handleMigrate`'s success branch now explicitly closes/resets migrate-modal state before navigating
- **Migration**: N/A
- **Status**: Done
- **Verification**: `npm run build` clean; confirmed via `docker-compose logs app` that Vite HMR picked up the change with no errors. Manual re-check of a successful migration (confirm the modal closes cleanly and the page is immediately usable with no refresh needed) handed off to the user.

---

## [2026-07-30] — Dark Mode Fix: Tooltip White-on-White (follow-up to TT-01)

- **Author**: Claude
- **PRD Requirement**: N/A (user-reported bug after browser-testing `7.1`)
- **Summary**: The user reported the new collapsed-sidebar tooltip (`TT-01`) showed white text on a white background in dark mode, making it unreadable. Root cause: both the new sidebar tooltip and the pre-existing `.story-type-cell::after` tooltip it was modeled on set `background-color: var(--color-neutral-900)` with hardcoded `color: white` — but `--color-neutral-900` is *deliberately inverted* in dark mode (`DM-01`, Phase 6: 900 becomes the brightest shade, used for text/headings there), so the "dark" background variable resolves to near-white (`#F4F5F7`) in dark mode while the text stays hardcoded white. This was a latent bug in `.story-type-cell::after` too (Backlog's story-type icon tooltip) that had gone unnoticed until the new sidebar tooltip made the same underlying issue visible. Fixed both by using a fixed, theme-invariant dark chip color (`#172B4D`, light mode's current neutral-900 value) instead of the inverting variable — a tooltip chip is meant to look the same dark scrim in both themes, unlike page text/surfaces, so tracking the inverting scale was the wrong variable choice from the start.
- **Files Changed**:
  - `kartas-app/src/index.css` — `.story-type-cell::after`'s `background-color` changed from `var(--color-neutral-900)` to a fixed `#172B4D`
  - `kartas-app/src/components/navigation.css` — same fix for `.sidebar.collapsed .sidebar-item[data-tooltip]::after`
- **Migration**: N/A
- **Status**: Done
- **Verification**: `npm run build` clean; confirmed via `docker-compose logs app` that Vite HMR picked up both files with no errors. Manual re-check of both tooltips in dark mode handed off to the user (the original light-mode appearance is unchanged, since `#172B4D` matches light mode's existing neutral-900 value exactly).

---

## [2026-07-30] — EPF-01 — Colored Epic Filter Badges

- **Author**: Claude
- **PRD Requirement**: EPF-01
- **Summary**: The Backlog's epic filter was a native `<select>`, which can't render a background color inside an `<option>` — unlike the in-table Epic badge cell, which already showed each epic's color correctly. Built a new generic `ColorDropdown` component (mirroring `UserDropdown.jsx`'s exact outside-click-to-close pattern: a `useRef`-tracked wrapper + `mousedown` listener) that renders a trigger button and option list each showing a small colored dot alongside the label, reusing the existing `.dropdown-item` row styling. Added an `Escape`-to-close handler as a small accessibility improvement beyond the pattern it copies. Applied it to both the epic filter dropdown and, as a low-cost bonus (marked optional in the PRD), the "Assign to epic" bulk-action dropdown, since the component is fully generic and reused with zero new logic in either place. While reusing `.dropdown-item`, found and fixed a real pre-existing dark-mode bug: the class hardcoded `color: #1a1a1a !important` instead of `var(--color-text)`, which would render this text nearly unreadable against `.user-dropdown-menu`'s/`.color-dropdown-menu`'s dark-mode surface color — fixed since the new dropdown would otherwise have inherited the same bug on day one.
- **Files Changed**:
  - `kartas-app/src/components/ColorDropdown.jsx` — new component
  - `kartas-app/src/components/navigation.css` — new `.color-dropdown-menu` rule; fixed `.dropdown-item`'s hardcoded text color to `var(--color-text)`
  - `kartas-app/src/pages/Backlog.jsx` — epic filter and "Assign to epic" bulk-action now use `ColorDropdown` instead of a native `<select>`; both wired to the existing `filterEpic`/`selectedEpic` string state with no other logic changes (`epic.id.toString()` used explicitly, since `ColorDropdown` doesn't implicitly coerce numeric values to strings the way a native `<select>` did)
- **Migration**: N/A
- **Status**: Done
- **Verification**: `npm run build` clean; confirmed via `docker-compose logs app` that Vite HMR picked up all changes with no errors. No browser-automation tool available this session — manual click-through (open the filter dropdown and confirm each epic's color dot, select one and confirm the table filters correctly and the trigger reflects the selection, click an in-table epic badge and confirm the dropdown's shown selection updates to match, test long epic titles for truncation, confirm `Escape` closes the dropdown, and re-check dark mode readability on the fixed `.dropdown-item` text) handed off to the user.

---

## [2026-07-30] — TT-01 — Collapsed Sidebar Tooltips

- **Author**: Claude
- **PRD Requirement**: TT-01
- **Summary**: When the sidebar is collapsed, nav item labels are hidden purely via CSS (`opacity:0; width:0`) with no fallback, so hovering a collapsed icon showed nothing. Added a `data-tooltip` attribute (the nav item's own label) to each `.sidebar-item`, plus new CSS reusing the app's existing lightweight CSS-only tooltip convention (`index.css`'s `.story-type-cell::after` pattern) — but positioned to the right of the icon instead of above it, since the sidebar sits at the screen's left edge. The tooltip rule is scoped entirely under `.sidebar.collapsed`, so it never renders in expanded mode (where the real label is already visible). Found and fixed a real clipping issue during implementation: `.sidebar` and `.sidebar-nav` both have `overflow-y: auto`, which per the CSS overflow spec forces `overflow-x` to also compute as `auto` — this would have clipped the right-positioned tooltip at the collapsed sidebar's 64px edge. Fixed by setting `overflow: visible` on both, scoped to `.sidebar.collapsed` only, so expanded mode's scroll behavior (needed for long content) is untouched.
- **Files Changed**:
  - `kartas-app/src/components/Sidebar.jsx` — added `data-tooltip={item.label}` to each nav `<Link>`
  - `kartas-app/src/components/navigation.css` — new tooltip `::after`/`:hover::after` rules, `position: relative` on `.sidebar-item`, `overflow: visible` on `.sidebar.collapsed` and `.sidebar.collapsed .sidebar-nav`
- **Migration**: N/A
- **Status**: Done
- **Verification**: `npm run build` clean; confirmed via `docker-compose logs app` that Vite HMR picked up both files with no errors. No browser-automation tool available this session — manual click-through (collapse sidebar, hover each of the 8 nav icons, confirm tooltip shows to the right with no clipping and disappears when expanded; quick check on a short viewport that removing `.sidebar-nav`'s scroll doesn't cause icon overflow) handed off to the user.

---

## [2026-07-30] — DND-01 — Migrate react-beautiful-dnd to @hello-pangea/dnd

- **Author**: Claude
- **PRD Requirement**: DND-01
- **Summary**: `react-beautiful-dnd` (the app's only drag-and-drop dependency, used exclusively in `KanbanBoard.jsx`) is deprecated/archived upstream and doesn't officially support React 18. Migrated to `@hello-pangea/dnd`, a maintained, API-compatible fork — confirmed via investigation that `KanbanBoard.jsx`'s `DragDropContext`/`Droppable`/`Draggable` usage and `handleDragEnd` rely only on the standard render-prop API, so the only required change was the import statement. This unblocks `SPR-04` (Backlog drag-and-drop, later in Phase 7), which needs equivalent drag-and-drop functionality and shouldn't be built on a dead dependency. Also updated a stale comment in `main.jsx` that referenced the old library's React 18 StrictMode incompatibility (now fixed by the new fork) — re-enabling StrictMode itself is intentionally deferred as a separate follow-up, since its regression surface is the whole app, not just Kanban.
- **Files Changed**:
  - `kartas-app/package.json` / `package-lock.json` — `react-beautiful-dnd` removed, `@hello-pangea/dnd@18.0.1` added
  - `kartas-app/src/pages/KanbanBoard.jsx` — import statement only (`DragDropContext`/`Droppable`/`Draggable` now from `@hello-pangea/dnd`)
  - `kartas-app/src/main.jsx` — updated comment explaining why StrictMode is still disabled
- **Migration**: N/A
- **Status**: Done
- **Verification**: `npm run build` clean. Container's separate `node_modules` volume (`docker-compose.yml`'s `/app/node_modules` anonymous volume) synced via `docker-compose exec app npm ci`, then `docker-compose restart app` to clear Vite's dependency pre-bundle cache — confirmed clean startup with no resolution errors in `docker-compose logs app`. No browser-automation tool was available this session (consistent with every prior session) — manual click-through (drag a story between kanban columns, drag a sub-task card, confirm optimistic update + revert-on-error still work) handed off to the user.

---

## [2026-07-29] — PAL-04 — Runtime Palette Application

- **Author**: Claude
- **PRD Requirement**: PAL-04
- **Summary**: The admin's system palette now actually applies across the whole app, layered on top of `DM-01`'s static CSS-file defaults. `AuthContext.jsx` fetches `GET /system-settings/theme` once per session (keyed on `user?.id`, so it doesn't refire on every dark/light toggle) and caches it via `systemTheme.js`'s module-level `setCachedSystemTheme()`, which immediately applies the correct mode's derived tokens as inline `document.documentElement.style` properties (higher specificity than any CSS rule, including `DM-01`'s `:root[data-theme="dark"]` block). `applyTheme()` (the same helper `DM-03` added for the dark/light toggle) now also calls `applyRuntimePalette()` after flipping the `data-theme` attribute — necessary because an inline style on `:root` is unconditional, so the *correct* mode's derived palette has to be re-picked and re-applied every time light/dark changes, not just once on load. Before the fetch resolves (or if it fails), the cache stays empty and `applyRuntimePalette()` no-ops, so `DM-01`'s static CSS values correctly show through as the fallback.
- **Files Changed**:
  - `kartas-app/src/utils/systemTheme.js` — New module: color math, `deriveTokens()`, module-level cache, `applyRuntimePalette()`/`setCachedSystemTheme()`
  - `kartas-app/src/contexts/AuthContext.jsx` — New fetch-on-session effect; `applyTheme()` now also calls `applyRuntimePalette()`
- **Migration**: N/A
- **Status**: Done
- **Verification**: Included in the combined `6.5` verification pass below.

---

## [2026-07-29] — PAL-03 — Admin Palette Editor UI

- **Author**: Claude
- **PRD Requirement**: PAL-03
- **Summary**: New `AdminPaletteEditor.jsx`, rendered on `Settings.jsx` (`DM-02`) only when `user.role === 'admin'`. Preset gallery: 6 thumbnails, each a rectangle split diagonally via `clip-path` polygons (one triangle = the preset's light-mode primary color, the other = its dark-mode primary) — pure CSS, no new dependency. Clicking a preset applies and persists it immediately via `PAL-01`'s `PUT`. A "Customize colors" button switches into an editing view with 18 native `<input type="color">` elements (9 `PAL-02` base categories × light/dark) — every keystroke/color pick calls a local `previewDraft()` helper that re-derives and re-applies tokens against the *actual app chrome* (not a static swatch) using the in-progress draft values, without touching the shared module cache — so "Cancel" can cleanly restore the last-saved palette via `setCachedSystemTheme(current)` instead of having to remember what it overwrote. "Save custom palette" persists the draft via the same `PUT` endpoint.
- **Files Changed**:
  - `kartas-app/src/components/AdminPaletteEditor.jsx` — New component
  - `kartas-app/src/pages/Settings.jsx` — Renders it inside an admin-only "System Color Palette" card
- **Migration**: N/A
- **Status**: Done
- **Verification**: Included in the combined `6.5` verification pass below.

---

## [2026-07-29] — PAL-02 — Curated Palette Categories & Presets

- **Author**: Claude
- **PRD Requirement**: PAL-02
- **Summary**: Defined the 9 admin-editable base categories (Primary, Secondary, Success, Warning, Danger, Info, Neutral, Background, Text) and the HSL-based derivation rules that generate every other existing `--color-*` token from them — `deriveTokens()` in the new `systemTheme.js`. Notable design calls made while implementing this: (1) the 11-step neutral scale is generated from the "Neutral" base color's hue/saturation walked across a fixed lightness ladder (light-mode vs. dark-mode ladders, matching `DM-01`'s hand-picked values shape), except `--color-neutral-0` (always pure white, same reasoning as `DM-01`) and `--color-neutral-900` (pinned to the "Text" base value directly, so headings/body text — which read `--color-neutral-900`, not `--color-text` — stay in sync with what the admin picked as "Text" rather than silently drifting from a separately-derived "Neutral" endpoint); (2) `--color-surface` is `background` lightened by a small fixed delta, which works correctly in both directions (surfaces read lighter than the page background in both light and dark mode) without needing a mode-specific branch beyond picking the delta; (3) `--color-success-light`/`--color-danger-light`/`--color-info-light` are desaturated, mode-appropriate tints of their base hue, not fixed swatches. Defined 6 presets spanning the spectrum (Purple — matches `DM-01`'s existing default exactly — Blue, Green, Red/Rose, Orange, Teal), each with independently hand-picked light **and** dark variants rather than one hue with an inverted lightness.
- **Files Changed**:
  - `kartas-app/src/utils/systemTheme.js` — `BASE_CATEGORIES`, `PRESETS`, `deriveTokens()` and its HSL color-math helpers
- **Migration**: N/A
- **Status**: Done
- **Verification**: Included in the combined `6.5` verification pass below.

---

## [2026-07-29] — PAL-01 — System Theme Settings Backend

- **Author**: Claude
- **PRD Requirement**: PAL-01
- **Summary**: New singleton `system_theme_settings` table (`id` fixed to `1` via a `CHECK` constraint), storing the active `preset_name` (or `'custom'`) plus the resolved 9-category light/dark palettes as `JSONB`. Seeded with today's exact purple values (matching `DM-01`'s existing `:root` defaults) so the app's visual identity is unchanged until an admin actively picks something else. New `GET /api/system-settings/theme` (any authenticated user — needed so `PAL-04` can render the app's actual current colors) and `PUT /api/system-settings/theme` (`requireAdmin`-gated). Like `DM-03`'s `PUT /users/theme`, the `PUT` handler validates its input with an explicit manual guard clause (every one of the 9 categories must be present and a valid 6-digit hex string, for both `lightPalette` and `darkPalette`) rather than relying on the codebase's non-functional `validationResult()` pipeline — this endpoint correctly rejects malformed palettes with `400` despite that systemic gap.
- **Files Changed**:
  - `kartas-api/src/migrations/015_add_system_theme_settings.sql` — New singleton table, seeded with the current purple palette
  - `kartas-api/src/controllers/systemSettingsController.js` — New `getTheme`/`updateTheme`
  - `kartas-api/src/routes/systemSettings.js` — New route file (`GET` any authenticated user, `PUT` admin-only)
  - `kartas-api/src/index.js` — Mounted at `/api/system-settings`
- **Migration**: `015_add_system_theme_settings.sql`
- **Status**: Done
- **Verification**: Migration applied cleanly (confirmed the seeded row matches `DM-01`'s exact purple values via `psql`). Curl-verified with temp admin + temp member users: `GET` succeeds for any authenticated user and `401`s unauthenticated; `PUT` `403`s for a non-admin; `PUT` with an invalid hex value correctly `400`s (the manual guard, not the broken validator pipeline); `PUT` with a full valid "Blue" preset payload persists and a follow-up `GET` reflects it; reset back to the purple default (including nulling `updated_by` before deleting the temp admin, to satisfy the FK) and both temp users deleted. `npm run build` clean.

---

## [2026-07-29] — Dark Mode Fix: Hardcoded White Card Backgrounds (follow-up to DM-01)

- **Author**: Claude
- **PRD Requirement**: N/A (user-reported bug after browser-testing `6.4`)
- **Summary**: `DM-01`'s audit of color usage covered every `var(--color-*)` reference but missed inline styles that hardcoded the literal string `'white'` instead of using a variable — those never picked up the dark-mode override, so a handful of surfaces stayed white while their text (driven by `var(--color-neutral-900)`/`var(--color-text)`, both correctly inverted to a light color in dark mode) became unreadable white-on-white. Worst offender: the Kanban board's actual story/sub-task cards, plus their right-click context menus and "Move To" submenus. Found and fixed a matching instance on the Sprint Reports page's "Average Time in Status" tiles as well. All six replaced with `var(--color-surface)`, matching every other card-style container on the same pages.
- **Files Changed**:
  - `kartas-app/src/pages/KanbanBoard.jsx` — 5 occurrences: story/sub-task card background, right-click context menu, "Move To" submenu, sub-task context menu, sub-task "Move To" submenu
  - `kartas-app/src/pages/Sprints.jsx` — 1 occurrence: "Average Time in Status" tile background
- **Migration**: N/A
- **Status**: Done
- **Verification**: Repo-wide grep confirmed these were the only `backgroundColor: 'white'`/`background: 'white'` literals left in `kartas-app/src` — no other pages affected. `npm run build` clean. Manual browser click-through (dark mode, Kanban board + context menus + Sprint Reports) handed off to the user.

---

## [2026-07-29] — DM-04 — Light/Dark Toggle UI

- **Author**: Claude
- **PRD Requirement**: DM-04
- **Summary**: Built the actual toggle control as part of the new `Settings.jsx` page (see `DM-02` entry below) — an "Appearance" card reusing the existing `.switch`/`.switch-primary` markup verbatim (same pattern as `Backlog.jsx`'s "Show completed stories" filter), bound to `user.themePreference` and calling `DM-03`'s `updateThemePreference()` on change. The UI reflects the change immediately (no reload) since `updateThemePreference()` updates React state directly.
- **Files Changed**:
  - `kartas-app/src/pages/Settings.jsx` — "Appearance" section with the theme toggle
- **Migration**: N/A
- **Status**: Done
- **Verification**: Included in the combined `6.4` verification pass below.

---

## [2026-07-29] — DM-03 — Theme Preference Persistence

- **Author**: Claude
- **PRD Requirement**: DM-03
- **Summary**: Added a genuine per-user, per-device-independent light/dark preference. New `users.theme_preference` column (`'light'` default). New `PUT /users/theme` validates `theme` is `'light'`/`'dark'` with an explicit manual guard clause (not relying on the codebase's broken `validationResult()` pipeline flagged in a prior entry — this endpoint enforces validation correctly despite that systemic gap) and persists it. `getProfile`, `login`, and `createAdmin` all now include `themePreference` in their response so the client has it immediately without an extra round-trip. `AuthContext.jsx` gained `updateThemePreference()` (follows `changePassword`'s exact `{ ...user, x: newValue }` + `localStorage` + `setUser()` pattern) plus a shared `applyTheme()` helper called from every path that resolves a user (`login`, `createAdmin`, `checkExistingAuth`'s both success and offline-fallback branches) — it keeps a dedicated `localStorage['theme']` key and the `<html data-theme>` attribute in sync with whatever the current user's preference is. To avoid a flash of the wrong theme on load, `main.jsx` reads that cached `localStorage['theme']` key **synchronously, before `ReactDOM.createRoot().render()`** — this runs before first paint and doesn't wait on the async `/users/profile` round-trip that `checkExistingAuth()` performs later to reconcile with the server.
- **Files Changed**:
  - `kartas-api/src/migrations/014_add_user_theme_preference.sql` — New `theme_preference` column
  - `kartas-api/src/controllers/userController.js` — New `updateThemePreference`; `getProfile` now selects/returns `themePreference`
  - `kartas-api/src/routes/users.js` — New `PUT /theme` route + validator
  - `kartas-api/src/controllers/authController.js` — `login`/`createAdmin` responses include `themePreference`
  - `kartas-app/src/contexts/AuthContext.jsx` — New `applyTheme()` helper, `updateThemePreference()` method, wired into `login`/`createAdmin`/`checkExistingAuth`
  - `kartas-app/src/main.jsx` — Synchronous pre-paint `localStorage` theme read
- **Migration**: `014_add_user_theme_preference.sql`
- **Status**: Done
- **Verification**: Migration applied cleanly (`theme_preference` confirmed `NOT NULL DEFAULT 'light'` via `\d users`). Curl-verified with a temp user: login response included `themePreference: "light"`; `PUT /users/theme {theme:"dark"}` returned `{themePreference:"dark"}` and a follow-up `GET /users/profile` reflected it; `PUT /users/theme {theme:"neon"}` correctly returned `400` (the manual guard clause, not the broken validator pipeline); reset to `"light"` and the temp user deleted. `npm run build` clean.

---

## [2026-07-29] — DM-02 — System-Level "Settings" Menu

- **Author**: Claude
- **PRD Requirement**: DM-02
- **Summary**: Added a new "Settings" item to `UserDropdown.jsx` (between "My Profile" and the admin-only "User Management" entry), routing to a new system-level `/settings` page (`Settings.jsx`, modeled directly on `UserProfile.jsx`'s standalone-page layout) visible to every user regardless of role. Resolved the naming collision flagged in the PRD: the existing per-project sidebar nav item (`Sidebar.jsx` → `ProjectSettings.jsx`, which only controls a project's default landing page) was renamed from "Settings" to "Project Settings" in both the sidebar label and the page's own heading/breadcrumb, so the two distinct concepts no longer share an identical label across two different menus.
- **Files Changed**:
  - `kartas-app/src/components/UserDropdown.jsx` — New "Settings" link (gear icon)
  - `kartas-app/src/pages/Settings.jsx` — New page (also hosts `DM-04`'s toggle; `PAL-03`'s admin-only palette editor will extend this same page in `6.5`)
  - `kartas-app/src/App.jsx` — New `/settings` route
  - `kartas-app/src/components/Sidebar.jsx` — Project-scoped "Settings" nav label renamed to "Project Settings"
  - `kartas-app/src/pages/ProjectSettings.jsx` — Heading/breadcrumb renamed to "Project Settings" to match
- **Migration**: N/A
- **Status**: Done
- **Verification**: Included in the combined `6.4` verification pass below.

---

## [2026-07-29] — DM-01 — Dark Mode Theme Infrastructure

- **Author**: Claude
- **PRD Requirement**: DM-01
- **Summary**: Added a `[data-theme="dark"]` block to `index.css` (as `:root[data-theme="dark"]`) redefining every existing `--color-*` custom property plus `--shadow-*`, applied via a `data-theme` attribute on `<html>` (set by `DM-03`'s `main.jsx`/`AuthContext.jsx` work). Because the app's CSS files and inline JS styles consume colors almost exclusively via `var(--color-*)`, this required no per-component rewrites. The neutral scale is deliberately inverted in dark mode (900 = brightest/used for headings and primary text, 50 = darkest/used for subtle surface tints) — except `--color-neutral-0`, kept at pure white in both themes since it's only ever used as text-on-saturated-color (button labels, the switch thumb), which needs to stay white regardless of theme. Fixed two pre-existing latent bugs found during Phase 6 planning research, as flagged in the PRD: three "phantom" CSS variables referenced throughout the app but never declared in `:root` (`--color-text`, `--color-danger-light`, `--shadow-xl`) now have real values in both the light and dark blocks. Also gave `avatar.js`'s hardcoded `AVATAR_PALETTE` (raw hex, doesn't derive from CSS variables and so can't follow a `:root` swap automatically) a parallel `AVATAR_PALETTE_DARK`, with `getAvatarColor()` picking between them by reading `document.documentElement`'s `data-theme` attribute at call time.
- **Files Changed**:
  - `kartas-app/src/index.css` — New `--color-danger-light`/`--color-text`/`--shadow-xl` in `:root`; new `:root[data-theme="dark"]` block redefining every color/shadow token
  - `kartas-app/src/utils/avatar.js` — New `AVATAR_PALETTE_DARK`; `getAvatarColor()` now theme-aware
- **Migration**: N/A
- **Status**: Done
- **Verification**: `npm run build` clean. Full manual regression click-through across page types (per PRD Section 7's explicit call-out that `DM-01`/`PAL-04` are the widest-blast-radius change in the phase) handed off to the user, alongside the rest of `6.4`.

---

## [2026-07-29] — For You Widgets Stretch to Equal Row Height (follow-up to FY-05)

- **Author**: Claude
- **PRD Requirement**: N/A (user-requested follow-up after browser-testing `6.3`)
- **Summary**: The grid's `alignItems: 'start'` sized each widget `.card` to its own content height, so widgets sharing a row (e.g. a tall "My Tasks" table next to a short "Sprint Countdown") looked visually unbalanced — the shorter card's bottom edge didn't line up with its row-mates. Changed to `alignItems: 'stretch'` (CSS grid's default) — since every widget's root element is a plain `<div className="card">` with no explicit height, it now stretches to match the tallest card in its row automatically, no changes needed inside any individual widget component.
- **Files Changed**:
  - `kartas-app/src/pages/ForYou.jsx` — Grid `alignItems: 'start'` → `'stretch'`
- **Migration**: N/A
- **Status**: Done
- **Verification**: `npm run build` clean — pure layout/CSS change, no data/logic affected. Manual browser click-through handed off to the user.

---

## [2026-07-29] — For You Grid Column Count (follow-up to FY-05/FY-06)

- **Author**: Claude
- **PRD Requirement**: N/A (user-requested follow-up after browser-testing `6.3`)
- **Summary**: `FY-05`'s grid used `repeat(auto-fit, minmax(420px, 1fr))`, which silently became 3 columns at wide viewport widths with no user control. Added an explicit 2-or-3-column choice to `FY-06`'s existing "Customize Widgets" modal (new "Layout" section, radio buttons), following the exact same independent-field partial-update pattern already established for `visibleWidgets` — a new nullable `grid_columns` column on `project_user_settings` (migration `013_add_widget_grid_columns.sql`), defaulting to 2 when unset. `ForYou.jsx`'s grid now uses `repeat(${gridColumns}, 1fr)` instead of the auto-fit rule.
  **Discovery made while curl-verifying this change**: sending an out-of-range `gridColumns` (e.g. `5`) returned `200` instead of the expected `400` from the new `isInt({min:2,max:3})` validator. Root cause: `validationResult()` — the express-validator function that actually checks accumulated validation errors and rejects the request — is **never imported or called anywhere in the entire backend** (confirmed via a codebase-wide grep). Every `body()`/`param()` validator across every route file runs and silently attaches errors to `req`, but nothing ever reads them; requests proceed regardless of validation outcome. This is a pre-existing, systemic gap that predates this session — not a regression introduced by this change, and consistent with how every other validator in the codebase already behaved. Not fixed here (out of scope for this small follow-up — a real fix means adding a shared "check and reject" middleware and wiring it into every validated route, a much larger change than what was asked); flagged in `KICKOFF_PROMPT.md` for awareness.
- **Files Changed**:
  - `kartas-api/src/migrations/013_add_widget_grid_columns.sql` — New `grid_columns` column
  - `kartas-api/src/controllers/projectController.js` — `getProjectSettings`/`updateProjectSettings` extended for `gridColumns`
  - `kartas-api/src/routes/projects.js` — New `gridColumns` validator (decorative only, per the discovery above)
  - `kartas-app/src/components/WidgetSettingsModal.jsx` — New "Layout" section (2/3 column radio choice), exports `DEFAULT_GRID_COLUMNS`
  - `kartas-app/src/pages/ForYou.jsx` — Fetches/saves/applies `gridColumns`
- **Migration**: `013_add_widget_grid_columns.sql`
- **Status**: Done
- **Verification**: Migration applied cleanly. Curl-verified with a temp user: default `gridColumns: 2` on a fresh settings row; `PUT {gridColumns:3}` persisted correctly; a subsequent `PUT {visibleWidgets:[...]}` (omitting `gridColumns`) left it at `3`, not reset — same partial-update guarantee as `visibleWidgets`. `npm run build` clean. Manual browser click-through handed off to the user.

---

## [2026-07-29] — FY-06 — Customizable "For You" Widgets

- **Author**: Claude
- **PRD Requirement**: FY-06
- **Summary**: A "⚙️ Customize" button in the For You page header opens a new `WidgetSettingsModal.jsx` (mirroring `KanbanBoard.jsx`'s existing "Customize Columns" in-page-button-opens-modal pattern, not a dedicated settings page — this is a per-page/per-user preference, not project-wide) listing all five widgets with a checkbox each. Persistence extends `project_user_settings` (migration `012_add_widget_preferences.sql`, `visible_widgets JSONB`, `NULL` meaning "use the default set" — My Tasks + Actions History, per the PRD — rather than an empty array, so existing rows from Phase 4's default-landing-page feature aren't misread as "show nothing"). `projectController.getProjectSettings`/`updateProjectSettings` were extended (not duplicated into new endpoints) to also read/write this column — `updateProjectSettings` now resolves each field (`defaultLandingPage`, `visibleWidgets`) independently, falling back to the existing row's current value for whichever one wasn't included in a given request, so `ForYou.jsx`'s widget-only saves never clobber `ProjectSettings.jsx`'s landing-page choice and vice versa. If the saved set is empty, the page shows an empty-state placeholder pointing back at the gear icon, per the PRD.
  Widget render order is **not** taken from the saved `visibleWidgets` array's own order (which would drift based on toggle history — e.g. re-enabling a widget moves it to the end) — `ForYou.jsx` instead filters a fixed canonical order (`WIDGET_DEFS`, exported from the new modal component) by membership in `visibleWidgets`, guaranteeing My Tasks and Actions History always read first when both are enabled, per the PRD's explicit ask.
- **Files Changed**:
  - `kartas-api/src/migrations/012_add_widget_preferences.sql` — New `visible_widgets` column
  - `kartas-api/src/controllers/projectController.js` — `getProjectSettings`/`updateProjectSettings` extended for independent partial updates
  - `kartas-api/src/routes/projects.js` — `defaultLandingPage` validator now optional, new optional `visibleWidgets` array validator
  - `kartas-app/src/components/WidgetSettingsModal.jsx` — New; exports `WIDGET_DEFS`, `DEFAULT_WIDGETS`
  - `kartas-app/src/pages/ForYou.jsx` — Gear icon, settings fetch/save, canonical-order widget rendering, empty-state placeholder
- **Migration**: `012_add_widget_preferences.sql`
- **Status**: Done
- **Verification**: Migration applied cleanly. Curl-verified the partial-update behavior specifically (the main risk in this design): `PUT` with only `visibleWidgets` left `defaultLandingPage` at its existing value; a subsequent `PUT` with only `defaultLandingPage` left the just-saved `visibleWidgets` array completely intact rather than resetting it to `null`. `npm run build` clean. Manual browser click-through handed off to the user.

---

## [2026-07-29] — FY-04 — "Latest Activities" Widget

- **Author**: Claude
- **PRD Requirement**: FY-04
- **Summary**: A new, separate widget from `ActionsHistoryWidget` (below) — per the user's explicit clarification during PRD drafting, this shows *other* people's activity, not the viewer's own. New `GET /for-you/project/:projectId/latest-activities?limit=&offset=` merges two heterogeneous sources: (1) `change_history` rows where the story/sub-task's current assignee is the caller but the actor isn't (someone else changed *my* item — resolved via a `sub_tasks` join keyed on `COALESCE(ch.entity_id, ch.story_id)` gated by `entity_type = 'sub_task'`, since a sub-task's own assignee can differ from its parent story's), and (2) `comment_mentions` rows (`CMT-04`, previously unconsumed) where the caller is the mentioned user. Since two different queries can't share one SQL `LIMIT`/`OFFSET` cleanly, both are fetched in full (capped at 200 rows each — this is a small-scale team tool, not a firehose) and merged/sorted/paginated in JS.
  New `describeLatestActivity()` (`kartas-app/src/utils/activity.js`) narrates in third person ("John moved X to Y", "Jane mentioned you in a comment on X") — deliberately a different function from `ActionsHistoryWidget`'s `describeActivity` (first-person/imperative, "Moved X to Y"), since the two widgets describe different actors. Clicking a mention item links to `/project/:projectId/story/:storyId#comment-{commentId}` — `StoryDetail.jsx` (from `6.2`'s Comments section) already had the `id="comment-{id}"` anchor, but needed a new `useEffect` to actually scroll to and briefly highlight it, since comments render asynchronously after `fetchStory()` resolves and native browser anchor-scrolling doesn't reliably fire against a hash target that didn't exist yet at navigation time.
- **Files Changed**:
  - `kartas-api/src/controllers/forYouController.js` — New `getLatestActivities`
  - `kartas-api/src/routes/forYou.js` — New `GET /project/:projectId/latest-activities` route
  - `kartas-app/src/utils/activity.js` — New `describeLatestActivity`
  - `kartas-app/src/components/LatestActivitiesWidget.jsx` — New
  - `kartas-app/src/pages/StoryDetail.jsx` — New scroll-to-and-highlight-comment `useEffect`
- **Migration**: N/A
- **Status**: Done
- **Verification**: Curl-verified end-to-end with two temp DB-seeded users and one fully throwaway story (created via the real API, assigned to user A, deleted at the end — its `ON DELETE CASCADE` FKs cleaned up every dependent `comments`/`change_history`/`comment_mentions` row in one shot, so real stories 4/5 were never touched, confirmed by re-checking their `assignee_id`/`status` unchanged after cleanup): user B edited the throwaway story's status and posted a comment mentioning user A → user A's `latest-activities` correctly showed both the status-change and the mention, newest-first; user B's own `latest-activities` (the actor, not the target) correctly showed neither. `npm run build` clean. Manual browser click-through handed off to the user.

---

## [2026-07-29] — FY-01, FY-02 — Team Workload & Sprint Countdown Widgets

- **Author**: Claude
- **PRD Requirement**: FY-01, FY-02
- **Summary**: Two new data-visualization widgets for the active sprint, both showing the same placeholder ("There will only be data here once there's an active sprint") when `GET .../active` or the new team-workload endpoint 404s — matching the existing convention `getActiveSprint`/`getKanbanBoard` already use for "no active sprint."
  **`FY-01` "Team Workload"**: New `GET /for-you/project/:projectId/team-workload`, grouping the active sprint's stories/sub-tasks by assignee and status (unassigned items excluded — nothing to chart them under). New `TeamWorkloadChart.jsx` renders it as a `recharts` stacked vertical bar graph (one bar per assignee, segmented by status color) — `recharts` was already a project dependency (used by `TimeInStatusChart.jsx`/`BurndownChart.jsx` in `SprintReports.jsx`), whose existing `ResponsiveContainer`/`Tooltip`/status-color-map conventions this new chart follows.
  **`FY-02` "Sprint Countdown"**: No new backend — reuses the existing `GET /sprints/project/:projectId/active` endpoint. The widget itself reuses `KanbanBoard.jsx`'s Elapsed Time bar markup verbatim (the same visual pattern from `6.1`'s `KAN-01`), just under a more descriptive name per the PRD's explicit ask for "a good widget name."
- **Files Changed**:
  - `kartas-api/src/controllers/forYouController.js` — New `getTeamWorkload`
  - `kartas-api/src/routes/forYou.js` — New `GET /project/:projectId/team-workload` route
  - `kartas-app/src/components/TeamWorkloadChart.jsx` — New `recharts` chart
  - `kartas-app/src/components/TeamWorkloadWidget.jsx`, `SprintCountdownWidget.jsx` — New
- **Migration**: N/A
- **Status**: Done
- **Verification**: Curl-verified `team-workload` against the project's real active sprint (Sprint 1, project 4) — correctly grouped two real assignees' items by status, matching the sprint's actual story/sub-task assignments (read-only query, nothing mutated). `npm run build` clean. Manual browser click-through handed off to the user.

---

## [2026-07-29] — FY-05, FY-03 — Grid Layout & Widget Extraction, "Actions History" Rename

- **Author**: Claude
- **PRD Requirement**: FY-05, FY-03
- **Summary**: `ForYou.jsx` was a single stacked-layout component with two inline sections (My Tasks table, Activity feed). With up to five widgets in this sub-phase, extracted each into its own component (`MyTasksWidget.jsx`, `ActionsHistoryWidget.jsx`) and rebuilt the page around a CSS grid (`repeat(auto-fit, minmax(420px, 1fr))`) that all widgets — including the three new ones landing later in this same sub-phase — render into as uniform `.card` items. This was done first, foundational to the rest of `6.3`, per the PRD's suggested order.
  `FY-03`'s rename happened as part of the same extraction: `ActionsHistoryWidget.jsx` is the old "Activity" section verbatim (same `getMyActivity` query, same `describeActivity`/`activityLink` logic) — renamed to "Actions History" and its page size reduced from 20 to 10, per the PRD. Its data/behavior is otherwise byte-for-byte unchanged, per the user's explicit clarification during PRD drafting that this is **not** the same thing as the new `FY-04` "Latest Activities" widget (a separate entry, below) — this one still shows only the viewer's own actions.
- **Files Changed**:
  - `kartas-app/src/components/MyTasksWidget.jsx`, `ActionsHistoryWidget.jsx` — New, extracted from the old `ForYou.jsx`
  - `kartas-app/src/pages/ForYou.jsx` — Rebuilt around a CSS grid; old inline My Tasks/Activity JSX removed
- **Migration**: N/A
- **Status**: Done
- **Verification**: `npm run build` clean. Manual browser click-through handed off to the user.

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
