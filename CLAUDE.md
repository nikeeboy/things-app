# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A vanilla-JS (no build step, no framework, no dependencies) browser task manager called "GTD". Tasks/projects/areas are stored in `localStorage` for offline/local use, and optionally synced to the user's Google Drive as Markdown files with YAML frontmatter.

## Running / testing

There is no build step, package manager, or test suite. To run the app:

```bash
python3 -m http.server 8000
# or: npx serve -l 8000
```

Then open `http://localhost:8000` in a browser. `file://` will not work because Google OAuth requires an http(s) origin. The app works fully in local-only mode without any Google setup — Drive sync is optional and configured at runtime via a Client ID entered in the in-app settings (gear icon, bottom-left), not via env vars or config files.

There is no linter or test runner configured. Verify changes by exercising the UI directly in a browser (see the `run` skill).

## Architecture

Four scripts loaded in a fixed order via `index.html` (`util.js` → `store.js` → `drive.js` → `ui.js`), each attaching globals to `window`. No modules/bundler — load order matters because later files depend on globals defined earlier.

- **`util.js`** — pure helpers with no dependencies on the other files: DOM shortcuts (`$`/`$$`), date math on `YYYY-MM-DD` ISO strings (`toISO`/`fromISO`/`addDaysISO`/etc.), human-readable date labels, `debounce`, `slug`.

- **`store.js`** — the data model and all GTD business logic. Everything hangs off a single in-memory `DB` object (`{v, tasks, projects, areas, tags, meta}`), mutated directly and persisted to `localStorage` (key `things.db`) via a debounced `saveLocal`. The `Store` object is the only public API for mutating `DB` (`newTask`, `patchTask`, `completeTask`, `trashTask`, project/area/tag CRUD, `moveTask`, etc.) — UI code should never touch `DB` directly. Key concepts:
  - A task's `when` field drives which GTD view it appears in: `null` (Anytime-eligible), `'today'`, `'someday'`, or `{date:'YYYY-MM-DD'}` (scheduled/Upcoming). `status` is `'open'|'done'|'canceled'|'trashed'`.
  - Repeating tasks (`repeat: {unit, interval, mode}`) are handled in `completeTask`: completing one logs a non-repeating completed copy and reschedules the live task via `nextRepeatDate`.
  - The "queries" section (`viewSections`, `inTodayOpen`, `inInbox`, `inAnytime`, `groupByParent`, etc.) computes what each sidebar view (Inbox/Today/Upcoming/Anytime/Someday/Logbook/Trash) should render — this is where GTD semantics live and is the section most likely to need touching for view/filtering changes.
  - Markdown (de)serialization for Drive sync lives at the bottom: `taskToMd`/`mdToTask`, `projectToMd`/`mdToProject`, `areaToMd`/`mdToArea`, plus generic `buildFrontmatter`/`parseFrontmatter`.
  - `window.Sync` is a set of no-op hooks (`taskSaved`, `taskRemoved`, `projectSaved`, ...) that `store.js` calls after every mutation; `drive.js` overwrites these with real implementations when Drive is connected. This is the only coupling between `store.js` and `drive.js` — keep it that way when adding new mutation types.

- **`drive.js`** — Google Identity Services OAuth (`drive.file` scope — Drive only sees files this app creates) and a REST client against the Drive API. Maintains its own id maps (`fileIds`, `folderIds`, `fileMeta`) to know which Drive file/folder corresponds to which entity. Structure on Drive mirrors the local model: `GTD/<Area>/<Project>/<task>.md`, loose tasks under `GTD/Inbox/`, app state/tags under `GTD/_service/state.json`, trashed tasks under `_service/Trash/`. Writes are queued (`chain`, an operation queue) so concurrent Drive calls serialize. On connect, does a full bidirectional sync (`full sync` section) reconciling local `DB` with what's on Drive.

- **`ui.js`** — all rendering and event wiring, built around one global mutable `UI` state object (current view, selection, filters, editor state, etc.) and a `render()` function that redraws `#sidebar`/`#main` from `Store` data whenever state changes. No virtual DOM — sections rebuild via template-string `innerHTML`. Notable subsystems, each in its own labeled section (grep for `/* ----- ... ----- */`): sidebar, main list rendering, the task/project editor panel, popovers (calendar, when/deadline/repeat/move pickers, project/area/heading menus), Quick Entry (`Ctrl+Space`), Quick Find (`⌘K`/`/`), settings modal, drag-and-drop (`wireDnd`), and global keyboard shortcuts (`wireGlobal`). `init()` at the bottom wires everything up on load.

- **`things.css`** — all styling; no CSS framework, no preprocessor, no CSS-in-JS. Uses CSS custom properties for theme colors.

## Data model notes for making changes

- Adding a new task/project/area field: extend the object literal in `Store.newTask`/`newProject`/etc., add read/write in the corresponding `*ToMd`/`md*` pair in `store.js` if it should sync to Drive, and render/edit it in `ui.js` (`editorHtml`/`wireEditor` for tasks).
- Any new mutation that should sync to Drive must call the relevant `Sync.*` hook (mirroring existing `Store` methods) so `drive.js` picks it up — `store.js` has no direct knowledge of Drive.
- Views/filtering logic (what shows up in Today vs Anytime vs Upcoming, etc.) belongs in `store.js`'s queries section, not in `ui.js`.
