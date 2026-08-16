# Alamza Scripts Manager — Requirements

Product owner's brief as agreed during the build, in the order it was decided.

---

## 1. What the app is

A reading and production tool for **video editors** working from long research scripts
written as markdown tables. The script is **not** shown as a document (Google-Docs /
Notion style) — it is shown as an **interactive UI** built around one script line at a
time and the visual guide attached to it.

Primary user: the editor who reads the script and hunts for footage.
Not a writing tool — editing happens in Raw mode only.

---

## 2. Two modes

### Raw mode
- The markdown source, editable.
- Syntax highlighting + line numbers.
- Add, update, remove tables, rows, sections — anything the markdown allows.
- `Save & render` re-parses and returns to Normal mode. Unsaved changes are flagged.

### Normal mode — the main work
The rendered, beautiful, interactive view. Requirements:

- **Sections collapse / expand.**
- **Tables are not tables.** Space must not be wasted.
- **Every tag in the visual-guide column renders separately** — not one crushed cell.
  The label starts the line, its data continues on the *same* line; a new line only
  begins at a new label. Labels look like small filled pills in the tag's own colour.
- **Links are handled properly** — favicon + title chips that open in a new tab.
- **Tags render as tags**, and clicking one copies it (search terms, article shots,
  text overlays).
- **Active line**: whatever line the user clicks becomes active. If they scroll away,
  a floating button brings them back to it.
- Light **and** dark themes.
- Script line: normal (sans) font, bold, only slightly larger than the guide text.
- Padding scales with text size — small text, small gaps; large text, larger gaps.
- Nothing may ever appear blank while scrolling, at any scroll speed.
- No glitching: scrollbar dragging and mobile flinging must behave natively.

### Editor features requested
- Progress bar per section and for the whole script (how much footage is ready).
- Click a tag = copy it.
- Copy all search terms — for a line or a section.
- Copy the whole script — the complete markdown, script lines plus visual guide, straight to the clipboard.
- Filters — only B-ROLL, only INSERT VIDEO, only what is still pending.
- Focus mode — one line lit, the rest dimmed.

---

## 3. Layout direction (decided by looking at options)

Explored ledger / beat-card / split-view directions, then refinements for wasted space.

**Locked:** the beat-card family, refined — script line full width on top, guide below
in a recessed panel whose items flow across two balanced columns (masonry), labels
above their content, no side-label gutter.
**Theme:** warm paper for light, plus the dark counterpart.

---

## 4. Settings — the rule

> "Har aik cheez, har aik setting is me se change ki ja sake. Koi bhi possible setting
> aisi na ho jo yahan se change na ki ja sake."

Every visual and behavioural choice is a setting. Groups:

| Group | Covers |
| --- | --- |
| Appearance | overall scale, theme, paper tone, accent colour, density, radius, borders, shadow, content width |
| Typography | script font / size / weight / leading, guide font / size / leading, tag label size, chip row spacing |
| Layout | tag label style, guide columns (1/2/3/auto), column gap + rule, chip shape, sources position, gaps between lines / tags / sections, guide panel padding + background + border, auto padding + ratios, space above and below the script line, sidebar show + width, line numbers (style, size, weight, colour), ready checkboxes, per-line copy button, transcripts, sticky headers, start collapsed |
| Reading | focus mode, dim strength, active-line style, remember active line |
| Copy & links | what a chip click does, which search engine opens, copy format, copy-all separator, new-tab links, favicons, domains |
| Parsing | auto-detect unknown tags, unknown tag renders as, default chip split, script/visual column headers, extra columns, resolve `[[10]]` refs, resolve `▶️(Title)` refs, repair broken cells |
| Tags & labels | the registry — see §5 |
| Library | rename / duplicate / delete every script |
| Account & sync | Google sign-in, cloud sync, settings sync |
| Sharing | default invite role, public-by-default, auto-refresh public copy, default sidebar tab, folders first, ready count, confirm before trash |
| Data | export script, export all search terms, export settings, clear ready marks, empty trash |

---

## 5. The markdown is never the same twice

The parser must survive every shape the research writer produces:

- Links after the sections, or at the end of every section, or inline in the visual guide,
  or only as bare numbering (`[10]`).
- Two columns, four columns, seven columns.
- `▶️(Title)` references resolved by title against the sources list.
- `[[10]](url)` numbered references resolved against the sources list.
- Cells broken by a `|` inside a link label — repaired rather than split.
- Notes and prose that sit outside the table — shown, never silently dropped.

**Tag registry:** the user decides what type each tag/label in the visual-guide column is
(prose, chips, overlay, links, hidden), its colour and its split character. Registry is
saved, so a tag met once is recognised in every future script. A tag the app has never
seen is auto-guessed and added, flagged `AUTO` for confirmation.

---

## 6. Files, folders, trash

- Two sidebar tabs: **Scripts** and **Review**. Scripts holds folders and scripts only;
  items shared with the user appear in the same tab under *Shared with me*.
- Nested folders, any depth.
- Create, rename, move, duplicate, delete for both folders and scripts.
- Deleted items go to **Trash** and stay there until the user chooses *Delete forever*.
- Scripts arrive by paste, by `.md` / `.txt` upload, or by creating a new one.

---

## 7. Sharing

- Any folder or any single script can be shared as a **public link**:
  `https://<the domain the app runs on>/#/s/<token>`.
- Whoever has the link **can only view**. No login required. They may change one thing:
  the **ready** tick on a script line. Ready marks are shared — one set for everyone.
- The shared view must look **exactly as the owner sees it** — their settings, their
  typography, their tag registry, their colours.
- Owner's edits reach open shared views live.
- Sharing to a specific Google account, with roles:
  **Viewer · Commenter · Editor · Manager · Owner**.
- Google sign-in. Settings follow the account across devices.
- Realtime database (Firebase) so a tick by one person appears immediately for others.

---

## 8. Login and account

- A professional, visually strong login screen; Google as the sign-in method.
- Continuing without an account is allowed — data then lives in that browser only.
- User card pinned at the bottom of the sidebar: photo, name, sync state, sign out.

---

## 9. Platforms

- Desktop-first, built for a large monitor.
- A fully optimised **mobile** version as well: drawer navigation, single-column guide,
  bottom tab bar, 44px+ touch targets.

---

## 10. Quality bar

> "User experience sab se badi priority hai, phir UI ke visuals."

- World-class visuals, no wasted space, no filler.
- Zero blank frames while scrolling, no glitching, snappy on long scripts (200+ lines).
- Every reported bug fixed at its root cause, not patched around.
