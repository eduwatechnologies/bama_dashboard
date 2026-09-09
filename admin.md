# HausaBridge Admin API

Reference for building an admin UI (web dashboard) against the HausaBridge backend. Covers authentication, content management (words, phrases, categories), the contribution review queue, installations, and the dashboard.

This document does **not** cover the public/mobile API (`/api/v1/content`, `/api/v1/sync`, `/api/v1/contributions`) — only endpoints under `/api/v1/admin`.

---

## 1. Base URL

```
{API_BASE_URL}/api/v1/admin
```

All paths below are relative to this prefix. Example: `POST /auth/login` means `POST {API_BASE_URL}/api/v1/admin/auth/login`.

---

## 2. Response envelope

Every response — success or failure — is JSON with a `success` flag.

**Success:**
```json
{
  "success": true,
  "data": { },
  "meta": { "page": 1, "limit": 20 }
}
```
`meta` is only present on paginated/search endpoints.

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": [
      { "field": "email", "message": "A valid email is required" }
    ]
  }
}
```
`details` is only present for validation errors (field-level messages).

### Error codes

| HTTP | code                    | Meaning                                                |
|------|-------------------------|---------------------------------------------------------|
| 400  | `VALIDATION_ERROR`      | Request body/query/params failed validation             |
| 401  | `AUTHENTICATION_ERROR`  | Missing, invalid, or expired token; bad login           |
| 403  | `AUTHORIZATION_ERROR`   | Authenticated, but role doesn't permit this action       |
| 404  | `NOT_FOUND`             | Resource or route doesn't exist                         |
| 409  | `DUPLICATE_KEY_ERROR`   | Unique field conflict (e.g. category slug, admin email) |
| 413  | `VALIDATION_ERROR`      | Request payload too large                                |
| 429  | `RATE_LIMIT_ERROR`      | Too many requests                                        |
| 500  | `INTERNAL_ERROR`        | Unexpected server error (never leaks internals)          |

Build the UI to key off `error.code`, not the message text (messages may change wording).

---

## 3. Authentication

Admins authenticate with email/password and receive a short-lived **access token** plus a longer-lived **refresh token**. There is no self-service signup — the first `SUPER_ADMIN` is created via a seed script; that admin creates everyone else's accounts (admin-creation endpoint is on the Phase-3 roadmap — for now, seed additional admins directly or ask backend to run the seed script again with different credentials).

### 3.1 Login

```
POST /auth/login
```
No auth required. Rate-limited to 10 requests / 15 min per IP.

**Body**
```json
{ "email": "admin@hausabridge.app", "password": "••••••••" }
```

**200 response**
```json
{
  "success": true,
  "data": {
    "admin": {
      "_id": "665f1c2e...",
      "name": "Super Admin",
      "email": "admin@hausabridge.app",
      "role": "SUPER_ADMIN",
      "isActive": true,
      "lastLoginAt": "2026-09-03T10:15:00.000Z",
      "createdAt": "...",
      "updatedAt": "..."
    },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

`401 AUTHENTICATION_ERROR` on bad credentials or a deactivated account. Deliberately vague ("Invalid email or password") — don't reveal which field was wrong.

### 3.2 Using the access token

Send it on every subsequent admin request:
```
Authorization: Bearer <accessToken>
```
Access tokens expire in **15 minutes** by default (`JWT_ACCESS_EXPIRES_IN`). Expired/invalid tokens return `401 AUTHENTICATION_ERROR` — the UI should transparently call refresh and retry once, then fall back to the login screen.

### 3.3 Refresh

```
POST /auth/refresh
```
No access token required — send the refresh token instead.

**Body**
```json
{ "refreshToken": "eyJhbGciOi..." }
```

**200 response** — same shape as login (`admin`, new `accessToken`, new `refreshToken`).

Refresh tokens are **single-use and rotate**: each successful refresh invalidates the token used and issues a new one. Store the newest `refreshToken` returned and discard the old one. An admin can hold up to 5 concurrent refresh tokens (e.g. multiple browser tabs/devices) — the oldest is dropped once the limit is exceeded.

`401 AUTHENTICATION_ERROR` if the refresh token is expired, already used, or the account was deactivated — send the user back to login.

### 3.4 Logout

```
POST /auth/logout
```
Requires a valid access token.

**Body**
```json
{ "refreshToken": "eyJhbGciOi..." }
```

Invalidates that specific refresh token server-side. Always call this on sign-out so a stolen refresh token from a previous session can't be replayed. **200 response:** `{ "loggedOut": true }`.

### Suggested client-side flow

```
login() -> store {accessToken, refreshToken}
on 401 from any admin call:
    try refresh() -> update stored tokens -> retry original request once
    if refresh fails -> clear tokens -> redirect to login
on explicit logout -> call /auth/logout -> clear tokens
```

---

## 4. Roles & permissions

| Role          | Words/Phrases read | Words/Phrases write | Words/Phrases delete | Categories write | Contributions review | Manage admins |
|---------------|:---:|:---:|:---:|:---:|:---:|:---:|
| `SUPER_ADMIN` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (not yet exposed via API) |
| `ADMIN`       | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `MODERATOR`   | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `EDITOR`      | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

A request from a role without permission returns `403 AUTHORIZATION_ERROR`. Use `admin.role` from the login/refresh response to conditionally show/hide UI actions (create/edit/delete/approve buttons) — but always expect the API to enforce this independently, since the UI check is only for UX.

---

## 5. Pagination

All list endpoints accept:

| Param   | Type | Default | Notes |
|---------|------|---------|-------|
| `page`  | int  | 1       | 1-indexed |
| `limit` | int  | 20      | max 100 |

Responses include `total` inside `data` (total matching records, not just this page) and echo `page`/`limit` back in `meta`.

```json
{
  "success": true,
  "data": { "items": [ /* ... */ ], "total": 187 },
  "meta": { "page": 1, "limit": 20 }
}
```

Compute total pages client-side as `Math.ceil(total / limit)`.

---

## 6. Dashboard

### `GET /dashboard`
Any authenticated role.

**200 response**
```json
{
  "success": true,
  "data": {
    "totalWords": 1820,
    "totalPhrases": 340,
    "totalCategories": 12,
    "totalInstallations": 1240,
    "contentVersion": 37
  }
}
```
Counts are live (`PUBLISHED` words/phrases, `ACTIVE` categories). `contentVersion` is the global sync version — useful to show "content is at version N" on the dashboard. Deeper analytics (pending/approved/rejected today, most-searched words, sync success rate) are on the Phase-4 roadmap; for now, derive pending-review counts from `GET /contributions?status=PENDING` (see §9).

### `GET /installations`
Any authenticated role. Paginated (`page`, `limit`).

**200 response**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "...",
        "installationId": "01JXYZ...",
        "appVersion": "1.2.0",
        "platform": "android",
        "deviceLanguage": "en",
        "contentVersion": 35,
        "firstSeenAt": "...",
        "lastSeenAt": "...",
        "lastSyncAt": "...",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "total": 1240
  }
}
```
Sorted by `lastSeenAt` descending (most recently active first). Useful for an "active installations" or "content version adoption" view.

---

## 7. Content: Words

A **Word** has `english`, `hausa`, optional `description`, `categoryId`, optional `exampleSentence {english, hausa}`, optional `audio {url, storageKey, mimeType, size, duration}`, and `status` (`DRAFT` | `PUBLISHED` | `ARCHIVED`).

> **Version bumping:** Creating or updating a word with `status: "PUBLISHED"` (or transitioning it into/out of `PUBLISHED`) stamps it with a new global content version, which is what makes it show up for mobile clients on their next `GET /api/v1/sync`. Saving as `DRAFT` does **not** bump the version or become visible to mobile — use this for work-in-progress entries.

### `GET /words`
Roles: any. Query: `page`, `limit`, `status` (`DRAFT`/`PUBLISHED`/`ARCHIVED`), `category` (category `_id`, **not** slug, on this admin endpoint).

Returns `{ items, total }`, each item populated with `categoryId` as `{ _id, name, slug }`.

### `GET /words/:id`
Roles: any. 404 if not found (no status filter — admins can view drafts/archived).

### `POST /words`
Roles: `SUPER_ADMIN`, `ADMIN`, `EDITOR`.

**Body**
```json
{
  "english": "Water",
  "hausa": "Ruwa",
  "description": "A common noun used daily.",
  "categoryId": "665f1c2e...",
  "exampleSentence": { "english": "Give me water.", "hausa": "Ba ni ruwa." },
  "audio": { "url": "https://.../water.mp3", "storageKey": "words/water.mp3", "duration": 1.8 },
  "status": "PUBLISHED"
}
```
Only `english`, `hausa`, `categoryId` are required. `status` defaults to `DRAFT` if omitted. `categoryId` must reference an existing category or the request fails with `400 VALIDATION_ERROR`. `201` on success, body is the created word.

### `PATCH /words/:id`
Roles: `SUPER_ADMIN`, `ADMIN`, `EDITOR`. Same body shape as create, but every field is optional (partial update — only send what changed).

### `DELETE /words/:id`
Roles: `SUPER_ADMIN`, `ADMIN`. **Soft delete**: sets `status: "ARCHIVED"` and bumps the content version (mobile clients remove it locally on next sync). The record is not actually deleted from the database. Returns the archived word.

---

## 8. Content: Phrases

Same shape and endpoints as Words, minus `description` and `exampleSentence` (phrases don't have those fields):

```
GET    /phrases
GET    /phrases/:id
POST   /phrases        (SUPER_ADMIN, ADMIN, EDITOR)
PATCH  /phrases/:id     (SUPER_ADMIN, ADMIN, EDITOR)
DELETE /phrases/:id     (SUPER_ADMIN, ADMIN)  — soft delete, same as words
```

**Body for POST/PATCH**
```json
{
  "english": "How are you?",
  "hausa": "Yaya kake?",
  "categoryId": "665f1c2e...",
  "audio": { "url": "...", "storageKey": "..." },
  "status": "PUBLISHED"
}
```
Same version-bumping behavior as words.

---

## 9. Categories

```json
{
  "_id": "665f1c2e...",
  "name": "Greetings",
  "slug": "greetings",
  "description": "Common greetings and pleasantries.",
  "icon": "wave",
  "status": "ACTIVE",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### `GET /categories`
Roles: any. Returns **all** categories (including `INACTIVE`), sorted by name — unlike the public `/api/v1/categories`, which only returns `ACTIVE` ones. No pagination (category counts are small).

### `POST /categories`
Roles: `SUPER_ADMIN`, `ADMIN`.

**Body**
```json
{ "name": "Greetings", "slug": "greetings", "description": "...", "icon": "wave", "status": "ACTIVE" }
```
`name` and `slug` required. `slug` must be lowercase letters, numbers, and hyphens only (`^[a-z0-9-]+$`) and unique — a duplicate returns `409 DUPLICATE_KEY_ERROR`. `status` defaults to `ACTIVE`.

### `PATCH /categories/:id`
Roles: `SUPER_ADMIN`, `ADMIN`. Same fields, all optional.

> There is currently no `DELETE /categories/:id`. To retire a category, `PATCH` its `status` to `INACTIVE` — it disappears from the public category list but existing words/phrases keep their reference.

---

## 10. Contributions (moderation queue)

This is the review workflow for community submissions from the mobile app. See the [contribution type reference](#101-contribution-type-reference) below before building the review screen — the fields that matter differ by `type`.

A contribution's lifecycle:
```
PENDING ──▶ UNDER_REVIEW ──▶ APPROVED   (applies the change to official content)
   │                    └──▶ REJECTED
   └───────────────────────▶ REJECTED
```
`UNDER_REVIEW` is optional — you can approve/reject directly from `PENDING`. It exists so a moderator can "claim" an item while working through the queue.

### `GET /contributions`
Roles: any. Query: `page`, `limit`, `status` (`PENDING`/`UNDER_REVIEW`/`APPROVED`/`REJECTED`), `type` (`WORD`/`PHRASE`/`TRANSLATION`/`CORRECTION`/`AUDIO`).

Returns `{ items, total }`, sorted newest-first. Build the queue view as `GET /contributions?status=PENDING` by default.

### `GET /contributions/:id`
Roles: any. Full contribution document — use this for the review detail screen.

### `PATCH /contributions/:id/review`
Roles: `SUPER_ADMIN`, `ADMIN`, `MODERATOR`. No body. Moves `PENDING` → `UNDER_REVIEW` and records `reviewedBy`. Fails with `400 VALIDATION_ERROR` if the contribution isn't currently `PENDING`.

### `PATCH /contributions/:id/approve`
Roles: `SUPER_ADMIN`, `ADMIN`, `MODERATOR`.

**Body (all optional — lets the reviewer adjust before publishing)**
```json
{ "english": "Water", "hausa": "Ruwa", "categoryId": "665f1c2e..." }
```
Any field you send **overrides** what the submitter proposed; omitted fields fall back to the submitted values. See §10.1 for which overrides apply to which type.

**200 response**
```json
{
  "success": true,
  "data": {
    "contribution": { "...": "...", "status": "APPROVED", "resultContentId": "665f..." },
    "content": { "...": "the resulting Word or Phrase document, now PUBLISHED" }
  }
}
```
Approving immediately publishes the change and bumps the global content version — it will appear for mobile clients on their next sync. Fails with `400 VALIDATION_ERROR` if already `APPROVED`/`REJECTED`, or (for `AUDIO` type) if no audio has been uploaded yet.

### `PATCH /contributions/:id/reject`
Roles: `SUPER_ADMIN`, `ADMIN`, `MODERATOR`.

**Body**
```json
{ "reviewNotes": "Translation doesn't match regional dialect used elsewhere in the app." }
```
`reviewNotes` is **required** — always show a reason field before allowing reject. Fails with `400 VALIDATION_ERROR` if the contribution is already `APPROVED` (approved changes can't be walked back through this endpoint).

### 10.1 Contribution type reference

| `type`        | Purpose | Key fields to display | What "approve" does |
|---------------|---------|------------------------|----------------------|
| `WORD`        | New word suggestion | `english`, `hausa`, `categoryId`, `notes` | Creates a new **published** Word |
| `PHRASE`      | New phrase suggestion | `english`, `hausa`, `categoryId`, `notes` | Creates a new **published** Phrase |
| `TRANSLATION` | Proposes a Hausa translation for existing content | `contentType`, `contentId`, `hausa`, `notes` | Sets `hausa` on the referenced Word/Phrase |
| `CORRECTION`  | Flags existing content as wrong | `contentType`, `contentId`, `suggestedEnglish`, `suggestedHausa`, `reason` | Applies whichever of `suggestedEnglish`/`suggestedHausa` was submitted (or your override) to the referenced content |
| `AUDIO`       | Pronunciation recording for existing content | `contentType`, `contentId`, `audio`, `notes` | Sets `audio` on the referenced Word/Phrase to the uploaded recording |

For `TRANSLATION`, `CORRECTION`, and `AUDIO`, the review screen should fetch and show the **currently official** content (`GET /words/:id` or `GET /phrases/:id`, using `contribution.contentType`/`contribution.contentId`) side-by-side with the submission, so the moderator can compare old vs. proposed — mirroring the "Existing translation" vs. "Submitted Khamuri/Hausa" comparison in the original product spec.

For `AUDIO` contributions, `contribution.audio.url` is playable directly (points at the storage backend — local disk in dev, S3/CDN in production) — render an inline `<audio>` player.

Every contribution also carries `installationId` (the anonymous device that submitted it — there's no user identity to show) and timestamps `createdAt`/`updatedAt`.

---

## 11. Common integration notes

- **CORS**: the API allows the origin(s) configured in `CORS_ORIGIN`. If your admin UI runs on a different origin than configured, requests will fail in-browser — confirm with backend before deploying.
- **Rate limits**: authenticated admin routes share a pool of 300 requests/minute per IP; `/auth/login` and `/auth/refresh` are limited to 10 requests/15 min per IP specifically to slow credential attacks. A `429 RATE_LIMIT_ERROR` means back off and retry after a short delay — don't hammer immediately.
- **Timestamps**: all dates are ISO 8601 UTC strings (e.g. `2026-09-03T10:15:00.000Z`) — format client-side for the admin's local timezone.
- **IDs**: all `_id` and `categoryId`/`contentId` fields are MongoDB ObjectId strings (24 hex characters). Sending a malformed ID returns `400 VALIDATION_ERROR`, not `404`.
- **Idempotency**: none of these endpoints are currently idempotency-key protected — avoid double-submitting forms (e.g. disable the submit button while a create/approve/reject request is in flight).

---

## 12. Not yet available (roadmap)

These appear in the original product spec but aren't implemented yet — don't build UI for them until backend confirms they're live:
- `POST /admin/admins` (creating other admin accounts through the API — currently seed-script only)
- Content releases (`GET/POST /admin/releases`, publish)
- Sync logs (`GET /admin/sync-logs`)
- Deeper analytics (search trends, audio play counts, sync success/failure rates, pending/approved/rejected-today counts)
- Audit log of admin actions
