# Desk Project/Session UX Hardening

**Date:** 2026-06-25
**Status:** approved design, pending implementation plan
**Owner lane:** Codex / Desk renderer and desktop bridge
**Related roadmap:** ENOS `docs/ROADMAP.md` C-UI / Desk polish

## Goal

Make Desk feel like a project workspace, not Chat with folders attached. Chat stays
conversation-first. Desk becomes project-first and session-based, with clean local vs
cloud behavior and no half-available projects on the wrong surface.

The user-facing rule:

- Chat has chats.
- Desk has projects and sessions.
- Desktop Desk can work local or cloud projects.
- Web Desk can work cloud projects only.

Underlying OWUI chat records can remain the storage primitive; the visible product
language and default filtering must match the surface.

## Decisions

### 1. Desk uses sessions, not chats

Desk UI copy changes from "New Chat", "Chats", and "No chats found" to "New Session",
"Sessions", and "No sessions yet" where the user is inside the Desk surface. Chat keeps
the current chat language.

Desk sessions are always project-scoped. If the user is in a project, new sessions
belong to that project. Loose Chat history does not appear in Desk by default.

### 2. Strict surface split

Desktop app:

- Shows local projects.
- Shows cloud projects.
- Allows moving/copying local projects to cloud.

Web Desk:

- Shows cloud projects only.
- Does not list local-only projects.
- Does not list local-only sessions.
- If a stale/direct URL points at a local-only project or session, redirect to the
  cloud projects view and show a calm toast: "Local projects open in ENOS Desktop. Move
  this project to Cloud from the desktop app to use it here."

No unavailable-local-project screen on web. The clean answer is: web Desk is cloud-only.

### 3. Missing local folder recovery

When the desktop app opens a local project whose saved folder no longer exists because
it was deleted, moved, or renamed outside ENOS, Desk shows a recovery-first project
home.

Behavior:

- File browser, local agent work, local git, and local file mutations are blocked.
- Existing sessions/history remain safe.
- The project remains selected so the user understands what needs recovery.
- Actions are: Relink Folder, Use Cloud Copy when available, Keep Read-Only, Archive
  Project.

This is intentionally stronger than a small banner. A missing filesystem root is a
workspace integrity problem, not a normal empty project.

### 4. Rename behavior

For ENOS-created clean local projects, renaming the project immediately renames the
backing Finder folder after validating name/path collisions.

For externally bound local folders, ENOS asks before renaming the real folder on disk.
The default can be label-only unless the user confirms disk rename.

For cloud projects, renaming updates the project label and project root metadata. It
must never expose or rename raw container home paths like `/home/user` as the product
concept.

### 5. Cloud files open at project root

Cloud Files must open at the active cloud project root, not `/home/user`.

The current screenshot showing `.local`, `lost+found`, `.bashrc`, and `.profile` is
the wrong product state. Those are container/home implementation details. In Desk
project mode, file navigation should show the project directory and project files.

Design rules:

- The visible path is product-shaped, for example `Projects / Test 22`.
- Agent and file actions are scoped to that project root.
- Container-home system files are not part of the default project file view.
- Project-owned dotfiles follow the existing file safety policy; do not hide useful
  project files just because they begin with a dot.
- A broad "Drive" view for all cloud folders is a later, intentional feature. It is
  out of scope for this pass.

## Architecture

### Product model

Desk should treat project identity as the first-class state:

```text
Surface: chat | desk
Runtime: desktop | web
Project runtime: local | cloud
Project source: local | github | cloud
Session: OWUI chat record with desk surface + project binding
```

The existing OWUI chat/folder data model can keep storing messages, titles, timestamps,
and chat ids. The Desk layer adds stricter projection:

- Surface filtering decides whether a record is visible on Chat or Desk.
- Project binding decides which Desk project owns a session.
- Runtime availability decides whether files/agent work can run.

### UI components

Primary areas likely touched by implementation:

- Sidebar project list and project/session labels.
- Desk project home empty/recovery states.
- Desk workspace/environment picker.
- Chat/session creation action labels.
- Local file nav and cloud file nav root selection.
- Direct URL guard for Desk project/session routes.

The copy should be calm and specific. Avoid raw stack traces, raw container paths, and
"chat" language inside Desk.

## Data Flow

### Desktop local project

1. User selects a local project.
2. Desktop bridge validates that the saved root exists.
3. If present, Desk enables local file/agent/git capabilities.
4. If missing, Desk enters recovery-first state and disables local file/agent/git
   capabilities.

### Web Desk project list

1. Web Desk loads project/folder/sidebar data.
2. It filters out local-only projects before rendering.
3. If no cloud projects exist, it shows cloud-first empty state/actions.
4. Direct/stale local-only routes redirect to cloud projects with a toast.

### Cloud project files

1. User selects a cloud project.
2. File pane resolves the active project root, not the workspace home.
3. File APIs list/read/write relative to that root.
4. UI renders a product path such as `Projects / Test 22`.

## Error Handling

- Missing local root: recovery-first screen, no repeated raw errors.
- Failed cloud create/copy: keep the modal open, preserve inputs, show actionable
  message.
- Duplicate cloud root/name: offer a safe alternate name or switch to the existing
  project; do not create ambiguous duplicate roots.
- Direct web access to local-only project/session: redirect to cloud projects with a
  toast.
- External folder rename: confirm before disk mutation.
- ENOS-created folder rename collision: block rename and explain the conflict.

## Testing

Add focused tests before implementation changes where possible:

- Desk surface copy returns "session" labels while Chat keeps "chat" labels.
- Web Desk filters local-only projects.
- Stale/direct local-only Desk URL on web redirects to cloud projects with toast state.
- Missing local folder produces recovery state and disables file/agent actions.
- ENOS-created local project rename requests disk rename; externally bound project asks
  before disk rename.
- Cloud files root resolves to the active project root, not `/home/user`.
- Cloud project file view excludes container-home implementation files by construction.

Run the existing focused webui tests for Desk helpers/components and the desktop bridge
tests for local workspace validation before claiming completion.

## Out of Scope

- A full cloud Drive UI for browsing all cloud folders.
- A data migration that changes OWUI chat storage primitives.
- Pi Terminal migration work.
- Backend billing/metering changes.
- Web support for operating on local-only projects.

## Self-Review

No unresolved markers remain. The design is intentionally product-level and
implementation agnostic where current code paths may differ, but the user-visible rules are explicit:
Desk is project/session-first, web Desk is cloud-only, missing local folders require
recovery, cloud files open at project root, and Drive is later. The scope is broad
enough for one implementation plan with multiple focused slices, but not mixed with
unrelated Pi or pricing work.
