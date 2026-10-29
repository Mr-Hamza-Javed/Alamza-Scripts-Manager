# Alamza Scripts Manager

A reading and production tool for video editors working from long research scripts
(markdown tables). React + TypeScript (Vite), Firebase Auth + Realtime Database, built
as a static web app. The full product brief is in [REQUIREMENTS.md](REQUIREMENTS.md).

## Run it locally

```bash
npm install
npm run dev
```

## Build and deploy

```bash
npm run build      # writes the static site to dist/
npm run deploy     # build + firebase deploy --only hosting
```

`dist/` is the folder Firebase Hosting serves (see `firebase.json`). For a drag-and-drop
deploy, drop the contents of `dist/` instead of the old single `index.html`.
Database rules are unchanged in `firebase-rules.json`.

## Where things live

| Path | What |
|---|---|
| `src/App.tsx` | All state and behaviour: sync, sharing, trash, ready marks, search, keyboard |
| `src/view.ts` | Turns state into what each screen shows |
| `src/components/` | Screens: sidebar / rail, top bar, reader, raw editor, card editor, settings, dialogs, sign-in |
| `src/lib/design.ts` | Card editor: which settings shape a card, the control groups, presets and the preview sample |
| `src/lib/parse.ts` | Markdown → sections, lines and guide items |
| `src/lib/constants.ts` | Default tags, every setting and its default, the settings screen layout |
| `src/lib/firebase.ts` | Firebase setup (same project and database paths as before) |
| `src/ui/calm-ui.css`, `src/ui/kit.tsx` | The Calm Blue UI look and its React pieces |
| `src/ui/app.css` | App-specific styles (script view, tree, settings rows) |
| `src/ui/icons.ts` | Every icon in one list (Fluent UI) |
| `archive/legacy-dc/` | The previous single-file version, kept for reference |

Local data, cloud data and share links from the previous version keep working: the
storage keys, database paths and share URL format (`/#/s/<token>`) are the same.
