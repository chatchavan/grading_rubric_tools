# Grading Rubric Tools — Developer Notes

## Project structure

| File | Purpose |
|------|---------|
| `rubric_grader.html` | Main app shell — markup only, no inline JS or CSS |
| `rubric_grader.css` | All styles, sectioned by feature area |
| `js/` | JavaScript modules (load-order matters; see below) |
| `rubric_editor.html` | Standalone rubric authoring tool (separate app) |

## JS files (`js/`) — load order and responsibilities

Files must be loaded in this order (each depends on the ones above it):

| # | File | Spec ref | Responsibilities |
|---|------|----------|-----------------|
| 1 | `storage.js` | §1.3 | `GLOBAL_KEYS`, `STORAGE_KEYS` (mutable — rebuilt by `updateStorageKeys(projectId)` on every project switch), `saveToLocalStorage` / `loadFromLocalStorage`, `debounce` utility. |
| 2 | `projects.js` | §1–§3 | `PALETTE`, `activeProject`, `projectRegistry`; `loadRegistry` / `saveRegistry`; `findBySlug` / `findById`; `createProject`, `duplicateProject`, `clearProjectGradingData`, `deleteProject`; `switchProject`; `initProjects` (startup hash routing); `popstate` handler for browser back/forward. |
| 3 | `rubric.js` | §1 | Default rubric markdown; `parseMarkdownRubric`; `loadRubricFile` / `useDefaultRubric`; `initializeRubric` (DOM rendering). Owns `rubricData` shared by scoring, students, and download. |
| 4 | `students.js` | §2 | `students` array, `currentStudentIndex`, `resetStudentState`; `saveCurrentStudentData` / `loadStudentData` / `navigateStudent`. Calls `releaseLock` / `acquireLock` (defined later in sync.js) around navigation via `typeof` guards. |
| 5 | `scoring.js` | §2 | `getMaxScore`, `updateScore`, `selectOption`, `updateVisualSelection`; criterion validation and missing-criterion highlighting. |
| 6 | `download.js` | §7 | `downloadCSV`, `downloadMarkdownZip`, `downloadPDFZip`, `downloadFile`, `saveBlob`. JSON export moved to `modals.js`. |
| 7 | `ui.js` | §4/§8 | `isColumnLayout`, `toggleLayout`, `savePdfMeta`, `initializeFromLocalStorage` (restores all per-project UI state on startup or project switch). |
| 8 | `sidebar.js` | §4 | `toggleSidebar` / `openSidebar` / `closeSidebar`; `renderProjectList`; `esc()` HTML-escape helper; `countStudents`; dropdown toggle; all sidebar action handlers (`onNewProject`, `onDuplicateCurrent`, `onDuplicateProject`, `onClearProject`, `onDeleteProject`, `onColorChange`); inline display-name rename (`startNameEdit`). |
| 9 | `sync.js` | §5 | `WINDOW_ID` (sessionStorage UUID); `acquireLock` / `releaseLock` / `writeLock` / `startHeartbeat` / `stopHeartbeat`; `setReadOnly` / `disableGradingInputs` / `takeOverEditing`; `storage` event listener for cross-window sync (registry changes, lock revocation, per-project data updates). |
| 10 | `modals.js` | §7, §2.2 | `openModal` / `closeModal` / `modalSelAll`; export modal (`populateExportList`, `doExport`); import modal (`onImportFileChange`, `populateImportList`, `doImport`); edit-project modal (`openEditProjectModal`, `saveProjectEdit`); `showToast`. |
| 11 | `app.js` | — | App entry point: `DOMContentLoaded` init sequence (`initProjects` → `initializeFromLocalStorage` → `initializeRubric` → `loadStudentData` → `acquireLock` → `renderProjectList`); `clearGradingData` / `doClearGradingData` (§2.3 — students only, keeps rubric); debounced `input` listeners for `studentName` and `studentNotes` (§5.2, 400 ms). |

## Key architectural notes

- **`STORAGE_KEYS` is mutable.** All per-project keys are prefixed with the project's immutable internal ID. `updateStorageKeys(id)` rebuilds the object on every project switch; all other files use `STORAGE_KEYS.students` etc. as before.
- **`activeProject`** (declared in `projects.js`) is the single source of truth for the current project. Never read the URL hash directly — use `activeProject.id` for storage and `activeProject.slug` for URLs.
- **Load-order forward-references** (e.g. `students.js` calling `acquireLock` from `sync.js`) are guarded with `typeof X === 'function'` checks so parse-time errors don't occur.
- **Debounced saves:** name and notes input events are debounced 400 ms (§5.2) via the `debounce` utility in `storage.js`. Score clicks save immediately.
