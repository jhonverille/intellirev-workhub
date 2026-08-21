# Work Hub

Work Hub is a collaborative productivity workspace built with Next.js, TypeScript, Tailwind CSS, and Firebase. It combines tasks, projects, notes, quick links, and real-time collaboration into one seamless workspace.

## What it includes

- **Dashboard**: High-level focus with recent activity and project status
- **Task & Project Management**: Track progress with deadlines, priorities, and assignees
- **Calendar View**: Interactive timeline to visualize upcoming deadlines
- **Markdown Notes**: Rich-text note taking with live preview and syntax highlighting
- **Team Collaboration**: Invite team members via links, role-based access (owner / assignee)
- **Recycle Bin**: Restore accidentally deleted tasks, projects, notes, and links
- **Data Portability**: Backup and restore your entire workspace via JSON exports
- **Settings**: Personalized theme, profile, and preferences
- **Real-time Sync**: Workspace data synced via Firestore with offline `localStorage` fallback
- **Authentication**: Google sign-in via Firebase Auth

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Lint code
npm run test       # Run unit tests (Vitest)
```

## Project structure

```text
src/
  app/
    (marketing)/        Landing page
    (workspace)/        Dashboard and all app pages
    invite/             Workspace invite acceptance flow
  components/
    forms/              Entity forms for tasks, projects, notes, and links
    ui/                 Reusable UI primitives
  lib/
    default-data.ts     Seed data and localStorage key
    firebase.ts         Firebase client initialization
    navigation.ts       Route metadata and filter options
    presentation.ts     Shared badge/status presentation helpers
    types.ts            TypeScript domain models
    utils.ts            Formatting and small helpers
    visibility.ts       Who may see a private item (one definition)
    workspace-items.ts  Item-document storage shape, merge and diff
    work-hub-store.tsx  Client-side store, Firestore sync, and auth
```

## Data model

Firestore holds three things per workspace:

- `workspaces/{id}` — name, members, pending assignment requests, and
  `schemaVersion`. Only the owner may change membership or the schema flag.
- `workspaces/{id}/items/{itemId}` — shared tasks, projects, notes, and links,
  one document each, tagged with `kind` and a `deleted` flag for the recycle bin.
  One document per item means two members editing different items never write the
  same document.
- `private_workspaces/{id}_{uid}` — that member's private items and their
  personal settings (theme, profile, list preferences).

Workspaces written by older builds kept all content in arrays on the workspace
document. They are read as-is until the owner next opens them, at which point the
content is copied into item documents and `schemaVersion` is set to 2.

Security rules are enforced server-side and are the only access control in the
app, since the client is a static export. After changing `firestore.rules`:

```bash
firebase deploy --only firestore:rules
```



## Deployment

Deployed via Firebase Hosting. Run `firebase deploy` to publish.
