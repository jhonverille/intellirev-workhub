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
    work-hub-store.tsx  Client-side store, Firestore sync, and auth
```

## Deployment

Deployed via Firebase Hosting. Run `firebase deploy` to publish.
