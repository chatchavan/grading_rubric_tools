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
| 1 | `storage.js` | §1.3 | `STORAGE_KEYS` constant; `saveToLocalStorage` / `loadFromLocalStorage` helpers. All other files call these. |
| 2 | `rubric.js` | §1 | Default rubric markdown; `parseMarkdownRubric`; `loadRubricFile` / `useDefaultRubric`; `initializeRubric` (DOM rendering). Owns the `rubricData` variable shared by scoring, students, and download. |
| 3 | `students.js` | §2 | `students` array and `currentStudentIndex`; `saveCurrentStudentData` / `loadStudentData` / `navigateStudent`. |
| 4 | `scoring.js` | §2 | `getMaxScore`, `updateScore`, `selectOption`, `updateVisualSelection`; criterion validation and missing-criterion highlighting. |
| 5 | `download.js` | §7 | `downloadCSV`, `downloadJSON`, `downloadMarkdownZip`, `downloadPDFZip`, `downloadFile`. Reads `rubricData`, `students`, `isColumnLayout`. |
| 6 | `ui.js` | §4/§8 | `isColumnLayout` flag; `toggleLayout`; `savePdfMeta`; `initializeFromLocalStorage` (restores all persisted UI state on startup). |
| 7 | `app.js` | — | App entry point: `DOMContentLoaded` init sequence, `studentName` input listener, `clearLocalStorage` / `doClearLocalStorage`, `uploadJSON`, `setEqual` utility. |

## Planned additions (multi-project spec)

The spec lives in `Ω WiP - mutli-project/multi-project-spec-3.md`. Future JS files will slot in as:

| File (planned) | Spec ref | Responsibilities |
|----------------|----------|-----------------|
| `projects.js` | §1–§3 | Project registry, URL-hash routing, slug↔ID resolution |
| `sidebar.js` | §4 | Sidebar open/close, project list rendering, inline rename |
| `sync.js` | §5 | `storage` event listener, cross-window sync, editing lock + heartbeat |
| `modals.js` | §7 | Export and import modal logic |

CSS placeholder sections for these features are already present in `rubric_grader.css`.
