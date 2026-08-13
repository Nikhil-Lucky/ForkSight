# ForkSight

> **Predict what breaks next. Prevent what broke before.**

ForkSight is a developer intelligence platform concept for understanding software risk before a change ships. It is designed around two complementary views:

- **Future Risk** — reason about potential failure paths introduced by a proposed change.
- **Bug Resurrection** — identify when new work may reintroduce a defect previously fixed in Git history.

## Frontend milestone

This repository currently contains the first working frontend foundation. It includes:

- A responsive product landing page
- Repository analysis setup with selectable analysis modes
- A professional analysis workspace shell with six investigation views
- A Bug Graveyard empty state for historical defects
- Reusable navigation, branding, layout, and design-system styles

This milestone intentionally does **not** connect to GitHub, run AI analysis, authenticate users, or generate findings. All analysis views use honest waiting states.

## Local setup

Requirements: [Node.js](https://nodejs.org/) 20+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Available routes are `/`, `/analyze`, `/analysis`, and `/graveyard`.

## Checks

```bash
npm run lint
npm run build
```

## Stack

- React + Vite (JavaScript)
- React Router
- Lucide React
- Plain CSS design system

Everything in this milestone runs locally without paid services or secrets.
